import type { Metadata } from "next";
import VideoDownloader from "@/components/VideoDownloader";

export const metadata: Metadata = {
  title: "Video Downloader — Amamiya",
  description:
    "Unduh video dari YouTube, Instagram, Threads & Facebook sebagai MP4 atau MP3 — satu engine yt-dlp, deteksi platform otomatis.",
};

// Halaman tool ketiga yang dipindah dari WebPortofolio lama (Tahap 2).
// Kontrak backend Vienna_Agent: GET /v1/tools/downloader/info dan
// POST /v1/tools/downloader/download (lihat components/VideoDownloader).
export default function VideoDownloaderPage() {
  return <VideoDownloader />;
}
