"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, SendHorizontal, Trash2 } from "lucide-react";
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
    "Tell me about Amamiya's Linux scripting.",
    "What is Amamiya's background?",
    "Show me Amamiya's latest projects.",
    "How can we work together?",
  ],
  mercury: [
    "What is a diffusion language model?",
    "Write a short Python API example.",
    "Tell me about Amamiya's AI stack.",
    "How can we work together?",
  ],
  deepseek: [
    "How do reasoning models work?",
    "Write a short FastAPI endpoint example.",
    "Compare DeepSeek with Gemini.",
    "How can we work together?",
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
    text: `Hi! I'm Vienna, Amamiya's AI assistant (powered by ${ENGINE_LABEL[engine]}). Ask me about his skills, his projects, or how to reach him.`,
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
  const logRef = useRef<HTMLDivElement>(null);
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
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, waiting]);

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
      setBusy(true);
      setWaiting(true);
      const startTime = performance.now();
      let streamedText = "";
      let streamUsage: BackendUsage | null = null;
      let streamSources: string[] = [];
      const aiId = `stream_${Date.now()}`;

      const finishWith = (finalText: string) => {
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
            lang: "en",
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
            throw new Error(detail || "Too many requests — wait a moment, then try again.");
          }
          throw new Error(detail || "Failed to reach the server.");
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
              setMessages((prev) =>
                prev.map((m) => (m.id === aiId ? { ...m, text: streamedText } : m)),
              );
            }
          }
        }
        finishWith(streamedText || "(no answer)");
      } catch (err) {
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
          <ArrowLeft size={16} /> All tools
        </Link>
        <div className="chat-engines" role="tablist" aria-label="Choose AI engine">
          {ENGINE_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={engine === id}
              className={engine === id ? "engine-pill is-active" : "engine-pill"}
              disabled={!engineStatus[id]}
              title={engineStatus[id] ? ENGINE_LABEL[id] : `${ENGINE_LABEL[id]} is not available on this server yet`}
              onClick={() => setEngine(id)}
            >
              {ENGINE_SHORT[id]}
            </button>
          ))}
        </div>
        <button type="button" className="chat-clear" onClick={clearChat} title="Start a new session">
          <Trash2 size={15} /> New session
        </button>
      </div>

      <div className="chat-log" ref={logRef}>
        {messages.map((m, i) => (
          <div key={m.id ?? i} className={m.sender === "user" ? "msg msg-user" : "msg msg-ai"}>
            <div className="msg-bubble">
              <MessageText text={m.text} />
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
        ))}
        {waiting && (
          <div className="msg msg-ai">
            <div className="msg-bubble msg-typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      <div className="chat-suggest">
        {SUGGESTIONS[engine].map((s) => (
          <button key={s} type="button" className="qp-chip" onClick={() => void send(s)} disabled={busy}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder={`Write a message for Vienna (${ENGINE_SHORT[engine]})…`}
          aria-label="Type a message"
          rows={1}
          maxLength={4000}
        />
        <button type="submit" className="qp-send" disabled={busy || !input.trim()} aria-label="Send message">
          <SendHorizontal size={17} />
        </button>
      </form>
    </div>
  );
}
