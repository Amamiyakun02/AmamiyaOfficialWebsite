import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileCode,
  FileText,
  Minus,
  X,
} from "lucide-react";
import { HighlightedCode } from "@/components/ChatMarkdown";
import { DICON_LAYOUT, DICON_NEUTRAL } from "./dashboard/ui";

const FC_BTN =
  "inline-flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-[7px] border border-line3 bg-[#11245F] text-[#AFC2E6] hover:border-steel hover:text-white";
const CODEWRAP =
  "mx-5 mt-3 mb-1 flex min-h-0 items-start overflow-auto rounded-[10px] border border-line bg-[#050E2E] [&_.msg-code]:m-0 [&_.msg-code]:flex-1 [&_.msg-code]:border-none [&_.msg-code]:rounded-none [&_.msg-code]:bg-transparent [&_.msg-code]:leading-[1.55] [&_.msg-code]:overflow-visible";
const MODAL_X = `${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`;


/* =====================================================================
   Kartu lampiran file hasil kerja agent (kedua chat). Kontrak
   backend (commit 2471994, 19 Nov 2026): event done stream dan
   respons /chat membawa "files" — file yang dibuat/diubah agent
   pada giliran itu, ditangkap backend dari tool write/edit:
   {name, path, size, content}. content = isi teks utuh hanya bila
   file teks UTF-8 ≤ 64 KB; bila tidak, content null +
   content_omitted ("too_large" | "binary") dan unduhan mustahil
   (tidak ada endpoint unduhan — tombol unduh dibuat dari Blob
   klien dari content yang sudah ikut di payload).
   ===================================================================== */

export type ChatFile = {
  name: string;
  path: string;
  size: number;
  content: string | null;
  content_omitted?: string;
};

/* Ekstensi → bahasa highlighter (nama pendek diselesaikan
   ChatMarkdown/highlight.js; tak dikenal jatuh ke text polos). */
const EXT_LANG: Record<string, string> = {
  py: "python",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  md: "markdown",
  txt: "text",
  sh: "bash",
};

function langFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_LANG[ext] ?? "text";
}

export function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024)
    return `${kb.toFixed(1).replace(".", ",").replace(/,0$/, "")} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1).replace(".", ",").replace(/,0$/, "")} MB`;
}

const MIME_BY_EXT: Record<string, string> = {
  json: "application/json",
  html: "text/html",
  css: "text/css",
  md: "text/markdown",
};

