import {
  FileText,
  Bot,
  ShoppingBag,
  Image,
  FileImage,
  LayoutDashboard,
  Smartphone,
  Video as Youtube, // ikon merek Youtube sudah dihapus lucide versi baru — diganti Video
  Clapperboard,
  type LucideIcon,
} from "lucide-react"

export type ProjectCategory = "AI/ML" | "Web" | "Mobile"

export type Localized = { en: string; id: string }

export type ProjectMetric = { label: Localized; value: string }

export type ProjectType = {
  id: string
  numericId: number
  title: string
  tagline: Localized
  description: Localized
  category: ProjectCategory
  tech: string[]
  githubUrl: string
  liveUrl?: string
  icon: LucideIcon
  featured: boolean
  // --- Case study fields (fullstack proof) ---
  problem: Localized
  architecture: Localized
  frontend: string[]
  backend: string[]
  infra: string[]
  apiEndpoints: string[]
  tradeoffs: Localized
  results: Localized
  metrics: ProjectMetric[]
  codeSnippet: { lang: string; code: string }
  demoSteps: Localized
}

export const projectsData: ProjectType[] = [
  {
    id: "pdf-analysis-tool",
    numericId: 1,
    title: "PDF Analysis Tool",
    tagline: {
      en: "Inspect any PDF + LLM summary, end to end.",
      id: "Bedah PDF apa pun + ringkasan LLM, end to end.",
    },
    description: {
      en: "Upload a PDF to see page count, file size, fonts, and embedded images. Built with React and FastAPI (PyMuPDF), with per-page color breakdown and an LLM-generated summary.",
      id: "Unggah PDF untuk melihat jumlah halaman, ukuran file, font, dan gambar di dalamnya. Dibangun dengan React dan FastAPI (PyMuPDF), lengkap dengan rincian warna per halaman dan ringkasan dari LLM.",
    },
    category: "AI/ML",
    tech: ["React", "TypeScript", "Tailwind CSS", "FastAPI", "PyMuPDF"],
    githubUrl: "https://github.com/Amamiyakun02/myAgentic-apps",
    liveUrl: "/pdf-analysis",
    icon: FileText,
    featured: true,
    problem: {
      en: "Users receive PDFs from unknown sources and need fast answers: how big, how many pages, what fonts, are images embedded, and what is it about — without installing desktop software.",
      id: "Pengguna menerima PDF dari sumber tak dikenal dan butuh jawaban cepat: seberapa besar, berapa halaman, font apa, apakah ada gambar, dan isinya tentang apa — tanpa install software desktop.",
    },
    architecture: {
      en: "React uploads via multipart to FastAPI. PyMuPDF parses pages, fonts, images and color stats in a background task. Result JSON returns to the frontend, then a second call requests an LLM summary of extracted text. Files are never persisted longer than the request.",
      id: "React mengunggah via multipart ke FastAPI. PyMuPDF mem-parsing halaman, font, gambar, dan statistik warna di background task. JSON hasil kembali ke frontend, lalu panggilan kedua meminta ringkasan LLM dari teks terekstrak. File tidak disimpan lebih lama dari request.",
    },
    frontend: ["React 19", "TypeScript", "Tailwind CSS", "react-router-dom"],
    backend: ["FastAPI", "PyMuPDF", "Pydantic validation", "Streaming response"],
    infra: ["FastAPI Cloud", "Vite build", "GitHub Pages (frontend)"],
    apiEndpoints: [
      "POST /v1/pdf/check-color?threshold=15 (multipart file) -> { total_pages, colored_pages, metadata }",
      "POST /v1/pdf/cut (multipart file + pages) -> application/pdf",
      "POST /v1/pdf/image-to-pdf (multipart files[]) -> application/pdf",
    ],
    tradeoffs: {
      en: "PyMuPDF chosen over pdf.js for accurate font/image extraction server-side. Trade-off: upload bandwidth vs client parsing. Mitigated with file-size guard and per-page streaming so large PDFs don't block the UI.",
      id: "PyMuPDF dipilih dibanding pdf.js demi ekstraksi font/gambar yang akurat di sisi server. Konsekuensinya: butuh upload. Diatasi dengan batas ukuran file dan streaming per halaman agar PDF besar tidak memblokir UI.",
    },
    results: {
      en: "One live tool inside the portfolio: upload, inspect, and summarize without leaving the site. Reused upload + SSE pattern later for the Vienna assistant.",
      id: "Satu live tool di dalam portofolio: unggah, bedah, dan ringkas tanpa keluar situs. Pola upload + SSE dipakai ulang untuk asisten Vienna.",
    },
    metrics: [
      { label: { en: "Pages parsed", id: "Halaman ter-parsing" }, value: "100+ / file" },
      { label: { en: "Extra signals", id: "Sinyal tambahan" }, value: "fonts + images + color" },
      { label: { en: "Summary", id: "Ringkasan" }, value: "LLM streaming" },
    ],
    codeSnippet: {
      lang: "python",
      code: `# FastAPI + PyMuPDF: extract per-page signals\nimport fitz  # PyMuPDF\n\ndef analyze_pdf(path: str):\n    doc = fitz.open(path)\n    pages = []\n    fonts = set()\n    for i, page in enumerate(doc):\n        fonts.update(f["name"] for f in page.get_fonts())\n        pix = page.get_pixmap(dpi=72)\n        pages.append({\n            "index": i,\n            "size": [page.rect.width, page.rect.height],\n            "images": len(page.get_images()),\n            "is_color": pix.is_unicolor is False,\n        })\n    return {"num_pages": len(doc), "fonts": sorted(fonts), "pages": pages}`,
    },
    demoSteps: {
      en: "Open live demo -> upload a PDF -> check fonts/images tab -> request AI summary.",
      id: "Buka live demo -> unggah PDF -> cek tab font/gambar -> minta ringkasan AI.",
    },
  },
  {
    id: "agent-mcp",
    numericId: 2,
    title: "Agent MCP",
    tagline: {
      en: "10 tools for AI agents over MCP stdio.",
      id: "10 tool untuk agen AI via MCP stdio.",
    },
    description: {
      en: "An MCP server in Python that exposes 10 tools to AI agents — math, system info, text utilities, clock — plus resources and prompt templates. Works with Claude Desktop and other MCP clients over stdio.",
      id: "Server MCP berbasis Python dengan 10 tool untuk agen AI — matematika, info sistem, utilitas teks, jam — plus resources dan template prompt. Bisa dipakai Claude Desktop dan klien MCP lain via stdio.",
    },
    category: "AI/ML",
    tech: ["Python", "MCP SDK", "uv", "AI Integration", "Claude Desktop"],
    githubUrl: "https://github.com/Amamiyakun02/AgentMCP",
    icon: Bot,
    featured: true,
    problem: {
      en: "AI assistants need safe, typed access to local utilities (calc, clock, sysinfo, text ops) without giving raw shell access. MCP is the standard contract for that.",
      id: "Asisten AI butuh akses aman dan terketik ke utilitas lokal (kalkulasi, jam, info sistem, operasi teks) tanpa memberi akses shell mentah. MCP adalah kontrak standarnya.",
    },
    architecture: {
      en: "Python MCP server over stdio. Each capability is a typed tool with JSON schema input/output. Resources expose static context, prompt templates standardize agent behavior. Tested with Claude Desktop as MCP client.",
      id: "Server MCP Python via stdio. Tiap kapabilitas adalah tool terketik dengan skema JSON input/output. Resources mengekspos konteks statis, template prompt menstandarkan perilaku agen. Diuji dengan Claude Desktop sebagai klien MCP.",
    },
    frontend: ["Claude Desktop (client)", "JSON schema inspector"],
    backend: ["Python", "MCP SDK", "uv packaging", "stdio transport"],
    infra: ["uv", "Git", "Local process (no cloud needed)"],
    apiEndpoints: [
      "tools/list -> 10 tools (math, sysinfo, text, clock)",
      "tools/call { name, arguments } -> typed result",
      "resources/list + prompts/list -> context templates",
    ],
    tradeoffs: {
      en: "stdio chosen over SSE/HTTP for zero-network local use and simplest Claude Desktop setup. Trade-off: no remote multi-client yet — HTTP transport is the planned next step.",
      id: "stdio dipilih dibanding SSE/HTTP untuk pemakaian lokal tanpa jaringan dan setup Claude Desktop paling mudah. Konsekuensinya: belum multi-klien remote — transport HTTP adalah langkah berikutnya.",
    },
    results: {
      en: "Working MCP server any MCP client can connect to. Proves AI-integration skill beyond prompt-calling: schemas, transports, and tool design.",
      id: "Server MCP berjalan yang bisa dihubungkan klien MCP apa pun. Bukti skill integrasi AI di luar prompt-calling: skema, transport, dan desain tool.",
    },
    metrics: [
      { label: { en: "Tools exposed", id: "Tool terekspos" }, value: "10" },
      { label: { en: "Transports", id: "Transport" }, value: "stdio" },
      { label: { en: "Clients tested", id: "Klien teruji" }, value: "Claude Desktop" },
    ],
    codeSnippet: {
      lang: "python",
      code: `# MCP tool definition (typed, self-describing)\nfrom mcp.server import Server\n\nserver = Server("agent-mcp")\n\n@server.tool(description="Add two numbers safely")\nasync def add(a: float, b: float) -> dict:\n    return {"result": a + b, "op": "add"}\n\n# Client discovers via tools/list, calls via tools/call`,
    },
    demoSteps: {
      en: "Clone repo -> uv sync -> configure Claude Desktop mcpServers -> call tools/list.",
      id: "Clone repo -> uv sync -> konfigurasi mcpServers Claude Desktop -> panggil tools/list.",
    },
  },
  {
    id: "lina-deals",
    numericId: 3,
    title: "Lina Deals",
    tagline: {
      en: "Deals aggregator + RAG shopping assistant.",
      id: "Agregator deals + asisten belanja RAG.",
    },
    description: {
      en: "A deals aggregator with an AI shopping assistant. Built with React 19 and FastAPI, with a chatbot backed by Qdrant and a scraping pipeline. Deployed on Vercel.",
      id: "Agregator penawaran dengan asisten belanja AI. Dibangun dengan React 19 dan FastAPI, chatbot didukung Qdrant dan pipeline scraping. Di-deploy di Vercel.",
    },
    category: "Web",
    tech: ["React 19", "Tailwind CSS", "FastAPI", "Qdrant", "Vercel"],
    githubUrl: "https://github.com/Amamiyakun02/lina-deals",
    liveUrl: "https://lina-deals.vercel.app",
    icon: ShoppingBag,
    featured: true,
    problem: {
      en: "Promo data is scattered and stale. Users want one search plus an assistant that answers 'which deal fits my budget?' grounded in real listings, not hallucination.",
      id: "Data promo tersebar dan cepat basi. Pengguna ingin satu pencarian plus asisten yang menjawab 'deal mana yang cocok untuk budget saya?' berbasis listing nyata, bukan halusinasi.",
    },
    architecture: {
      en: "Scraping pipeline normalizes deals into Postgres + Qdrant vectors. FastAPI serves REST for listings and SSE for the chatbot. RAG retrieves top-k deals before LLM answering, with source links in every reply.",
      id: "Pipeline scraping menormalkan deals ke Postgres + vektor Qdrant. FastAPI melayani REST untuk listing dan SSE untuk chatbot. RAG mengambil top-k deals sebelum LLM menjawab, dengan tautan sumber di tiap balasan.",
    },
    frontend: ["React 19", "Tailwind CSS", "Vercel hosting"],
    backend: ["FastAPI", "Qdrant (vector search)", "Scraping pipeline", "SSE chat"],
    infra: ["Vercel (frontend)", "FastAPI Cloud (API)", "Qdrant Cloud"],
    apiEndpoints: [
      "GET /v1/deals?query=&sort= -> paginated listings",
      "POST /v1/assistant/chat -> SSE grounded answer + sources",
      "POST /v1/ingest/deals -> normalize + embed + upsert",
    ],
    tradeoffs: {
      en: "Qdrant over pgvector for dedicated vector ops and easier hybrid search later. Scraping cadence balanced against source rate-limits with incremental upserts instead of full re-crawl.",
      id: "Qdrant dipilih dibanding pgvector untuk operasi vektor khusus dan hybrid search ke depan. Frekuensi scraping diseimbangkan dengan rate-limit sumber via upsert inkremental, bukan crawl ulang penuh.",
    },
    results: {
      en: "Deployed full-stack app: searchable deals plus grounded AI assistant with citations.",
      id: "Aplikasi full-stack ter-deploy: deals bisa dicari plus asisten AI grounded dengan sitasi.",
    },
    metrics: [
      { label: { en: "Stack", id: "Stack" }, value: "React 19 + FastAPI" },
      { label: { en: "Retrieval", id: "Retrieval" }, value: "Qdrant top-k" },
      { label: { en: "Deployed", id: "Ter-deploy" }, value: "Vercel" },
    ],
    codeSnippet: {
      lang: "python",
      code: `# RAG answering with sources\nresults = qdrant.search(collection="deals", query_vector=embed(q), limit=5)\ncontext = "\\n".join(f"- {r.payload['title']} | {r.payload['price']}" for r in results)\nprompt = f"Answer using ONLY these deals:\\n{context}\\n\\nQ: {q}"\nfor chunk in llm.stream(prompt):\n    yield chunk  # SSE to React`,
    },
    demoSteps: {
      en: "Open live URL -> search deals -> ask assistant with budget -> check source links.",
      id: "Buka URL live -> cari deals -> tanya asisten dengan budget -> cek tautan sumber.",
    },
  },
  {
    id: "ai-background-remover",
    numericId: 4,
    title: "AI Background Remover",
    tagline: {
      en: "In-browser background removal, no backend.",
      id: "Hapus background di browser, tanpa backend.",
    },
    description: {
      en: "Remove image backgrounds in the browser with the Bi-RefNet model. Supports PNG and JPG, with before/after preview and one-click download. No custom backend needed.",
      id: "Hapus background gambar langsung di browser dengan model Bi-RefNet. Mendukung PNG dan JPG, ada pratinjau sebelum/sesudah dan unduhan satu klik. Tanpa backend khusus.",
    },
    category: "AI/ML",
    tech: ["React", "TypeScript", "Tailwind CSS", "Hugging Face Spaces", "Bi-RefNet"],
    githubUrl: "https://github.com/Amamiyakun02/myAgentic-apps",
    liveUrl: "/remove-bg",
    icon: Image,
    featured: true,
    problem: {
      en: "Quick background removal shouldn't require uploads to shady sites or heavy desktop apps. It should run near the user with instant preview.",
      id: "Hapus background cepat seharusnya tidak perlu unggah ke situs meragukan atau aplikasi desktop berat. Harus jalan dekat pengguna dengan pratinjau instan.",
    },
    architecture: {
      en: "React frontend calls a Hugging Face Space hosting Bi-RefNet. Image preprocessing and before/after slider stay client-side. No custom backend to maintain — the Space is the inference API.",
      id: "Frontend React memanggil Hugging Face Space berisi Bi-RefNet. Preprocessing gambar dan slider sebelum/sesudah tetap di sisi klien. Tanpa backend kustom — Space adalah API inference-nya.",
    },
    frontend: ["React", "TypeScript", "Canvas preview", "Before/after slider"],
    backend: ["Hugging Face Spaces (Bi-RefNet inference)"],
    infra: ["HF Spaces", "GitHub Pages (frontend)"],
    apiEndpoints: [
      "POST {HF_SPACE}/upload (multipart image) -> { mask, cutout }",
      "Client: canvas compositing + one-click download",
    ],
    tradeoffs: {
      en: "HF Space over self-hosting GPU: zero ops cost, but cold-starts possible. Mitigated with loading state + retry and client-side caching of last result.",
      id: "HF Space dibanding self-host GPU: nol biaya ops, tapi bisa cold-start. Diatasi dengan state loading + retry dan cache hasil terakhir di klien.",
    },
    results: {
      en: "Live in-portfolio tool: PNG/JPG in, transparent cutout out, one click.",
      id: "Live tool di portofolio: PNG/JPG masuk, cutout transparan keluar, satu klik.",
    },
    metrics: [
      { label: { en: "Formats", id: "Format" }, value: "PNG + JPG" },
      { label: { en: "Backend", id: "Backend" }, value: "None (HF Space)" },
      { label: { en: "UX", id: "UX" }, value: "Before/after + 1-click" },
    ],
    codeSnippet: {
      lang: "typescript",
      code: `// Call HF Space inference, keep UX responsive\nconst form = new FormData();\nform.append("image", file);\nconst res = await fetch(REMOVE_BG_ENDPOINT, { method: "POST", body: form });\nconst blob = await res.blob();\nconst url = URL.createObjectURL(blob); // preview + download`,
    },
    demoSteps: {
      en: "Open live demo -> upload PNG/JPG -> compare slider -> download.",
      id: "Buka live demo -> unggah PNG/JPG -> bandingkan slider -> unduh.",
    },
  },
  {
    id: "image-to-pdf-converter",
    numericId: 5,
    title: "Image to PDF Converter",
    tagline: {
      en: "Images in, print-ready PDF out.",
      id: "Gambar masuk, PDF siap cetak keluar.",
    },
    description: {
      en: "Combine multiple images into one print-ready PDF. Drag, reorder, and convert — the FastAPI backend (PyMuPDF) keeps original dimensions and quality.",
      id: "Gabungkan beberapa gambar menjadi satu PDF siap cetak. Seret, susun ulang, lalu konversi — backend FastAPI (PyMuPDF) menjaga dimensi dan kualitas asli.",
    },
    category: "Web",
    tech: ["React", "TypeScript", "Tailwind CSS", "FastAPI", "PyMuPDF"],
    githubUrl: "https://github.com/Amamiyakun02/myAgentic-apps",
    liveUrl: "/image-to-pdf",
    icon: FileImage,
    featured: true,
    problem: {
      en: "Merging phone photos into one clean PDF usually degrades quality or leaks files to third parties. Users need drag-reorder plus faithful conversion.",
      id: "Menggabung foto HP jadi satu PDF bersih biasanya menurunkan kualitas atau membocorkan file ke pihak ketiga. Pengguna butuh seret-susun plus konversi yang setia.",
    },
    architecture: {
      en: "React handles drag-reorder and previews with object URLs. On convert, ordered files POST to FastAPI which builds the PDF with PyMuPDF preserving dimensions, then streams the file back for download.",
      id: "React menangani seret-susun dan pratinjau via object URL. Saat konversi, file terurut di-POST ke FastAPI yang merakit PDF dengan PyMuPDF menjaga dimensi, lalu streaming file kembali untuk diunduh.",
    },
    frontend: ["React", "Drag-reorder list", "Object URL previews"],
    backend: ["FastAPI", "PyMuPDF", "Streaming file response"],
    infra: ["FastAPI Cloud", "Ephemeral storage (no DB)"],
    apiEndpoints: [
      "POST /v1/pdf/image-to-pdf (multipart files[]) -> application/pdf",
      "POST /v1/pdf/check-color (multipart file) -> color analysis",
      "GET /docs + GET / -> backend liveness for Status page",
    ],
    tradeoffs: {
      en: "Server-side merge over client jsPDF for print fidelity and EXIF-correct sizing. Trade-off: upload time — mitigated with client thumbnails so reorder stays instant.",
      id: "Merge sisi server dibanding jsPDF klien demi fidelitas cetak dan ukuran EXIF yang benar. Konsekuensinya: waktu unggah — diatasi dengan thumbnail klien agar susun ulang tetap instan.",
    },
    results: {
      en: "Live converter in the portfolio reusing the same upload/auth/streaming base as PDF Analysis.",
      id: "Konverter live di portofolio memakai ulang basis upload/auth/streaming yang sama dengan PDF Analysis.",
    },
    metrics: [
      { label: { en: "Input", id: "Input" }, value: "Multi-image + reorder" },
      { label: { en: "Fidelity", id: "Fidelitas" }, value: "Original dims kept" },
      { label: { en: "Output", id: "Output" }, value: "Streamed PDF" },
    ],
    codeSnippet: {
      lang: "python",
      code: `# Preserve dimensions when merging\nimport fitz\n\ndef images_to_pdf(image_paths: list[str], out: str):\n    doc = fitz.open()\n    for p in image_paths:\n        img = fitz.open(p)\n        rect = img[0].rect\n        page = doc.new_page(width=rect.width, height=rect.height)\n        page.new_shape().draw_rect(rect)\n        page.insert_image(rect, filename=p)\n    doc.save(out, deflate=True)`,
    },
    demoSteps: {
      en: "Open live demo -> add images -> drag to reorder -> convert -> download PDF.",
      id: "Buka live demo -> tambah gambar -> seret untuk susun -> konversi -> unduh PDF.",
    },
  },
  {
    id: "agent-dashboard",
    numericId: 6,
    title: "Agent Dashboard",
    tagline: {
      en: "Admin + RAG knowledge ops in one place.",
      id: "Admin + operasi knowledge RAG dalam satu tempat.",
    },
    description: {
      en: "An admin dashboard for managing agent data and knowledge bases. Role-based access (Superadmin & Sales), CRUD for products, users, bookings, and chats, plus document upload and indexing for a RAG assistant.",
      id: "Dasbor admin untuk mengelola data agen dan knowledge base. Akses berbasis peran (Superadmin & Sales), CRUD produk, pengguna, pemesanan, dan chat, plus unggah dan indeks dokumen untuk asisten RAG.",
    },
    category: "Web",
    tech: ["React", "TypeScript", "Vite", "ShadCN UI", "FastAPI", "Qdrant"],
    githubUrl: "https://github.com/Amamiyakun02/AgentDashboard",
    icon: LayoutDashboard,
    featured: true,
    problem: {
      en: "Agent apps need non-technical ops: manage users/products/bookings and feed documents to the assistant without touching code or vector DB consoles.",
      id: "Aplikasi agen butuh operasional non-teknis: kelola pengguna/produk/booking dan beri dokumen ke asisten tanpa menyentuh kode atau konsol vector DB.",
    },
    architecture: {
      en: "React + ShadCN admin with JWT role guards (Superadmin/Sales). FastAPI exposes CRUD plus /ingest pipeline: chunk, embed, upsert to Qdrant. Chat reads back via RAG with per-document citations.",
      id: "Admin React + ShadCN dengan guard peran JWT (Superadmin/Sales). FastAPI mengekspos CRUD plus pipeline /ingest: chunk, embed, upsert ke Qdrant. Chat membaca balik via RAG dengan sitasi per dokumen.",
    },
    frontend: ["React", "TypeScript", "Vite", "ShadCN UI", "Role guards"],
    backend: ["FastAPI", "JWT RBAC", "Qdrant indexing", "CRUD + ingest APIs"],
    infra: ["Vite build", "FastAPI Cloud", "Qdrant Cloud"],
    apiEndpoints: [
      "GET /v1/admin/{users,chatsessions,messages,documents,feedbacks,stats}",
      "POST /v1/admin/feedbacks (validated) -> { _id, created_at }",
      "POST /v1/gemini/chat, /v1/mercury/chat, or /v1/deepseek/chat (SSE; OpenAI nonaktif, credits habis; X-Session-ID)",
    ],
    tradeoffs: {
      en: "RBAC in JWT claims for simple two-role ops; row-level rules deferred until multi-tenant need. Chunking tuned for ID/EN mixed docs rather than one-size-fits-all.",
      id: "RBAC di klaim JWT untuk operasional dua peran yang simpel; aturan row-level ditunda sampai butuh multi-tenant. Chunking disetel untuk dokumen campuran ID/EN, bukan satu ukuran untuk semua.",
    },
    results: {
      en: "Single pane for business ops + knowledge ops feeding the same assistant backend as Vienna.",
      id: "Satu panel untuk operasi bisnis + operasi knowledge yang memberi makan backend asisten yang sama dengan Vienna.",
    },
    metrics: [
      { label: { en: "Roles", id: "Peran" }, value: "Superadmin + Sales" },
      { label: { en: "Modules", id: "Modul" }, value: "products/users/bookings/chats" },
      { label: { en: "Knowledge", id: "Knowledge" }, value: "Upload -> Qdrant" },
    ],
    codeSnippet: {
      lang: "typescript",
      code: `// Role guard for admin routes\nfunction requireRole(user: { role: string }, allowed: string[]) {\n  if (!allowed.includes(user.role)) throw new Error("Forbidden");\n  return true;\n}\n// usage: requireRole(session.user, ["superadmin", "sales"])`,
    },
    demoSteps: {
      en: "Login as role -> CRUD a product -> upload doc -> ask assistant -> verify citation.",
      id: "Login sebagai peran -> CRUD produk -> unggah dokumen -> tanya asisten -> verifikasi sitasi.",
    },
  },
  {
    id: "vienna-assistant-mobile",
    numericId: 7,
    title: "Vienna Assistant Mobile",
    tagline: {
      en: "RAG assistant in your pocket.",
      id: "Asisten RAG di saku Anda.",
    },
    description: {
      en: "An Android app for the Vienna AI assistant. Connects to the main AI backend for RAG chat and access to personal knowledge bases from your phone.",
      id: "Aplikasi Android untuk asisten AI Vienna. Terhubung ke backend AI utama untuk chat RAG dan akses knowledge base pribadi dari HP.",
    },
    category: "Mobile",
    tech: ["Kotlin", "Jetpack Compose", "Android SDK", "Coroutines", "Retrofit"],
    githubUrl: "https://github.com/Amamiyakun02/AssistantMobile",
    icon: Smartphone,
    featured: true,
    problem: {
      en: "Desktop-only assistants miss mobile moments. Users need the same RAG backend on Android with offline-tolerant chat UX.",
      id: "Asisten yang hanya desktop melewatkan momen mobile. Pengguna butuh backend RAG yang sama di Android dengan UX chat yang toleran offline.",
    },
    architecture: {
      en: "Native Android (Kotlin + Compose) with Retrofit to the shared FastAPI backend. Coroutines handle SSE streaming; local cache keeps history across sessions. Same user_id/session model as the web assistant.",
      id: "Android native (Kotlin + Compose) dengan Retrofit ke backend FastAPI bersama. Coroutines menangani streaming SSE; cache lokal menyimpan riwayat antar sesi. Model user_id/session sama dengan asisten web.",
    },
    frontend: ["Kotlin", "Jetpack Compose", "Retrofit", "Coroutines"],
    backend: ["Shared FastAPI (chat + sessions)", "Qdrant RAG"],
    infra: ["Android SDK", "Gradle", "Same cloud backend as web"],
    apiEndpoints: [
      "POST /v1/gemini/chat, /v1/mercury/chat, or /v1/deepseek/chat (SSE, shared with web)",
      "GET /v1/engines -> engine availability (Gemini/Mercury/DeepSeek)",
      "POST /v1/assistant/new-session -> rotate backend memory",
      "GET /v1/admin/chats -> history sync",
    ],
    tradeoffs: {
      en: "Native over Flutter here for best Android streaming + background behavior. Trade-off: two mobile codebases to maintain — shared backend contract keeps drift low.",
      id: "Native dipilih dibanding Flutter di sini demi streaming Android + perilaku background terbaik. Konsekuensinya: dua codebase mobile — kontrak backend bersama menekan drift.",
    },
    results: {
      en: "Phone access to the same Vienna brain: RAG chat + personal knowledge from anywhere.",
      id: "Akses HP ke otak Vienna yang sama: chat RAG + knowledge pribadi dari mana saja.",
    },
    metrics: [
      { label: { en: "Platform", id: "Platform" }, value: "Android native" },
      { label: { en: "Chat", id: "Chat" }, value: "SSE streaming" },
      { label: { en: "Backend", id: "Backend" }, value: "Shared FastAPI" },
    ],
    codeSnippet: {
      lang: "kotlin",
      code: `// Stream assistant SSE with coroutines\nsuspend fun streamChat(msgs: List<Msg>, onChunk: (String) -> Unit) {\n  retrofit.postChat(msgs).byteStream().bufferedReader().useLines { lines ->\n    lines.filter { it.startsWith("data: ") }.forEach {\n      onChunk(parseChunk(it.removePrefix("data: ")))\n    }\n  }\n}`,
    },
    demoSteps: {
      en: "Install APK -> login -> chat with Vienna -> check synced history on web.",
      id: "Install APK -> login -> chat dengan Vienna -> cek riwayat tersinkron di web.",
    },
  },
  {
    id: "video-downloader",
    numericId: 8,
    title: "Video Downloader",
    tagline: {
      en: "Paste a link, preview, save MP4 or MP3.",
      id: "Tempel tautan, pratinjau, simpan MP4 atau MP3.",
    },
    description: {
      en: "Download videos from YouTube, Instagram, Threads, and Facebook as MP4 or MP3 with automatic platform detection. The Vienna backend fetches once via yt-dlp with file caching, then streams the file to the browser — no double download.",
      id: "Unduh video dari YouTube, Instagram, Threads, dan Facebook sebagai MP4 atau MP3 dengan deteksi platform otomatis. Backend Vienna mengunduh sekali via yt-dlp dengan cache file, lalu streaming file ke browser — tanpa unduhan ganda.",
    },
    category: "Web",
    tech: ["React", "TypeScript", "Tailwind CSS", "FastAPI", "yt-dlp"],
    githubUrl: "https://github.com/Amamiyakun02/myAgentic-apps",
    liveUrl: "/video-downloader",
    icon: Youtube,
    featured: true,
    problem: {
      en: "Direct CDN links from video platforms expire fast, are IP-bound, and hit CORS walls in browsers. Users need paste-preview-download for YouTube, IG Reels, Threads, and FB without leaving the portfolio.",
      id: "Tautan CDN langsung dari platform video cepat kedaluwarsa, terikat IP, dan terhalang CORS di browser. Pengguna butuh tempel-pratinjau-unduh untuk YouTube, IG Reels, Threads, dan FB tanpa keluar portofolio.",
    },
    architecture: {
      en: "React previews metadata via GET info with auto platform detection, then POSTs url+format+quality. FastAPI validates the per-platform URL whitelist, dedups by {platform:media_id:format:quality} in an LRU file cache with per-key locks, runs yt-dlp once (optional cookie files for login-walled IG/FB content), and streams the bytes back with Content-Disposition + X-Cache + X-Platform.",
      id: "React mempratinjau metadata via GET info dengan deteksi platform otomatis, lalu POST url+format+quality. FastAPI memvalidasi whitelist URL per platform, dedup via {platform:media_id:format:quality} di cache file LRU dengan lock per key, menjalankan yt-dlp sekali (cookie file opsional untuk konten IG/FB yang butuh login), dan streaming byte kembali dengan Content-Disposition + X-Cache + X-Platform.",
    },
    frontend: ["React", "Platform badge + quality picker", "Blob download via Content-Disposition"],
    backend: ["FastAPI", "yt-dlp (4 extractors)", "LRU file cache + per-key locks", "Rate limit 10/min/IP"],
    infra: ["FastAPI Cloud", "Ephemeral cache (2 GB / 50 files)", "Optional cookie files"],
    apiEndpoints: [
      "GET /v1/tools/downloader/info?url=... -> { platform, title, duration, thumbnail, qualities }",
      "POST /v1/tools/downloader/download { url, format, quality } -> video/mp4 | audio/mpeg",
      "GET /v1/tools/downloader/platforms -> supported platforms + cookie status",
    ],
    tradeoffs: {
      en: "Server proxy + streaming over direct URLs for CORS-proof, non-expiring downloads. Trade-off: server bandwidth + disk — mitigated with LRU cache and 30-min / 500 MB guards. Login-walled IG/FB content needs server cookie files.",
      id: "Proxy server + streaming dibanding URL langsung demi unduhan anti-CORS yang tidak kedaluwarsa. Konsekuensinya: bandwidth + disk server — diatasi dengan cache LRU dan batas 30 menit / 500 MB. Konten IG/FB yang butuh login perlu cookie file di server.",
    },
    results: {
      en: "Live multi-platform downloader in the portfolio reusing the same tool-page pattern as Image to PDF.",
      id: "Pengunduh live multi-platform di portofolio memakai ulang pola tool-page yang sama dengan Image to PDF.",
    },
    metrics: [
      { label: { en: "Platforms", id: "Platform" }, value: "YT + IG + Threads + FB" },
      { label: { en: "Cache", id: "Cache" }, value: "LRU, X-Cache HIT" },
      { label: { en: "Guards", id: "Batas" }, value: "30 min / 500 MB" },
    ],
    codeSnippet: {
      lang: "typescript",
      code: `// Auto-detect platform, then download as blob\nconst info = await fetch(apiUrl("/v1/tools/downloader/info?url=" + encodeURIComponent(url))).then(r => r.json());\nconsole.log(info.platform); // youtube | instagram | threads | facebook\nconst res = await fetch(apiUrl("/v1/tools/downloader/download"), {\n  method: "POST", headers: { "Content-Type": "application/json" },\n  body: JSON.stringify({ url, format: "mp4", quality: "720" }),\n});\nconst blob = await res.blob(); // save via object URL`,
    },
    demoSteps: {
      en: "Open live demo -> paste video link -> check -> pick MP4/MP3 + quality -> download.",
      id: "Buka live demo -> tempel tautan video -> cek -> pilih MP4/MP3 + kualitas -> unduh.",
    },
  },
  {
    id: "anime-downloader",
    numericId: 9,
    title: "Anime Downloader",
    tagline: {
      en: "Batch + ongoing anime links, one page.",
      id: "Link anime batch + ongoing, satu halaman.",
    },
    description: {
      en: "Search batch anime with Indonesian subtitles, browse the full Kusonime batch list, or grab ongoing episode mirrors from Samehadaku. Pick a resolution and server — Google Drive and Pixeldrain links auto-resolve to direct downloads.",
      id: "Cari anime batch subtitle Indonesia, jelajahi daftar batch Kusonime, atau ambil mirror episode ongoing dari Samehadaku. Pilih resolusi dan server — link Google Drive dan Pixeldrain otomatis jadi direct download.",
    },
    category: "Web",
    tech: ["React", "TypeScript", "Tailwind CSS", "FastAPI", "BeautifulSoup"],
    githubUrl: "https://github.com/Amamiyakun02/myAgentic-apps",
    liveUrl: "/anime-downloader",
    icon: Clapperboard,
    featured: true,
    problem: {
      en: "Anime batch links are scattered across resolutions and mirrors (Drive, Acefile, Mega, Linkbox...), and multi-part titles need exact-part selection. Users need search-browse-pick-open in one page without leaving the portfolio.",
      id: "Link batch anime tersebar di banyak resolusi dan mirror (Drive, Acefile, Mega, Linkbox...), dan judul multi-part butuh pemilihan part yang tepat. Pengguna butuh cari-jelajah-pilih-buka dalam satu halaman tanpa keluar portofolio.",
    },
    architecture: {
      en: "React page with Batch + Ongoing tabs calls Vienna FastAPI: search/detail via Kusonime scraper with retry + exact-match ranking, batch list browsing with letter filter and pagination, Samehadaku ongoing/episode/download-links chain. Drive/Pixeldrain mirrors resolve server-side to bypass confirm pages; other mirrors open directly.",
      id: "Halaman React dengan tab Batch + Ongoing memanggil FastAPI Vienna: search/detail via scraper Kusonime dengan retry + ranking exact-match, jelajah daftar batch dengan filter huruf dan pagination, rantai ongoing/episode/download-links Samehadaku. Mirror Drive/Pixeldrain di-resolve sisi server menghindari halaman konfirmasi; mirror lain dibuka langsung.",
    },
    frontend: ["React", "Resolution pills + mirror rows", "Batch browse + ongoing chain"],
    backend: ["FastAPI", "Kusonime + Samehadaku scrapers", "GDrive/Pixeldrain resolver", "Retry + SSRF guard"],
    infra: ["FastAPI Cloud", "Stateless scraping (no DB)"],
    apiEndpoints: [
      "GET /v1/anime_downloader?search=&resolution=&server=&anime_url= -> matched + mirrors",
      "GET /v1/anime/batch_list?page=&huruf= -> paginated batch entries",
      "GET /v1/anime_downloader/resolve?url= -> direct download files",
      "GET /v1/ongoing_anime + /episodes + /download_links -> ongoing chain",
    ],
    tradeoffs: {
      en: "Server-side scraping over client fetch for CORS-proof access and retry logic in one place. Trade-off: upstream site flakiness — mitigated with retries and honest error messages suggesting a retry.",
      id: "Scraping sisi server dibanding fetch klien demi akses anti-CORS dan logika retry di satu tempat. Konsekuensinya: flaky situs upstream — diatasi dengan retry dan pesan error jujur yang menyarankan coba lagi.",
    },
    results: {
      en: "Live anime tool in the portfolio reusing the same tool-page pattern as Video Downloader: batch search, A-Z browse, multi-part picking, and ongoing episode links.",
      id: "Tool anime live di portofolio memakai ulang pola tool-page yang sama dengan Video Downloader: search batch, jelajah A-Z, pilih multi-part, dan link episode ongoing.",
    },
    metrics: [
      { label: { en: "Sources", id: "Sumber" }, value: "Kusonime + Samehadaku" },
      { label: { en: "Resolutions", id: "Resolusi" }, value: "360p - 1080p + sub" },
      { label: { en: "Mirrors", id: "Mirror" }, value: "Drive + PDL auto, rest manual" },
    ],
    codeSnippet: {
      lang: "typescript",
      code: `// Pick exact part via URL, then open the mirror\nconst detail = await fetch(\n  apiUrl("/v1/anime_downloader?search=86&anime_url=" + encodeURIComponent(part2Url))\n).then(r => r.json());\nconst mirror = detail.available_links["720P"].find(m => /drive\\.google/i.test(m.url));\nconst resolved = await fetch(\n  apiUrl("/v1/anime_downloader/resolve?url=" + encodeURIComponent(mirror.url))\n).then(r => r.json());\nwindow.open(resolved.files[0].resolved_url, "_blank"); // direct download`,
    },
    demoSteps: {
      en: "Open live demo -> search batch (try '86') -> pick resolution + mirror -> open; or browse A-Z; or Ongoing tab -> anime -> episode -> mirror.",
      id: "Buka live demo -> cari batch (coba '86') -> pilih resolusi + mirror -> buka; atau jelajah A-Z; atau tab Ongoing -> anime -> episode -> mirror.",
    },
  },
]

export const getProjectById = (id: string) => projectsData.find((p) => p.id === id)

export const getAdjacentProjects = (id: string) => {
  const idx = projectsData.findIndex((p) => p.id === id)
  if (idx === -1) return { prev: null, next: null }
  return {
    prev: idx > 0 ? projectsData[idx - 1] : null,
    next: idx < projectsData.length - 1 ? projectsData[idx + 1] : null,
  }
}
