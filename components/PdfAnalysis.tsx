"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  SlidersHorizontal,
  AlertTriangle,
  X,
  RefreshCw,
  Clock,
  Layers,
  FileCheck,
  Search,
  Check,
  Scissors,
  ArrowLeft,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

// Porting PdfAnalysis lama (Tahap 2) dengan kontrak backend Vienna_Agent
// yang sama persis (terverifikasi di routers/pdf_api.py):
//   POST /v1/pdf/check-color?threshold=N  (multipart: file)
//        -> { total_pages, colored_pages[], grayscale_pages[], metadata,
//             pages_details[{page, is_colored}], detection_time_seconds }
//   POST /v1/pdf/cut                      (multipart: file + form pages)
//        -> berkas PDF (blob), nama dari Content-Disposition.
// Batas backend: PDF maks 25 MB / 500 halaman; pesan error backend
// diteruskan apa adanya (sudah Bahasa Indonesia dari FastAPI).

type PDFMetadata = {
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  creationDate: string;
  modDate: string;
  format: string;
  encryption: string;
};

type PDFPageDetail = {
  page: number;
  is_colored: boolean;
};

type PDFColorAnalysisResponse = {
  status: string;
  filename: string;
  file_size_bytes: number;
  file_size_formatted: string;
  total_pages: number;
  colored_pages_count: number;
  grayscale_pages_count: number;
  colored_pages: number[];
  grayscale_pages: number[];
  threshold_used: number;
  detection_time_seconds: number;
  metadata: PDFMetadata;
  pages_details: PDFPageDetail[];
};

// [1,2,3,5,8,9] -> "1-3, 5, 8-9"
function pageListToRangeString(nums: number[]): string {
  if (nums.length === 0) return "";
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(", ");
}

