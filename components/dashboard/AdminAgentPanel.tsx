"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  SendHorizontal,
  SquarePen,
  MessageCircle,
  ShieldAlert,
  Check,
  Hourglass,
  LoaderCircle,
  X,
  Paperclip,
  Mic,
  FileText,
  AlertCircle,
} from "lucide-react";
import ChatMarkdown from "@/components/ChatMarkdown";
import FileCards, { formatSize, type ChatFile } from "@/components/FileCards";
import { apiUrl } from "@/lib/api";

/* =====================================================================
   Panel AI Agent — antarmuka agent ADMINISTRATOR di dashboard.
   Kontrak backend (routers/opencode_api.py, terverifikasi dari kode
   18 Nov 2026): chat memakai endpoint stream yang sama dengan
   Assistant publik, tetapi body membawa role: "admin" dan header
   X-Admin-Token (token dashboard yang sama) — backend memilih
   instance opencode-core admin dan menggerbangnya dengan verifikasi
   token dashboard; tanpa token valid balasannya 401. HITL penuh:
   form (question) + permission dijawab lewat endpoint sessions
   dengan query ?role=admin + header token yang sama.
   Mesin chat (SSE, render markdown per-delta lewat ChatMarkdown,
   segmen per kartu HITL, indikator menunggu + status tool) meniru
   AssistantChat yang sudah teruji — disalin dengan adaptasi role
   admin, TANPA batas peran publik.
   Daftar sesi dari GET /v1/opencode/sessions?role=admin; riwayat
   sesi lama dimuat dari GET .../sessions/{id}/messages?role=admin
   (hanya part teks yang dirender).
   Lampiran file (21 Nov, permintaan user — sisi admin banyak
   bekerja dengan file): file diunggah DULU lewat
   POST /v1/opencode/chat/upload?role=admin (multipart, field
   "files", header token sama) -> {files: [{id, name, size, mime}]};
   saat mengirim pesan, id lampiran yang siap ikut di body sebagai
   "attachments": [id, ...] dan backend menyediakan berkasnya ke
   agent dari ruang kerja admin. Batas: maks 5 berkas/pesan,
   10 MB/berkas (backend menegakkan; frontend memeriksa lebih
   awal). Kontrak lengkap = prompt serah-terima sesi Backend
   21 Nov. Masukan suara memakai Web Speech API di peramban
   (id-ID) — murni sisi klien, tanpa endpoint backend.
   ===================================================================== */

const CHAT_ENDPOINT = "/v1/opencode/chat/stream";
const UPLOAD_ENDPOINT = "/v1/opencode/chat/upload";
const SESSION_KEY = "admin_agent_session_id";
const HISTORY_KEY = "admin_agent_chat_history";
// Batas lampiran — cermin kontrak backend (backend yang
// menegakkan; di sini untuk umpan balik cepat sebelum unggah).
const MAX_ATTACH_FILES = 5;
const MAX_ATTACH_SIZE = 10 * 1024 * 1024;

type PendingFile = {
  localId: string;
  name: string;
  size: number;
  status: "uploading" | "ready" | "error";
  serverId?: string;
  error?: string;
};
type SentAttachment = { name: string; size: number };

const SUGGESTIONS: string[] = [
  "Cek status & kesehatan server saat ini.",
  "Ada error penting di log backend hari ini?",
  "Ringkasan proyek yang terdaftar di dashboard.",
];

const token = (): string => {
  try {
    return localStorage.getItem("dashboard_token") || "";
  } catch {
    return "";
  }
};
const authHeaders = (): Record<string, string> => ({
  "X-Admin-Token": token(),
});

type BackendUsage = {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  prompt_tokens_est?: number;
  response_tokens_est?: number;
  // Bentuk opencode (event done): usage.tokens.{input,output,
  // reasoning} + usage.cost — diisi normalizeUsage.
  input_tokens?: number;
  output_tokens?: number;
  reasoning_tokens?: number;
  cost_usd?: number;
};

type MessageMeta = {
  engine: string;
  latencyMs: number;
  tokens: number;
  realTokens?: boolean;
  tools?: string[];
  inTokens?: number;
  outTokens?: number;
  reasoning?: number;
  cost?: number;
};

type Message = {
  id?: string;
  sender: "ai" | "user";
  text: string;
  timestamp: string;
  meta?: MessageMeta;
  files?: ChatFile[];
  attachments?: SentAttachment[];
};

type HitlOption = { value: string; label: string; description?: string };
type HitlField = {
  key: string;
  title: string;
  description?: string;
  type?: string;
  required?: boolean;
  options?: HitlOption[];
  // custom: true = pengguna boleh mengetik jawaban sendiri di luar
  // opsi; type "multiselect" = jawaban berupa array string.
  custom?: boolean;
};
type HitlFormData = {
  id: string;
  sessionID?: string;
  title?: string;
  fields: HitlField[];
};
type HitlPermissionData = {
  id: string;
  sessionID?: string;
  action: string;
  resources?: string[];
};
type HitlCardStatus = "pending" | "sending" | "answered" | "cancelled";
type HitlCard = {
  kind: "form" | "permission";
  id: string;
  sessionId: string;
  form?: HitlFormData;
  permission?: HitlPermissionData;
  status: HitlCardStatus;
  decision?: string;
  error?: string;
  afterId?: string;
};

type OcSession = { id: string; title?: string; agent?: string };

const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));
const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function welcomeMessage(): Message {
  return {
    sender: "ai",
    text: "Halo, Admin. Saya agent administrator — saya bisa menjalankan perintah di server lewat tool opencode. Aksi berisiko akan meminta persetujuanmu dulu lewat kartu persetujuan. Silakan beri perintah.",
    timestamp: nowTime(),
  };
}

