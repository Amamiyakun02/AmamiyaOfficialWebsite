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
  // desc = Bahasa Indonesia, descEn = Inggris (27 Nov 2026, i18n
  // situs): komponen memilih sisi sesuai bahasa aktif.
  desc: string;
  descEn: string;
  icon: LucideIcon;
  status: "live" | "migrasi";
};

export const toolsData: ToolDef[] = [
  { slug: "assistant", name: "Vienna AI Assistant", desc: "Obrol dengan asisten AI-ku — agen FastAPI + RAG yang bisa menjawab soal proyek, keahlian, dan menjalankan tool.", descEn: "Chat with my AI assistant — a FastAPI + RAG agent that can answer questions about my projects and skills, and run tools.", icon: Bot, status: "live" },
  { slug: "video-downloader", name: "Video Downloader", desc: "Unduh video dari YouTube, Instagram, Threads, dan Facebook — satu engine yt-dlp, deteksi platform otomatis.", descEn: "Download videos from YouTube, Instagram, Threads, and Facebook — one yt-dlp engine, automatic platform detection.", icon: Video, status: "live" },
  { slug: "pdf-analysis", name: "PDF Analysis", desc: "Bedah PDF: rincian warna per halaman (berwarna vs grayscale), metadata dokumen, dan ekstrak halaman menjadi PDF baru.", descEn: "Dissect a PDF: per-page color breakdown (color vs grayscale), document metadata, and extract pages into a new PDF.", icon: FileText, status: "live" },
  { slug: "image-to-pdf", name: "Image to PDF", desc: "Ubah kumpulan gambar menjadi satu berkas PDF rapi.", descEn: "Turn a set of images into one tidy PDF file.", icon: FileImage, status: "migrasi" },
  { slug: "remove-bg", name: "Remove Background", desc: "Hapus latar belakang foto secara otomatis dengan model AI.", descEn: "Remove a photo's background automatically with an AI model.", icon: Eraser, status: "migrasi" },
  { slug: "anime-downloader", name: "Anime Downloader", desc: "Cari dan unduh anime dari katalog, lengkap dengan pilihan resolusi.", descEn: "Search and download anime from the catalog, complete with resolution choices.", icon: Clapperboard, status: "migrasi" },
  { slug: "mcp-playground", name: "MCP Playground", desc: "Coba langsung 31 tool MCP server-ku (AgentMCP): sistem, database, produk, booking, dan pencarian web.", descEn: "Try 31 tools from my MCP server (AgentMCP) live: system, database, products, booking, and web search.", icon: Plug, status: "live" },
  { slug: "automations", name: "Automations", desc: "Kumpulan workflow otomatisasi yang kubangun untuk pekerjaan berulang.", descEn: "A collection of automation workflows I built for repetitive work.", icon: Workflow, status: "migrasi" },
  { slug: "status", name: "Service Status", desc: "Pantau kesehatan backend dan layanan-layanan yang menopang situs ini.", descEn: "Monitor the health of the backend and the services that power this site.", icon: Activity, status: "migrasi" },
  { slug: "feedback", name: "Feedback", desc: "Kirim ulasan dan masukan tentang situs dan tool-tool di sini.", descEn: "Send reviews and feedback about this site and its tools.", icon: MessageSquare, status: "live" },
];