// "1-3, 5" -> [1,2,3,5] (dibatasi maxPages)
function rangeStringToPageList(str: string, maxPages: number): number[] {
  const pages = new Set<number>();
  for (const part of str.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (trimmed.includes("-")) {
      const sub = trimmed.split("-");
      if (sub.length === 2) {
        const start = parseInt(sub[0].trim());
        const end = parseInt(sub[1].trim());
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let p = start; p <= end; p++) {
            if (p >= 1 && p <= maxPages) pages.add(p);
          }
        }
      }
    } else {
      const p = parseInt(trimmed);
      if (!isNaN(p) && p >= 1 && p <= maxPages) pages.add(p);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Tanggal metadata PDF mentah berbentuk "D:20240101120000+07'00'".
function formatPdfDate(raw: string): string {
  if (!raw) return "-";
  const m = raw.match(
    /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/,
  );
  if (!m) return raw;
  const [, y, mo = "01", d = "01", hh, mm] = m;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const base = `${parseInt(d)} ${months[parseInt(mo) - 1] || ""} ${y}`;
  return hh && mm ? `${base}, ${hh}:${mm}` : base;
}

function filenameFromHeader(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const m = header.match(/filename\*?=(?:UTF-8''|")?([^";]+)"?/i);
  if (!m) return fallback;
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

async function readError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return (data && typeof data.detail === "string" && data.detail) || fallback;
}

export default function PdfAnalysis() {
  const [file, setFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState<number>(15);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<PDFColorAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const [activeFilter, setActiveFilter] = useState<
    "all" | "color" | "grayscale"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [rangeText, setRangeText] = useState<string>("");
  const [cutting, setCutting] = useState<boolean>(false);
  const [cutError, setCutError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File) => {
    setError(null);
    if (
      f.type === "application/pdf" ||
      f.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(f);
    } else {
      setError("Tipe file tidak valid. Hanya file PDF yang didukung.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      acceptFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setSelectedPages([]);
    setRangeText("");
    setCutting(false);
    setCutError(null);
    setActiveFilter("all");
    setSearchQuery("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(
        apiUrl(`/v1/pdf/check-color?threshold=${threshold}`),
        { method: "POST", body: formData },
      );
      if (!response.ok) {
        throw new Error(await readError(response, "Analisis gagal dilakukan."));
      }
      const data = (await response.json()) as PDFColorAnalysisResponse;
      setResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Gagal terhubung dengan layanan analisis PDF.");
    } finally {
      setAnalyzing(false);
    }
  };

  const applySelection = (pages: number[]) => {
    setSelectedPages(pages);
    setRangeText(pageListToRangeString(pages));
  };

  const handleTogglePage = (pageNumber: number) => {
    const updated = selectedPages.includes(pageNumber)
      ? selectedPages.filter((p) => p !== pageNumber)
      : [...selectedPages, pageNumber].sort((a, b) => a - b);
    applySelection(updated);
  };

  const handleRangeTextChange = (value: string) => {
    setRangeText(value);
    if (result) {
      setSelectedPages(rangeStringToPageList(value, result.total_pages));
    }
  };

  const handleCut = async () => {
    if (!file || selectedPages.length === 0) return;
    setCutting(true);
    setCutError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pages", rangeText);
      const response = await fetch(apiUrl("/v1/pdf/cut"), {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Gagal memotong PDF."));
      }
      const blob = await response.blob();
      const origBase =
        file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
      const filename = filenameFromHeader(
        response.headers.get("Content-Disposition"),
        `${origBase}_cut.pdf`,
      );
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setCutError(msg || "Gagal terhubung dengan layanan pemotong PDF.");
    } finally {
      setCutting(false);
    }
  };

  const filteredPages = result
    ? result.pages_details.filter((p) => {
        const matchesFilter =
          activeFilter === "all" ||
          (activeFilter === "color" && p.is_colored) ||
          (activeFilter === "grayscale" && !p.is_colored);
        const matchesSearch =
          searchQuery === "" || p.page.toString().includes(searchQuery);
        return matchesFilter && matchesSearch;
      })
    : [];

  const metaRows: { label: string; val: string }[] = result
    ? [
        { label: "Judul", val: result.metadata.title || "-" },
        { label: "Penulis", val: result.metadata.author || "-" },
        { label: "Subjek", val: result.metadata.subject || "-" },
        { label: "Kata Kunci", val: result.metadata.keywords || "-" },
        { label: "Pembuat", val: result.metadata.creator || "-" },
        { label: "Produser", val: result.metadata.producer || "-" },
        { label: "Dibuat", val: formatPdfDate(result.metadata.creationDate) },
        { label: "Dimodifikasi", val: formatPdfDate(result.metadata.modDate) },
        { label: "Format", val: result.metadata.format || "-" },
        { label: "Enkripsi", val: result.metadata.encryption || "None" },
      ]
    : [];

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1080px] px-4 pt-[18px] pb-14">
        <Link href="/#tools" className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-fog no-underline hover:text-white">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="mt-4 flex items-start gap-3.5">
          <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[14px] border border-[rgba(0,255,170,0.25)] bg-[rgba(0,255,170,0.1)] text-accent2">
            <FileText size={26} />
          </span>
          <div>
            <h1 className="text-[30px] leading-[1.15] font-extrabold text-[#EEF4FF]">PDF Analysis</h1>
            <p className="mt-[5px] max-w-[560px] text-[13.5px] leading-[1.6] text-fog">
              Cek warna halaman dan baca metadata dokumen PDF — lalu ekstrak
              halaman pilihan menjadi PDF baru.
            </p>
          </div>
        </div>

        <div className="mt-[22px] grid grid-cols-[5fr_7fr] items-start gap-5 max-[900px]:grid-cols-1">
          {/* Kolom kiri: unggah + kontrol */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="rounded-[14px] border border-line bg-panel p-5">
              {!file ? (
                <div
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed px-5 py-[34px] text-center transition-[border-color,background] duration-200 ${dragOver ? "border-accent bg-[rgba(0,255,170,0.06)]" : "border-line3 hover:border-[rgba(0,255,170,0.45)]"}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        acceptFile(e.target.files[0]);
                      }
                    }}
                    accept=".pdf"
                    className="hidden"
                  />
                  <span className="mb-2.5 inline-flex rounded-[14px] border border-[rgba(0,255,170,0.18)] bg-[rgba(0,255,170,0.08)] p-3.5 text-accent2">
                    <Upload size={30} />
                  </span>
                  <h3 className="m-0 text-[15px] text-white">Seret dan lepas PDF Anda di sini</h3>
                  <p className="m-0 text-xs text-dim">atau klik untuk mencari dari perangkat Anda</p>
                  <span className="mt-3.5 rounded-md border border-line bg-[#0a0a0b] px-2 py-[3px] text-[10px] font-bold tracking-[0.08em] text-dim uppercase">Hanya file PDF · maks 25 MB</span>
                </div>
              ) : (
                <div className="flex flex-col gap-3.5">
                  <div className="relative flex items-center gap-3 rounded-xl border border-line bg-[#0a0a0b] p-3.5">
                    <span className="inline-flex flex-shrink-0 rounded-[10px] border border-[rgba(0,255,170,0.16)] bg-[rgba(0,255,170,0.1)] p-2.5 text-accent2">
                      <FileText size={20} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="m-0 truncate pr-[18px] text-[13px] text-white" title={file.name}>{file.name}</h4>
                      <p className="mt-0.5 font-mono text-[11px] text-dim">{formatBytes(file.size)}</p>
                    </div>
                    {!analyzing && (
                      <button
                        type="button"
                        className="absolute top-2 right-2 inline-flex cursor-pointer rounded-full border-0 bg-transparent p-1 text-dim hover:bg-[rgba(244,63,94,0.08)] hover:text-[#fb7185]"
                        onClick={handleRemoveFile}
                        title="Hapus file"
                        aria-label="Hapus file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5 rounded-xl border border-[#1e1e22] bg-[#0a0a0b] p-3.5">
                    <div className="flex items-center justify-between">
                      <label className="inline-flex items-center gap-1.5 text-xs font-bold text-[#AFC2E6]" htmlFor="pdf-threshold-range">
                        <SlidersHorizontal size={14} className="text-accent2" />
                        <span>Ambang Warna</span>
                      </label>
                      <span className="rounded-md border border-[rgba(0,255,170,0.16)] bg-[rgba(0,255,170,0.1)] px-2 py-0.5 font-mono text-xs font-bold text-accent2">{threshold}</span>
                    </div>
                    <input
                      className="w-full cursor-pointer accent-accent"
                      id="pdf-threshold-range"
                      type="range"
                      min="0"
                      max="100"
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      disabled={analyzing}
                    />
                    <p className="m-0 text-[11px] leading-[1.5] text-dim">
                      Seberapa sensitif deteksi warna. Nilai rendah menangkap
                      warna yang samar sekalipun.
                    </p>
                    {threshold < 5 && (
                      <div className="flex items-start gap-1.5 rounded-lg border border-[rgba(245,158,11,0.16)] bg-[rgba(245,158,11,0.06)] p-2 text-[10px] leading-[1.45] text-[#fbbf24]">
                        <AlertTriangle size={12} className="mt-px flex-shrink-0" />
                        <span>
                          Ambang yang sangat ketat bisa menganggap artefak
                          kompresi sebagai warna.
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[rgba(0,255,170,0.35)] bg-accent p-[13px] text-xs font-extrabold tracking-[0.08em] text-[#052A1E] uppercase transition-[background] duration-200 enabled:hover:bg-[#00BBA2] disabled:cursor-not-allowed disabled:border-line disabled:bg-[#1e1e22] disabled:text-dim"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    {analyzing ? (
                      <>
                        <RefreshCw size={14} className="pdf-spin" />
                        <span>Menganalisis Halaman...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck size={14} />
                        <span>Analisis Dokumen</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-[14px] border border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.05)] p-3.5 text-[#fda4af]">
                <AlertTriangle size={16} className="mt-px flex-shrink-0" />
                <div>
                  <h4 className="m-0 mb-0.5 text-[11px] tracking-[0.08em] text-[#fda4af] uppercase">Error</h4>
                  <p className="m-0 text-xs leading-[1.5] text-[#fb7185]">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Kolom kanan: hasil */}
          <div className="flex min-w-0 flex-col gap-4">
            {analyzing && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-line bg-panel px-5 py-11 text-center text-dim">
                <span className="inline-flex rounded-[14px] border border-[rgba(0,255,170,0.18)] bg-[rgba(0,255,170,0.1)] p-4 text-accent2">
                  <RefreshCw size={30} className="pdf-spin" />
                </span>
                <h3 className="m-0 mt-1.5 text-[15px] text-white">Menganalisis PDF</h3>
                <p className="m-0 max-w-[340px] text-xs leading-[1.5]">
                  Memeriksa warna setiap halaman. Biasanya hanya butuh
                  beberapa detik.
                </p>
              </div>
            )}

            {!analyzing && !result && (
              <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-line bg-transparent px-5 py-11 text-center text-dim">
                <FileText size={38} />
                <p className="m-0 max-w-[340px] text-xs leading-[1.5]">Unggah dokumen lalu tekan Analisis untuk melihat detailnya.</p>
              </div>
            )}

            {!analyzing && result && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-4 gap-3 max-[560px]:grid-cols-2">
                  <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-panel p-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.07em] text-dim uppercase">Total Halaman</span>
                    <strong className="text-2xl leading-[1.1] font-extrabold text-white">{result.total_pages}</strong>
                  </div>
                  <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-panel p-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.07em] text-accent2 uppercase">Halaman Berwarna</span>
                    <strong className="text-2xl leading-[1.1] font-extrabold text-accent2">
                      {result.colored_pages_count}
                    </strong>
                  </div>
                  <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-panel p-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.07em] text-dim uppercase">Halaman Grayscale</span>
                    <strong className="text-2xl leading-[1.1] font-extrabold text-white">{result.grayscale_pages_count}</strong>
                  </div>
                  <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-panel p-3.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-[0.07em] text-[#00FFAA] uppercase">
                      <Clock size={10} /> Waktu Eksekusi
                    </span>
                    <strong className="text-2xl leading-[1.1] font-extrabold text-[#00FFAA]">
                      {result.detection_time_seconds}s
                    </strong>
                  </div>
                </div>

                <div className="rounded-[14px] border border-line bg-panel p-5">
                  <h3 className="m-0 mb-3 flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] text-fog uppercase">
                    <Layers size={13} /> Rasio Distribusi Warna
                  </h3>
                  <div className="flex h-3 w-full overflow-hidden rounded-full border border-line bg-[#0a0a0b]">
                    {result.colored_pages_count > 0 && (
                      <div
                        className="h-full bg-[linear-gradient(90deg,#006E9B,#00BBA2)]"
                        style={{
                          width: `${(result.colored_pages_count / result.total_pages) * 100}%`,
                        }}
                      />
                    )}
                    {result.grayscale_pages_count > 0 && (
                      <div
                        className="h-full bg-[#354C8C]"
                        style={{
                          width: `${(result.grayscale_pages_count / result.total_pages) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="mt-2.5 flex justify-between text-[11px] font-semibold text-fog">
                    <span>
                      <i className="mr-0.5 inline-block h-2 w-2 rounded-full bg-[#00BBA2]" /> {result.colored_pages_count}{" "}
                      ({Math.round((result.colored_pages_count / result.total_pages) * 100)}%)
                    </span>
                    <span>
                      <i className="mr-0.5 inline-block h-2 w-2 rounded-full bg-[#4C63A0]" /> {result.grayscale_pages_count}{" "}
                      ({Math.round((result.grayscale_pages_count / result.total_pages) * 100)}%)
                    </span>
                  </div>
                </div>

                <div className="rounded-[14px] border border-line bg-panel p-5">
                  <h3 className="m-0 mb-3 flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] text-fog uppercase">Metadata Dokumen</h3>
                  <div className="grid grid-cols-2 gap-x-[18px] gap-y-3.5 max-[560px]:grid-cols-1">
                    {metaRows.map((item) => (
                      <div key={item.label} className="flex min-w-0 flex-col">
                        <span className="text-[10px] font-bold tracking-[0.07em] text-dim uppercase">{item.label}</span>
                        <strong className="mt-[3px] text-xs font-semibold break-anywhere text-[#DCE7FA]">{item.val}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[14px] border border-line bg-panel p-5">
                  <h3 className="m-0 mb-3 flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] text-fog uppercase">
                    <Scissors size={13} /> Ekstrak Halaman
                  </h3>
                  <p className="mx-0 -mt-1.5 mb-3.5 text-xs leading-[1.5] text-dim">
                    Pilih halaman untuk disimpan sebagai PDF baru. Klik kotak
                    halaman di bawah, atau ketik rentang langsung.
                  </p>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                      <label className="text-[10px] font-bold tracking-[0.07em] text-fog uppercase" htmlFor="pdf-cut-input">Halaman yang Diekstrak</label>
                      <input
                        className="rounded-[10px] border border-line bg-[#0a0a0b] px-3 py-[9px] font-mono text-xs text-white outline-none focus:border-line"
                        id="pdf-cut-input"
                        type="text"
                        value={rangeText}
                        onChange={(e) => handleRangeTextChange(e.target.value)}
                        placeholder="contoh: 1-3, 5, 7-9"
                        disabled={cutting}
                      />
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border border-[rgba(0,255,170,0.35)] bg-accent px-[18px] text-[11px] font-extrabold tracking-[0.06em] whitespace-nowrap text-[#052A1E] uppercase enabled:hover:bg-[#00BBA2] disabled:cursor-not-allowed disabled:border-line disabled:bg-[#1e1e22] disabled:text-[#4C63A0]"
                      onClick={handleCut}
                      disabled={cutting || selectedPages.length === 0}
                    >
                      {cutting ? (
                        <>
                          <RefreshCw size={12} className="pdf-spin" />
                          <span>Mengekstrak Halaman...</span>
                        </>
                      ) : (
                        <>
                          <Scissors size={12} />
                          <span>Ekstrak &amp; Unduh PDF</span>
                        </>
                      )}
                    </button>
                  </div>
                  {cutError && (
                    <div className="mt-3 flex items-center gap-2.5 rounded-[10px] border border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.05)] p-2.5 text-[11px] text-[#fda4af]">
                      <AlertTriangle size={13} />
                      <span>{cutError}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-[14px] border border-line bg-panel p-5">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#1e1e22] pb-3">
                    <h3 className="m-0 flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] text-fog uppercase">Rincian Halaman</h3>
                    <div className="relative">
                      <Search size={12} className="absolute top-1/2 left-[9px] -translate-y-1/2 text-dim" />
                      <input
                        className="w-[180px] rounded-lg border border-line bg-[#0a0a0b] py-1.5 pr-2.5 pl-7 font-mono text-xs text-white outline-none focus:border-line"
                        type="text"
                        value={searchQuery}
                        onChange={(e) =>
                          setSearchQuery(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="Cari nomor halaman..."
                        aria-label="Cari nomor halaman"
                      />
                    </div>
                  </div>

                  <div className="mb-3 inline-flex flex-wrap gap-1 rounded-[10px] border border-[#1e1e22] bg-[#0a0a0b] p-1">
                    {(
                      [
                        ["all", "Semua Halaman"],
                        ["color", "Hanya Berwarna"],
                        ["grayscale", "Hanya Grayscale"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        className={`cursor-pointer rounded-[7px] border-0 px-3 py-[5px] text-[11px] font-bold ${activeFilter === mode ? "bg-accent text-[#052A1E]" : "bg-transparent text-fog hover:text-[#DCE7FA]"}`}
                        onClick={() => setActiveFilter(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mb-3.5 flex flex-wrap items-center gap-2 rounded-xl border border-[#1e1e22] bg-[#0a0a0b] p-2">
                    <span className="px-1 text-[9px] font-bold tracking-[0.08em] text-dim uppercase">Pilih:</span>
                    <button type="button" className="cursor-pointer rounded-[7px] border px-2.5 py-[5px] text-[10px] font-bold hover:border-[#354C8C] hover:text-white border-line bg-panel2 text-[#AFC2E6]" onClick={() => result && applySelection(Array.from({ length: result.total_pages }, (_, i) => i + 1))}>
                      Pilih Semua
                    </button>
                    {result.colored_pages_count > 0 && (
                      <button type="button" className="cursor-pointer rounded-[7px] border px-2.5 py-[5px] text-[10px] font-bold hover:border-[#354C8C] hover:text-white border-[rgba(0,255,170,0.2)] bg-[rgba(0,255,170,0.08)] text-accent2" onClick={() => applySelection(result.colored_pages)}>
                        Pilih Hanya Berwarna
                      </button>
                    )}
                    {result.grayscale_pages_count > 0 && (
                      <button type="button" className="cursor-pointer rounded-[7px] border px-2.5 py-[5px] text-[10px] font-bold hover:border-[#354C8C] hover:text-white border-line bg-panel2 text-[#AFC2E6]" onClick={() => applySelection(result.grayscale_pages)}>
                        Pilih Hanya Grayscale
                      </button>
                    )}
                    {selectedPages.length > 0 && (
                      <button type="button" className="cursor-pointer rounded-[7px] border px-2.5 py-[5px] text-[10px] font-bold hover:border-[#354C8C] hover:text-white ml-auto border-[rgba(244,63,94,0.18)] bg-[rgba(244,63,94,0.06)] text-[#fb7185]" onClick={() => applySelection([])}>
                        Bersihkan Pilihan
                      </button>
                    )}
                  </div>

                  {filteredPages.length > 0 ? (
                    <div className="grid max-h-[260px] grid-cols-8 gap-2.5 overflow-y-auto pr-0.5 max-[900px]:grid-cols-6 max-[560px]:grid-cols-4">
                      {filteredPages.map((pageObj) => {
                        const selected = selectedPages.includes(pageObj.page);
                        return (
                          <button
                            key={pageObj.page}
                            type="button"
                            className={`relative flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 transition-[border-color,background] duration-150 ${selected ? "border-accent bg-[rgba(0,255,170,0.12)]" : pageObj.is_colored ? "border-[rgba(0,255,170,0.18)] bg-[rgba(0,255,170,0.05)]" : "border-line bg-[#0a0a0b]"} ${pageObj.is_colored ? "hover:border-[rgba(0,255,170,0.45)]" : selected ? "" : "hover:border-[#354C8C]"}`}
                            onClick={() => handleTogglePage(pageObj.page)}
                            aria-pressed={selected}
                          >
                            {selected && (
                              <span className="absolute top-1 right-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[#052A1E]">
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                            <span className="text-[9px] font-bold tracking-[0.07em] text-dim uppercase">Halaman</span>
                            <span className="font-mono text-[15px] font-extrabold text-white">{pageObj.page}</span>
                            <span
                              className={`rounded px-[5px] py-0.5 text-[8px] font-extrabold tracking-[0.05em] uppercase ${pageObj.is_colored ? "bg-[rgba(0,255,170,0.22)] text-accent2" : "bg-[#1e1e22] text-fog"}`}
                            >
                              {pageObj.is_colored ? "Warna" : "Abu"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line p-7 text-center text-xs text-dim">
                      Tidak ada halaman yang cocok dengan filter aktif.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="inline-flex cursor-pointer items-center gap-1.5 self-center rounded-xl border border-line bg-panel2 px-5 py-2.5 text-xs font-bold text-fog hover:text-white"
                  onClick={handleRemoveFile}
                >
                  <RefreshCw size={12} />
                  <span>Unggah File Lain</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
