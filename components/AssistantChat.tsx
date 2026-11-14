"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, SendHorizontal, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { apiUrl } from "@/lib/api";

/* =====================================================================
   Halaman chat Vienna AI Assistant — dipindah dari WebPortofolio lama
   (src/pages/Assistant.tsx) dengan kontrak backend yang sama persis:
   - engine: gemini / mercury / deepseek → /v1/<engine>/chat
   - kesiapan engine dari GET /v1/engines (404 = mercury & deepseek off)
   - sesi per engine di localStorage, diperbarui dari header
     X-Session-ID; riwayat chat per engine juga di localStorage
   - jawaban streaming SSE: baris "data: {json}" dengan {text},
     {done, usage, sources}, {error}, dan "[DONE]"; ada fallback
     respons JSON polos seperti versi lama.
   - potongan SSE Mercury besar-besar (model difusi): teks diterima
     diungkap bertahap seperti mengetik oleh loop rAF (startReveal);
     pesan AI yang selesai dirender markdown betulan (react-markdown).
   Quick prompt dari halaman utama tiba sebagai ?q= dan terkirim
   otomatis sekali saat halaman dibuka.
   ===================================================================== */

type EngineId = "gemini" | "mercury" | "deepseek";

const ENGINE_ORDER: EngineId[] = ["mercury", "gemini", "deepseek"];

// Engine yang AKTIF dipakai (keputusan user 2 Nov 2026): hanya Mercury.
// Gemini nonaktif sementara — kunci API Google-nya diblokir (403
// API_KEY_SERVICE_BLOCKED); DeepSeek nonaktif — modelnya tidak tersedia
// di pool LARP Router (400). Untuk mengaktifkan lagi, tambahkan id-nya
// ke daftar ini; status dari backend tetap dicek seperti biasa.
const ENABLED_ENGINES: EngineId[] = ["mercury"];

const ENGINE_ENDPOINT: Record<EngineId, string> = {
  gemini: "/v1/gemini/chat",
  mercury: "/v1/mercury/chat",
  deepseek: "/v1/deepseek/chat",
};

const ENGINE_LABEL: Record<EngineId, string> = {
  gemini: "Google Gemini-3.1",
  mercury: "Inception Mercury-3",
  deepseek: "DeepSeek V4.1",
};

const ENGINE_SHORT: Record<EngineId, string> = {
  gemini: "Gemini-3.1",
  mercury: "Mercury-3",
  deepseek: "DeepSeek-V4.1",
};

const SUGGESTIONS: Record<EngineId, string[]> = {
  gemini: [
    "Ceritakan tentang scripting Linux Anda.",
    "Bagaimana latar belakang Anda?",
    "Tampilkan proyek terbaru Anda.",
    "Bagaimana cara kita bekerja sama?",
  ],
  mercury: [
    "Apa itu diffusion language model?",
    "Buat contoh API Python singkat.",
    "Ceritakan stack AI Anda.",
    "Bagaimana cara kita bekerja sama?",
  ],
  deepseek: [
    "Bagaimana cara kerja model reasoning?",
    "Buat contoh endpoint FastAPI singkat.",
    "Bandingkan DeepSeek dengan Gemini.",
    "Bagaimana cara kita bekerja sama?",
  ],
};

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
  sources?: string[];
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

