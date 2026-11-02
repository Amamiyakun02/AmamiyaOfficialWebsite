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
  { slug: "assistant", name: "Vienna AI Assistant", desc: "Chat with my AI assistant — a FastAPI + RAG agent that can answer questions about my projects and skills, and run tools.", icon: Bot, status: "live" },
  { slug: "video-downloader", name: "Video Downloader", desc: "Download videos from YouTube, Instagram, Threads, and Facebook — one yt-dlp engine, automatic platform detection.", icon: Video, status: "live" },
  { slug: "pdf-analysis", name: "PDF Analysis", desc: "Dissect a PDF: page count, fonts, embedded images, per-page color breakdown, plus an LLM summary and split/trim tools.", icon: FileText, status: "migrasi" },
  { slug: "image-to-pdf", name: "Image to PDF", desc: "Turn a set of images into one tidy PDF file.", icon: FileImage, status: "migrasi" },
  { slug: "remove-bg", name: "Remove Background", desc: "Remove photo backgrounds automatically with an AI model.", icon: Eraser, status: "migrasi" },
  { slug: "anime-downloader", name: "Anime Downloader", desc: "Search and download anime from a catalog, complete with resolution options.", icon: Clapperboard, status: "migrasi" },
  { slug: "mcp-playground", name: "MCP Playground", desc: "Try my MCP server tools (AgentMCP) live: system, database, products, booking, and web search.", icon: Plug, status: "live" },
  { slug: "automations", name: "Automations", desc: "A collection of automation workflows I built for repetitive work.", icon: Workflow, status: "migrasi" },
  { slug: "status", name: "Service Status", desc: "Monitor the health of the backend and the services that power this site.", icon: Activity, status: "migrasi" },
  { slug: "feedback", name: "Feedback", desc: "Send reviews and suggestions about this site and its tools.", icon: MessageSquare, status: "migrasi" },
];