// Bentuk usage opencode pada event done: {cost, tokens{input,
// output, reasoning, cache}} (terukur 19 Nov 2026). Normalkan ke
// total_tokens + bawa rincian input/output/reasoning & cost untuk
// footer (cost admin selalu 0 → disembunyikan di footer).
function normalizeUsage(u: unknown): BackendUsage | null {
  if (!u || typeof u !== "object") return null;
  const rec = u as Record<string, unknown>;
  const cost = typeof rec.cost === "number" ? rec.cost : undefined;
  if (typeof rec.total_tokens === "number") {
    return { total_tokens: rec.total_tokens, cost_usd: cost };
  }
  const t = rec.tokens;
  if (typeof t === "number") return { total_tokens: t, cost_usd: cost };
  if (t && typeof t === "object") {
    const tt = t as Record<string, unknown>;
    const base: BackendUsage = {
      cost_usd: cost,
      input_tokens: typeof tt.input === "number" ? tt.input : undefined,
      output_tokens: typeof tt.output === "number" ? tt.output : undefined,
      reasoning_tokens:
        typeof tt.reasoning === "number" ? tt.reasoning : undefined,
    };
    if (typeof tt.total === "number" && tt.total > 0) {
      return { ...base, total_tokens: tt.total };
    }
    const sum = (base.input_tokens ?? 0) + (base.output_tokens ?? 0);
    if (sum > 0) return { ...base, total_tokens: sum };
  }
  return null;
}

// Saring entri files dari payload backend ke bentuk yang aman
// dirender (name/path string, size angka; content string|null).
function pickFiles(raw: unknown): ChatFile[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is ChatFile =>
      !!f &&
      typeof f === "object" &&
      typeof (f as ChatFile).name === "string" &&
      typeof (f as ChatFile).path === "string" &&
      typeof (f as ChatFile).size === "number",
  );
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

// Footer: cost 0 (atau terlalu kecil) disembunyikan — model admin
// selalu melaporkan cost 0 karena opencode tak punya harga Lyber.
const formatCost = (cost: number): string =>
  "$" + cost.toFixed(4).replace(/0+$/, "").replace(/\.$/, ".00");

// Label status tool (event {meta: {tool}}) selama agent bekerja.
const TOOL_LABELS: Record<string, string> = {
  write: "Menulis file…",
  read: "Membaca file…",
  edit: "Mengedit file…",
  bash: "Menjalankan perintah…",
  shell: "Menjalankan perintah…",
  question: "Menyiapkan pertanyaan…",
  webfetch: "Mengambil halaman web…",
  websearch: "Mencari di web…",
  grep: "Mencari dalam file…",
  glob: "Mencari file…",
  task: "Menjalankan sub-tugas…",
};
const toolLabel = (name: string): string =>
  TOOL_LABELS[name] ?? `Memakai tool ${name}…`;

// Render teks pesan PENGGUNA (bukan markdown). Pesan AI memakai
// ChatMarkdown.
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

