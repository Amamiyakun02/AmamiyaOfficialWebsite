"use client";

import { useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import {
  Link2,
  Search,
  Download,
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  AtSign,
  Clapperboard,
  Clock,
  User,
  Music,
  Globe,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

// Porting VideoDownloader lama (Tahap 2) dengan kontrak backend
// Vienna_Agent yang sama persis (terverifikasi di routers/tools_api.py):
//   GET  /v1/tools/downloader/info?url=...        -> MediaInfo
//   POST /v1/tools/downloader/download {url, format, quality}
//        -> berkas (blob), nama dari Content-Disposition,
//           header X-Cache (HIT/MISS) + X-Platform untuk lencana.
// Ikon merek YouTube/Instagram/Facebook = SVG inline (lucide versi
// project tidak lagi menyediakan ikon merek); Threads memakai AtSign.

type MediaInfo = {
  platform: "youtube" | "instagram" | "threads" | "facebook";
  id: string;
  title: string;
  duration: number;
  duration_formatted: string;
  uploader: string;
  thumbnail: string;
  is_shorts: boolean;
  too_long: boolean;
  available_formats: string[];
  available_qualities: string[];
};

const QUALITY_LABELS: Record<string, string> = {
  "360": "360p",
  "480": "480p",
  "720": "720p HD",
  "1080": "1080p Full HD",
  best: "Best available",
};

function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23 12s0-3.85-.46-5.58a2.9 2.9 0 0 0-2.04-2.04C18.6 5 12 5 12 5s-6.6 0-8.5.38A2.9 2.9 0 0 0 1.46 6.42C1 8.15 1 12 1 12s0 3.85.46 5.58a2.9 2.9 0 0 0 2.04 2.04C5.4 19 12 19 12 19s6.6 0 8.5-.38a2.9 2.9 0 0 0 2.04-2.04C23 15.85 23 12 23 12ZM9.75 15.5v-7L15.5 12l-5.75 3.5Z" />
    </svg>
  );
}

function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      {...props}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.87.24-1.46 1.49-1.46h1.4V4.96c-.24-.03-1.07-.1-2.04-.1-2.02 0-3.4 1.23-3.4 3.49V11H8.5v3H11v7h2.5Z" />
    </svg>
  );
}

type IconProps = { size?: number; className?: string };

const PLATFORM_META: Record<
  MediaInfo["platform"],
  {
    label: string;
    badgeClass: string;
    chipClass: string;
    Icon: ComponentType<IconProps>;
  }
> = {
  youtube: {
    label: "YouTube",
    badgeClass: "bg-[#dc2626] text-white",
    chipClass: "text-[#ff6b5e]",
    Icon: ({ size = 11 }) => <YoutubeIcon width={size} height={size} />,
  },
  instagram: {
    label: "Instagram",
    badgeClass: "bg-[#db2777] text-white",
    chipClass: "text-[#f06ba8]",
    Icon: ({ size = 11 }) => <InstagramIcon width={size} height={size} />,
  },
  threads: {
    label: "Threads",
    badgeClass: "bg-[#f4f4f5] text-[#18181b]",
    chipClass: "text-[#e8e8ee]",
    Icon: ({ size = 11 }) => <AtSign size={size} />,
  },
  facebook: {
    label: "Facebook",
    badgeClass: "bg-[#2563eb] text-white",
    chipClass: "text-accent3",
    Icon: ({ size = 11 }) => <FacebookIcon width={size} height={size} />,
  },
};

const TOO_LONG_MSG =
  "Media lebih dari 30 menit dan tidak bisa diunduh.";

