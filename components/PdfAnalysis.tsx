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
    <div className="vd-page">
      <div className="vd-inner">
        <Link href="/#tools" className="chat-back">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="vd-head">
          <span className="vd-head-icon">
            <FileText size={26} />
          </span>
          <div>
            <h1 className="vd-title">PDF Analysis</h1>
            <p className="vd-sub">
              Cek warna halaman dan baca metadata dokumen PDF — lalu ekstrak
              halaman pilihan menjadi PDF baru.
            </p>
          </div>
        </div>

        <div className="pdf-grid">
          {/* Kolom kiri: unggah + kontrol */}
          <div className="pdf-col">
            <div className="pdf-panel">
              {!file ? (
                <div
                  className={`pdf-drop${dragOver ? " is-over" : ""}`}
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
                    className="pdf-file-input"
                  />
                  <span className="pdf-drop-icon">
                    <Upload size={30} />
                  </span>
                  <h3>Seret dan lepas PDF Anda di sini</h3>
                  <p>atau klik untuk mencari dari perangkat Anda</p>
                  <span className="pdf-drop-badge">Hanya file PDF · maks 25 MB</span>
                </div>
              ) : (
                <div className="pdf-filecol">
                  <div className="pdf-filecard">
                    <span className="pdf-filecard-icon">
                      <FileText size={20} />
                    </span>
                    <div className="pdf-filemeta">
                      <h4 title={file.name}>{file.name}</h4>
                      <p>{formatBytes(file.size)}</p>
                    </div>
                    {!analyzing && (
                      <button
                        type="button"
                        className="pdf-remove"
                        onClick={handleRemoveFile}
                        title="Hapus file"
                        aria-label="Hapus file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="pdf-threshold">
                    <div className="pdf-threshold-head">
                      <label htmlFor="pdf-threshold-range">
                        <SlidersHorizontal size={14} />
                        <span>Ambang Warna</span>
                      </label>
                      <span className="pdf-threshold-val">{threshold}</span>
                    </div>
                    <input
                      id="pdf-threshold-range"
                      type="range"
                      min="0"
                      max="100"
                      value={threshold}
                      onChange={(e) => setThreshold(parseInt(e.target.value))}
                      disabled={analyzing}
                    />
                    <p>
                      Seberapa sensitif deteksi warna. Nilai rendah menangkap
                      warna yang samar sekalipun.
                    </p>
                    {threshold < 5 && (
                      <div className="pdf-warn">
                        <AlertTriangle size={12} />
                        <span>
                          Ambang yang sangat ketat bisa menganggap artefak
                          kompresi sebagai warna.
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="pdf-analyze"
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
              <div className="pdf-error">
                <AlertTriangle size={16} />
                <div>
                  <h4>Error</h4>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Kolom kanan: hasil */}
          <div className="pdf-col">
            {analyzing && (
              <div className="pdf-panel pdf-loading">
                <span className="pdf-loading-icon">
                  <RefreshCw size={30} className="pdf-spin" />
                </span>
                <h3>Menganalisis PDF</h3>
                <p>
                  Memeriksa warna setiap halaman. Biasanya hanya butuh
                  beberapa detik.
                </p>
              </div>
            )}

            {!analyzing && !result && (
              <div className="pdf-panel pdf-empty">
                <FileText size={38} />
                <p>Unggah dokumen lalu tekan Analisis untuk melihat detailnya.</p>
              </div>
            )}

            {!analyzing && result && (
              <div className="pdf-results">
                <div className="pdf-metrics">
                  <div className="pdf-metric">
                    <span>Total Halaman</span>
                    <strong>{result.total_pages}</strong>
                  </div>
                  <div className="pdf-metric">
                    <span className="is-blue">Halaman Berwarna</span>
                    <strong className="is-blue">
                      {result.colored_pages_count}
                    </strong>
                  </div>
                  <div className="pdf-metric">
                    <span>Halaman Grayscale</span>
                    <strong>{result.grayscale_pages_count}</strong>
                  </div>
                  <div className="pdf-metric">
                    <span className="is-green">
                      <Clock size={10} /> Waktu Eksekusi
                    </span>
                    <strong className="is-green">
                      {result.detection_time_seconds}s
                    </strong>
                  </div>
                </div>

                <div className="pdf-panel">
                  <h3 className="pdf-panel-title">
                    <Layers size={13} /> Rasio Distribusi Warna
                  </h3>
                  <div className="pdf-bar">
                    {result.colored_pages_count > 0 && (
                      <div
                        className="pdf-bar-color"
                        style={{
                          width: `${(result.colored_pages_count / result.total_pages) * 100}%`,
                        }}
                      />
                    )}
                    {result.grayscale_pages_count > 0 && (
                      <div
                        className="pdf-bar-gray"
                        style={{
                          width: `${(result.grayscale_pages_count / result.total_pages) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                  <div className="pdf-bar-legend">
                    <span>
                      <i className="pdf-dot is-blue" /> {result.colored_pages_count}{" "}
                      ({Math.round((result.colored_pages_count / result.total_pages) * 100)}%)
                    </span>
                    <span>
                      <i className="pdf-dot is-gray" /> {result.grayscale_pages_count}{" "}
                      ({Math.round((result.grayscale_pages_count / result.total_pages) * 100)}%)
                    </span>
                  </div>
                </div>

                <div className="pdf-panel">
                  <h3 className="pdf-panel-title">Metadata Dokumen</h3>
                  <div className="pdf-meta-grid">
                    {metaRows.map((item) => (
                      <div key={item.label} className="pdf-meta-item">
                        <span>{item.label}</span>
                        <strong>{item.val}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pdf-panel">
                  <h3 className="pdf-panel-title">
                    <Scissors size={13} /> Ekstrak Halaman
                  </h3>
                  <p className="pdf-panel-desc">
                    Pilih halaman untuk disimpan sebagai PDF baru. Klik kotak
                    halaman di bawah, atau ketik rentang langsung.
                  </p>
                  <div className="pdf-cut-row">
                    <div className="pdf-cut-field">
                      <label htmlFor="pdf-cut-input">Halaman yang Diekstrak</label>
                      <input
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
                      className="pdf-cut-btn"
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
                    <div className="pdf-error is-inline">
                      <AlertTriangle size={13} />
                      <span>{cutError}</span>
                    </div>
                  )}
                </div>

                <div className="pdf-panel">
                  <div className="pdf-pages-head">
                    <h3 className="pdf-panel-title">Rincian Halaman</h3>
                    <div className="pdf-search">
                      <Search size={12} />
                      <input
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

                  <div className="pdf-tabs">
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
                        className={activeFilter === mode ? "is-active" : ""}
                        onClick={() => setActiveFilter(mode)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="pdf-select-row">
                    <span>Pilih:</span>
                    <button type="button" onClick={() => result && applySelection(Array.from({ length: result.total_pages }, (_, i) => i + 1))}>
                      Pilih Semua
                    </button>
                    {result.colored_pages_count > 0 && (
                      <button type="button" className="is-blue" onClick={() => applySelection(result.colored_pages)}>
                        Pilih Hanya Berwarna
                      </button>
                    )}
                    {result.grayscale_pages_count > 0 && (
                      <button type="button" onClick={() => applySelection(result.grayscale_pages)}>
                        Pilih Hanya Grayscale
                      </button>
                    )}
                    {selectedPages.length > 0 && (
                      <button type="button" className="is-red" onClick={() => applySelection([])}>
                        Bersihkan Pilihan
                      </button>
                    )}
                  </div>

                  {filteredPages.length > 0 ? (
                    <div className="pdf-badges">
                      {filteredPages.map((pageObj) => {
                        const selected = selectedPages.includes(pageObj.page);
                        return (
                          <button
                            key={pageObj.page}
                            type="button"
                            className={`pdf-badge${pageObj.is_colored ? " is-colored" : ""}${selected ? " is-selected" : ""}`}
                            onClick={() => handleTogglePage(pageObj.page)}
                            aria-pressed={selected}
                          >
                            {selected && (
                              <span className="pdf-badge-check">
                                <Check size={10} strokeWidth={3} />
                              </span>
                            )}
                            <span className="pdf-badge-cap">Halaman</span>
                            <span className="pdf-badge-num">{pageObj.page}</span>
                            <span
                              className={`pdf-badge-tag${pageObj.is_colored ? " is-colored" : ""}`}
                            >
                              {pageObj.is_colored ? "Warna" : "Abu"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="pdf-nopages">
                      Tidak ada halaman yang cocok dengan filter aktif.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="pdf-reset"
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
