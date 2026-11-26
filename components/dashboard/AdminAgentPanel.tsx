"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  SendHorizontal,
  Square,
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
  History,
  Trash2,
} from "lucide-react";
import ChatMarkdown from "@/components/ChatMarkdown";
import FileCards, {
  FileReviewModal,
  FileReviewWindow,
  formatSize,
  type ChatFile,
} from "@/components/FileCards";
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
   Pemulihan stream putus (21 Nov): bila aliran SSE terputus di
   tengah (jaringan/proxy) padahal agent menyelesaikan
   gilirannya di serve, panel TIDAK langsung menampilkan error —
   ia mengambil jawaban final dari riwayat sesi backend
   (polling ±5 dtk, final = isi stabil dua kali berurutan,
   batal bila ada HITL tertunda) dan menampilkannya seolah
   stream tidak pernah putus.
   Kelola sesi (21 Nov): tombol "Sesi" di header membuka daftar
   sesi tersimpan — klik membuka riwayatnya (read), ikon tempat
   sampah menghapus permanen (DELETE /v1/opencode/sessions/{id}
   ?role=admin; kontrak = prompt serah-terima sesi Backend —
   backend lama menjawab 404/405 dan UI menampilkannya sebagai
   catatan, bukan error diam). Review file: kartu file hasil
   agent punya tombol mata yang membuka FileReviewWindow —
   jendela mengambang PER FILE yang bisa digeser dari
   kepalanya, di-minimize menjadi kepala saja, dan ditutup;
   beberapa jendela boleh terbuka bersamaan berisi kode
   ter-highlight + nomor baris + metadata lengkap. Jendela
   HANYA di desktop (≥1024px) dan dibatasi REVIEW_WIN_MAX
   jendela (lebih dari itu muncul notif overload); di layar
   non-desktop review kembali ke FileReviewModal tunggal
   seperti versi awal.
   Keep-alive + rekonsiliasi (21 Nov): DashboardShell TIDAK
   melepas panel ini saat admin pindah tab (disembunyikan saja)
   sehingga stream yang berjalan tetap berlanjut di latar; dan
   saat panel dibuka, riwayat sesi aktif dimuat ulang dari
   backend (rekonsiliasi) menggantikan salinan lokal yang basi.
   Kartu file hasil agent dicatat juga di gudang file per sesi
   (FILES_KEY) dan ditempel kembali setiap riwayat dimuat —
   riwayat backend tidak membawa file, jadi tanpa gudang ini
   kartu file hilang setiap berpindah sesi (perbaikan 21 Nov).
   Selama agent bekerja, tombol kirim di composer berganti
   menjadi tombol Stop: menghentikan stream di klien
   (AbortController) dan meminta backend meng-abort giliran
   di serve; pesan parsial ditutup dengan penanda
   "Dihentikan oleh pengguna" dan pemulihan jawaban tidak
   berjalan (berhenti disengaja bukan stream putus).
   — metadata lokal pesan yang cocok dipertahankan.
   ===================================================================== */

const CHAT_ENDPOINT = "/v1/opencode/chat/stream";
const UPLOAD_ENDPOINT = "/v1/opencode/chat/upload";
const SESSION_KEY = "admin_agent_session_id";
const HISTORY_KEY = "admin_agent_chat_history";
const FILES_KEY = "admin_agent_session_files";
// Batas lampiran — cermin kontrak backend (backend yang
// menegakkan; di sini untuk umpan balik cepat sebelum unggah).
const MAX_ATTACH_FILES = 5;
// Batas jendela review mengambang (desktop) sebelum notif
// overload muncul — menjaga RAM/DOM tetap waras.
const REVIEW_WIN_MAX = 5;
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

type OcSession = {
  id: string;
  title?: string;
  agent?: string;
  time?: { created?: number; updated?: number };
};

/* Bentuk pesan riwayat sesi dari backend. Serve opencode v2
   mengembalikan pesan bergaya simpanan barunya: {type: "user",
   text} untuk pengguna dan {type: "assistant", content:
   [{type: "text" | "reasoning", text}]} untuk agent (blok
   reasoning dilewati — stream langsung pun tidak pernah
   menampilkannya), diselingi penanda {type: "idle"}. Bentuk
   lama v1 {info: {role}, parts: [...]} tetap diterima sebagai
   cadangan. Parser lama yang hanya mengenal v1 membuat SEMUA
   riwayat v2 terbaca kosong (insiden 21 Nov: sesi "Ibu kota
   Indonesia" tampil judulnya saja + pesan sambutan, padahal
   backend menjawab 200 dan datanya ada). */
type RawSessionMessage = {
  type?: string;
  info?: { role?: string };
  text?: string;
  time?: { created?: number };
  content?: { type?: string; text?: string }[];
  parts?: { type?: string; text?: string }[];
  // Backend kelak bisa mengirim files[] per pesan assistant
  // (prompt serah-terima sesi Backend, 21 Nov 2026); bila ada,
  // diteruskan apa adanya dan didahulukan atas gudang lokal.
  files?: unknown;
};

