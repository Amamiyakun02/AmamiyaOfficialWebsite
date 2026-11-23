// Data keahlian — dipakai section About (filter kategori + kartu level).
// Kategori diperluas 23 Nov 2026 atas permintaan user: Frontend, Backend,
// Android, Database, Deployment, System Integration, AI/ML, AI Tools,
// Other. Sebagian isi masih dummy (Fiber, Laravel, Kotlin, GCP, Oracle
// Cloud) — disesuaikan lagi oleh user nanti.
export type SkillCategory =
  | "All"
  | "Frontend"
  | "Backend"
  | "Android"
  | "Database"
  | "Deployment"
  | "System Integration"
  | "AI/ML"
  | "AI Tools"
  | "Other";

export type Skill = {
  name: string;
  level: number;
  desc: { en: string; id: string };
  category: Exclude<SkillCategory, "All">;
};

export const skillsData: Skill[] = [
  // ===== Frontend =====
  {
    name: "React",
    level: 80,
    desc: {
      en: "Frontends and dashboards with React.",
      id: "Frontend dan dasbor dengan React."
    },
    category: "Frontend"
  },
  {
    name: "Next.js",
    level: 80,
    desc: {
      en: "Full-stack web apps and this portfolio site itself.",
      id: "Aplikasi web full-stack dan situs portofolio ini sendiri."
    },
    category: "Frontend"
  },
  {
    name: "Tailwind CSS",
    level: 75,
    desc: {
      en: "Responsive layouts and component styling with utilities.",
      id: "Layout responsif dan styling komponen berbasis utilitas."
    },
    category: "Frontend"
  },
  {
    name: "TypeScript / JS",
    level: 75,
    desc: {
      en: "Type-safe code for web apps.",
      id: "Kode yang type-safe untuk aplikasi web."
    },
    category: "Frontend"
  },

  // ===== Backend =====
  {
    name: "FastAPI",
    level: 85,
    desc: {
      en: "REST APIs and the AI agent backend behind this site.",
      id: "API REST dan backend agent AI di balik situs ini."
    },
    category: "Backend"
  },
  {
    name: "Python",
    level: 85,
    desc: {
      en: "Main language for backends, scripting, and automation.",
      id: "Bahasa utama untuk backend, scripting, dan otomatisasi."
    },
    category: "Backend"
  },
  {
    name: "Fiber (Go)",
    level: 55,
    desc: {
      en: "Lightweight, fast HTTP APIs with Go's Fiber framework.",
      id: "API HTTP yang ringan dan cepat dengan framework Fiber di Go."
    },
    category: "Backend"
  },
  {
    name: "Laravel",
    level: 55,
    desc: {
      en: "PHP web apps with Laravel's MVC structure and Eloquent ORM.",
      id: "Aplikasi web PHP dengan struktur MVC Laravel dan Eloquent ORM."
    },
    category: "Backend"
  },
  {
    name: "Supabase",
    level: 65,
    desc: {
      en: "Backend-as-a-service on PostgreSQL: database, auth, and storage in one platform.",
      id: "Backend-as-a-service berbasis PostgreSQL: database, auth, dan storage dalam satu platform."
    },
    category: "System Integration"
  },
  {
    name: "Firebase",
    level: 65,
    desc: {
      en: "Google's app platform: Firestore, auth, and hosting for web and mobile apps.",
      id: "Platform aplikasi Google: Firestore, auth, dan hosting untuk aplikasi web dan mobile."
    },
    category: "System Integration"
  },
  {
    name: "Google OAuth",
    level: 75,
    desc: {
      en: "Sign-in and Google API access with OAuth 2.0.",
      id: "Login dan akses API Google dengan OAuth 2.0."
    },
    category: "System Integration"
  },
  {
    name: "Gmail API",
    level: 75,
    desc: {
      en: "Reading mail through Google's API with read-only OAuth scopes.",
      id: "Membaca email lewat API Google dengan scope OAuth baca-saja."
    },
    category: "System Integration"
  },
  {
    name: "WhatsApp API",
    level: 70,
    desc: {
      en: "Sending messages and notifications through WhatsApp.",
      id: "Mengirim pesan dan notifikasi lewat WhatsApp."
    },
    category: "System Integration"
  },
  {
    name: "Telegram API",
    level: 70,
    desc: {
      en: "Telegram bots and notification channels via the Bot API.",
      id: "Bot Telegram dan kanal notifikasi lewat Bot API."
    },
    category: "System Integration"
  },
  {
    name: "Discord API",
    level: 85,
    desc: {
      en: "Community bots with dozens of commands, music, and moderation.",
      id: "Bot komunitas dengan puluhan perintah, musik, dan moderasi."
    },
    category: "System Integration"
  },
  {
    name: "Spotify API",
    level: 70,
    desc: {
      en: "Music search, playlists, and playback control through Spotify.",
      id: "Pencarian musik, playlist, dan kontrol pemutaran lewat Spotify."
    },
    category: "System Integration"
  },
  {
    name: "Resend (Email API)",
    level: 80,
    desc: {
      en: "Transactional email delivery through the Resend API.",
      id: "Pengiriman email transaksional lewat API Resend."
    },
    category: "System Integration"
  },
  {
    name: "OpenAI API",
    level: 80,
    desc: {
      en: "GPT models for chat, tools, and multimodal apps.",
      id: "Model GPT untuk chat, tool, dan aplikasi multimodal."
    },
    category: "System Integration"
  },
  {
    name: "Gemini API",
    level: 80,
    desc: {
      en: "Google's Gemini models in apps and agent workflows.",
      id: "Model Gemini Google di aplikasi dan alur kerja agent."
    },
    category: "System Integration"
  },
  {
    name: "Claude API",
    level: 75,
    desc: {
      en: "Anthropic's Claude models for reasoning and coding tasks.",
      id: "Model Claude dari Anthropic untuk penalaran dan tugas coding."
    },
    category: "System Integration"
  },
  {
    name: "Meta AI (Llama)",
    level: 65,
    desc: {
      en: "Meta's Llama models through hosted APIs.",
      id: "Model Llama dari Meta lewat API ter-hosting."
    },
    category: "System Integration"
  },
  {
    name: "DeepSeek API",
    level: 80,
    desc: {
      en: "DeepSeek models — the default brain of my admin agent.",
      id: "Model DeepSeek — otak default agent admin-ku."
    },
    category: "System Integration"
  },
  {
    name: "Inception (Mercury)",
    level: 80,
    desc: {
      en: "Mercury models powering this site's public assistant.",
      id: "Model Mercury yang menjalankan asisten publik situs ini."
    },
    category: "System Integration"
  },
  {
    name: "ElevenLabs API",
    level: 65,
    desc: {
      en: "Text-to-speech voices and voice generation for apps.",
      id: "Suara text-to-speech dan pembuatan suara untuk aplikasi."
    },
    category: "System Integration"
  },
  {
    name: "Weather & Maps API",
    level: 75,
    desc: {
      en: "Open-Meteo forecasts and OpenStreetMap geocoding.",
      id: "Prakiraan Open-Meteo dan geocoding OpenStreetMap."
    },
    category: "System Integration"
  },

  // ===== Android =====
  {
    name: "Flutter & Dart",
    level: 80,
    desc: {
      en: "Cross-platform mobile apps with Flutter.",
      id: "Aplikasi mobile lintas platform dengan Flutter."
    },
    category: "Android"
  },
  {
    name: "Kotlin",
    level: 50,
    desc: {
      en: "Native Android apps with Kotlin.",
      id: "Aplikasi Android native dengan Kotlin."
    },
    category: "Android"
  },

  // ===== Database =====
  {
    name: "PostgreSQL",
    level: 75,
    desc: {
      en: "Relational storage for dashboards and audit data.",
      id: "Penyimpanan relasional untuk dasbor dan data audit."
    },
    category: "Database"
  },
  {
    name: "MongoDB",
    level: 80,
    desc: {
      en: "Document storage for app data and the MCP server.",
      id: "Penyimpanan dokumen untuk data aplikasi dan server MCP."
    },
    category: "Database"
  },
  {
    name: "MySQL",
    level: 70,
    desc: {
      en: "Classic relational databases for web apps.",
      id: "Database relasional klasik untuk aplikasi web."
    },
    category: "Database"
  },
  {
    name: "Qdrant",
    level: 75,
    desc: {
      en: "Vector database for embeddings and semantic search.",
      id: "Database vektor untuk embedding dan pencarian semantik."
    },
    category: "Database"
  },
  {
    name: "ChromaDB",
    level: 70,
    desc: {
      en: "Embedding store for RAG pipelines and AI apps.",
      id: "Penyimpanan embedding untuk alur RAG dan aplikasi AI."
    },
    category: "Database"
  },
  {
    name: "Redis",
    level: 65,
    desc: {
      en: "In-memory store for caching, sessions, and queues.",
      id: "Penyimpanan in-memory untuk cache, sesi, dan antrean."
    },
    category: "Database"
  },

  // ===== Deployment =====
  {
    name: "Vultr",
    level: 75,
    desc: {
      en: "VPS hosting for backends and self-hosted services.",
      id: "Hosting VPS untuk backend dan layanan self-hosted."
    },
    category: "Deployment"
  },
  {
    name: "Google Cloud (GCP)",
    level: 50,
    desc: {
      en: "Cloud compute and managed services on Google Cloud.",
      id: "Komputasi awan dan layanan terkelola di Google Cloud."
    },
    category: "Deployment"
  },
  {
    name: "Oracle Cloud",
    level: 50,
    desc: {
      en: "Cloud infrastructure on Oracle Cloud (OCI).",
      id: "Infrastruktur awan di Oracle Cloud (OCI)."
    },
    category: "Deployment"
  },
  {
    name: "Cloudflare",
    level: 80,
    desc: {
      en: "DNS, proxy, and tunnels for my domains and services.",
      id: "DNS, proxy, dan tunnel untuk domain dan layananku."
    },
    category: "Deployment"
  },
  {
    name: "Vercel",
    level: 80,
    desc: {
      en: "Frontend hosting and deployment for Next.js apps.",
      id: "Hosting dan deployment frontend untuk aplikasi Next.js."
    },
    category: "Deployment"
  },
  {
    name: "Docker Containers",
    level: 80,
    desc: {
      en: "Containerized apps for consistent deployments.",
      id: "Aplikasi dalam container agar deployment konsisten."
    },
    category: "Deployment"
  },
  {
    name: "Linux Administration",
    level: 70,
    desc: {
      en: "Server setup, config, and day-to-day administration.",
      id: "Setup server, konfigurasi, dan administrasi harian."
    },
    category: "Deployment"
  },

  // ===== AI/ML =====
  {
    name: "PyTorch & ML",
    level: 75,
    desc: {
      en: "Model setup, fine-tuning, and working with embeddings.",
      id: "Setup model, fine-tuning, dan pengolahan embedding."
    },
    category: "AI/ML"
  },
  {
    name: "LangChain / RAG",
    level: 80,
    desc: {
      en: "Agent pipelines and knowledge retrieval over custom documents.",
      id: "Alur agen dan pencarian pengetahuan dari dokumen sendiri."
    },
    category: "AI/ML"
  },
  {
    name: "Gemini / OpenAI SDKs",
    level: 80,
    desc: {
      en: "Using Gemini and OpenAI models in real apps, including multimodal input.",
      id: "Memakai model Gemini dan OpenAI di aplikasi nyata, termasuk input multimodal."
    },
    category: "AI/ML"
  },

  // ===== AI Tools =====
  {
    name: "Claude Code",
    level: 75,
    desc: {
      en: "AI coding assistant for development workflows.",
      id: "Asisten coding AI untuk alur kerja pengembangan."
    },
    category: "AI Tools"
  },
  {
    name: "Codex",
    level: 70,
    desc: {
      en: "OpenAI's coding agent for code generation and fixes.",
      id: "Agent coding OpenAI untuk membuat dan memperbaiki kode."
    },
    category: "AI Tools"
  },
  {
    name: "OpenCode",
    level: 85,
    desc: {
      en: "The agent core powering this site's public and admin assistants.",
      id: "Inti agent yang menjalankan asisten publik dan admin situs ini."
    },
    category: "AI Tools"
  },
  {
    name: "Muse",
    level: 75,
    desc: {
      en: "Personal AI assistant in chat and messaging apps.",
      id: "Asisten AI pribadi di aplikasi chat dan pesan."
    },
    category: "AI Tools"
  },
  {
    name: "MCP",
    level: 85,
    desc: {
      en: "Model Context Protocol — my own MCP server with dozens of tools for agents.",
      id: "Model Context Protocol — server MCP buatanku dengan puluhan tool untuk agent."
    },
    category: "AI Tools"
  },

  // ===== Other =====
  {
    name: "Bash & Python Scripting",
    level: 80,
    desc: {
      en: "Automation scripts for routine tasks.",
      id: "Skrip otomatisasi untuk tugas rutin."
    },
    category: "Other"
  },
  {
    name: "Git & GitHub",
    level: 80,
    desc: {
      en: "Version control and collaboration for all my projects.",
      id: "Kontrol versi dan kolaborasi untuk semua proyekku."
    },
    category: "Other"
  }
]
