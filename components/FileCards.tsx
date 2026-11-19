import { useState } from "react";
import { ChevronDown, Download, FileCode, FileText } from "lucide-react";
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
}: {
  file: ChatFile;
  defaultOpen: boolean;
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

export default function FileCards({ files }: { files?: ChatFile[] }) {
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
        />
      ))}
    </div>
  );
}
