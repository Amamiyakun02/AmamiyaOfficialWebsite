"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, SendHorizontal, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { apiUrl } from "@/lib/api";

/* =====================================================================
   Halaman chat Vienna AI Assistant.
   SUMBER ENDPOINT (update 18 Nov 2026, sesuai catatan vault
   "Vienna Agent.md — Referensi Endpoint Chat Core OpenCode"): chat
   kini berjalan di core opencode lewat backend —
   POST /v1/opencode/chat/stream dengan body {prompt, session_id?}.
   Riwayat percakapan disimpan opencode serve sendiri; frontend
   hanya menyimpan session_id (dari event meta/done) + salinan
   tampilan riwayat di localStorage. Sebelumnya halaman ini memakai
   engine lama (/v1/<engine>/chat: gemini/mercury/deepseek) dengan
   tab pemilih engine — tab itu hilang karena sumbernya kini satu.
   - aliran SSE: {meta: {session_id}} di awal, {text} berkali-kali,
     {meta: {tool}} saat agent memanggil tool, ditutup
     {done, session_id, tools_used, model, usage}; gagal = {error}.
   - teks yang diterima diungkap bertahap seperti mengetik oleh loop
     rAF (startReveal); pesan AI selesai dirender markdown betulan
     (react-markdown).
   Quick prompt dari halaman utama tiba sebagai ?q= dan terkirim
   otomatis sekali saat halaman dibuka.
   ===================================================================== */

const CHAT_ENDPOINT = "/v1/opencode/chat/stream";
const SESSION_KEY = "assistant_session_id";
const HISTORY_KEY = "assistant_chat_history";

const SUGGESTIONS: string[] = [
  "Apa itu diffusion language model?",
  "Buat contoh API Python singkat.",
  "Ceritakan stack AI Anda.",
  "Bagaimana cara kita bekerja sama?",
];

type BackendUsage = {
  model?: string;
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_est?: number;
  response_tokens_est?: number;
};

type MessageMeta = {
  engine: string;
  latencyMs: number;
  tokens: number;
  realTokens?: boolean;
  tools?: string[];
};

type Message = {
  id?: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  meta?: MessageMeta;
};

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));
const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function welcomeMessage(): Message {
  return {
    sender: "ai",
    text: "Halo! Saya Vienna, asisten AI Amamiya. Tanyakan tentang keahliannya, proyeknya, atau cara menghubunginya.",
    timestamp: nowTime(),
  };
}

// Bentuk usage jalur opencode berbeda dari engine lama: done membawa
// {cost, tokens} dengan tokens berupa objek opencode. Normalkan ke
// total_tokens agar resolveTokens lama bisa dipakai apa adanya.
function normalizeUsage(u: unknown): BackendUsage | null {
  if (!u || typeof u !== "object") return null;
  const rec = u as Record<string, unknown>;
  if (typeof rec.total_tokens === "number") {
    return { total_tokens: rec.total_tokens };
  }
  const t = rec.tokens;
  if (typeof t === "number") return { total_tokens: t };
  if (t && typeof t === "object") {
    const tt = t as Record<string, unknown>;
    if (typeof tt.total === "number" && tt.total > 0) {
      return { total_tokens: tt.total };
    }
    const sum =
      (typeof tt.input === "number" ? tt.input : 0) +
      (typeof tt.output === "number" ? tt.output : 0);
    if (sum > 0) return { total_tokens: sum };
  }
  return null;
}

function resolveTokens(usage: BackendUsage | null, fallbackText: string) {
  if (usage) {
    const total =
      usage.total_tokens ??
      (usage.prompt_tokens ?? usage.prompt_tokens_est ?? 0) +
        (usage.completion_tokens ?? usage.response_tokens_est ?? 0);
    if (total > 0) return { tokens: total, realTokens: true };
  }
  return { tokens: estimateTokens(fallbackText), realTokens: false };
}

