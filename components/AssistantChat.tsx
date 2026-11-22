"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  SendHorizontal,
  Trash2,
  MessageCircle,
  ShieldAlert,
  Check,
  Hourglass,
  LoaderCircle,
  X,
} from "lucide-react";
import ChatMarkdown from "@/components/ChatMarkdown";
import FileCards, { type ChatFile } from "@/components/FileCards";
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
     {done, session_id, tools_used, model, usage, files}; gagal =
     {error}. files = lampiran file hasil kerja agent pada giliran
     itu (backend 2471994) — dirender sebagai kartu FileCards di
     bawah gelembung pesan yang ditutup event done tersebut.
     TIDAK ADA event reasoning (terukur 19 Nov 2026) — token
     reasoning hanya angka di usage akhir.
   - HITL (body hitl: true): meta {hitl_form} / {hitl_permission}
     dirender sebagai kartu yang dijawab lewat endpoint reply
     backend (agent lanjut di aliran yang sama); kartu tertunda
     dipulihkan dari GET forms/permissions sesudah reload.
   - render teks mengikuti bentuk output TERUKUR (19 Nov 2026):
     delta produksi kasar (1–6 potongan besar), jadi gelembung
     stream dirender ulang sebagai markdown (komponen ChatMarkdown:
     GFM + highlight) dari string gabungan pada SETIAP delta —
     loop ungkap rAF lama dibuang. Event {meta: {tool}} tampil
     sebagai status kecil selama tool berjalan.
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
};

/* ---- HITL (18 Nov 2026): pertanyaan & persetujuan dari agent ----
   Backend meneruskan form.created sebagai meta.hitl_form dan
   permission.asked sebagai meta.hitl_permission di aliran stream
   yang sama (body chat membawa hitl: true). Jawaban dikirim ke
   endpoint reply backend; agent melanjutkan TANPA request chat
   baru. Bentuk objek mengikuti serve apa adanya. */