/* Serve v2 mentah mengembalikan riwayat TERBARU-dulu, sedangkan
   backend yang sudah menormalisasi (commit backend 0cec7ee)
   mengembalikannya kronologis. Bila semua pesan membawa
   time.created, urutkan menaik agar kedua dunia tampil benar;
   bila tidak, percayai urutan pemberi. */
function orderSessionMessages(
  raw: RawSessionMessage[],
): RawSessionMessage[] {
  if (
    raw.length > 1 &&
    raw.every((m) => typeof m.time?.created === "number")
  ) {
    return [...raw].sort(
      (a, b) => (a.time?.created ?? 0) - (b.time?.created ?? 0),
    );
  }
  return raw;
}

function parseSessionMessage(
  m: RawSessionMessage,
): { sender: "user" | "ai"; text: string } | null {
  const role = m.type ?? m.info?.role;
  if (role !== "user" && role !== "assistant" && role !== "ai") return null;
  const blocksText = (blocks?: { type?: string; text?: string }[]) =>
    (blocks ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string)
      .join("\n");
  let text = "";
  if (role === "user" && typeof m.text === "string") text = m.text;
  if (!text) text = blocksText(m.content);
  if (!text) text = blocksText(m.parts);
  text = text.trim();
  if (!text) return null;
  return { sender: role === "user" ? "user" : "ai", text };
}