// Isi pesan AI yang SUDAH selesai dirender sebagai markdown betulan
// (tebal, daftar, judul, tautan) — sebelumnya markdown tampil mentah.
// Saat streaming berjalan, pesan ditampilkan teks polos + karet ketik
// (lihat MessageText) lalu ditukar ke render ini begitu selesai.
function MessageMarkdown({ text }: { text: string }) {
  return (
    <div className="msg-md">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

// Render teks pesan: blok ```...``` jadi <pre>, sisanya pre-wrap biasa.
function MessageText({ text }: { text: string }) {
  const segments = text.split("```");
  return (
    <>
      {segments.map((seg, i) => {
        if (i % 2 === 1) {
          const code = seg.replace(/^[a-zA-Z0-9_-]*\n/, "");
          return (
            <pre key={i} className="msg-code">
              {code}
            </pre>
          );
        }
        return (
          <span key={i} className="msg-plain">
            {seg}
          </span>
        );
      })}
    </>
  );
}

export default function AssistantChat() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // Streaming halus (9 Nov): backend mengirim SSE dalam potongan besar
  // (Mercury = model difusi), jadi teks yang SUDAH diterima diungkap
  // bertahap oleh loop rAF agar mengalir seperti mengetik. streamId =
  // pesan yang sedang diungkap (dirender polos + karet, belum markdown).
  const [streamId, setStreamId] = useState<string | null>(null);
  const targetRef = useRef("");
  const shownRef = useRef(0);
  const streamDoneRef = useRef(false);
  const rafRef = useRef(0);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Tetap menempel ke bawah saat streaming HANYA bila user memang
  // sedang di dekat bawah; user yang menggulir ke atas tidak ditarik.
  const stickRef = useRef(true);
  const quickSentRef = useRef(false);

  // Muat riwayat tampilan (atau pesan sambutan bila kosong). Riwayat
  // betulan percakapan ada di opencode serve, terikat session_id.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as Message[]) : null;
      setMessages(parsed && parsed.length > 0 ? parsed : [welcomeMessage()]);
    } catch {
      setMessages([welcomeMessage()]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, waiting]);

  // Hentikan loop ungkap saat komponen dilepas.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const persist = useCallback((msgs: Message[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
    } catch {
      /* storage penuh/tidak tersedia — abaikan */
    }
  }, []);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || busy) return;
      const userMsg: Message = { sender: "user", text, timestamp: nowTime() };
      // Baca dari ref, bukan state tertutup: pengiriman otomatis quick
      // prompt terjadi tepat setelah mount saat state belum tentu
      // terisi di closure — ref selalu mencerminkan riwayat terbaru.
      const history = [...messagesRef.current, userMsg];
      setMessages(history);
      persist(history);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      stickRef.current = true;
      setBusy(true);
      setWaiting(true);
      const startTime = performance.now();
      let streamedText = "";
      let streamUsage: BackendUsage | null = null;
      let streamModel: string | null = null;
      let streamTools: string[] = [];
      const aiId = `stream_${Date.now()}`;

      const finishWith = (finalText: string) => {
        setStreamId(null);
        const latencyMs = Math.round(performance.now() - startTime);
        const tk = resolveTokens(streamUsage, text + finalText);
        setMessages((prev) => {
          const base = prev.some((m) => m.id === aiId)
            ? prev.map((m) => (m.id === aiId ? { ...m, text: finalText } : m))
            : [
                ...prev,
                { id: aiId, sender: "ai" as const, text: finalText, timestamp: nowTime() },
              ];
          const withMeta = base.map((m) =>
            m.id === aiId
              ? {
                  ...m,
                  meta: {
                    engine: streamModel || "Vienna Agent",
                    latencyMs,
                    tokens: tk.tokens,
                    realTokens: tk.realTokens,
                    tools: streamTools,
                  },
                }
              : m,
          );
          persist(withMeta);
          return withMeta;
        });
      };

      // Mesin ungkap bertahap: targetRef menampung SELURUH teks yang
      // sudah diterima dari SSE; loop rAF menggeser shownRef menuju
      // target dengan laju adaptif (sisa besar = lebih cepat, dibatasi
      // ±24 karakter/frame) sehingga potongan besar dari backend tampil
      // mengalir. Begitu stream selesai DAN teks tertampil penuh,
      // finishWith menutup pesan (meta + simpan). prefers-reduced-
      // motion: ungkap seketika tanpa animasi.
      targetRef.current = "";
      shownRef.current = 0;
      streamDoneRef.current = false;
      let revealStarted = false;
      const startReveal = () => {
        if (revealStarted) return;
        revealStarted = true;
        const reduced =
          typeof window !== "undefined" &&
          window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const step = () => {
          const target = targetRef.current;
          const shown = shownRef.current;
          if (shown < target.length) {
            const remaining = target.length - shown;
            const inc = reduced
              ? remaining
              : Math.max(1, Math.min(Math.ceil(remaining / 18), 24));
            const next = Math.min(target.length, shown + inc);
            shownRef.current = next;
            const slice = target.slice(0, next);
            setMessages((prev) =>
              prev.map((m) => (m.id === aiId ? { ...m, text: slice } : m)),
            );
            rafRef.current = requestAnimationFrame(step);
          } else if (!streamDoneRef.current) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            finishWith(target || "(tidak ada jawaban)");
          }
        };
        rafRef.current = requestAnimationFrame(step);
      };

      try {
        // Riwayat TIDAK dikirim: serve menyimpannya per session_id.
        // Tanpa session_id tersimpan, backend membuat sesi baru dan
        // mengembalikannya lewat event meta pertama.
        const response = await fetch(apiUrl(CHAT_ENDPOINT), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            session_id: localStorage.getItem(SESSION_KEY) || undefined,
          }),
        });
        if (!response.ok) {
          let detail = "";
          try {
            const errData = await response.clone().json();
            detail = (errData as { detail?: string }).detail || "";
          } catch {
            /* bukan JSON */
          }
          if (response.status === 429) {
            throw new Error(detail || "Terlalu banyak permintaan — tunggu sebentar lalu coba lagi.");
          }
          throw new Error(detail || "Gagal menghubungi server.");
        }
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable");
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;
        let isFirstChunk = true;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (!value) continue;
          buffer += decoder.decode(value, { stream: !done });
          if (isFirstChunk) {
            isFirstChunk = false;
            const trimmed = buffer.trim();
            if (trimmed.startsWith("{") && !trimmed.includes("data:")) {
              try {
                const data = JSON.parse(trimmed);
                if (data.error) throw new Error(data.error);
                const responseText =
                  data.response || data.text || data.reply || data.message || "";
                if (responseText) {
                  streamUsage = normalizeUsage(data.usage);
                  if (typeof data.model === "string") streamModel = data.model;
                  setWaiting(false);
                  finishWith(responseText);
                  setBusy(false);
                  return;
                }
              } catch (e) {
                if (e instanceof Error && !e.message.startsWith("Unexpected token")) throw e;
              }
            }
            setWaiting(false);
            setStreamId(aiId);
            setMessages((prev) => [
              ...prev,
              { id: aiId, sender: "ai", text: "", timestamp: nowTime() },
            ]);
          }
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data: ")) continue;
            const jsonStr = t.substring(6).trim();
            if (!jsonStr) continue;
            if (jsonStr === "[DONE]") {
              done = true;
              break;
            }
            const parsed = JSON.parse(jsonStr);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.meta && typeof parsed.meta === "object") {
              // Event meta pertama membawa session_id sesi ini;
              // meta {tool} hanya penanda aktivitas — tidak ditampilkan.
              const sid = (parsed.meta as { session_id?: unknown }).session_id;
              if (typeof sid === "string" && sid) {
                try {
                  localStorage.setItem(SESSION_KEY, sid);
                } catch {
                  /* abaikan */
                }
              }
              continue;
            }
            if (parsed.done === true) {
              streamUsage = normalizeUsage(parsed.usage);
              if (typeof parsed.model === "string") streamModel = parsed.model;
              if (Array.isArray(parsed.tools_used)) {
                streamTools = parsed.tools_used as string[];
              }
              if (typeof parsed.session_id === "string" && parsed.session_id) {
                try {
                  localStorage.setItem(SESSION_KEY, parsed.session_id);
                } catch {
                  /* abaikan */
                }
              }
              continue;
            }
            if (parsed.text) {
              streamedText += parsed.text;
              targetRef.current = streamedText;
              startReveal();
            }
          }
        }
        // Stream selesai: loop ungkap memanggil finishWith begitu
        // teks tertampil mengejar target (atau langsung di sini bila
        // tidak ada potongan teks sama sekali).
        streamDoneRef.current = true;
        if (!revealStarted) finishWith(streamedText || "(tidak ada jawaban)");
      } catch (err) {
        cancelAnimationFrame(rafRef.current);
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
        setWaiting(false);
        finishWith(`⚠️ ${msg}`);
      } finally {
        setBusy(false);
        setWaiting(false);
      }
    },
    [busy, persist],
  );

  // Quick prompt dari halaman utama: kirim sekali saat tiba, SETELAH
  // riwayat termuat (hydrated). JANGAN pakai setTimeout + replaceState
  // di depan: replaceState mengubah searchParams, efek berjalan ulang,
  // cleanup membatalkan timer, dan penjaga ref menghalangi penjadwalan
  // ulang — prompt hilang diam-diam (bug terverifikasi 31 Okt).
  useEffect(() => {
    if (!hydrated || quickSentRef.current) return;
    const q = searchParams.get("q");
    if (!q) return;
    quickSentRef.current = true;
    window.history.replaceState(null, "", "/tools/assistant");
    void send(q);
  }, [hydrated, searchParams, send]);

  // Sesi baru = buang session_id lokal; backend membuat sesi baru
  // pada kiriman berikutnya. Tidak ada endpoint new-session lagi.
  const clearChat = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* abaikan */
    }
    const fresh = [welcomeMessage()];
    setMessages(fresh);
    persist(fresh);
  };

  return (
    <div className="chat-page">
      <div className="chat-head">
        <Link href="/#tools" className="chat-back">
          <ArrowLeft size={16} /> Semua tools
        </Link>
        <button type="button" className="chat-clear" onClick={clearChat} title="Mulai sesi baru">
          <Trash2 size={15} /> Sesi baru
        </button>
      </div>

      <div
        className="chat-log"
        ref={logRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={m.sender === "user" ? "msg msg-user" : "msg msg-ai"}>
            {m.sender === "ai" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="msg-avatar" src="/favicon.png" alt="" width={26} height={26} />
            )}
            <div className="msg-col">
              <div className="msg-bubble">
                {m.sender === "ai" && m.id !== streamId ? (
                  <MessageMarkdown text={m.text} />
                ) : (
                  <MessageText text={m.text} />
                )}
                {m.id === streamId && <span className="msg-caret" aria-hidden="true" />}
              </div>
              <div className="msg-meta">
                <span>{m.timestamp}</span>
                {m.meta && (
                  <span>
                    {" · "}
                    {m.meta.engine} · {(m.meta.latencyMs / 1000).toFixed(1)} dtk ·{" "}
                    {m.meta.realTokens ? "" : "±"}
                    {m.meta.tokens} token
                    {m.meta.tools && m.meta.tools.length > 0
                      ? ` · tool: ${m.meta.tools.join(", ")}`
                      : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {waiting && (
          <div className="msg msg-ai">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="msg-avatar" src="/favicon.png" alt="" width={26} height={26} />
            <div className="msg-col">
              <div className="msg-bubble msg-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="qp-chip" onClick={() => void send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Kotak tulis membesar mengikuti isi (maks 120px dari CSS).
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Tulis pesan untuk Vienna…"
          aria-label="Tulis pesan"
          rows={1}
          maxLength={4000}
        />
        <button type="submit" className="qp-send" disabled={busy || !input.trim()} aria-label="Kirim pesan">
          <SendHorizontal size={17} />
        </button>
      </form>
    </div>
  );
}