export default function AdminAgentPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [streamId, setStreamId] = useState<string | null>(null);
  // Nama tool yang sedang dijalankan agent (event meta.tool).
  const [toolName, setToolName] = useState<string | null>(null);
  // Lampiran menunggu kirim + masukan suara (lihat kontrak di
  // header berkas). pendingRef = cermin untuk dibaca send().
  const [pending, setPending] = useState<PendingFile[]>([]);
  const pendingRef = useRef<PendingFile[]>([]);
  pendingRef.current = pending;
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [listening, setListening] = useState(false);
  const [voiceOk] = useState<boolean>(
    () =>
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window),
  );
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickRef = useRef(true);

  /* Status instance admin + daftar sesi (untuk strip di kepala panel) */
  const [instStatus, setInstStatus] = useState<"ok" | "unreachable" | null>(
    null,
  );
  const [instModel, setInstModel] = useState<string>("");
  const [sessions, setSessions] = useState<OcSession[]>([]);
  const [currentSession, setCurrentSession] = useState<string>("");

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/v1/opencode/sessions?role=admin"), {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: OcSession[] };
      setSessions(
        (data.sessions ?? []).filter((s) => typeof s?.id === "string"),
      );
    } catch {
      /* backend belum hidup — strip tetap tampil apa adanya */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? (JSON.parse(raw) as Message[]) : null;
      setMessages(parsed && parsed.length > 0 ? parsed : [welcomeMessage()]);
      setCurrentSession(localStorage.getItem(SESSION_KEY) || "");
    } catch {
      setMessages([welcomeMessage()]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/v1/opencode/status"));
        if (res.ok) {
          const data = (await res.json()) as {
            instances?: {
              admin?: { status?: string; default_model?: string };
            };
          };
          const adm = data.instances?.admin;
          setInstStatus(adm?.status === "ok" ? "ok" : "unreachable");
          setInstModel(adm?.default_model || "");
        } else {
          setInstStatus("unreachable");
        }
      } catch {
        setInstStatus("unreachable");
      }
      void loadSessions();
    })();
  }, [hydrated, loadSessions]);

  useEffect(() => {
    const el = logRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, waiting]);

  const persist = useCallback((msgs: Message[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
    } catch {
      /* abaikan */
    }
  }, []);

  /* ---- HITL ---- */
  const [hitlCards, setHitlCards] = useState<HitlCard[]>([]);
  // Jawaban per kartu per field: string, atau string[] untuk field
  // multiselect.
  const [hitlAnswers, setHitlAnswers] = useState<
    Record<string, Record<string, string | string[]>>
  >({});

  const patchCard = useCallback((id: string, patch: Partial<HitlCard>) => {
    setHitlCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  // Pemulihan kartu tertunda sesudah reload/ganti tab.
  useEffect(() => {
    if (!hydrated) return;
    let sid: string | null = null;
    try {
      sid = localStorage.getItem(SESSION_KEY);
    } catch {
      /* abaikan */
    }
    if (!sid) return;
    let cancelled = false;
    const getJson = (path: string) =>
      fetch(apiUrl(path), { headers: authHeaders() })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    void (async () => {
      const [fr, pr] = await Promise.all([
        getJson(`/v1/opencode/sessions/${sid}/forms?role=admin`),
        getJson(`/v1/opencode/sessions/${sid}/permissions?role=admin`),
      ]);
      if (cancelled) return;
      const cards: HitlCard[] = [];
      for (const f of (fr?.forms ?? []) as HitlFormData[]) {
        if (f?.id) {
          cards.push({
            kind: "form",
            id: f.id,
            sessionId: f.sessionID || sid!,
            form: f,
            status: "pending",
          });
        }
      }
      for (const p of (pr?.permissions ?? []) as HitlPermissionData[]) {
        if (p?.id) {
          cards.push({
            kind: "permission",
            id: p.id,
            sessionId: p.sessionID || sid!,
            permission: p,
            status: "pending",
          });
        }
      }
      if (cards.length > 0) {
        setHitlCards((prev) => [
          ...prev,
          ...cards.filter((c) => !prev.some((x) => x.id === c.id)),
        ]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  const replyForm = useCallback(
    async (
      card: HitlCard,
      answerOverride?: Record<string, string | string[]>,
    ) => {
      patchCard(card.id, { status: "sending", error: undefined });
      try {
        const res = await fetch(
          apiUrl(
            `/v1/opencode/sessions/${card.sessionId}/forms/${card.id}/reply?role=admin`,
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
              answer: answerOverride ?? hitlAnswers[card.id] ?? {},
            }),
          },
        );
        if (!res.ok) throw new Error(`server menjawab ${res.status}`);
        patchCard(card.id, { status: "answered" });
      } catch {
        patchCard(card.id, {
          status: "pending",
          error: "Gagal mengirim jawaban — coba lagi.",
        });
      }
    },
    [hitlAnswers, patchCard],
  );

  const cancelForm = useCallback(
    async (card: HitlCard) => {
      patchCard(card.id, { status: "sending", error: undefined });
      try {
        const res = await fetch(
          apiUrl(
            `/v1/opencode/sessions/${card.sessionId}/forms/${card.id}?role=admin`,
          ),
          { method: "DELETE", headers: authHeaders() },
        );
        if (!res.ok) throw new Error(`server menjawab ${res.status}`);
        setHitlCards((prev) => prev.filter((c) => c.id !== card.id));
      } catch {
        patchCard(card.id, {
          status: "pending",
          error: "Gagal membatalkan — coba lagi.",
        });
      }
    },
    [patchCard],
  );

  const replyPermission = useCallback(
    async (card: HitlCard, decision: "once" | "always" | "reject") => {
      patchCard(card.id, { status: "sending", error: undefined });
      try {
        const res = await fetch(
          apiUrl(
            `/v1/opencode/sessions/${card.sessionId}/permissions/${card.id}/reply?role=admin`,
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ decision }),
          },
        );
        if (!res.ok) throw new Error(`server menjawab ${res.status}`);
        patchCard(card.id, { status: "answered", decision });
      } catch {
        patchCard(card.id, {
          status: "pending",
          error: "Gagal mengirim keputusan — coba lagi.",
        });
      }
    },
    [patchCard],
  );

  // --- Lampiran: pilih/tempel/jatuhkan berkas -> unggah sekarang,
  // chip menunjukkan status; yang "ready" ikut terkirim. ---
  const addFiles = useCallback((list: FileList | File[]) => {
    const files = Array.from(list);
    if (files.length === 0) return;
    const room = MAX_ATTACH_FILES - pendingRef.current.length;
    const accepted: { pf: PendingFile; file: File }[] = [];
    const rejected: PendingFile[] = [];
    files.forEach((f, i) => {
      const localId = `att_${Date.now()}_${i}`;
      if (i >= room) {
        rejected.push({
          localId,
          name: f.name,
          size: f.size,
          status: "error",
          error: `Maksimal ${MAX_ATTACH_FILES} berkas per pesan.`,
        });
      } else if (f.size > MAX_ATTACH_SIZE) {
        rejected.push({
          localId,
          name: f.name,
          size: f.size,
          status: "error",
          error: "Melebihi batas 10 MB.",
        });
      } else {
        accepted.push({
          pf: { localId, name: f.name, size: f.size, status: "uploading" },
          file: f,
        });
      }
    });
    setPending((prev) => [
      ...prev,
      ...accepted.map((a) => a.pf),
      ...rejected,
    ]);
    if (accepted.length === 0) return;
    void (async () => {
      try {
        const fd = new FormData();
        accepted.forEach((a) => fd.append("files", a.file));
        const res = await fetch(apiUrl(`${UPLOAD_ENDPOINT}?role=admin`), {
          method: "POST",
          headers: authHeaders(),
          body: fd,
        });
        if (!res.ok) {
          let detail = "";
          try {
            detail =
              ((await res.json()) as { detail?: string }).detail || "";
          } catch {
            /* bukan JSON */
          }
          throw new Error(detail || `server menjawab ${res.status}`);
        }
        const data = (await res.json()) as {
          files?: { id?: string }[];
        };
        const got = data.files ?? [];
        setPending((prev) =>
          prev.map((p) => {
            const idx = accepted.findIndex((a) => a.pf.localId === p.localId);
            if (idx === -1) return p;
            const g = got[idx];
            return g?.id
              ? { ...p, status: "ready" as const, serverId: g.id }
              : {
                  ...p,
                  status: "error" as const,
                  error: "Respons unggahan tidak lengkap.",
                };
          }),
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unggahan gagal.";
        setPending((prev) =>
          prev.map((p) =>
            accepted.some((a) => a.pf.localId === p.localId)
              ? { ...p, status: "error" as const, error: msg }
              : p,
          ),
        );
      }
    })();
  }, []);

  const removePending = useCallback((localId: string) => {
    setPending((prev) => prev.filter((p) => p.localId !== localId));
  }, []);

  // --- Masukan suara: Web Speech API (id-ID), hasil menyatu ke
  // kotak teks dan bisa disunting sebelum dikirim. ---
  const recogRef = useRef<{ stop: () => void } | null>(null);
  const voiceBaseRef = useRef("");
  const toggleVoice = useCallback(() => {
    if (listening) {
      recogRef.current?.stop();
      return;
    }
    type SpeechCtor = new () => {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult:
        | ((e: {
            results: ArrayLike<ArrayLike<{ transcript: string }>>;
          }) => void)
        | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.interimResults = true;
    rec.continuous = true;
    voiceBaseRef.current = input.trim() ? `${input.trim()} ` : "";
    rec.onresult = (e) => {
      let s = "";
      for (let i = 0; i < e.results.length; i++)
        s += e.results[i][0].transcript;
      setInput(voiceBaseRef.current + s);
      const el = inputRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recogRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [listening, input, inputRef]);

  useEffect(
    () => () => {
      try {
        recogRef.current?.stop();
      } catch {
        /* abaikan */
      }
    },
    [],
  );

  const send = useCallback(
    async (rawText: string) => {
      const readyAtt = pendingRef.current.filter(
        (p) => p.status === "ready" && p.serverId,
      );
      const uploadingNow = pendingRef.current.some(
        (p) => p.status === "uploading",
      );
      const raw = rawText.trim();
      if (!raw && readyAtt.length === 0) return;
      if (busy || uploadingNow) return;
      const text = raw || "Tolong periksa file yang kulampirkan.";
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        sender: "user",
        text,
        timestamp: nowTime(),
        ...(readyAtt.length > 0
          ? {
              attachments: readyAtt.map((p) => ({
                name: p.name,
                size: p.size,
              })),
            }
          : {}),
      };
      const history = [...messagesRef.current, userMsg];
      setMessages(history);
      persist(history);
      setPending([]);
      setInput("");
      if (inputRef.current) inputRef.current.style.height = "auto";
      stickRef.current = true;
      setBusy(true);
      setWaiting(true);
      setToolName(null);
      const startTime = performance.now();
      let allText = "";
      let streamUsage: BackendUsage | null = null;
      let streamModel: string | null = null;
      let streamTools: string[] = [];
      let streamFiles: ChatFile[] = [];
      const aiId = `stream_${Date.now()}`;

      let segText = "";
      let segId = aiId;
      let segCreated = false;
      let anySegCreated = false;
      let lastSegId = aiId;
      let segCount = 0;

      let waitingNow = true;
      const setWaitingBoth = (v: boolean) => {
        if (waitingNow !== v) {
          waitingNow = v;
          setWaiting(v);
        }
      };

      const ensureBubble = () => {
        if (segCreated) return;
        segCreated = true;
        anySegCreated = true;
        lastSegId = segId;
        setStreamId(segId);
        const id = segId;
        setMessages((prev) => [
          ...prev,
          { id, sender: "ai" as const, text: "", timestamp: nowTime() },
        ]);
      };

      const rotateSegment = (): string => {
        const anchorId = segCreated
          ? segId
          : anySegCreated
            ? lastSegId
            : userMsg.id!;
        // Teks segmen lama sudah tercermin penuh lewat render
        // per-delta; status tool dibersihkan (kartu menggantikannya).
        setToolName(null);
        segText = "";
        segCount += 1;
        segId = `${aiId}_s${segCount}`;
        segCreated = false;
        setStreamId(segId);
        return anchorId;
      };

      const finishWith = (finalText: string) => {
        setStreamId(null);
        setWaitingBoth(false);
        setToolName(null);
        setHitlCards((prev) =>
          prev.map((c) =>
            c.status === "pending" ? { ...c, status: "cancelled" as const } : c,
          ),
        );
        const latencyMs = Math.round(performance.now() - startTime);
        const tk = resolveTokens(streamUsage, text + allText);
        const targetId = segCreated ? segId : lastSegId;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === targetId);
          const base = exists
            ? prev.map((m) =>
                m.id === targetId && segCreated
                  ? { ...m, text: finalText }
                  : m,
              )
            : [
                ...prev,
                {
                  id: targetId,
                  sender: "ai" as const,
                  text: finalText,
                  timestamp: nowTime(),
                },
              ];
          const withMeta = base.map((m) =>
            m.id === targetId
              ? {
                  ...m,
                  meta: {
                    engine: streamModel || "Vienna Agent (admin)",
                    latencyMs,
                    tokens: tk.tokens,
                    realTokens: tk.realTokens,
                    tools: streamTools,
                    inTokens: streamUsage?.input_tokens,
                    outTokens: streamUsage?.output_tokens,
                    reasoning: streamUsage?.reasoning_tokens,
                    cost: streamUsage?.cost_usd,
                  },
                  ...(streamFiles.length > 0
                    ? { files: streamFiles }
                    : {}),
                }
              : m,
          );
          persist(withMeta);
          return withMeta;
        });
        void loadSessions();
      };

      // Render per-delta: setiap potongan teks SSE langsung ditulis
      // ke gelembung segmen aktif dan dirender ChatMarkdown dari
      // string gabungannya.

      try {
        const response = await fetch(apiUrl(CHAT_ENDPOINT), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            prompt: text,
            session_id: (() => {
              try {
                return localStorage.getItem(SESSION_KEY) || undefined;
              } catch {
                return undefined;
              }
            })(),
            hitl: true,
            role: "admin",
            ...(readyAtt.length > 0
              ? { attachments: readyAtt.map((p) => p.serverId as string) }
              : {}),
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
          if (response.status === 401) {
            throw new Error(
              detail ||
                "Token dashboard tidak valid — coba muat ulang halaman atau login lagi.",
            );
          }
          if (response.status === 429) {
            throw new Error(
              detail || "Terlalu banyak permintaan — tunggu sebentar lalu coba lagi.",
            );
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
                  if (Array.isArray(data.files)) {
                    streamFiles = pickFiles(data.files);
                  }
                  setWaiting(false);
                  finishWith(responseText);
                  setBusy(false);
                  return;
                }
              } catch (e) {
                if (
                  e instanceof Error &&
                  !e.message.startsWith("Unexpected token")
                )
                  throw e;
              }
            }
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
              const meta = parsed.meta as Record<string, unknown>;
              const sid = meta.session_id;
              if (typeof sid === "string" && sid) {
                try {
                  localStorage.setItem(SESSION_KEY, sid);
                } catch {
                  /* abaikan */
                }
                setCurrentSession(sid);
              }
              if (typeof meta.tool === "string" && meta.tool) {
                setToolName(meta.tool);
              }
              const form = meta.hitl_form as HitlFormData | undefined;
              if (form && typeof form.id === "string") {
                const card: HitlCard = {
                  kind: "form",
                  id: form.id,
                  sessionId:
                    form.sessionID ||
                    (typeof sid === "string" ? sid : null) ||
                    (() => {
                      try {
                        return localStorage.getItem(SESSION_KEY);
                      } catch {
                        return null;
                      }
                    })() ||
                    "",
                  form,
                  status: "pending",
                  afterId: rotateSegment(),
                };
                setHitlCards((prev) => [
                  ...prev.filter((c) => c.id !== card.id),
                  card,
                ]);
              }
              if (typeof meta.hitl_form_cancelled === "string") {
                const cid = meta.hitl_form_cancelled;
                setHitlCards((prev) => prev.filter((c) => c.id !== cid));
              }
              const perm = meta.hitl_permission as
                | HitlPermissionData
                | undefined;
              if (perm && typeof perm.id === "string") {
                const card: HitlCard = {
                  kind: "permission",
                  id: perm.id,
                  sessionId:
                    perm.sessionID ||
                    (typeof sid === "string" ? sid : null) ||
                    (() => {
                      try {
                        return localStorage.getItem(SESSION_KEY);
                      } catch {
                        return null;
                      }
                    })() ||
                    "",
                  permission: perm,
                  status: "pending",
                  afterId: rotateSegment(),
                };
                setHitlCards((prev) => [
                  ...prev.filter((c) => c.id !== card.id),
                  card,
                ]);
              }
              continue;
            }
            if (parsed.done === true) {
              streamUsage = normalizeUsage(parsed.usage);
              if (typeof parsed.model === "string") streamModel = parsed.model;
              if (Array.isArray(parsed.tools_used)) {
                streamTools = parsed.tools_used as string[];
              }
              if (Array.isArray(parsed.files)) {
                streamFiles = pickFiles(parsed.files);
              }
              if (typeof parsed.session_id === "string" && parsed.session_id) {
                try {
                  localStorage.setItem(SESSION_KEY, parsed.session_id);
                } catch {
                  /* abaikan */
                }
                setCurrentSession(parsed.session_id);
              }
              continue;
            }
            if (parsed.text) {
              ensureBubble();
              setWaitingBoth(false);
              setToolName(null);
              allText += parsed.text;
              segText += parsed.text;
              const id = segId;
              const txt = segText;
              setMessages((prev) =>
                prev.map((m) => (m.id === id ? { ...m, text: txt } : m)),
              );
            }
          }
        }
        finishWith(segText || "(tidak ada jawaban)");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
        setWaiting(false);
        ensureBubble();
        finishWith(`⚠️ ${msg}`);
      } finally {
        setBusy(false);
        setWaiting(false);
      }
    },
    [busy, persist, loadSessions],
  );

  // Sesi baru = buang session_id lokal; backend membuat sesi admin
  // baru pada kiriman berikutnya.
  const clearChat = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* abaikan */
    }
    setCurrentSession("");
    setHitlCards([]);
    setHitlAnswers({});
    const fresh = [welcomeMessage()];
    setMessages(fresh);
    persist(fresh);
  };

  // Beralih ke sesi lama: muat riwayatnya dari backend (part teks).
  const switchSession = async (sid: string) => {
    if (busy || !sid) return;
    try {
      localStorage.setItem(SESSION_KEY, sid);
    } catch {
      /* abaikan */
    }
    setCurrentSession(sid);
    setHitlCards([]);
    setHitlAnswers({});
    try {
      const res = await fetch(
        apiUrl(`/v1/opencode/sessions/${sid}/messages?role=admin`),
        { headers: authHeaders() },
      );
      if (!res.ok) throw new Error("gagal memuat");
      const data = (await res.json()) as {
        messages?: {
          info?: { role?: string };
          parts?: { type?: string; text?: string }[];
        }[];
      };
      const msgs: Message[] = [];
      for (const m of data.messages ?? []) {
        const text = (m.parts ?? [])
          .filter((p) => p.type === "text" && typeof p.text === "string")
          .map((p) => p.text as string)
          .join("\n")
          .trim();
        if (!text) continue;
        msgs.push({
          id: `hist_${msgs.length}`,
          sender: m.info?.role === "user" ? "user" : "ai",
          text,
          timestamp: "",
        });
      }
      const shown = msgs.length > 0 ? msgs : [welcomeMessage()];
      setMessages(shown);
      persist(shown);
      stickRef.current = true;
    } catch {
      setMessages([
        {
          sender: "ai",
          text: "⚠️ Gagal memuat riwayat sesi ini dari backend.",
          timestamp: nowTime(),
        },
      ]);
    }
  };

  const formComplete = (
    form: HitlFormData,
    ans: Record<string, string | string[]>,
  ): boolean =>
    form.fields.every((f) => {
      if (f.required === false) return true;
      const v = ans[f.key];
      return Array.isArray(v) ? v.length > 0 : (v ?? "").trim().length > 0;
    });

  const renderHitlCard = (card: HitlCard) => (
    <div key={card.id} className="msg msg-ai">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="msg-avatar" src="/vienna.svg" alt="" width={26} height={26} />
      <div className="msg-col">
        {card.status === "cancelled" ? (
          <div className="hitl-card is-cancelled">
            {card.kind === "form"
              ? "Pertanyaan ini sudah tidak berlaku."
              : "Permintaan persetujuan ini sudah tidak berlaku."}
          </div>
        ) : card.kind === "form" && card.form ? (
          <div
            className={
              card.status === "answered" ? "hitl-card is-answered" : "hitl-card"
            }
          >
            <div className="hitl-head">
              <MessageCircle size={15} />
              <span>{card.form.title || "Pertanyaan dari agent"}</span>
            </div>
            {card.form.fields.map((f) => {
              const locked = card.status !== "pending";
              const raw = hitlAnswers[card.id]?.[f.key];
              const isMulti = f.type === "multiselect";
              const value = typeof raw === "string" ? raw : "";
              const selectedArr = Array.isArray(raw) ? raw : [];
              const setField = (v: string | string[]) => {
                const next = { ...(hitlAnswers[card.id] ?? {}), [f.key]: v };
                setHitlAnswers((prev) => ({ ...prev, [card.id]: next }));
                return next;
              };
              // Pembaruan array multiselect secara fungsional dari
              // state terbaru — klik beruntun tidak saling menimpa.
              const updateMulti = (fn: (arr: string[]) => string[]) => {
                setHitlAnswers((prev) => {
                  const cur = prev[card.id]?.[f.key];
                  const arr = Array.isArray(cur) ? cur : [];
                  return {
                    ...prev,
                    [card.id]: {
                      ...(prev[card.id] ?? {}),
                      [f.key]: fn(arr),
                    },
                  };
                });
              };
              // Jawaban teks bebas (field custom): nilai yang bukan
              // salah satu opsi = tulisan pengguna sendiri.
              const customValue =
                !isMulti &&
                f.options &&
                !f.options.some((o) => o.value === value)
                  ? value
                  : "";
              return (
                <div key={f.key} className="hitl-field">
                  <div className="hitl-field-title">{f.title}</div>
                  {f.description && (
                    <div className="hitl-field-desc">{f.description}</div>
                  )}
                  {f.options && f.options.length > 0 ? (
                    <>
                      <div className="hitl-options">
                        {f.options.map((o) => {
                          const selected = isMulti
                            ? selectedArr.includes(o.value)
                            : value === o.value;
                          return (
                            <button
                              key={o.value}
                              type="button"
                              disabled={locked}
                              className={
                                selected
                                  ? "hitl-option is-selected"
                                  : "hitl-option"
                              }
                              onClick={() => {
                                if (isMulti) {
                                  // Multiselect: alih pilihan saja;
                                  // pengiriman lewat tombol Kirim
                                  // jawaban (jawaban = array string).
                                  updateMulti((arr) =>
                                    arr.includes(o.value)
                                      ? arr.filter((x) => x !== o.value)
                                      : [...arr, o.value],
                                  );
                                  return;
                                }
                                const next = setField(o.value);
                                if (
                                  card.form &&
                                  formComplete(card.form, next)
                                ) {
                                  void replyForm(card, next);
                                }
                              }}
                            >
                              <span className="hitl-option-label">
                                {o.label}
                              </span>
                              {o.description && (
                                <span className="hitl-option-desc">
                                  {o.description}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {isMulti &&
                        selectedArr.some(
                          (v) => !f.options?.some((o) => o.value === v),
                        ) && (
                          <div className="hitl-custom-list">
                            {selectedArr
                              .filter(
                                (v) =>
                                  !f.options?.some((o) => o.value === v),
                              )
                              .map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  className="hitl-custom-chip"
                                  disabled={locked}
                                  onClick={() =>
                                    updateMulti((arr) =>
                                      arr.filter((x) => x !== v),
                                    )
                                  }
                                >
                                  {v} <X size={12} />
                                </button>
                              ))}
                          </div>
                        )}
                      {f.custom &&
                        (isMulti ? (
                          <input
                            className="hitl-input hitl-custom-input"
                            disabled={locked}
                            placeholder="atau tulis jawabanmu sendiri, Enter untuk menambahkan…"
                            defaultValue=""
                            onKeyDown={(e) => {
                              if (e.key !== "Enter") return;
                              const draft = e.currentTarget.value.trim();
                              if (!draft) return;
                              updateMulti((arr) =>
                                arr.includes(draft) ? arr : [...arr, draft],
                              );
                              e.currentTarget.value = "";
                            }}
                          />
                        ) : (
                          <input
                            className="hitl-input hitl-custom-input"
                            disabled={locked}
                            placeholder="atau tulis jawabanmu sendiri…"
                            value={customValue}
                            onChange={(e) => setField(e.target.value)}
                            onKeyDown={(e) => {
                              if (
                                e.key === "Enter" &&
                                card.form &&
                                formComplete(
                                  card.form,
                                  hitlAnswers[card.id] ?? {},
                                )
                              ) {
                                void replyForm(card);
                              }
                            }}
                          />
                        ))}
                    </>
                  ) : f.type === "textarea" ? (
                    <textarea
                      className="hitl-input"
                      rows={3}
                      disabled={locked}
                      value={value}
                      onChange={(e) => setField(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          (e.ctrlKey || e.metaKey) &&
                          e.key === "Enter" &&
                          card.form &&
                          formComplete(card.form, hitlAnswers[card.id] ?? {})
                        ) {
                          void replyForm(card);
                        }
                      }}
                    />
                  ) : (
                    <input
                      className="hitl-input"
                      disabled={locked}
                      value={value}
                      onChange={(e) => setField(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          card.form &&
                          formComplete(card.form, hitlAnswers[card.id] ?? {})
                        ) {
                          void replyForm(card);
                        }
                      }}
                    />
                  )}
                </div>
              );
            })}
            {card.status === "answered" ? (
              <div className="hitl-done">
                <Check size={14} /> Sudah dijawab — agent melanjutkan
                pekerjaannya.
              </div>
            ) : (
              <>
                {card.form.fields.some(
                  (f) => !f.options?.length || f.custom,
                ) && (
                  <div className="hitl-hint">
                    Tekan Enter untuk mengirim jawaban.
                  </div>
                )}
                <div className="hitl-actions">
                  {card.form.fields.some(
                    (f) => f.type === "multiselect",
                  ) && (
                    <button
                      type="button"
                      className="hitl-btn hitl-btn-primary"
                      disabled={
                        card.status !== "pending" ||
                        !formComplete(card.form, hitlAnswers[card.id] ?? {})
                      }
                      onClick={() => void replyForm(card)}
                    >
                      Kirim jawaban
                    </button>
                  )}
                  <button
                    type="button"
                    className="hitl-btn"
                    disabled={card.status === "sending"}
                    onClick={() => void cancelForm(card)}
                  >
                    Batalkan
                  </button>
                </div>
              </>
            )}
            {card.error && <div className="hitl-error">{card.error}</div>}
          </div>
        ) : card.kind === "permission" && card.permission ? (
          <div
            className={
              card.status === "answered" ? "hitl-card is-answered" : "hitl-card"
            }
          >
            <div className="hitl-head">
              <ShieldAlert size={15} />
              <span>Persetujuan aksi</span>
            </div>
            <div className="hitl-action">{card.permission.action}</div>
            {card.permission.resources &&
              card.permission.resources.length > 0 && (
                <ul className="hitl-resources">
                  {card.permission.resources.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            {card.status === "answered" ? (
              <div className="hitl-done">
                <Check size={14} /> Keputusan terkirim:{" "}
                {card.decision === "once"
                  ? "diizinkan sekali"
                  : card.decision === "always"
                    ? "selalu diizinkan"
                    : "ditolak"}
                .
              </div>
            ) : (
              <div className="hitl-actions">
                <button
                  type="button"
                  className="hitl-btn hitl-btn-primary"
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "once")}
                >
                  Izinkan sekali
                </button>
                <button
                  type="button"
                  className="hitl-btn"
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "always")}
                >
                  Selalu izinkan
                </button>
                <button
                  type="button"
                  className="hitl-btn hitl-btn-danger"
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "reject")}
                >
                  Tolak
                </button>
              </div>
            )}
            {card.error && <div className="hitl-error">{card.error}</div>}
          </div>
        ) : null}
      </div>
    </div>
  );

  const sessionTitle =
    sessions.find((s) => s.id === currentSession)?.title ||
    (currentSession ? "Sesi berjalan" : "Sesi baru");

  return (
    <div
      className="aag-wrap"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDragOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
      }}
    >
      {dragOver && (
        <div className="aag-drop">Lepaskan file untuk melampirkan</div>
      )}
      {/* Kepala chat gaya aplikasi chat umum (permintaan user
          18 Nov): judul sesi + status instance di kiri; pemilih
          sesi & tombol sesi baru di kanan. */}
      <div className="aag-header">
        <div className="aag-title-wrap">
          <div className="aag-title">{sessionTitle}</div>
          <div className="aag-subtitle">
            <span
              className={
                instStatus === "ok"
                  ? "aag-dot aag-dot-ok"
                  : instStatus === "unreachable"
                    ? "aag-dot aag-dot-bad"
                    : "aag-dot"
              }
              aria-hidden="true"
            />
            {instStatus === null
              ? "Memeriksa instance administrator…"
              : instStatus === "ok"
                ? `Administrator aktif${instModel ? ` · ${instModel}` : ""}`
                : "Instance administrator tidak terjangkau — pastikan backend & opencode-core admin berjalan."}
          </div>
        </div>
        <div className="aag-header-actions">
          <select
            className="aag-session-select"
            value={currentSession}
            disabled={busy}
            onChange={(e) => {
              const v = e.target.value;
              if (v) void switchSession(v);
            }}
            aria-label="Pilih sesi lama"
          >
            <option value="">Sesi saat ini</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title || s.id}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="aag-new-btn"
            onClick={clearChat}
            title="Mulai sesi baru"
          >
            <SquarePen size={15} /> Sesi baru
          </button>
        </div>
      </div>

      <div
        className="chat-log aag-log"
        ref={logRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        {messages.map((m, i) => (
          <Fragment key={m.id ?? i}>
            <div className={m.sender === "user" ? "msg msg-user" : "msg msg-ai"}>
              {m.sender === "ai" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="msg-avatar" src="/vienna.svg" alt="" width={26} height={26} />
              )}
              <div className="msg-col">
                <div className="msg-bubble">
                  {m.sender === "ai" ? (
                    <ChatMarkdown
                      text={m.text}
                      streaming={m.id === streamId}
                    />
                  ) : (
                    <MessageText text={m.text} />
                  )}
                  {m.id === streamId && (
                    <span className="msg-caret" aria-hidden="true" />
                  )}
                </div>
                <FileCards files={m.files} />
                {m.attachments && m.attachments.length > 0 && (
                  <div className="aag-sent-files">
                    {m.attachments.map((a, j) => (
                      <span key={j} className="aag-sent-file">
                        <Paperclip size={12} /> {a.name} ·{" "}
                        {formatSize(a.size)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="msg-meta">
                  <span>{m.timestamp}</span>
                  {m.meta && (
                    <span>
                      {" · "}
                      {m.meta.engine} · {(m.meta.latencyMs / 1000).toFixed(1)}{" "}
                      dtk ·{" "}
                      {m.meta.inTokens != null && m.meta.outTokens != null ? (
                        <>
                          {m.meta.inTokens} masuk · {m.meta.outTokens} keluar
                        </>
                      ) : (
                        <>
                          {m.meta.realTokens ? "" : "±"}
                          {m.meta.tokens} token
                        </>
                      )}
                      {m.meta.reasoning
                        ? ` · penalaran ${m.meta.reasoning}`
                        : ""}
                      {m.meta.cost && m.meta.cost >= 0.0001
                        ? ` · ${formatCost(m.meta.cost)}`
                        : ""}
                      {m.meta.tools && m.meta.tools.length > 0
                        ? ` · tool: ${m.meta.tools.join(", ")}`
                        : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {hitlCards
              .filter((c) => c.afterId === m.id)
              .map((card) => renderHitlCard(card))}
          </Fragment>
        ))}
        {waiting && !toolName && (
          <div className="msg msg-ai">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="msg-avatar" src="/vienna.svg" alt="" width={26} height={26} />
            <div className="msg-col">
              <div className="msg-bubble msg-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        {/* Status tool yang sedang berjalan (event meta.tool). */}
        {toolName && busy && (
          <div className="tool-status" role="status">
            <LoaderCircle size={13} className="tool-status-spin" />
            <span>{toolLabel(toolName)}</span>
          </div>
        )}

        {hitlCards
          .filter(
            (c) => !c.afterId || !messages.some((m) => m.id === c.afterId),
          )
          .map((card) => renderHitlCard(card))}

        {busy && hitlCards.some((c) => c.status === "pending") && (
          <div className="hitl-waiting">
            <Hourglass size={14} /> Agent menunggu jawabanmu…
          </div>
        )}
      </div>

      <div className="aag-composer">
      {messages.length <= 1 && (
        <div className="chat-suggest">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="qp-chip"
              onClick={() => void send(s)}
              disabled={busy}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="aag-chips">
          {pending.map((p) => (
            <span
              key={p.localId}
              className={`aag-chip${p.status === "error" ? " is-error" : ""}`}
              title={p.error || p.name}
            >
              {p.status === "uploading" ? (
                <LoaderCircle size={13} className="aag-spin" />
              ) : p.status === "error" ? (
                <AlertCircle size={13} />
              ) : (
                <FileText size={13} />
              )}
              <span className="aag-chip-name">{p.name}</span>
              <span className="aag-chip-size">{formatSize(p.size)}</span>
              <button
                type="button"
                className="aag-chip-x"
                onClick={() => removePending(p.localId)}
                aria-label={`Hapus lampiran ${p.name}`}
              >
                <X size={12} />
              </button>
            </span>
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="aag-tool-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Lampirkan file"
          title="Lampirkan file (maks 5 berkas, 10 MB per berkas) — atau jatuhkan/tempel berkas ke panel"
        >
          <Paperclip size={17} />
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
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
          onPaste={(e) => {
            const fs = e.clipboardData?.files;
            if (fs && fs.length > 0) {
              e.preventDefault();
              addFiles(fs);
            }
          }}
          placeholder="Beri perintah untuk agent administrator…"
          aria-label="Tulis perintah"
          rows={1}
          maxLength={8000}
        />
        {voiceOk && (
          <button
            type="button"
            className={`aag-tool-btn${listening ? " is-listening" : ""}`}
            onClick={toggleVoice}
            aria-label={listening ? "Berhenti mendengarkan" : "Masukan suara"}
            title={
              listening
                ? "Berhenti mendengarkan"
                : "Masukan suara (Bahasa Indonesia)"
            }
          >
            <Mic size={17} />
          </button>
        )}
        <button
          type="submit"
          className="qp-send"
          disabled={
            busy ||
            pending.some((p) => p.status === "uploading") ||
            (!input.trim() &&
              !pending.some((p) => p.status === "ready"))
          }
          aria-label="Kirim perintah"
        >
          <SendHorizontal size={17} />
        </button>
      </form>
      </div>
    </div>
  );
}
