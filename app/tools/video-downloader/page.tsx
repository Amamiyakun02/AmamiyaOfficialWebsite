import type { Metadata } from "next";
import VideoDownloader from "@/components/VideoDownloader";

export const metadata: Metadata = {
  title: "Video Downloader — Amamiya",
  description:
    "Download videos from YouTube, Instagram, Threads & Facebook as MP4 or MP3 — one yt-dlp engine, automatic platform detection.",
};

// Halaman tool ketiga yang dipindah dari WebPortofolio lama (Tahap 2).
// Kontrak backend Vienna_Agent: GET /v1/tools/downloader/info dan
// POST /v1/tools/downloader/download (lihat components/VideoDownloader).
export default function VideoDownloaderPage() {
  return <VideoDownloader />;
}