function welcomeMessage(engine: EngineId): Message {
  return {
    sender: "ai",
    text: `Halo! Saya Vienna, asisten AI Amamiya (ditenagai oleh ${ENGINE_LABEL[engine]}). Tanyakan tentang keahliannya, proyeknya, atau cara menghubunginya.`,
    timestamp: nowTime(),
  };
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
  const [engine, setEngine] = useState<EngineId>(() => {
    if (typeof window === "undefined") return "mercury";
    const saved = localStorage.getItem("assistant_selected_model") as EngineId | null;
    return saved && ENABLED_ENGINES.includes(saved) ? saved : "mercury";
  });
  const [engineStatus, setEngineStatus] = useState<Record<EngineId, boolean>>({
    gemini: ENABLED_ENGINES.includes("gemini"),
    mercury: ENABLED_ENGINES.includes("mercury"),
    deepseek: ENABLED_ENGINES.includes("deepseek"),
  });
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
  const [userId] = useState(() => {
    if (typeof window === "undefined") return "guest";
    let id = localStorage.getItem("assistant_user_id");
    if (!id) {
      id = `guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem("assistant_user_id", id);
    }
    return id;
  });

  // Muat riwayat per engine (atau pesan sambutan bila kosong).
  useEffect(() => {
    localStorage.setItem("assistant_selected_model", engine);
    try {
      const raw = localStorage.getItem(`assistant_chat_history_${engine}`);
      const parsed = raw ? (JSON.parse(raw) as Message[]) : null;
      setMessages(parsed && parsed.length > 0 ? parsed : [welcomeMessage(engine)]);
    } catch {
      setMessages([welcomeMessage(engine)]);
    }
    setHydrated(true);
  }, [engine]);

  // Kesiapan engine dari backend.
  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/v1/engines"))
      .then((res) => {
        if (res.status === 404) {
          return {
            engines: [
              { id: "mercury", available: false },
              { id: "deepseek", available: false },
            ],
          };
        }
        return res.ok ? res.json() : null;
      })
      .then((data: { engines?: Array<{ id?: string; available?: boolean }> } | null) => {
        if (cancelled || !data || !Array.isArray(data.engines)) return;
        setEngineStatus((prev) => {
          const next = { ...prev };
          for (const e of data.engines!) {
            if (e?.id && ENGINE_ORDER.includes(e.id as EngineId) && ENABLED_ENGINES.includes(e.id as EngineId)) {
              next[e.id as EngineId] = e.available !== false;
            }
          }
          return next;
        });
      })
      .catch(() => {
        /* backend tidak terjangkau — status dibiarkan default */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, waiting]);

  // Hentikan loop ungkap saat komponen dilepas.
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const persist = useCallback(
    (engineKey: EngineId, msgs: Message[]) => {
      try {
        localStorage.setItem(`assistant_chat_history_${engineKey}`, JSON.stringify(msgs));
      } catch {
        /* storage penuh/tidak tersedia — abaikan */
      }
    },
    [],
  );

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
      persist(engine, history);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      stickRef.current = true;
      setBusy(true);
      setWaiting(true);
      const startTime = performance.now();
      let streamedText = "";
      let streamUsage: BackendUsage | null = null;
      let streamSources: string[] = [];
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
                    engine: streamUsage?.model || ENGINE_SHORT[engine],
                    latencyMs,
                    tokens: tk.tokens,
                    realTokens: tk.realTokens,
                    sources: streamSources,
                  },
                }
              : m,
          );
          persist(engine, withMeta);
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
        const apiMessages = history
          .slice(1)
          .map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
        const response = await fetch(apiUrl(ENGINE_ENDPOINT[engine]), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            session_id: localStorage.getItem(`assistant_session_id_${engine}`),
            messages: apiMessages,
            lang: "id",
          }),
        });
        try {
          const sid = response.headers.get("X-Session-ID");
          if (sid) localStorage.setItem(`assistant_session_id_${engine}`, sid);
        } catch {
          /* abaikan */
        }
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
                  streamUsage = (data.usage ?? null) as BackendUsage | null;
                  streamSources = Array.isArray(data.sources) ? data.sources : [];
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
            if (parsed.done === true) {
              if (parsed.usage && typeof parsed.usage === "object") streamUsage = parsed.usage;
              if (Array.isArray(parsed.sources)) streamSources = parsed.sources;
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
    [busy, engine, persist, userId],
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

  const clearChat = async () => {
    try {
      const res = await fetch(apiUrl("/v1/assistant/new-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          engine,
          session_id: localStorage.getItem(`assistant_session_id_${engine}`),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session_id) {
          localStorage.setItem(`assistant_session_id_${engine}`, data.session_id);
        }
      }
    } catch {
      localStorage.removeItem(`assistant_session_id_${engine}`);
    }
    const fresh = [welcomeMessage(engine)];
    setMessages(fresh);
    persist(engine, fresh);
  };

  return (
    <div className="chat-page">
      <div className="chat-head">
        <Link href="/#tools" className="chat-back">
          <ArrowLeft size={16} /> Semua tools
        </Link>
        <div className="chat-engines" role="tablist" aria-label="Pilih engine AI">
          {ENGINE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={engine === id}
              className={engine === id ? "engine-pill is-active" : "engine-pill"}
              disabled={!engineStatus[id]}
              title={engineStatus[id] ? ENGINE_LABEL[id] : `${ENGINE_LABEL[id]} belum tersedia di server`}
              onClick={() => setEngine(id)}
            >
              {ENGINE_SHORT[id]}
            </button>
          ))}
        </div>
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
                    {m.meta.sources && m.meta.sources.length > 0
                      ? ` · sumber: ${m.meta.sources.join(", ")}`
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
          {SUGGESTIONS[engine].map((s) => (
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
          placeholder={`Tulis pesan untuk Vienna (${ENGINE_SHORT[engine]})…`}
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
