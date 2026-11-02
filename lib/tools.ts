// Registry tool portofolio — halaman-halaman tool dari WebPortofolio lama
// yang dipindah bertahap ke project ini. status "live" = rute sudah
// berfungsi di sini; "migrasi" = masih dalam antrean pemindahan.
import {
  Bot,
  Video,
  FileText,
  FileImage,
  Eraser,
  Clapperboard,
  Plug,
  Workflow,
  Activity,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

export type ToolDef = {
  slug: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  status: "live" | "migrasi";
};

export const toolsData: ToolDef[] = [
  { slug: "assistant", name: "Vienna AI Assistant", desc: "Obrol dengan asisten AI-ku — agen FastAPI + RAG yang bisa menjawab soal proyek, keahlian, dan menjalankan tool.", icon: Bot, status: "live" },
  { slug: "video-downloader", name: "Video Downloader", desc: "Unduh video dari YouTube, Instagram, Threads, dan Facebook — satu engine yt-dlp, deteksi platform otomatis.", icon: Video, status: "live" },
  { slug: "pdf-analysis", name: "PDF Analysis", desc: "Bedah PDF: rincian warna per halaman (berwarna vs grayscale), metadata dokumen, dan ekstrak halaman menjadi PDF baru.", icon: FileText, status: "live" },
  { slug: "image-to-pdf", name: "Image to PDF", desc: "Ubah kumpulan gambar menjadi satu berkas PDF rapi.", icon: FileImage, status: "migrasi" },
  { slug: "remove-bg", name: "Remove Background", desc: "Hapus latar belakang foto secara otomatis dengan model AI.", icon: Eraser, status: "migrasi" },
  { slug: "anime-downloader", name: "Anime Downloader", desc: "Cari dan unduh anime dari katalog, lengkap dengan pilihan resolusi.", icon: Clapperboard, status: "migrasi" },
  { slug: "mcp-playground", name: "MCP Playground", desc: "Coba langsung 31 tool MCP server-ku (AgentMCP): sistem, database, produk, booking, dan pencarian web.", icon: Plug, status: "live" },
  { slug: "automations", name: "Automations", desc: "Kumpulan workflow otomatisasi yang kubangun untuk pekerjaan berulang.", icon: Workflow, status: "migrasi" },
  { slug: "status", name: "Service Status", desc: "Pantau kesehatan backend dan layanan-layanan yang menopang situs ini.", icon: Activity, status: "migrasi" },
  { slug: "feedback", name: "Feedback", desc: "Kirim ulasan dan masukan tentang situs dan tool-tool di sini.", icon: MessageSquare, status: "migrasi" },
];