type HitlOption = { value: string; label: string; description?: string };
type HitlField = {
  key: string;
  title: string;
  description?: string;
  type?: string;
  required?: boolean;
  options?: HitlOption[];
  // custom: true (bentuk terverifikasi produksi 19 Nov 2026) =
  // pengguna boleh mengetik jawaban sendiri di luar opsi.
  // type "multiselect" = jawaban berupa array string.
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
  // Id pesan penjangkar: kartu dirender TEPAT sesudah pesan ini agar
  // urutan chat kronologis (jawaban agent sesudah kartu tampil di
  // bawah kartu, bukan di atasnya).
  afterId?: string;
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
// {cost, tokens} dengan tokens berupa objek opencode
// {input, output, reasoning, cache{read, write}} (terukur 19 Nov
// 2026). Normalkan ke total_tokens agar resolveTokens lama bisa
// dipakai apa adanya, SAMBIL membawa rincian input/output/reasoning
// + cost untuk footer pesan (cost admin selalu 0 → disembunyikan).
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

// Label status tool (event {meta: {tool}}) selama agent bekerja —
// status kecil yang hilang saat teks berikutnya/done tiba, bukan
// gelembung sendiri.
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

// Render teks pesan PENGGUNA (bukan markdown): blok ```...``` jadi
// <pre>, sisanya pre-wrap biasa. Pesan AI memakai ChatMarkdown.
function MessageText({ text }: { text: string }) {
  const segments = text.split("```");
  return (
    <>
      {segments.map((seg, i) => {
        if (i % 2 === 1) {
          const code = seg.replace(/^[a-zA-Z0-9_-]*\n/, "");
          return (
            <pre key={i} className="my-2 overflow-x-auto rounded-lg border border-line bg-[#0a0a0c] px-3 py-2.5 text-[13px] whitespace-pre">
              {code}
            </pre>
          );
        }
        return (
          <span key={i} className="break-anywhere whitespace-pre-wrap">
            {seg}
          </span>
        );
      })}
    </>
  );
}

export default function AssistantChat({
  quickPrompt,
  embedded = false,
}: {
  // Prompt cepat dari chip hover tombol mengambang (AgentFab):
  // tiap objek baru (n berubah) dikirim sekali sebagai pesan user.
  quickPrompt?: { text: string; n: number } | null;
  // embedded = dirender di dalam panel quick-chat AgentFab: gaya
  // konteks panel yang dulu datang dari penimpa CSS
  // ".agent-panel .chat-*" kini dinyatakan langsung di sini
  // (lebar penuh panel, tautan kembali hilang, kepala rata kanan).
  embedded?: boolean;
} = {}) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  // streamId = gelembung segmen stream yang sedang aktif (dirender
  // ChatMarkdown dengan streaming=true; blok kode yang pagarnya
  // belum tiba tampil polos). Render diperbarui per delta SSE.
  const [streamId, setStreamId] = useState<string | null>(null);
  // Nama tool yang sedang dijalankan agent (event meta.tool);
  // null = tidak ada tool aktif.
  const [toolName, setToolName] = useState<string | null>(null);
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

  const persist = useCallback((msgs: Message[]) => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs));
    } catch {
      /* storage penuh/tidak tersedia — abaikan */
    }
  }, []);

  /* ---- HITL: kartu pertanyaan/persetujuan + jawabannya ---- */
  const [hitlCards, setHitlCards] = useState<HitlCard[]>([]);
  // Jawaban per kartu per field: string untuk field biasa/teks/
  // custom, string[] untuk field multiselect.
  const [hitlAnswers, setHitlAnswers] = useState<
    Record<string, Record<string, string | string[]>>
  >({});

  const patchCard = useCallback((id: string, patch: Partial<HitlCard>) => {
    setHitlCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  // Pemulihan sesudah reload: gambar ulang kartu yang masih tertunda
  // di sesi tersimpan (agent bisa saja masih menunggu jawabannya).
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
      fetch(apiUrl(path))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    void (async () => {
      const [fr, pr] = await Promise.all([
        getJson(`/v1/opencode/sessions/${sid}/forms`),
        getJson(`/v1/opencode/sessions/${sid}/permissions`),
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
            `/v1/opencode/sessions/${card.sessionId}/forms/${card.id}/reply`,
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
          apiUrl(`/v1/opencode/sessions/${card.sessionId}/forms/${card.id}`),
          { method: "DELETE" },
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
            `/v1/opencode/sessions/${card.sessionId}/permissions/${card.id}/reply`,
          ),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || busy) return;
      const userMsg: Message = {
        id: `user_${Date.now()}`,
        sender: "user",
        text,
        timestamp: nowTime(),
      };
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
      setToolName(null);
      const startTime = performance.now();
      let allText = "";
      let streamUsage: BackendUsage | null = null;
      let streamModel: string | null = null;
      let streamTools: string[] = [];
      let streamFiles: ChatFile[] = [];
      const aiId = `stream_${Date.now()}`;

      // --- Segmen stream: satu giliran bisa dipecah kartu HITL ---
      // Teks sebelum kartu masuk gelembung segmen lama; teks sesudah
      // kartu masuk gelembung BARU di bawah kartu (urutan kronologis).
      let segText = "";
      let segId = aiId;
      let segCreated = false;
      let anySegCreated = false;
      let lastSegId = aiId;
      let segCount = 0;

      // Indikator "agent bekerja": titik mengetik tampil selama agent
      // sibuk TANPA teks mengalir (berpikir, menjalankan tool, atau
      // melanjutkan sesudah jawaban HITL) dan hilang saat teks tampil.
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

      // Tutup segmen aktif dan mulai segmen baru; mengembalikan id
      // penjangkar untuk kartu HITL. Teks segmen lama sudah tercermin
      // penuh di gelembungnya lewat render per-delta. Status tool
      // dibersihkan: kartu yang tiba menggantikannya sebagai UI.
      const rotateSegment = (): string => {
        const anchorId = segCreated
          ? segId
          : anySegCreated
            ? lastSegId
            : userMsg.id!;
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
        // Giliran berakhir: kartu HITL yang belum terjawab kehilangan
        // alirannya — tandai tidak berlaku agar tidak dijawab percuma.
        setHitlCards((prev) =>
          prev.map((c) =>
            c.status === "pending" ? { ...c, status: "cancelled" as const } : c,
          ),
        );
        const latencyMs = Math.round(performance.now() - startTime);
        const tk = resolveTokens(streamUsage, text + allText);
        // Meta menempel di gelembung segmen terakhir yang benar-benar
        // terbuat; teks segmen aktif hanya ditimpa bila segmen itu ada
        // (segmen kosong sesudah kartu tidak menghapus teks segmen
        // sebelumnya).
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
                    engine: streamModel || "Vienna Agent",
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
      };

      // Render per-delta: setiap potongan teks SSE langsung ditulis
      // ke gelembung segmen aktif (lihat handler parsed.text) dan
      // dirender ChatMarkdown dari string gabungannya.

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
            // HITL aktif: pertanyaan/persetujuan agent diteruskan
            // sebagai kartu yang bisa dijawab di UI ini.
            hitl: true,
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
                  if (Array.isArray(data.files)) {
                    streamFiles = pickFiles(data.files);
                  }
                  setWaiting(false);
                  finishWith(responseText);
                  setBusy(false);
                  return;
                }
              } catch (e) {
                if (e instanceof Error && !e.message.startsWith("Unexpected token")) throw e;
              }
            }
            // Gelembung segmen TIDAK dibuat di sini lagi: ia lahir
            // malas pada potongan teks pertama segmen (ensureBubble),
            // dan indikator menunggu tetap menyala sampai teks itu
            // tiba — potongan meta/tool awal tidak mematikannya.
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
              // meta {tool} = tool yang mulai dijalankan agent —
              // tampil sebagai status kecil sampai teks/done tiba.
              const meta = parsed.meta as Record<string, unknown>;
              const sid = meta.session_id;
              if (typeof sid === "string" && sid) {
                try {
                  localStorage.setItem(SESSION_KEY, sid);
                } catch {
                  /* abaikan */
                }
              }
              if (typeof meta.tool === "string" && meta.tool) {
                setToolName(meta.tool);
              }
              // HITL: agent bertanya / meminta persetujuan. Aliran
              // tetap terbuka (heartbeat backend) — kartu dirender
              // dan dijawab lewat endpoint reply, bukan chat baru.
              const form = meta.hitl_form as HitlFormData | undefined;
              if (form && typeof form.id === "string") {
                const card: HitlCard = {
                  kind: "form",
                  id: form.id,
                  sessionId:
                    form.sessionID ||
                    (typeof sid === "string" ? sid : null) ||
                    localStorage.getItem(SESSION_KEY) ||
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
                    localStorage.getItem(SESSION_KEY) ||
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
        // Stream selesai: tutup segmen aktif dengan teks gabungan
        // terakhir (meta ditempel oleh finishWith).
        finishWith(segText || "(tidak ada jawaban)");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
        setWaiting(false);
        // Pastikan ada gelembung segmen aktif agar teks error punya
        // tempat tampil (bila error terjadi sesudah rotasi kartu).
        ensureBubble();
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

  // Prompt cepat dari chip hover FAB (quick chat mengambang):
  // pola yang sama — kirim sekali per objek quickPrompt baru,
  // sesudah riwayat termuat. Penjaga ref mencatat n terakhir yang
  // sudah ditangani supaya render ulang tidak mengirim dobel.
  const qpHandledRef = useRef(0);
  useEffect(() => {
    if (!hydrated || !quickPrompt) return;
    if (qpHandledRef.current === quickPrompt.n) return;
    qpHandledRef.current = quickPrompt.n;
    void send(quickPrompt.text);
  }, [hydrated, quickPrompt, send]);

  // Sesi baru = buang session_id lokal; backend membuat sesi baru
  // pada kiriman berikutnya. Tidak ada endpoint new-session lagi.
  const clearChat = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* abaikan */
    }
    setHitlCards([]);
    setHitlAnswers({});
    const fresh = [welcomeMessage()];
    setMessages(fresh);
    persist(fresh);
  };

  // Kelengkapan jawaban form: semua field wajib (required !== false)
  // terisi. Dipakai untuk kirim-otomatis saat pilihan terakhir dipilih.
  // Field multiselect terisi bila arraynya tak kosong.
  const formComplete = (
    form: HitlFormData,
    ans: Record<string, string | string[]>,
  ): boolean =>
    form.fields.every((f) => {
      if (f.required === false) return true;
      const v = ans[f.key];
      return Array.isArray(v) ? v.length > 0 : (v ?? "").trim().length > 0;
    });

  // Satu baris kartu HITL di aliran chat (dipakai terselip sesudah
  // pesan penjangkarnya maupun di akhir untuk kartu pemulihan).
  const renderHitlCard = (card: HitlCard) => (
    <div key={card.id} className="flex max-w-[85%] flex-row gap-2 self-start max-[760px]:max-w-[92%]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mt-0.5 h-[26px] w-[26px] flex-none rounded-full border border-line bg-[#0a0a0c] object-cover" src="/vienna.svg" alt="" width={26} height={26} />
      <div className="flex min-w-0 flex-col items-start">
        {card.status === "cancelled" ? (
          <div className="min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] border-l-steel bg-panel2 px-3.5 py-2.5 text-[13.5px] text-[#8b8b94]">
            {card.kind === "form"
              ? "Pertanyaan ini sudah tidak berlaku."
              : "Permintaan persetujuan ini sudah tidak berlaku."}
          </div>
        ) : card.kind === "form" && card.form ? (
          <div
            className={
              card.status === "answered" ? "min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] bg-panel2 px-4 py-3.5 text-[14.5px] border-l-[#34d399] opacity-85" : "min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] bg-panel2 px-4 py-3.5 text-[14.5px] border-l-accent"
            }
          >
            <div className="mb-2.5 flex items-center gap-2 text-[14.5px] font-bold text-[#f2f2f4]">
              <MessageCircle size={15} className="flex-none text-accent3" />
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
                <div key={f.key} className="mb-3.5">
                  <div className="mb-[3px] text-[13.5px] font-semibold text-[#e6e6e9]">{f.title}</div>
                  {f.description && (
                    <div className="mb-2 text-[12.5px] leading-[1.5] text-fog">{f.description}</div>
                  )}
                  {f.options && f.options.length > 0 ? (
                    <>
                      <div className="flex flex-col gap-[7px]">
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
                                  ? "flex cursor-pointer flex-col items-start gap-px rounded-[10px] border border-accent bg-[rgba(0,129,251,0.14)] px-3 py-[9px] text-left [font:inherit] enabled:hover:border-[#4a4a55] disabled:cursor-default disabled:opacity-75"
                                  : "flex cursor-pointer flex-col items-start gap-px rounded-[10px] border border-line3 bg-[rgba(255,255,255,0.03)] px-3 py-[9px] text-left [font:inherit] enabled:hover:border-[#4a4a55] disabled:cursor-default disabled:opacity-75"
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
                                // Pilih = kirim: begitu semua field
                                // wajib terisi, jawaban langsung
                                // terkirim — tanpa tombol Kirim
                                // (permintaan user 18 Nov).
                                const next = setField(o.value);
                                if (
                                  card.form &&
                                  formComplete(card.form, next)
                                ) {
                                  void replyForm(card, next);
                                }
                              }}
                            >
                              <span className="text-[13.5px] font-semibold">
                                {o.label}
                              </span>
                              {o.description && (
                                <span className="text-xs text-fog">
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
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedArr
                              .filter(
                                (v) =>
                                  !f.options?.some((o) => o.value === v),
                              )
                              .map((v) => (
                                <button
                                  key={v}
                                  type="button"
                                  className="inline-flex cursor-pointer items-center gap-[5px] rounded-full border border-[rgba(0,129,251,0.45)] bg-[rgba(0,129,251,0.14)] px-[9px] py-[3px] text-[12.5px] text-[#cfe4ff] disabled:cursor-default disabled:opacity-75"
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
                            className="box-border w-full rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-3 py-[9px] [font-family:inherit] [font-weight:inherit] text-sm text-[#f2f2f4] focus:border-line focus:outline-none disabled:opacity-70 mt-2"
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
                            className="box-border w-full rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-3 py-[9px] [font-family:inherit] [font-weight:inherit] text-sm text-[#f2f2f4] focus:border-line focus:outline-none disabled:opacity-70 mt-2"
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
                      className="box-border w-full rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-3 py-[9px] [font-family:inherit] [font-weight:inherit] text-sm text-[#f2f2f4] focus:border-line focus:outline-none disabled:opacity-70"
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
                      className="box-border w-full rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-3 py-[9px] [font-family:inherit] [font-weight:inherit] text-sm text-[#f2f2f4] focus:border-line focus:outline-none disabled:opacity-70"
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
              <div className="flex items-center gap-[7px] text-[13px] font-semibold text-[#34d399]">
                <Check size={14} /> Sudah dijawab — agent melanjutkan
                pekerjaannya.
              </div>
            ) : (
              <>
                {card.form.fields.some(
                  (f) => !f.options?.length || f.custom,
                ) && (
                  <div className="mb-[9px] text-xs text-fog">
                    Tekan Enter untuk mengirim jawaban.
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-2">
                  {card.form.fields.some(
                    (f) => f.type === "multiselect",
                  ) && (
                    <button
                      type="button"
                      className="cursor-pointer rounded-full border border-accent bg-accent px-4 py-2 text-[13.5px] font-semibold text-white enabled:hover:border-[#0064e0] enabled:hover:bg-[#0064e0] disabled:cursor-default disabled:opacity-50"
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
                    className="cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-semibold enabled:hover:border-[#4a4a55] disabled:cursor-default disabled:opacity-50 border-line3 bg-[rgba(255,255,255,0.04)] text-[#e6e6e9]"
                    disabled={card.status === "sending"}
                    onClick={() => void cancelForm(card)}
                  >
                    Batalkan
                  </button>
                </div>
              </>
            )}
            {card.error && <div className="mt-[9px] text-[12.5px] text-[#f87171]">{card.error}</div>}
          </div>
        ) : card.kind === "permission" && card.permission ? (
          <div
            className={
              card.status === "answered" ? "min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] bg-panel2 px-4 py-3.5 text-[14.5px] border-l-[#34d399] opacity-85" : "min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] bg-panel2 px-4 py-3.5 text-[14.5px] border-l-accent"
            }
          >
            <div className="mb-2.5 flex items-center gap-2 text-[14.5px] font-bold text-[#f2f2f4]">
              <ShieldAlert size={15} className="flex-none text-accent3" />
              <span>Persetujuan aksi</span>
            </div>
            <div className="mb-1.5 font-semibold break-anywhere text-[#e6e6e9]">{card.permission.action}</div>
            {card.permission.resources &&
              card.permission.resources.length > 0 && (
                <ul className="m-0 mb-1.5 pl-[18px] text-[12.5px] break-anywhere text-fog">
                  {card.permission.resources.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            {card.status === "answered" ? (
              <div className="flex items-center gap-[7px] text-[13px] font-semibold text-[#34d399]">
                <Check size={14} /> Keputusan terkirim:{" "}
                {card.decision === "once"
                  ? "diizinkan sekali"
                  : card.decision === "always"
                    ? "selalu diizinkan"
                    : "ditolak"}
                .
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="cursor-pointer rounded-full border border-accent bg-accent px-4 py-2 text-[13.5px] font-semibold text-white enabled:hover:border-[#0064e0] enabled:hover:bg-[#0064e0] disabled:cursor-default disabled:opacity-50"
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "once")}
                >
                  Izinkan sekali
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-semibold enabled:hover:border-[#4a4a55] disabled:cursor-default disabled:opacity-50 border-line3 bg-[rgba(255,255,255,0.04)] text-[#e6e6e9]"
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "always")}
                >
                  Selalu izinkan
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-full border px-4 py-2 text-[13.5px] font-semibold enabled:hover:border-[#4a4a55] disabled:cursor-default disabled:opacity-50 border-line3 bg-[rgba(255,255,255,0.04)] text-[#f87171]"
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "reject")}
                >
                  Tolak
                </button>
              </div>
            )}
            {card.error && <div className="mt-[9px] text-[12.5px] text-[#f87171]">{card.error}</div>}
          </div>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={embedded ? "flex min-h-0 w-full flex-1 flex-col px-3 pt-2 pb-3" : "mx-auto flex min-h-0 w-full max-w-[880px] flex-1 flex-col px-4 pt-3.5 pb-4 max-[760px]:px-3 max-[760px]:pt-2.5 max-[760px]:pb-3"}>
      <div className={embedded ? "flex flex-wrap items-center justify-end gap-2.5 border-b border-[#1d1d21] pb-2" : "flex flex-wrap items-center gap-2.5 border-b border-[#1d1d21] pb-3"}>
        <Link href="/#tools" className={embedded ? "hidden" : "mr-auto inline-flex items-center gap-1.5 text-[13px] text-fog no-underline hover:text-white max-[760px]:mr-0"}>
          <ArrowLeft size={16} /> Semua tools
        </Link>
        <button type="button" className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-transparent px-3 py-1.5 text-[13px] text-fog hover:border-steel hover:text-white" onClick={clearChat} title="Mulai sesi baru">
          <Trash2 size={15} /> Sesi baru
        </button>
      </div>

      <div
        className={embedded ? "flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-0.5 py-3" : "flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-0.5 py-[18px]"}
        ref={logRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        {messages.map((m, i) => (
          <Fragment key={m.id ?? i}>
          <div className={m.sender === "user" ? "flex max-w-[85%] self-end max-[760px]:max-w-[92%]" : "flex max-w-[85%] flex-row gap-2 self-start max-[760px]:max-w-[92%]"}>
            {m.sender === "ai" && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="mt-0.5 h-[26px] w-[26px] flex-none rounded-full border border-line bg-[#0a0a0c] object-cover" src="/vienna.svg" alt="" width={26} height={26} />
            )}
            <div className={m.sender === "user" ? "flex min-w-0 flex-col items-end" : "flex min-w-0 flex-col items-start"}>
              <div className={m.sender === "user" ? "rounded-[14px] rounded-br-[4px] bg-accent px-3.5 py-2.5 text-[15px] leading-[1.55] text-white" : "rounded-[14px] rounded-bl-[4px] border border-line bg-panel2 px-3.5 py-2.5 text-[15px] leading-[1.55] text-[#eeeef2]"}>
                {m.sender === "ai" ? (
                  <ChatMarkdown text={m.text} streaming={m.id === streamId} />
                ) : (
                  <MessageText text={m.text} />
                )}
                {m.id === streamId && <span className="msg-caret" aria-hidden="true" />}
              </div>
              <FileCards files={m.files} />
              <div className="mt-[5px] text-[11.5px] text-[#77777f]">
                <span>{m.timestamp}</span>
                {m.meta && (
                  <span>
                    {" · "}
                    {m.meta.engine} · {(m.meta.latencyMs / 1000).toFixed(1)} dtk ·{" "}
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
          {/* Kartu HITL yang berjangkar pada pesan ini tampil tepat
              sesudahnya — urutan aliran mengikuti kronologi. */}
          {hitlCards
            .filter((c) => c.afterId === m.id)
            .map((card) => renderHitlCard(card))}
          </Fragment>
        ))}
        {waiting && !toolName && (
          <div className="flex max-w-[85%] flex-row gap-2 self-start max-[760px]:max-w-[92%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mt-0.5 h-[26px] w-[26px] flex-none rounded-full border border-line bg-[#0a0a0c] object-cover" src="/vienna.svg" alt="" width={26} height={26} />
            <div className="flex min-w-0 flex-col items-start">
              {/* Kelas msg-typing dipertahankan sebagai kait CSS
                  vanilla untuk animasi titik ketik (.msg-typing .dot,
                  keyframes + tunda per titik) — gaya kotaknya sendiri
                  sudah dinyatakan utilitas di sini. */}
              <div className="msg-typing inline-flex items-center gap-[5px] rounded-[14px] rounded-bl-[4px] border border-line bg-panel2 px-3.5 py-2.5 text-[15px] leading-[1.55] text-[#eeeef2]">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        {/* Status tool yang sedang berjalan (event meta.tool) —
            baris kecil, hilang saat teks berikutnya/done tiba. */}
        {toolName && busy && (
          <div className="-mt-0.5 mb-1.5 flex items-center gap-[7px] pl-9 text-[12.5px] text-fog" role="status">
            <LoaderCircle size={13} className="tool-status-spin" />
            <span>{toolLabel(toolName)}</span>
          </div>
        )}

        {/* Kartu HITL tanpa penjangkar di daftar pesan (hasil
            pemulihan sesudah reload) tampil di akhir aliran. */}
        {hitlCards
          .filter(
            (c) => !c.afterId || !messages.some((m) => m.id === c.afterId),
          )
          .map((card) => renderHitlCard(card))}

        {busy && hitlCards.some((c) => c.status === "pending") && (
          <div className="mt-0.5 mb-1.5 ml-10 flex items-center gap-2 text-[13px] text-fog">
            <Hourglass size={14} /> Agent menunggu jawabanmu…
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 pt-1 pb-2.5">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="cursor-pointer rounded-full border border-line bg-panel2 px-3 py-1.5 text-[13px] text-[#c9c9d2] hover:border-accent hover:text-white disabled:cursor-default disabled:opacity-50" onClick={() => void send(s)} disabled={busy}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="flex items-end gap-2.5 rounded-[14px] border border-line bg-panel p-2 pl-3.5 focus-within:border-line"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          className="max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent px-0 py-[7px] [font-family:inherit] text-[15px] leading-[1.45] text-[#eeeef2] outline-none placeholder:text-fog"
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
        <button type="submit" className="inline-flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border-0 bg-accent text-white disabled:cursor-default disabled:opacity-45" disabled={busy || !input.trim()} aria-label="Kirim pesan">
          <SendHorizontal size={17} />
        </button>
      </form>
    </div>
  );
}