function downloadFile(f: ChatFile) {
  if (f.content == null) return;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  const blob = new Blob([f.content], {
    type: `${MIME_BY_EXT[ext] ?? "text/plain"};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function FileCard({
  file,
  defaultOpen,
  onReview,
}: {
  file: ChatFile;
  defaultOpen: boolean;
  onReview?: (f: ChatFile) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = typeof file.content === "string";
  const lang = langFromName(file.name);
  const Icon = lang === "text" ? FileText : FileCode;
  const omittedNote =
    file.content_omitted === "too_large"
      ? "File terlalu besar untuk ditampilkan"
      : file.content_omitted === "binary"
        ? "File biner — pratinjau tidak tersedia"
        : "Pratinjau tidak tersedia";
  return (
    <div className="rounded-[10px] border border-line bg-panel px-[11px] py-[9px]">
      <div className="flex items-start gap-[9px]">
        <Icon size={16} className="mt-0.5 flex-none text-[#5EEAD0]" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] break-anywhere text-white [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
            {file.name}
            <span className="ml-[7px] text-[11.5px] whitespace-nowrap text-fog">{formatSize(file.size)}</span>
          </div>
          <div className="text-[11.5px] break-anywhere text-[#67799F]">{file.path}</div>
        </div>
        {onReview && (
          <button
            type="button"
            className={FC_BTN}
            onClick={() => onReview(file)}
            title="Review file ini (kode + metadata lengkap)"
          >
            <Eye size={15} />
          </button>
        )}
        {hasContent && (
          <>
            <button
              type="button"
              className={FC_BTN}
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              title={open ? "Tutup pratinjau" : "Lihat pratinjau"}
            >
              <ChevronDown
                size={15}
                className={`transition-transform duration-[180ms] [transition-timing-function:ease] ${open ? "rotate-180" : ""}`}
              />
            </button>
            <button
              type="button"
              className={FC_BTN}
              onClick={() => downloadFile(file)}
              title={`Unduh ${file.name}`}
            >
              <Download size={15} />
            </button>
          </>
        )}
      </div>
      {hasContent && open && (
        <div className="mt-2 max-h-[320px] overflow-y-auto rounded-lg [&_.msg-code]:m-0">
          <HighlightedCode lang={lang} code={file.content as string} />
        </div>
      )}
      {!hasContent && <div className="mt-1.5 text-[12.5px] text-fog italic">{omittedNote}</div>}
    </div>
  );
}

export default function FileCards({
  files,
  onReview,
}: {
  files?: ChatFile[];
  onReview?: (f: ChatFile) => void;
}) {
  if (!files || files.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-2">
      {files.map((f, i) => (
        <FileCard
          key={`${f.path}-${i}`}
          file={f}
          // Satu file: pratinjau langsung terbuka; banyak file:
          // tertutup agar aliran chat tetap ringkas.
          defaultOpen={files.length === 1}
          onReview={onReview}
        />
      ))}
    </div>
  );
}

/* =====================================================================
   Review file hasil agent (dashboard admin, 21 Nov 2026).
   Isi review (ReviewBody): HANYA kode ter-highlight DENGAN
   nomor baris — metadata dan tombol unduh dibuang atas
   keputusan user agar area kode lega (nama + lokasi sudah
   ada di kepala jendela dan di kartu file). Konten
   mengikuti kontrak files[] yang sama (teks ≤ 64 KB ikut di
   payload; lebih besar/biner hanya catatan yang bisa
   ditampilkan). Di desktop review tampil sebagai JENDELA
   mengambang per file (FileReviewWindow) yang bisa digeser,
   di-minimize, dan ditutup — beberapa jendela bisa terbuka
   bersamaan; di non-desktop sebagai modal tunggal
   (FileReviewModal).
   ===================================================================== */

/* Isi review = HANYA area kode (atau catatan konten
   dihilangkan). Metadata (nama, path, ukuran, baris, bahasa)
   dan tombol unduh SENGAJA dibuang atas keputusan user
   (21 Nov 2026): nama + lokasi sudah ada di kepala jendela/
   modal dan di kartu file, jadi area review dibuat lega
   khusus untuk membaca kode. Unduh tetap bisa dari kartu
   file di chat. */
function ReviewBody({ file, inWindow }: { file: ChatFile; inWindow?: boolean }) {
  const hasContent = typeof file.content === "string";
  const content = hasContent ? (file.content as string) : "";
  const rawLines = hasContent ? content.split("\n") : [];
  // Baris terakhir kosong (newline penutup) tidak dihitung.
  const lineCount =
    rawLines.length > 0 && rawLines[rawLines.length - 1] === ""
      ? rawLines.length - 1
      : rawLines.length;
  const lang = langFromName(file.name);
  const omittedNote =
    file.content_omitted === "too_large"
      ? "Konten dihilangkan — file terlalu besar (> 64 KB)"
      : file.content_omitted === "binary"
        ? "Konten dihilangkan — file biner"
        : "Konten tidak disertakan backend";

  if (!hasContent) {
    return <div className="mx-5 mt-3 mb-1 text-[12.5px] text-fog italic">{omittedNote}</div>;
  }
  return (
    <div className={inWindow ? `${CODEWRAP} flex-1` : CODEWRAP}>
      <div className="flex flex-none flex-col border-r border-line py-2.5 pr-2.5 pl-3 text-right text-[13px] leading-[1.55] text-[#4C63A0] select-none [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]" aria-hidden="true">
        {Array.from({ length: lineCount }, (_, i) => (
          <span key={i}>{i + 1}</span>
        ))}
      </div>
      <HighlightedCode lang={lang} code={content} />
    </div>
  );
}

/* Modal review TUNGGAL — dipakai di layar non-desktop
   (< 1024px), tempat jendela multi-tab dimatikan atas
   keputusan user (21 Nov 2026): di HP/tablet review tetap
   modal biasa satu file seperti versi awal. */
export function FileReviewModal({
  file,
  onClose,
}: {
  file: ChatFile;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(4,4,6,0.66)] px-4 py-6 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-48px)] w-[min(920px,100%)] flex-col rounded-2xl border border-[#22336A] bg-panel shadow-[0_24px_64px_rgba(0,0,0,0.55)] animate-[dash-modal-in_0.16s_ease] motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${file.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <span>
            {langFromName(file.name) === "text" ? (
              <FileText size={16} />
            ) : (
              <FileCode size={16} />
            )}{" "}
            {file.name}
          </span>
          <button
            type="button"
            className={MODAL_X}
            onClick={onClose}
            title="Tutup review"
          >
            <X size={16} />
          </button>
        </div>
        <ReviewBody file={file} />
      </div>
    </div>
  );
}

/* Jendela review mengambang per file (desktop): bisa
   DIGESER dari kepala jendelanya, di-MINIMIZE menjadi
   kepala saja, di-TUTUP, dan DIUBAH UKURANNYA dari tepi
   kanan/bawah/sudut kanan bawah — seperti jendela aplikasi.
   Posisi awal di tengah layar dengan geseran tangga per
   jendela (spawnIndex) agar beberapa jendela tidak menumpuk
   persis. Klik di mana pun pada jendela membawanya ke depan
   (onFocus; urutan render panel = urutan z). */
export function FileReviewWindow({
  file,
  zIndex,
  spawnIndex,
  minimized,
  onToggleMinimize,
  onClose,
  onFocus,
}: {
  file: ChatFile;
  zIndex: number;
  spawnIndex: number;
  minimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
  onFocus: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    const off = (spawnIndex % 6) * 30;
    const w = Math.min(920, window.innerWidth - 16);
    setPos({
      x: Math.max(8, (window.innerWidth - w) / 2 + off),
      y: Math.max(8, Math.round(window.innerHeight * 0.07) + off),
    });
    // Hanya saat mount: jendela yang ditata ulang z-nya oleh
    // panel tidak boleh melompat balik ke posisi awal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onHeadPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (!pos) return;
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setPos({
        x: Math.min(Math.max(0, ev.clientX - d.dx), window.innerWidth - 120),
        y: Math.min(Math.max(0, ev.clientY - d.dy), window.innerHeight - 48),
      });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  // Ubah ukuran dari tepi kanan ("r"), tepi bawah ("b"), atau
  // sudut kanan bawah ("br") — seperti jendela aplikasi.
  // Ukuran awal jendela mengikuti isi; sekali di-resize,
  // lebar+tinggi menjadi eksplisit dari rect saat mulai.
  const startResize =
    (mode: "r" | "b" | "br") => (e: ReactPointerEvent) => {
      if (!pos) return;
      e.preventDefault();
      e.stopPropagation();
      const win = (e.currentTarget as HTMLElement).closest("[data-review-window]");
      if (!win) return;
      const rect = win.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = rect.width;
      const startH = rect.height;
      const maxW = window.innerWidth - pos.x - 8;
      const maxH = window.innerHeight - pos.y - 8;
      const move = (ev: PointerEvent) => {
        setSize({
          w:
            mode === "b"
              ? startW
              : Math.min(Math.max(380, startW + ev.clientX - startX), maxW),
          h:
            mode === "r"
              ? startH
              : Math.min(Math.max(220, startH + ev.clientY - startY), maxH),
        });
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };

  if (!pos) return null;

  return (
    <div
      data-review-window=""
      className="fixed z-[60] flex max-h-[88vh] w-[min(920px,96vw)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_24px_64px_rgba(0,0,0,0.55)]"
      role="dialog"
      aria-label={`Review ${file.name}`}
      style={{
        left: pos.x,
        top: pos.y,
        zIndex,
        width: minimized ? "min(430px, 94vw)" : size ? size.w : undefined,
        height: minimized || !size ? undefined : size.h,
      }}
      onPointerDown={onFocus}
    >
      <div className="flex cursor-grab items-center gap-2.5 border-b border-[#16296B] px-3 py-2.5 select-none [touch-action:none] active:cursor-grabbing" onPointerDown={onHeadPointerDown}>
        <span className="flex min-w-0 flex-1 items-center gap-[7px] text-[0.86rem] font-bold text-white">
          {langFromName(file.name) === "text" ? (
            <FileText size={15} />
          ) : (
            <FileCode size={15} />
          )}
          {file.name}
          <span className="truncate text-[0.72rem] font-medium text-[#8298C0]">{file.path}</span>
        </span>
        <span className="flex flex-none gap-0.5">
          <button
            type="button"
            className={FC_BTN}
            onClick={onToggleMinimize}
            title={minimized ? "Pulihkan jendela" : "Minimize"}
          >
            {minimized ? <ChevronUp size={15} /> : <Minus size={15} />}
          </button>
          <button
            type="button"
            className={FC_BTN}
            onClick={onClose}
            title="Tutup review"
          >
            <X size={15} />
          </button>
        </span>
      </div>
      {!minimized && <ReviewBody file={file} inWindow />}
      {!minimized && (
        <>
          <div
            className="absolute top-0 right-0 z-[2] h-full w-[7px] cursor-ew-resize [touch-action:none]"
            onPointerDown={startResize("r")}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-0 left-0 z-[2] h-[7px] w-full cursor-ns-resize [touch-action:none]"
            onPointerDown={startResize("b")}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 bottom-0 z-[3] h-[18px] w-[18px] cursor-nwse-resize [touch-action:none] after:absolute after:right-1 after:bottom-1 after:h-2 after:w-2 after:rounded-br-[4px] after:border-r-2 after:border-b-2 after:border-[#354C8C] after:content-['']"
            onPointerDown={startResize("br")}
            title="Seret untuk mengubah ukuran"
          />
        </>
      )}
    </div>
  );
}
