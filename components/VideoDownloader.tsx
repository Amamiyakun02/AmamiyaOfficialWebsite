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
    badgeClass: "vd-badge-youtube",
    chipClass: "vd-chip-youtube",
    Icon: ({ size = 11 }) => <YoutubeIcon width={size} height={size} />,
  },
  instagram: {
    label: "Instagram",
    badgeClass: "vd-badge-instagram",
    chipClass: "vd-chip-instagram",
    Icon: ({ size = 11 }) => <InstagramIcon width={size} height={size} />,
  },
  threads: {
    label: "Threads",
    badgeClass: "vd-badge-threads",
    chipClass: "vd-chip-threads",
    Icon: ({ size = 11 }) => <AtSign size={size} />,
  },
  facebook: {
    label: "Facebook",
    badgeClass: "vd-badge-facebook",
    chipClass: "vd-chip-facebook",
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
        throw new Error(await readError(response, "Failed to fetch media info."));
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
      setError(msg || "Failed to connect to the download service.");
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
        throw new Error(await readError(response, "Download failed."));
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
      setError(msg || "Failed to connect to the download service.");
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
    <div className="vd-page">
      <div className="vd-inner">
        <Link href="/#tools" className="chat-back">
          <ArrowLeft size={14} /> Back to Tools
        </Link>

        <div className="vd-head">
          <span className="vd-head-icon">
            <Clapperboard size={26} />
          </span>
          <div>
            <h1 className="vd-title">Video Downloader</h1>
            <p className="vd-sub">
              Download videos from YouTube, Instagram, Threads &amp; Facebook
              as MP4 or MP3. Paste a link, preview it, then save.
            </p>
            <div className="vd-chips">
              {(
                Object.keys(PLATFORM_META) as MediaInfo["platform"][]
              ).map((p) => {
                const { label, Icon, chipClass } = PLATFORM_META[p];
                return (
                  <span key={p} className={`vd-chip ${chipClass}`}>
                    <Icon size={11} />
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="vd-grid">
          {/* Kolom kiri: URL + opsi */}
          <div className="vd-col">
            <div className="vd-card">
              <label className="vd-label" htmlFor="vd-url">
                <Link2 size={12} /> Video URL
              </label>
              <div className="vd-url-row">
                <input
                  id="vd-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCheck();
                  }}
                  placeholder="Paste a video link (YouTube, IG Reel, Threads, FB...)"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={handleCheck}
                  disabled={checking || !url.trim()}
                  className="vd-btn vd-btn-check"
                >
                  {checking ? (
                    <>
                      <RefreshCw size={14} className="vd-spin" />
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <Search size={14} />
                      <span>Check Video</span>
                    </>
                  )}
                </button>
              </div>

              {info && (
                <div className="vd-opts">
                  <div>
                    <span className="vd-label">
                      {format === "mp3" ? (
                        <Music size={12} />
                      ) : (
                        <Clapperboard size={12} />
                      )}
                      Format
                    </span>
                    <div className="vd-seg">
                      {(["mp4", "mp3"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFormat(f)}
                          className={format === f ? "is-active" : undefined}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="vd-label">Quality</span>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      disabled={format === "mp3"}
                      className="vd-select"
                      aria-label="Quality"
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
                <div className="vd-actions">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="vd-btn vd-btn-download"
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
                          Download {format.toUpperCase()}
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
                    className="vd-btn vd-btn-reset"
                  >
                    New Link
                  </button>
                  {fromCache !== null && (
                    <p className="vd-cache-note">
                      {fromPlatform ? `${fromPlatform} · ` : ""}
                      {fromCache ? "from cache — instant" : "freshly downloaded"}
                    </p>
                  )}
                </div>
              )}

              <p className="vd-hint">
                <Globe size={11} />
                <span>
                  Private or login-gated content cannot be downloaded.
                  Public posts work best.
                </span>
              </p>
            </div>

            {error && (
              <div className="vd-error" role="alert">
                <AlertTriangle size={16} />
                <div>
                  <h4>Error</h4>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Kolom kanan: pratinjau */}
          <div className="vd-col">
            {!info ? (
              <div className="vd-empty">
                <Clapperboard size={40} strokeWidth={1.2} />
                <p>
                  Paste a video link above and press Check Video to see
                  its title, duration, and available qualities.
                </p>
              </div>
            ) : (
              <div className="vd-preview">
                {info.thumbnail && (
                  <div className="vd-thumb">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={info.thumbnail} alt={info.title} />
                    {platMeta && (
                      <span className={`vd-badge ${platMeta.badgeClass}`}>
                        <platMeta.Icon size={11} />
                        {platMeta.label}
                      </span>
                    )}
                    {info.is_shorts && (
                      <span className="vd-badge vd-badge-shorts">Shorts</span>
                    )}
                    <span className="vd-duration">
                      {info.duration_formatted}
                    </span>
                  </div>
                )}
                <div className="vd-preview-body">
                  <h2>{info.title}</h2>
                  <div className="vd-meta">
                    {info.uploader && (
                      <span>
                        <User size={12} />
                        {info.uploader}
                      </span>
                    )}
                    <span>
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