export default function VideoDownloader() {
  const [url, setUrl] = useState("");
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [format, setFormat] = useState<"mp4" | "mp3">("mp4");
  const [quality, setQuality] = useState("720");
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [fromCache, setFromCache] = useState<boolean | null>(null);
  const [fromPlatform, setFromPlatform] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readError = async (
    response: Response,
    fallback: string,
  ): Promise<string> => {
    const errData = await response
      .json()
      .catch(() => ({}) as { detail?: string });
    if (typeof errData.detail === "string" && errData.detail.length > 0) {
      return errData.detail;
    }
    return fallback;
  };

  const handleCheck = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setChecking(true);
    setError(null);
    setInfo(null);
    setFromCache(null);
    setFromPlatform(null);
    try {
      const endpoint = apiUrl(
        `/v1/tools/downloader/info?url=${encodeURIComponent(trimmed)}`,
      );
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(await readError(response, "Gagal mengambil info media."));
      }
      const data = (await response.json()) as MediaInfo;
      setInfo(data);
      const qualities: string[] = data.available_qualities || [];
      setQuality(
        qualities.includes("720")
          ? "720"
          : qualities[qualities.length - 1] || "best",
      );
      if (data.too_long) setError(TOO_LONG_MSG);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg || "Gagal terhubung ke layanan unduhan.");
    } finally {
      setChecking(false);
    }
  };

  const filenameFromHeader = (
    header: string | null,
    fallback: string,
  ): string => {
    if (!header) return fallback;
    const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (star) {
      try {
        return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
      } catch {
        /* lanjut ke pola nama biasa */
      }
    }
    const plain =
      /filename="([^"]+)"/i.exec(header) || /filename=([^;]+)/i.exec(header);
    if (plain) return plain[1].trim();
    return fallback;
  };

  const handleDownload = async () => {
    const trimmed = url.trim();
    if (!trimmed || !info) return;
    setDownloading(true);
    setError(null);
    try {
      const endpoint = apiUrl("/v1/tools/downloader/download");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, format, quality }),
      });
      if (!response.ok) {
        throw new Error(await readError(response, "Unduhan gagal."));
      }
      setFromCache(response.headers.get("X-Cache") === "HIT");
      setFromPlatform(response.headers.get("X-Platform"));
      const blob = await response.blob();
      const fallbackName = `${info.platform}_${info.id}.${
        format === "mp3" ? "mp3" : "mp4"
      }`;
      const filename = filenameFromHeader(
        response.headers.get("Content-Disposition"),
        fallbackName,
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
      setError(msg || "Gagal terhubung ke layanan unduhan.");
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setInfo(null);
    setFormat("mp4");
    setQuality("720");
    setFromCache(null);
    setFromPlatform(null);
    setError(null);
  };

  const qualities = info?.available_qualities || [];
  const platMeta = info ? PLATFORM_META[info.platform] : null;

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1080px] px-4 pt-[18px] pb-14">
        <Link href="/#tools" className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-fog no-underline hover:text-white">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="mt-4 flex items-start gap-3.5">
          <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[14px] border border-[rgba(0,129,251,0.25)] bg-[rgba(0,129,251,0.1)] text-accent2">
            <Clapperboard size={26} />
          </span>
          <div>
            <h1 className="text-[30px] leading-[1.15] font-extrabold text-[#f2f2f5]">Video Downloader</h1>
            <p className="mt-[5px] max-w-[560px] text-[13.5px] leading-[1.6] text-fog">
              Unduh video dari YouTube, Instagram, Threads &amp; Facebook
              sebagai MP4 atau MP3. Tempel tautan, pratinjau, lalu simpan.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                Object.keys(PLATFORM_META) as MediaInfo["platform"][]
              ).map((p) => {
                const { label, Icon, chipClass } = PLATFORM_META[p];
                return (
                  <span key={p} className={`inline-flex items-center gap-[5px] rounded-lg border border-line bg-[#0a0a0c] px-[9px] py-1 text-[10px] font-bold ${chipClass}`}>
                    <Icon size={11} />
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[22px] grid grid-cols-1 items-start gap-[18px] min-[960px]:grid-cols-[5fr_7fr]">
          {/* Kolom kiri: URL + opsi */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <div className="rounded-2xl border border-line bg-panel p-[18px]">
              <label className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.07em] text-fog uppercase" htmlFor="vd-url">
                <Link2 size={12} /> Video URL
              </label>
              <div className="flex flex-col gap-2 min-[560px]:flex-row">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-line bg-[#0a0a0c] px-[13px] py-[11px] text-[12.5px] text-[#eeeef2] outline-none placeholder:text-[#5c5c66] focus:border-line"
                  id="vd-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCheck();
                  }}
                  placeholder="Tempel tautan video (YouTube, IG Reel, Threads, FB...)"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={checking || !url.trim()}
                  className="inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-xl border border-transparent text-xs font-extrabold tracking-[0.06em] uppercase transition-[background,border-color] duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] disabled:cursor-not-allowed disabled:border-line disabled:bg-[#1b1b1f] disabled:text-[#6d6d76] flex-shrink-0 bg-accent px-4 py-[11px] text-white enabled:hover:bg-[#1a8fff]"
                >
                  {checking ? (
                    <>
                      <RefreshCw size={14} className="vd-spin" />
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Cek Video</span>
                    </>
                  )}
                </button>
              </div>

              {info && (
                <div className="mt-[18px] grid grid-cols-2 gap-3">
                  <div>
                    <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.07em] text-fog uppercase">
                      {format === "mp3" ? (
                        <Music size={12} />
                      ) : (
                        <Clapperboard size={12} />
                      )}
                      Format
                    </span>
                    <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-[#0a0a0c] p-1">
                      {(["mp4", "mp3"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormat(f)}
                          className={`cursor-pointer rounded-lg border-0 bg-transparent px-0 py-2 text-xs font-extrabold tracking-[0.06em] uppercase hover:text-white ${format === f ? "bg-accent text-white" : "text-fog"}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.07em] text-fog uppercase">Kualitas</span>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      disabled={format === "mp3"}
                      className="w-full rounded-xl border border-line bg-[#0a0a0c] px-3 py-2.5 text-[12.5px] text-[#eeeef2] outline-none focus:border-line disabled:opacity-40"
                      aria-label="Kualitas"
                    >
                      {format === "mp3" ? (
                        <option value="audio">192 kbps MP3</option>
                      ) : (
                        qualities.map((q) => (
                          <option key={q} value={q}>
                            {QUALITY_LABELS[q] || q}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              )}

              {info && !info.too_long && (
                <div className="mt-[18px] flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-xl border border-transparent text-xs font-extrabold tracking-[0.06em] uppercase transition-[background,border-color] duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] disabled:cursor-not-allowed disabled:border-line disabled:bg-[#1b1b1f] disabled:text-[#6d6d76] w-full bg-accent px-4 py-[13px] text-white enabled:hover:bg-[#1a8fff]"
                  >
                    {downloading ? (
                      <>
                        <RefreshCw size={14} className="vd-spin" />
                        <span>Mengunduh...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>
                          Unduh {format.toUpperCase()}
                          {format === "mp4"
                            ? ` ${QUALITY_LABELS[quality] || quality}`
                            : ""}
                        </span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={downloading || checking}
                    className="inline-flex cursor-pointer items-center justify-center gap-[7px] rounded-xl border border-transparent text-xs font-extrabold tracking-[0.06em] uppercase transition-[background,border-color] duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)] disabled:cursor-not-allowed disabled:border-line disabled:bg-[#1b1b1f] disabled:text-[#6d6d76] w-full border-line bg-transparent px-4 py-2.5 font-bold tracking-normal text-fog normal-case enabled:hover:border-steel enabled:hover:text-white"
                  >
                    Tautan Baru
                  </button>
                  {fromCache !== null && (
                    <p className="text-center text-[11px] text-[#6d6d76]">
                      {fromPlatform ? `${fromPlatform} · ` : ""}
                      {fromCache ? "dari cache — instan" : "baru diunduh"}
                    </p>
                  )}
                </div>
              )}

              <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-[1.55] text-[#6d6d76]">
                <Globe size={11} className="mt-0.5 flex-shrink-0" />
                <span>
                  Konten privat atau yang butuh login tidak bisa diunduh.
                  Postingan publik paling aman.
                </span>
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-[rgba(244,63,94,0.25)] bg-[rgba(244,63,94,0.06)] px-4 py-3.5 text-[#fda4af]" role="alert">
                <AlertTriangle size={16} className="mt-px flex-shrink-0 text-[#fb7185]" />
                <div>
                  <h4 className="mb-0.5 text-[11px] font-extrabold tracking-[0.07em] text-[#fda4af] uppercase">Error</h4>
                  <p className="text-xs leading-[1.55] text-[#fb8fa3]">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Kolom kanan: pratinjau */}
          <div className="flex min-w-0 flex-col gap-3.5">
            {!info ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-12 text-center text-[#6d6d76]">
                <Clapperboard size={40} strokeWidth={1.2} />
                <p className="max-w-[300px] text-xs leading-[1.6]">
                  Tempel tautan video di atas lalu tekan Cek Video untuk
                  melihat judul, durasi, dan kualitas yang tersedia.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-line bg-panel">
                {info.thumbnail && (
                  <div className="relative aspect-[16/9] bg-[#0a0a0c]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="block h-full w-full object-cover" src={info.thumbnail} alt={info.title} />
                    {platMeta && (
                      <span className={`absolute top-3 left-3 inline-flex items-center gap-[5px] rounded-lg px-2.5 py-[5px] text-[10px] font-extrabold tracking-[0.06em] uppercase ${platMeta.badgeClass}`}>
                        <platMeta.Icon size={11} />
                        {platMeta.label}
                      </span>
                    )}
                    {info.is_shorts && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-[5px] rounded-lg bg-[rgba(0,0,0,0.7)] px-2.5 py-[5px] text-[10px] font-extrabold tracking-[0.06em] text-white uppercase">Shorts</span>
                    )}
                    <span className="absolute right-3 bottom-3 rounded-lg bg-[rgba(0,0,0,0.8)] px-2 py-1 font-mono text-[11px] font-bold text-white">
                      {info.duration_formatted}
                    </span>
                  </div>
                )}
                <div className="p-[18px]">
                  <h2 className="text-[16.5px] leading-[1.45] font-bold text-[#f2f2f5]">{info.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[11.5px] text-fog">
                    {info.uploader && (
                      <span className="inline-flex items-center gap-1.5">
                        <User size={12} />
                        {info.uploader}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={12} />
                      {info.duration_formatted}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
