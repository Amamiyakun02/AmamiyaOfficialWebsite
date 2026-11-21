import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
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
    <div className="file-card">
      <div className="file-card-head">
        <Icon size={16} className="file-card-icon" />
        <div className="file-card-info">
          <div className="file-card-name">
            {file.name}
            <span className="file-card-size">{formatSize(file.size)}</span>
          </div>
          <div className="file-card-path">{file.path}</div>
        </div>
        {onReview && (
          <button
            type="button"
            className="file-card-btn"
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
              className="file-card-btn"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              title={open ? "Tutup pratinjau" : "Lihat pratinjau"}
            >
              <ChevronDown
                size={15}
                className={open ? "file-chev is-open" : "file-chev"}
              />
            </button>
            <button
              type="button"
              className="file-card-btn"
              onClick={() => downloadFile(file)}
              title={`Unduh ${file.name}`}
            >
              <Download size={15} />
            </button>
          </>
        )}
      </div>
      {hasContent && open && (
        <div className="file-preview">
          <HighlightedCode lang={lang} code={file.content as string} />
        </div>
      )}
      {!hasContent && <div className="file-omitted">{omittedNote}</div>}
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
    <div className="file-cards">
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
   Isi review (ReviewBody): kode ter-highlight DENGAN nomor
   baris + metadata lengkap — nama file, folder proyek, path,
   ukuran, jumlah baris, bahasa, status konten. Konten
   mengikuti kontrak files[] yang sama (teks ≤ 64 KB ikut di
   payload; lebih besar/biner hanya metadata yang bisa
   ditampilkan). Di desktop review tampil sebagai JENDELA
   mengambang per file (FileReviewWindow) yang bisa digeser,
   di-minimize, dan ditutup — beberapa jendela bisa terbuka
   bersamaan; di non-desktop sebagai modal tunggal
   (FileReviewModal).
   ===================================================================== */

function ReviewBody({
  file,
  footerExtra,
}: {
  file: ChatFile;
  footerExtra?: ReactNode;
}) {
  const hasContent = typeof file.content === "string";
  const content = hasContent ? (file.content as string) : "";
  const rawLines = hasContent ? content.split("\n") : [];
  // Baris terakhir kosong (newline penutup) tidak dihitung.
  const lineCount =
    rawLines.length > 0 && rawLines[rawLines.length - 1] === ""
      ? rawLines.length - 1
      : rawLines.length;
  const lang = langFromName(file.name);
  const slash = file.path.lastIndexOf("/");
  const folder = slash > 0 ? file.path.slice(0, slash) : "";
  const project = folder ? folder.split("/")[0] : "";
  const omittedNote =
    file.content_omitted === "too_large"
      ? "Dihilangkan — file terlalu besar (> 64 KB)"
      : file.content_omitted === "binary"
        ? "Dihilangkan — file biner"
        : "Tidak disertakan backend";

  const meta: { label: string; value: string }[] = [
    { label: "Nama file", value: file.name },
    { label: "Folder proyek", value: project || "—" },
    { label: "Folder", value: folder || "(akar workspace)" },
    { label: "Path lengkap", value: file.path },
    { label: "Ukuran", value: formatSize(file.size) },
    { label: "Baris", value: hasContent ? `${lineCount} baris` : "—" },
    { label: "Bahasa", value: lang },
    { label: "Konten", value: hasContent ? "Utuh" : omittedNote },
  ];

  return (
    <>
      <div className="review-meta">
        {meta.map((m) => (
          <div key={m.label} className="review-meta-item">
            <span className="review-meta-label">{m.label}</span>
            <span className="review-meta-value">{m.value}</span>
          </div>
        ))}
      </div>
      {hasContent ? (
        <div className="review-codewrap">
          <div className="review-gutter" aria-hidden="true">
            {Array.from({ length: lineCount }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </div>
          <HighlightedCode lang={lang} code={content} />
        </div>
      ) : (
        <div className="file-omitted review-omitted">{omittedNote}</div>
      )}
      <div className="review-foot">
        {hasContent && (
          <button
            type="button"
            className="aag-new-btn"
            onClick={() => downloadFile(file)}
          >
            <Download size={14} /> Unduh file
          </button>
        )}
        {footerExtra}
      </div>
    </>
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
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal review-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Review ${file.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-modal-head">
          <span className="dash-modal-title">
            {langFromName(file.name) === "text" ? (
              <FileText size={16} />
            ) : (
              <FileCode size={16} />
            )}{" "}
            {file.name}
          </span>
          <button
            type="button"
            className="dicon-btn"
            onClick={onClose}
            title="Tutup review"
          >
            <X size={16} />
          </button>
        </div>
        <ReviewBody
          file={file}
          footerExtra={
            <button type="button" className="aag-new-btn" onClick={onClose}>
              Tutup
            </button>
          }
        />
      </div>
    </div>
  );
}

/* Jendela review mengambang per file (desktop): bisa
   DIGESER dari kepala jendelanya, di-MINIMIZE menjadi
   kepala saja, dan di-TUTUP — seperti jendela aplikasi.
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

  if (!pos) return null;

  return (
    <div
      className="review-window"
      role="dialog"
      aria-label={`Review ${file.name}`}
      style={{
        left: pos.x,
        top: pos.y,
        zIndex,
        width: minimized ? "min(430px, 94vw)" : undefined,
      }}
      onPointerDown={onFocus}
    >
      <div className="review-win-head" onPointerDown={onHeadPointerDown}>
        <span className="review-win-title">
          {langFromName(file.name) === "text" ? (
            <FileText size={15} />
          ) : (
            <FileCode size={15} />
          )}
          {file.name}
          <span className="review-win-path">{file.path}</span>
        </span>
        <span className="review-win-actions">
          <button
            type="button"
            className="file-card-btn"
            onClick={onToggleMinimize}
            title={minimized ? "Pulihkan jendela" : "Minimize"}
          >
            {minimized ? <ChevronUp size={15} /> : <Minus size={15} />}
          </button>
          <button
            type="button"
            className="file-card-btn"
            onClick={onClose}
            title="Tutup review"
          >
            <X size={15} />
          </button>
        </span>
      </div>
      {!minimized && <ReviewBody file={file} />}
    </div>
  );
}