// Waktu sesi terakhir diperbarui (epoch ms dari serve) untuk
// daftar kelola sesi; kosong bila tidak valid.
const formatSessionTime = (ms?: number): string => {
  if (!ms || !Number.isFinite(ms)) return "";
  try {
    return new Date(ms).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

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

/* Gudang file per sesi (21 Nov 2026): kartu file hasil agent
   semula hanya hidup di riwayat lokal — riwayat backend tidak
   membawanya, jadi berpindah sesi atau penyelarasan saat
   panel dibuka membuatnya hilang dari pesan (user merasakannya
   sebagai "file ter-destroy"). Gudang ini menyimpan files[]
   per sesi, dikunci teks pesan assistant-nya, untuk ditempel
   kembali setiap kali riwayat sesi dimuat dari backend.
   Batas wajar: maks 10 sesi × 20 pesan berfile; penulisan
   yang gagal kuota membuang sesi terlama lalu mencoba sekali
   lagi. Backend yang kelak mengirim files di riwayatnya
   didahulukan — gudang hanya mengisi yang kosong. */
type SessionFileStore = Record<
  string,
  { text: string; files: ChatFile[] }[]
>;

function loadFileStore(): SessionFileStore {
  try {
    const raw = localStorage.getItem(FILES_KEY);
    const parsed = raw ? (JSON.parse(raw) as SessionFileStore) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function rememberSessionFiles(
  sid: string,
  text: string,
  files: ChatFile[],
): void {
  if (!sid || !text || files.length === 0) return;
  try {
    const store = loadFileStore();
    const list = store[sid] ?? [];
    // Entri ditambah BERURUTAN (bukan diganti per teks): dua
    // giliran bisa berbalas teks sama persis dengan file
    // berbeda, dan penempelan kembali mengonsumsi entri
    // seurutan teksnya. Duplikat persis (teks + daftar path
    // sama — mis. dari penyelarasan berulang) dilewati.
    const sig = files.map((f) => f.path).join("|");
    const dup = list.some(
      (e) =>
        e.text === text &&
        e.files.map((f) => f.path).join("|") === sig,
    );
    if (!dup) list.push({ text, files });
    store[sid] = list.slice(-20);
    const keys = Object.keys(store);
    while (keys.length > 10) {
      delete store[keys.shift() as string];
    }
    try {
      localStorage.setItem(FILES_KEY, JSON.stringify(store));
    } catch {
      const ks = Object.keys(store);
      if (ks.length > 1) {
        delete store[ks[0]];
        localStorage.setItem(FILES_KEY, JSON.stringify(store));
      }
    }
  } catch {
    /* abaikan */
  }
}

function attachStoredFiles(sid: string, msgs: Message[]): Message[] {
  const list = loadFileStore()[sid];
  if (!list || list.length === 0) return msgs;
  const used = new Set<number>();
  return msgs.map((m) => {
    if (m.sender !== "ai" || (m.files && m.files.length > 0)) return m;
    const idx = list.findIndex((e, i) => !used.has(i) && e.text === m.text);
    if (idx === -1) return m;
    used.add(idx);
    return { ...m, files: list[idx].files };
  });
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
            <pre key={i} className="my-2 overflow-x-auto rounded-lg border border-line bg-[#0a0a0b] px-3 py-2.5 text-[13px] whitespace-pre">
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

const MSG_USER =
  "flex max-w-[85%] self-end max-[760px]:max-w-[92%]";
const MSG_AI =
  "flex max-w-[85%] flex-row gap-2 self-start max-[760px]:max-w-[92%]";
const MSG_COL_USER = "flex min-w-0 flex-col items-end";
const MSG_COL_AI = "flex min-w-0 flex-col items-start";
const MSG_AVATAR =
  "mt-0.5 h-[26px] w-[26px] flex-none rounded-full border border-line bg-[#0a0a0b] object-cover";
const BUBBLE_USER =
  "rounded-[14px] rounded-br-[4px] bg-accent px-3.5 py-2.5 text-[15px] leading-[1.55] text-[#052A1E]";
const BUBBLE_AI =
  "rounded-[14px] rounded-bl-[4px] border border-line bg-panel2 px-3.5 py-2.5 text-[15px] leading-[1.55] text-[#DCE7FA]";
const HITL_CARD =
  "min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] bg-panel2 px-4 py-3.5 text-[14.5px]";
const HITL_HEAD =
  "mb-2.5 flex items-center gap-2 text-[14.5px] font-bold text-[#EEF4FF] [&_svg]:flex-none [&_svg]:text-accent3";
const HITL_INPUT =
  "w-full rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-3 py-[9px] text-sm text-[#EEF4FF] [font:inherit] focus:border-line focus:outline-none disabled:opacity-70";
const HITL_BTN =
  "cursor-pointer rounded-full border border-line3 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-[13.5px] font-semibold text-[#DCE7FA] enabled:hover:border-[#41538A] disabled:cursor-default disabled:opacity-50";
const HITL_BTN_PRIMARY =
  "cursor-pointer rounded-full border border-accent bg-accent px-4 py-2 text-[13.5px] font-semibold text-[#052A1E] enabled:hover:border-[#00BBA2] enabled:hover:bg-[#00BBA2] disabled:cursor-default disabled:opacity-50";
const HITL_BTN_DANGER =
  "cursor-pointer rounded-full border border-line3 bg-[rgba(255,255,255,0.04)] px-4 py-2 text-[13.5px] font-semibold text-[#f87171] enabled:hover:border-[#41538A] disabled:cursor-default disabled:opacity-50";
const HITL_OPTION =
  "flex cursor-pointer flex-col items-start gap-px rounded-[10px] border px-3 py-[9px] text-left text-[#DCE7FA] [font:inherit] enabled:hover:border-[#41538A] disabled:cursor-default disabled:opacity-75";
const TOOL_BTN =
  "inline-flex h-9 w-9 flex-[0_0_auto] cursor-pointer items-center justify-center rounded-[10px] border border-line bg-transparent text-[#9DB1D9] hover:border-steel hover:text-white disabled:cursor-default disabled:opacity-45";
const QP_SEND =
  "inline-flex h-9 w-9 flex-[0_0_auto] cursor-pointer items-center justify-center rounded-[10px] border-0 bg-accent text-[#052A1E] disabled:cursor-default disabled:opacity-45";
const NEW_BTN =
  "inline-flex cursor-pointer items-center gap-[7px] rounded-lg border border-[#22336A] bg-[#17171b] px-3 py-[7px] text-[13px] text-[#DCE7FA] transition-all duration-[120ms] hover:border-[#354C8C] hover:bg-[rgba(255,255,255,0.05)]";
const SESS_ICON =
  "inline-flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-[7px] border border-transparent bg-transparent text-[#93A9D1] hover:border-[#22336A] hover:text-[#DCE7FA]";
const SESS_ICON_DANGER =
  "inline-flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-[7px] border border-transparent bg-transparent text-[#ff7a7a] hover:border-[#22336A]";

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
  // Sedang memulihkan jawaban dari riwayat sesi (stream putus).
  const [recovering, setRecovering] = useState(false);
  // Lampiran menunggu kirim + masukan suara (lihat kontrak di
  // header berkas). pendingRef = cermin untuk dibaca send().
  const [pending, setPending] = useState<PendingFile[]>([]);
  const pendingRef = useRef<PendingFile[]>([]);
  pendingRef.current = pending;
  // Penghenti giliran yang sedang berjalan: diisi send() selama
  // stream aktif, dipanggil tombol Stop di composer.
  const stopRef = useRef<(() => void) | null>(null);
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
  // Popover kelola sesi (buka/hapus) + statusnya.
  const [sessOpen, setSessOpen] = useState(false);
  const [sessConfirm, setSessConfirm] = useState<string | null>(null);
  const [sessError, setSessError] = useState("");
  // Review file: di DESKTOP (≥1024px) satu JENDELA
  // mengambang per file — bisa digeser, di-minimize, ditutup;
  // beberapa jendela boleh terbuka bersamaan (urutan array =
  // urutan tumpukan, terakhir paling depan) sampai batas
  // REVIEW_WIN_MAX; mencoba membuka lebih dari itu
  // memunculkan notif overload, bukan jendela baru. Di layar
  // non-desktop jendela DIMATIKAN (keputusan user 21 Nov
  // 2026): review kembali modal tunggal satu file.
  const [reviewWins, setReviewWins] = useState<
    { file: ChatFile; min: boolean; spawn: number }[]
  >([]);
  const reviewSpawn = useRef(0);
  const [reviewFile, setReviewFile] = useState<ChatFile | null>(null);
  const [reviewNotice, setReviewNotice] = useState("");
  const noticeTimer = useRef<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  const openReview = (f: ChatFile) => {
    if (!isDesktop) {
      setReviewFile(f);
      return;
    }
    const existing = reviewWins.find((w) => w.file.path === f.path);
    if (existing) {
      // Sudah terbuka: segarkan isinya, pulihkan dari
      // minimize, dan bawa ke depan.
      setReviewWins((prev) => [
        ...prev.filter((w) => w.file.path !== f.path),
        { ...existing, file: f, min: false },
      ]);
      return;
    }
    if (reviewWins.length >= REVIEW_WIN_MAX) {
      setReviewNotice(
        `Maksimal ${REVIEW_WIN_MAX} jendela review terbuka — tutup salah satu jendela dulu untuk membuka file lain.`,
      );
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setReviewNotice(""), 4500);
      return;
    }
    reviewSpawn.current += 1;
    const spawn = reviewSpawn.current;
    setReviewWins((prev) => [...prev, { file: f, min: false, spawn }]);
  };
  const focusReviewWin = (path: string) => {
    setReviewWins((prev) => {
      const idx = prev.findIndex((w) => w.file.path === path);
      if (idx === -1 || idx === prev.length - 1) return prev;
      return [...prev.filter((w) => w.file.path !== path), prev[idx]];
    });
  };
  const toggleReviewMin = (path: string) => {
    setReviewWins((prev) =>
      prev.map((w) => (w.file.path === path ? { ...w, min: !w.min } : w)),
    );
  };
  const closeReviewWin = (path: string) => {
    setReviewWins((prev) => prev.filter((w) => w.file.path !== path));
  };
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

  // Muat ulang riwayat sesi aktif dari backend saat panel dibuka
  // (permintaan user 21 Nov): salinan lokal bisa basi — jawaban
  // yang selesai di serve saat panel tertutup, atau gelembung
  // error sisa stream putus, harus digantikan isi sesi yang
  // sebenarnya. Backend = sumber kebenaran; metadata lokal
  // (footer model/token, kartu file, penanda lampiran, waktu)
  // dipertahankan untuk pesan yang pengirim+teksnya cocok.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (!hydrated || reconciledRef.current) return;
    reconciledRef.current = true;
    let sid: string | null = null;
    try {
      sid = localStorage.getItem(SESSION_KEY);
    } catch {
      sid = null;
    }
    if (!sid) return;
    const localAtStart = messagesRef.current;
    void (async () => {
      const fresh = await fetchSessionMessages(sid);
      if (!fresh || fresh.length === 0) return;
      // Panel sudah dipakai (user mengirim pesan lebih dulu) —
      // jangan timpa percakapan yang sedang berjalan.
      if (messagesRef.current !== localAtStart) return;
      const local = localAtStart;
      const same =
        local.length === fresh.length &&
        local.every(
          (m, i) => m.sender === fresh[i].sender && m.text === fresh[i].text,
        );
      if (same) return;
      let p = 0;
      const merged = fresh.map((fm) => {
        for (let i = p; i < local.length; i++) {
          const lm = local[i];
          if (lm.sender === fm.sender && lm.text === fm.text) {
            p = i + 1;
            return {
              ...fm,
              meta: lm.meta,
              files: lm.files,
              attachments: lm.attachments,
              timestamp: lm.timestamp || fm.timestamp,
            };
          }
        }
        return fm;
      });
      setMessages(merged);
      persist(merged);
      // File yang selamat lewat penggabungan ini (mis. dari
      // riwayat lokal lama) ikut dicatat ke gudang sesi agar
      // tetap menempel sesudah berpindah sesi.
      for (const m of merged) {
        if (m.sender === "ai" && m.files && m.files.length > 0) {
          rememberSessionFiles(sid, m.text, m.files);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Tombol Stop (21 Nov 2026): membatalkan stream di klien
      // lewat AbortController + best-effort meminta backend
      // menghentikan giliran di serve (POST sessions/{id}/abort;
      // endpoint backend menyusul — panggilan ini aman gagal).
      // Bendera userStopped membedakan berhenti atas perintah
      // pengguna dari stream putus: jalur pemulihan jawaban
      // TIDAK boleh berjalan sesudah Stop.
      const controller = new AbortController();
      let userStopped = false;
      stopRef.current = () => {
        userStopped = true;
        try {
          const sid = localStorage.getItem(SESSION_KEY);
          if (sid) {
            void fetch(
              apiUrl(`/v1/opencode/sessions/${sid}/abort?role=admin`),
              { method: "POST", headers: authHeaders() },
            ).catch(() => {});
          }
        } catch {
          /* abaikan */
        }
        controller.abort();
      };
      const stoppedText = () =>
        segText
          ? `${segText}\n\n⏹️ *Dihentikan oleh pengguna.*`
          : "⏹️ *Dihentikan oleh pengguna.*";
      const startTime = performance.now();
      let allText = "";
      let streamUsage: BackendUsage | null = null;
      let streamModel: string | null = null;
      let streamTools: string[] = [];
      let streamFiles: ChatFile[] = [];
      let sawDone = false;
      let streamStarted = false;
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
          if (streamFiles.length > 0) {
            try {
              const sidNow = localStorage.getItem(SESSION_KEY);
              if (sidNow) {
                rememberSessionFiles(sidNow, finalText, streamFiles);
              }
            } catch {
              /* abaikan */
            }
          }
          return withMeta;
        });
        void loadSessions();
      };

      // Render per-delta: setiap potongan teks SSE langsung ditulis
      // ke gelembung segmen aktif dan dirender ChatMarkdown dari
      // string gabungannya.

      // Pemulihan jawaban saat stream putus di tengah (insiden
      // 21 Nov: koneksi streaming diputus proxy saat agent sepi
      // menjalankan tool ±98 dtk — agent MENYELESAIKAN gilirannya
      // di serve, tetapi browser hanya melihat "network error").
      // Ambil teks assistant sesudah pesan user terakhir dari
      // riwayat sesi backend; dianggap final bila isinya sama di
      // dua pengambilan berurutan (agent sudah berhenti menulis).
      // Batalkan pemulihan bila agent ternyata menunggu jawaban
      // HITL (form/izin tertunda) — alur ganti sesi yang memulihkannya.
      const tryRecoverAnswer = async (): Promise<string | null> => {
        let sid: string | null = null;
        try {
          sid = localStorage.getItem(SESSION_KEY);
        } catch {
          sid = null;
        }
        if (!sid) return null;
        setRecovering(true);
        setWaitingBoth(true);
        let lastSeen = "";
        try {
          for (let i = 0; i < 36; i++) {
            await new Promise((r) => setTimeout(r, 5000));
            try {
              const [msgRes, formRes, permRes] = await Promise.all([
                fetch(
                  apiUrl(`/v1/opencode/sessions/${sid}/messages?role=admin`),
                  { headers: authHeaders() },
                ),
                fetch(apiUrl(`/v1/opencode/sessions/${sid}/forms?role=admin`), {
                  headers: authHeaders(),
                }),
                fetch(
                  apiUrl(`/v1/opencode/sessions/${sid}/permissions?role=admin`),
                  { headers: authHeaders() },
                ),
              ]);
              if (!msgRes.ok) continue;
              const forms = formRes.ok
                ? ((await formRes.json()) as { forms?: unknown[] }).forms ?? []
                : [];
              const perms = permRes.ok
                ? ((await permRes.json()) as { permissions?: unknown[] })
                    .permissions ?? []
                : [];
              if (forms.length > 0 || perms.length > 0) return null;
              const data = (await msgRes.json()) as {
                messages?: RawSessionMessage[];
              };
              const list = orderSessionMessages(data.messages ?? [])
                .map(parseSessionMessage)
                .filter(
                  (x): x is { sender: "user" | "ai"; text: string } =>
                    x !== null,
                );
              let lastUser = -1;
              for (let j = list.length - 1; j >= 0; j--) {
                if (list[j].sender === "user") {
                  lastUser = j;
                  break;
                }
              }
              if (lastUser === -1) continue;
              const candidate = list
                .slice(lastUser + 1)
                .filter((m) => m.sender === "ai")
                .map((m) => m.text)
                .filter(Boolean)
                .join("\n\n");
              if (candidate && candidate === lastSeen) return candidate;
              if (candidate) lastSeen = candidate;
            } catch {
              /* coba lagi di putaran berikutnya */
            }
          }
        } finally {
          setRecovering(false);
        }
        return null;
      };

      try {
        const response = await fetch(apiUrl(CHAT_ENDPOINT), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          signal: controller.signal,
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
        streamStarted = true;
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
              sawDone = true;
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
        if (userStopped) {
          finishWith(stoppedText());
          return;
        }
        if (!sawDone) {
          // Stream berakhir tanpa event done: jawaban mungkin
          // terpotong — coba pulihkan dari riwayat sesi dulu.
          const recovered = await tryRecoverAnswer();
          if (recovered) {
            finishWith(recovered);
            return;
          }
        }
        finishWith(segText || "(tidak ada jawaban)");
      } catch (err) {
        if (userStopped) {
          finishWith(stoppedText());
          return;
        }
        // Putus jaringan di tengah stream (TypeError dari reader)
        // bukan vonis gagal: coba pulihkan jawaban dari sesi.
        if (streamStarted && err instanceof TypeError) {
          const recovered = await tryRecoverAnswer();
          if (recovered) {
            finishWith(recovered);
            return;
          }
        }
        const msg =
          err instanceof Error ? err.message : "Terjadi kesalahan tak terduga.";
        setWaiting(false);
        ensureBubble();
        finishWith(`⚠️ ${msg}`);
      } finally {
        stopRef.current = null;
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

  // Muat riwayat pesan satu sesi dari backend (part teks saja).
  // null = gagal memuat; [] = sesi tanpa pesan teks.
  const fetchSessionMessages = async (
    sid: string,
  ): Promise<Message[] | null> => {
    try {
      const res = await fetch(
        apiUrl(`/v1/opencode/sessions/${sid}/messages?role=admin`),
        { headers: authHeaders() },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        messages?: RawSessionMessage[];
      };
      const msgs: Message[] = [];
      for (const m of orderSessionMessages(data.messages ?? [])) {
        const parsed = parseSessionMessage(m);
        if (!parsed) continue;
        const backendFiles =
          parsed.sender === "ai" ? pickFiles(m.files) : [];
        msgs.push({
          id: `hist_${msgs.length}`,
          sender: parsed.sender,
          text: parsed.text,
          timestamp: "",
          ...(backendFiles.length > 0 ? { files: backendFiles } : {}),
        });
      }
      return attachStoredFiles(sid, msgs);
    } catch {
      return null;
    }
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
      const msgs = await fetchSessionMessages(sid);
      if (!msgs) throw new Error("gagal memuat");
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

  // Hapus sesi permanen (kontrak backend: DELETE
  // /v1/opencode/sessions/{id}?role=admin — prompt serah-terima
  // sesi Backend 21 Nov; backend lama menjawab 404/405 dan UI
  // menampilkan catatan itu, bukan gagal diam-diam). Menghapus
  // sesi yang sedang aktif mereset panel ke sesi baru.
  const deleteSession = async (sid: string) => {
    setSessError("");
    try {
      const res = await fetch(
        apiUrl(`/v1/opencode/sessions/${sid}?role=admin`),
        { method: "DELETE", headers: authHeaders() },
      );
      if (!res.ok) {
        setSessError(
          res.status === 404 || res.status === 405
            ? "Backend belum mendukung hapus sesi (endpoint DELETE belum tersedia)."
            : `Gagal menghapus sesi (${res.status}).`,
        );
        return;
      }
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      setSessConfirm(null);
      if (sid === currentSession) clearChat();
    } catch {
      setSessError("Gagal menghapus sesi — backend tidak terjangkau.");
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
    <div key={card.id} className={MSG_AI}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={MSG_AVATAR} src="/vienna.svg" alt="" width={26} height={26} />
      <div className={MSG_COL_AI}>
        {card.status === "cancelled" ? (
          <div className="min-w-[min(430px,72vw)] rounded-[14px] rounded-bl-[4px] border border-line3 border-l-[3px] border-l-steel bg-panel2 px-3.5 py-2.5 text-[13.5px] text-[#8298C0]">
            {card.kind === "form"
              ? "Pertanyaan ini sudah tidak berlaku."
              : "Permintaan persetujuan ini sudah tidak berlaku."}
          </div>
        ) : card.kind === "form" && card.form ? (
          <div
            className={
              card.status === "answered" ? `${HITL_CARD} border-l-[#00FFAA] opacity-85` : `${HITL_CARD} border-l-accent`
            }
          >
            <div className={HITL_HEAD}>
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
                <div key={f.key} className="mb-3.5">
                  <div className="mb-[3px] text-[13.5px] font-semibold text-[#DCE7FA]">{f.title}</div>
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
                                  ? `${HITL_OPTION} border-accent bg-[rgba(0,255,170,0.14)]`
                                  : `${HITL_OPTION} border-line3 bg-[rgba(255,255,255,0.03)]`
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
                                  className="inline-flex cursor-pointer items-center gap-[5px] rounded-full border border-[rgba(0,255,170,0.45)] bg-[rgba(0,255,170,0.14)] px-[9px] py-[3px] text-[12.5px] text-[#C8F7E6] disabled:cursor-default disabled:opacity-75"
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
                            className={`${HITL_INPUT} mt-2`}
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
                            className={`${HITL_INPUT} mt-2`}
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
                      className={HITL_INPUT}
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
                      className={HITL_INPUT}
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
              <div className="flex items-center gap-[7px] text-[13px] font-semibold text-[#00FFAA]">
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
                      className={HITL_BTN_PRIMARY}
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
                    className={HITL_BTN}
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
              card.status === "answered" ? `${HITL_CARD} border-l-[#00FFAA] opacity-85` : `${HITL_CARD} border-l-accent`
            }
          >
            <div className={HITL_HEAD}>
              <ShieldAlert size={15} />
              <span>Persetujuan aksi</span>
            </div>
            <div className="mb-1.5 font-semibold break-anywhere text-[#DCE7FA]">{card.permission.action}</div>
            {card.permission.resources &&
              card.permission.resources.length > 0 && (
                <ul className="m-0 mb-1.5 pl-[18px] text-[12.5px] break-anywhere text-fog">
                  {card.permission.resources.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              )}
            {card.status === "answered" ? (
              <div className="flex items-center gap-[7px] text-[13px] font-semibold text-[#00FFAA]">
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
                  className={HITL_BTN_PRIMARY}
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "once")}
                >
                  Izinkan sekali
                </button>
                <button
                  type="button"
                  className={HITL_BTN}
                  disabled={card.status === "sending"}
                  onClick={() => void replyPermission(card, "always")}
                >
                  Selalu izinkan
                </button>
                <button
                  type="button"
                  className={HITL_BTN_DANGER}
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

  const sessionTitle =
    sessions.find((s) => s.id === currentSession)?.title ||
    (currentSession ? "Sesi berjalan" : "Sesi baru");

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-2xl border border-line bg-[rgba(12,12,15,0.55)]"
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
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center rounded-2xl border-2 border-dashed border-accent bg-[rgba(0,255,170,0.12)] text-[15px] font-semibold text-[#C8F7E6]">Lepaskan file untuk melampirkan</div>
      )}
      {/* Kepala chat gaya aplikasi chat umum (permintaan user
          18 Nov): judul sesi + status instance di kiri; pemilih
          sesi & tombol sesi baru di kanan. */}
      <div className="flex flex-wrap items-center gap-3.5 border-b border-[#1e1e22] bg-[rgba(255,255,255,0.015)] px-[18px] py-3">
        <div className="min-w-0">
          <div className="max-w-[430px] truncate text-[16.5px] font-[650] text-[#EEF4FF]">{sessionTitle}</div>
          <div className="mt-0.5 flex items-center gap-[7px] text-[12.5px] text-[#93A9D1]">
            <span
              className={`h-2 w-2 flex-none rounded-full ${instStatus === "ok" ? "bg-[#00FFAA]" : instStatus === "unreachable" ? "bg-[#f87171]" : "bg-[#4C63A0]"}`}
              aria-hidden="true"
            />
            {instStatus === null
              ? "Memeriksa instance administrator…"
              : instStatus === "ok"
                ? `Administrator aktif${instModel ? ` · ${instModel}` : ""}`
                : "Instance administrator tidak terjangkau — pastikan backend & opencode-core admin berjalan."}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className={NEW_BTN}
              onClick={() => {
                setSessOpen((o) => !o);
                setSessConfirm(null);
                setSessError("");
              }}
              aria-expanded={sessOpen}
              title="Kelola sesi chat (buka / hapus)"
            >
              <History size={15} /> Sesi
            </button>
            {sessOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSessOpen(false)}
                />
                <div className="absolute top-[calc(100%+8px)] right-0 z-[41] max-h-[380px] w-[min(360px,86vw)] overflow-y-auto rounded-xl border border-[#22336A] bg-panel p-2 shadow-[0_18px_48px_rgba(0,0,0,0.55)]">
                  <div className="px-2 pt-1.5 pb-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-[#93A9D1]">Sesi chat tersimpan</div>
                  {sessions.length === 0 && (
                    <div className="px-2 pt-1 pb-2.5 text-[13px] text-[#93A9D1]">
                      Belum ada sesi tersimpan.
                    </div>
                  )}
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-1.5 rounded-[9px] px-0.5 py-0.5 pl-1 ${s.id === currentSession ? "bg-[#17171b] shadow-[inset_2px_0_0_#00FFAA]" : "hover:bg-[#17171b]"}`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-px border-none px-1 py-1.5 text-left text-[#DCE7FA] [background:none]"
                        disabled={busy}
                        onClick={() => {
                          setSessOpen(false);
                          void switchSession(s.id);
                        }}
                        title="Buka sesi ini"
                      >
                        <span className="max-w-full truncate text-[13px] font-medium">
                          {s.title || s.id}
                        </span>
                        <span className="text-[11px] text-[#93A9D1]">
                          {formatSessionTime(s.time?.updated)}
                        </span>
                      </button>
                      {sessConfirm === s.id ? (
                        <span className="inline-flex flex-none items-center gap-1 pr-0.5 text-xs text-[#ff9a9a]">
                          <span>Hapus?</span>
                          <button
                            type="button"
                            className={SESS_ICON_DANGER}
                            onClick={() => void deleteSession(s.id)}
                            title="Ya, hapus sesi ini"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            className={SESS_ICON}
                            onClick={() => setSessConfirm(null)}
                            title="Batal"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={SESS_ICON}
                          disabled={busy}
                          onClick={() => setSessConfirm(s.id)}
                          title="Hapus sesi ini"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  {sessError && (
                    <div className="mt-1.5 border-t border-line px-2 py-2 text-xs text-[#ff9a9a]">{sessError}</div>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            className={NEW_BTN}
            onClick={clearChat}
            title="Mulai sesi baru"
          >
            <SquarePen size={15} /> Sesi baru
          </button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto border-b border-[#1e1e22] px-[18px] py-4 [scrollbar-width:thin] [scrollbar-color:#2C3F78_transparent] [&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-thumb]:rounded-[99px] [&::-webkit-scrollbar-thumb]:bg-[#2C3F78] [&::-webkit-scrollbar-track]:bg-transparent"
        ref={logRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        }}
      >
        {messages.map((m, i) => (
          <Fragment key={m.id ?? i}>
            <div className={m.sender === "user" ? MSG_USER : MSG_AI}>
              {m.sender === "ai" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={MSG_AVATAR} src="/vienna.svg" alt="" width={26} height={26} />
              )}
              <div className={m.sender === "user" ? MSG_COL_USER : MSG_COL_AI}>
                <div className={m.sender === "user" ? BUBBLE_USER : BUBBLE_AI}>
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
                <FileCards files={m.files} onReview={openReview} />
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {m.attachments.map((a, j) => (
                      <span key={j} className="inline-flex items-center gap-[5px] rounded-full border border-line bg-[rgba(255,255,255,0.05)] px-[9px] py-[3px] text-xs text-[#AFC2E6]">
                        <Paperclip size={12} /> {a.name} ·{" "}
                        {formatSize(a.size)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-[5px] text-[11.5px] text-[#67799F]">
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
          <div className={MSG_AI}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={MSG_AVATAR} src="/vienna.svg" alt="" width={26} height={26} />
            <div className={MSG_COL_AI}>
              <div className={`${BUBBLE_AI} msg-typing`}>
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        {/* Status tool yang sedang berjalan (event meta.tool). */}
        {toolName && busy && (
          <div className="mt-[-2px] mb-1.5 flex items-center gap-[7px] pl-9 text-[12.5px] text-fog" role="status">
            <LoaderCircle size={13} className="tool-status-spin" />
            <span>{toolLabel(toolName)}</span>
          </div>
        )}

        {/* Status pemulihan jawaban (stream putus di tengah). */}
        {recovering && busy && (
          <div className="mt-[-2px] mb-1.5 flex items-center gap-[7px] pl-9 text-[12.5px] text-fog" role="status">
            <LoaderCircle size={13} className="tool-status-spin" />
            <span>Koneksi terputus — memulihkan jawaban dari sesi…</span>
          </div>
        )}

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

      <div className="w-full px-[18px] pt-3 pb-3.5">
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 pt-1 pb-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              className="cursor-pointer rounded-full border border-line bg-panel2 px-3 py-1.5 text-[13px] text-[#AFC2E6] hover:border-accent hover:text-white disabled:cursor-default disabled:opacity-50"
              onClick={() => void send(s)}
              disabled={busy}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {pending.map((p) => (
            <span
              key={p.localId}
              className={`inline-flex max-w-full items-center gap-1.5 rounded-full border bg-panel2 py-1 pr-1.5 pl-2.5 text-[12.5px] ${p.status === "error" ? "border-[rgba(255,110,110,0.5)] text-[#ff9c9c]" : "border-line text-[#C3D2F0]"}`}
              title={p.error || p.name}
            >
              {p.status === "uploading" ? (
                <LoaderCircle size={13} className="aag-spin" />
              ) : p.status === "error" ? (
                <AlertCircle size={13} />
              ) : (
                <FileText size={13} />
              )}
              <span className="max-w-[220px] truncate">{p.name}</span>
              <span className="text-[11.5px] text-[#8298C0]">{formatSize(p.size)}</span>
              <button
                type="button"
                className="inline-flex h-[18px] w-[18px] flex-none cursor-pointer items-center justify-center rounded-full border-none bg-[rgba(255,255,255,0.06)] text-inherit"
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
        className="flex items-end gap-2.5 rounded-[14px] border border-line bg-panel py-2 pr-2 pl-3.5"
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
          className={TOOL_BTN}
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          aria-label="Lampirkan file"
          title="Lampirkan file (maks 5 berkas, 10 MB per berkas) — atau jatuhkan/tempel berkas ke panel"
        >
          <Paperclip size={17} />
        </button>
        <textarea
          className="max-h-[120px] min-w-0 flex-1 resize-none border-0 bg-transparent py-[7px] text-[15px] leading-[1.45] text-[#DCE7FA] outline-none [font-family:inherit] placeholder:text-fog"
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
            className={listening ? "inline-flex h-9 w-9 flex-[0_0_auto] cursor-pointer animate-[aag-pulse_1.2s_ease-in-out_infinite] items-center justify-center rounded-[10px] border border-[#d92d20] bg-[#d92d20] text-white disabled:cursor-default disabled:opacity-45" : TOOL_BTN}
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
        {busy ? (
          <button
            type="button"
            className="inline-flex h-9 w-9 flex-[0_0_auto] cursor-pointer items-center justify-center rounded-[10px] border-0 bg-danger text-white hover:bg-[#e0343f]"
            onClick={() => stopRef.current?.()}
            aria-label="Hentikan agent"
            title="Hentikan agent"
          >
            <Square size={15} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            className={QP_SEND}
            disabled={
              pending.some((p) => p.status === "uploading") ||
              (!input.trim() &&
                !pending.some((p) => p.status === "ready"))
            }
            aria-label="Kirim perintah"
          >
            <SendHorizontal size={17} />
          </button>
        )}
      </form>
      </div>
      {reviewWins.map((w, i) => (
        <FileReviewWindow
          key={w.file.path}
          file={w.file}
          zIndex={60 + i}
          spawnIndex={w.spawn}
          minimized={w.min}
          onToggleMinimize={() => toggleReviewMin(w.file.path)}
          onClose={() => closeReviewWin(w.file.path)}
          onFocus={() => focusReviewWin(w.file.path)}
        />
      ))}
      {reviewFile && (
        <FileReviewModal
          file={reviewFile}
          onClose={() => setReviewFile(null)}
        />
      )}
      {reviewNotice && (
        <div className="fixed bottom-[26px] left-1/2 z-[70] max-w-[min(92vw,560px)] -translate-x-1/2 rounded-full border border-[#0F3D2C] bg-[#0B2E24] px-4 py-2.5 text-center text-[0.82rem] font-semibold text-[#7CF7CF] shadow-[0_16px_40px_rgba(0,0,0,0.5)]" role="status">
          {reviewNotice}
        </div>
      )}
    </div>
  );
}
