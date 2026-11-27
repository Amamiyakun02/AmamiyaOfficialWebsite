// Kamus UI situs publik (EN/ID) — ditambahkan 27 Nov 2026 saat user
// memutuskan branding internasional: bahasa bawaan situs = Inggris,
// pengunjung bisa beralih ke Bahasa Indonesia lewat tombol di navbar
// (komponen LangSwitcher di lib/i18n.tsx). Pilihan disimpan di
// localStorage "site-lang".
//
// Konten DATA (deskripsi project/skill dari dashboard & data statis
// lib/projects.ts, lib/skills.ts, lib/mcpTools.ts) TIDAK lewat kamus
// ini — data itu sudah dwibahasa sejak awal (tipe Localized {en, id})
// dan komponen memilih sisinya dengan indeks [lang]. Kamus ini hanya
// untuk teks antarmuka yang tertanam di komponen.

export type Lang = "en" | "id";

type Entry = { en: string; id: string };

export const DICT = {
  // ===== Umum =====
  "common.all": { en: "All", id: "Semua" },
  "common.showLess": { en: "Show less", id: "Tampilkan lebih sedikit" },
  "common.backToTools": { en: "Back to Tools", id: "Kembali ke Tools" },
  "common.backHome": { en: "Back to Home", id: "Kembali ke Beranda" },
  "common.featured": { en: "★ Featured", id: "★ Unggulan" },
  "common.caseStudy": { en: "Case study →", id: "Studi kasus →" },
  "common.demoVideo": { en: "Demo video", id: "Video demo" },
  "common.close": { en: "Close", id: "Tutup" },
  "common.statusActive": { en: "Active", id: "Aktif" },
  "common.statusMaintenance": { en: "Maintenance", id: "Pemeliharaan" },

  // ===== Navbar =====
  "nav.downloadCv": { en: "Download CV", id: "Unduh CV" },
  "nav.openMenu": { en: "Open menu", id: "Buka menu" },
  "nav.closeMenu": { en: "Close menu", id: "Tutup menu" },
  "nav.language": { en: "Language", id: "Bahasa" },

  // ===== Section Projects + halaman /projects =====
  "projects.intro": {
    en: "Featured projects I hand-picked straight from my dashboard — the best of what I am building and have built. The full list lives on the Projects page.",
    id: "Project unggulan yang kupilih langsung dari dashboard-ku — empat terbaik yang sedang dan sudah kubangun. Daftar lengkapnya ada di halaman Projects.",
  },
  "projects.nonePinned": {
    en: "No featured projects have been pinned from the dashboard yet.",
    id: "Belum ada project unggulan yang di-pin dari dashboard.",
  },
  "projects.allIntro": {
    en: "All of my public projects — the ones pinned as Top Projects appear first. This list is managed from my System Dashboard.",
    id: "Semua project publikku — yang di-pin sebagai Top Project tampil lebih dulu. Daftar ini dikelola dari System Dashboard-ku.",
  },
  "projects.allFallback": {
    en: "(Showing the backup list — the backend server is currently unreachable.)",
    id: "(Menampilkan daftar cadangan — server backend sedang tidak terjangkau.)",
  },
  "projects.allLoading": { en: "Loading projects…", id: "Memuat daftar project…" },
  "projects.allEmpty": { en: "No public projects yet.", id: "Belum ada project publik." },
  "projects.allCount": { en: "Showing {count} projects.", id: "Menampilkan {count} project." },

  // ===== Section Tools =====
  "tools.intro": {
    en: "Tools I built and use myself — an AI assistant, a video downloader, PDF and image processors, and a playground for my MCP server. Everything is being moved into this new home, step by step.",
    id: "Tool-tool yang kubangun dan kupakai sendiri — asisten AI, pengunduh video, pengolah PDF dan gambar, sampai playground MCP server-ku. Semuanya sedang dipindah ke rumah baru ini secara bertahap.",
  },
  "tools.live": { en: "Live", id: "Aktif" },
  "tools.migrating": { en: "Migrating", id: "Tahap migrasi" },
  "tools.open": { en: "Open tool →", id: "Buka tool →" },
  "tools.showAll": { en: "Show all tools", id: "Lihat semua tool" },

  // ===== Section About =====
  "about.intro": {
    en: "I like building practical tools that solve real problems. Build once, useful forever.",
    id: "Saya suka membangun alat praktis yang menyelesaikan masalah nyata. Sekali buat, berguna selamanya.",
  },
  "about.skills": { en: "Skills", id: "Keahlian" },
  "about.experience": { en: "Experience", id: "Pengalaman" },
  "about.showAllSkills": { en: "Show all skills", id: "Lihat semua keahlian" },

  // ===== Section Contact =====
  "contact.intro": {
    en: "Send a message through this form — for freelance opportunities, collaboration, or just to say hi.",
    id: "Kirim pesan lewat formulir ini — untuk peluang freelance, kolaborasi, atau sekadar menyapa.",
  },
  "contact.sentTitle": { en: "Message Sent", id: "Pesan Terkirim" },
  "contact.sentBody": {
    en: "Thank you for reaching out. I will reply as soon as I can.",
    id: "Terima kasih sudah menghubungi. Saya akan membalas secepatnya.",
  },
  "contact.sendAnother": { en: "Send another message", id: "Kirim pesan lainnya" },
  "contact.name": { en: "Your Name", id: "Nama Anda" },
  "contact.email": { en: "Your Email", id: "Email Anda" },
  "contact.message": { en: "Your Message", id: "Pesan Anda" },
  "contact.sending": { en: "Sending...", id: "Mengirim..." },
  "contact.send": { en: "Send Message", id: "Kirim Pesan" },
  "contact.connect": { en: "Get in Touch", id: "Terhubung" },
  "contact.error": {
    en: "Failed to send your message. Please try again in a moment, or reach me through another channel.",
    id: "Gagal mengirim pesan. Silakan coba lagi sebentar, atau hubungi lewat kanal lain.",
  },

  // ===== Detail project (studi kasus) =====
  "detail.close": { en: "✕ Close", id: "✕ Tutup" },
  "detail.closeLabel": { en: "Close case study", id: "Tutup studi kasus" },
  "detail.visitLive": { en: "Visit Live →", id: "Kunjungi Live →" },
  "detail.problem": { en: "The Problem", id: "Masalah" },
  "detail.architecture": { en: "Architecture", id: "Arsitektur" },
  "detail.stack": { en: "Tech Stack", id: "Tumpukan Teknologi" },
  "detail.endpoints": { en: "API Endpoints", id: "Endpoint API" },
  "detail.code": { en: "Code Snippet", id: "Cuplikan Kode" },
  "detail.demo": { en: "Demo Steps", id: "Langkah Demo" },
  "detail.results": { en: "Results", id: "Hasil" },
  "detail.tradeoffs": { en: "Trade-offs", id: "Trade-off" },

  // ===== Assistant (chat publik + quick chat) =====
  "assistant.welcome": {
    en: "Hi! I'm Vienna, Amamiya's AI assistant. Ask me about his skills, his projects, or how to contact him.",
    id: "Halo! Saya Vienna, asisten AI Amamiya. Tanyakan tentang keahliannya, proyeknya, atau cara menghubunginya.",
  },
  "assistant.tool.write": { en: "Writing a file…", id: "Menulis file…" },
  "assistant.tool.read": { en: "Reading a file…", id: "Membaca file…" },
  "assistant.tool.edit": { en: "Editing a file…", id: "Mengedit file…" },
  "assistant.tool.bash": { en: "Running a command…", id: "Menjalankan perintah…" },
  "assistant.tool.question": { en: "Preparing a question…", id: "Menyiapkan pertanyaan…" },
  "assistant.tool.webfetch": { en: "Fetching a web page…", id: "Mengambil halaman web…" },
  "assistant.tool.websearch": { en: "Searching the web…", id: "Mencari di web…" },
  "assistant.tool.grep": { en: "Searching in files…", id: "Mencari dalam file…" },
  "assistant.tool.glob": { en: "Searching for files…", id: "Mencari file…" },
  "assistant.tool.task": { en: "Running a sub-task…", id: "Menjalankan sub-tugas…" },
  "assistant.toolFallback": { en: "Using tool {name}…", id: "Memakai tool {name}…" },
  "assistant.errAnswer": { en: "Failed to send your answer — please try again.", id: "Gagal mengirim jawaban — coba lagi." },
  "assistant.errCancel": { en: "Failed to cancel — please try again.", id: "Gagal membatalkan — coba lagi." },
  "assistant.errDecision": { en: "Failed to send your decision — please try again.", id: "Gagal mengirim keputusan — coba lagi." },
  "assistant.errRate": { en: "Too many requests — wait a moment, then try again.", id: "Terlalu banyak permintaan — tunggu sebentar lalu coba lagi." },
  "assistant.errServer": { en: "Failed to reach the server.", id: "Gagal menghubungi server." },
  "assistant.noAnswer": { en: "(no answer)", id: "(tidak ada jawaban)" },
  "assistant.formExpired": { en: "This question is no longer valid.", id: "Pertanyaan ini sudah tidak berlaku." },
  "assistant.permExpired": { en: "This approval request is no longer valid.", id: "Permintaan persetujuan ini sudah tidak berlaku." },
  "assistant.formFallbackTitle": { en: "Question from the agent", id: "Pertanyaan dari agent" },
  "assistant.approvalTitle": { en: "Action approval", id: "Persetujuan aksi" },
  "assistant.customPlaceholderEnter": { en: "or write your own answer, Enter to add…", id: "atau tulis jawabanmu sendiri, Enter untuk menambahkan…" },
  "assistant.customPlaceholder": { en: "or write your own answer…", id: "atau tulis jawabanmu sendiri…" },
  "assistant.sendAnswer": { en: "Send answer", id: "Kirim jawaban" },
  "assistant.cancel": { en: "Cancel", id: "Batalkan" },
  "assistant.allowOnce": { en: "Allow once", id: "Izinkan sekali" },
  "assistant.allowAlways": { en: "Always allow", id: "Selalu izinkan" },
  "assistant.reject": { en: "Reject", id: "Tolak" },
  "assistant.allTools": { en: "All tools", id: "Semua tools" },
  "assistant.newSession": { en: "New session", id: "Sesi baru" },
  "assistant.newSessionTitle": { en: "Start a new session", id: "Mulai sesi baru" },
  "assistant.inputPlaceholder": { en: "Message Vienna…", id: "Tulis pesan untuk Vienna…" },
  "assistant.inputLabel": { en: "Write a message", id: "Tulis pesan" },
  "assistant.sendLabel": { en: "Send message", id: "Kirim pesan" },

  // ===== Quick chat (AgentFab) =====
  "fab.prompt1": { en: "Tell me about Amamiya's skills", id: "Ceritakan keahlian Amamiya" },
  "fab.prompt2": { en: "Show me his latest projects", id: "Tampilkan proyek terbarunya" },
  "fab.prompt3": { en: "How can I contact him?", id: "Bagaimana cara menghubunginya?" },
  "fab.quickPrompts": { en: "Vienna quick prompts", id: "Prompt cepat Vienna" },
  "fab.openVienna": { en: "Open Vienna AI Assistant quick chat", id: "Buka quick chat Vienna AI Assistant" },
  "fab.closeVienna": { en: "Close Vienna quick chat", id: "Tutup quick chat Vienna" },
  "fab.subtitle": { en: "Amamiya's AI assistant", id: "Asisten AI Amamiya" },
  "fab.fullPage": { en: "Full page", id: "Halaman penuh" },
  "fab.openFull": { en: "Open the full Assistant page", id: "Buka halaman penuh Assistant" },
  "fab.close": { en: "Close quick chat", id: "Tutup quick chat" },

  // ===== Video Downloader =====
  "video.subtitle": {
    en: "Download videos from YouTube, Instagram, Threads & Facebook as MP4 or MP3. Paste a link, preview it, then save.",
    id: "Unduh video dari YouTube, Instagram, Threads & Facebook sebagai MP4 atau MP3. Tempel tautan, pratinjau, lalu simpan.",
  },
  "video.placeholder": {
    en: "Paste a video link (YouTube, IG Reel, Threads, FB...)",
    id: "Tempel tautan video (YouTube, IG Reel, Threads, FB...)",
  },
  "video.checking": { en: "Checking...", id: "Memeriksa..." },
  "video.check": { en: "Check Video", id: "Cek Video" },
  "video.quality": { en: "Quality", id: "Kualitas" },
  "video.downloading": { en: "Downloading...", id: "Mengunduh..." },
  "video.download": { en: "Download {label}", id: "Unduh {label}" },
  "video.newLink": { en: "New Link", id: "Tautan Baru" },
  "video.fromCache": { en: "from cache — instant", id: "dari cache — instan" },
  "video.fresh": { en: "just downloaded", id: "baru diunduh" },
  "video.note": {
    en: "Private content, or content that needs a login, cannot be downloaded. Public posts are the safest bet.",
    id: "Konten privat atau yang butuh login tidak bisa diunduh. Postingan publik paling aman.",
  },
  "video.emptyPreview": {
    en: "Paste a video link above and press Check Video to see the title, duration, and available qualities.",
    id: "Tempel tautan video di atas lalu tekan Cek Video untuk melihat judul, durasi, dan kualitas yang tersedia.",
  },
  "video.errInfo": { en: "Failed to fetch media info.", id: "Gagal mengambil info media." },
  "video.errConnect": { en: "Failed to connect to the download service.", id: "Gagal terhubung ke layanan unduhan." },
  "video.errDownload": { en: "Download failed.", id: "Unduhan gagal." },
  "video.errTooLong": {
    en: "Media is longer than 30 minutes and cannot be downloaded.",
    id: "Media lebih dari 30 menit dan tidak bisa diunduh.",
  },

  // ===== PDF Analysis =====
  "pdf.subtitle": {
    en: "Check page colors and read a PDF document's metadata — then extract selected pages into a new PDF.",
    id: "Cek warna halaman dan baca metadata dokumen PDF — lalu ekstrak halaman pilihan menjadi PDF baru.",
  },
  "pdf.dropTitle": { en: "Drag and drop your PDF here", id: "Seret dan lepas PDF Anda di sini" },
  "pdf.dropSub": { en: "or click to browse your device", id: "atau klik untuk mencari dari perangkat Anda" },
  "pdf.onlyPdf": { en: "PDF files only · max 25 MB", id: "Hanya file PDF · maks 25 MB" },
  "pdf.removeFile": { en: "Remove file", id: "Hapus file" },
  "pdf.threshold": { en: "Color Threshold", id: "Ambang Warna" },
  "pdf.thresholdHelp": {
    en: "How sensitive color detection is. Low values catch even faint colors.",
    id: "Seberapa sensitif deteksi warna. Nilai rendah menangkap warna yang samar sekalipun.",
  },
  "pdf.thresholdWarn": {
    en: "A very strict threshold can mistake compression artifacts for color.",
    id: "Ambang yang sangat ketat bisa menganggap artefak kompresi sebagai warna.",
  },
  "pdf.analyzingBtn": { en: "Analyzing Pages...", id: "Menganalisis Halaman..." },
  "pdf.analyzeBtn": { en: "Analyze Document", id: "Analisis Dokumen" },
  "pdf.analyzingTitle": { en: "Analyzing PDF", id: "Menganalisis PDF" },
  "pdf.analyzingBody": {
    en: "Checking the color of every page. It usually takes just a few seconds.",
    id: "Memeriksa warna setiap halaman. Biasanya hanya butuh beberapa detik.",
  },
  "pdf.emptyResult": {
    en: "Upload a document and press Analyze to see its details.",
    id: "Unggah dokumen lalu tekan Analisis untuk melihat detailnya.",
  },
  "pdf.totalPages": { en: "Total Pages", id: "Total Halaman" },
  "pdf.coloredPages": { en: "Colored Pages", id: "Halaman Berwarna" },
  "pdf.grayPages": { en: "Grayscale Pages", id: "Halaman Grayscale" },
  "pdf.execTime": { en: "Execution Time", id: "Waktu Eksekusi" },
  "pdf.ratio": { en: "Color Distribution Ratio", id: "Rasio Distribusi Warna" },
  "pdf.metadata": { en: "Document Metadata", id: "Metadata Dokumen" },
  "pdf.metaTitle": { en: "Title", id: "Judul" },
  "pdf.metaAuthor": { en: "Author", id: "Penulis" },
  "pdf.metaSubject": { en: "Subject", id: "Subjek" },
  "pdf.metaKeywords": { en: "Keywords", id: "Kata Kunci" },
  "pdf.metaCreator": { en: "Creator", id: "Pembuat" },
  "pdf.metaProducer": { en: "Producer", id: "Produser" },
  "pdf.metaCreated": { en: "Created", id: "Dibuat" },
  "pdf.metaModified": { en: "Modified", id: "Dimodifikasi" },
  "pdf.metaFormat": { en: "Format", id: "Format" },
  "pdf.metaEncryption": { en: "Encryption", id: "Enkripsi" },
  "pdf.extract": { en: "Extract Pages", id: "Ekstrak Halaman" },
  "pdf.extractHelp": {
    en: "Pick pages to save as a new PDF. Click the page boxes below, or type a range directly.",
    id: "Pilih halaman untuk disimpan sebagai PDF baru. Klik kotak halaman di bawah, atau ketik rentang langsung.",
  },
  "pdf.extractLabel": { en: "Pages to Extract", id: "Halaman yang Diekstrak" },
  "pdf.rangePlaceholder": { en: "e.g. 1-3, 5, 7-9", id: "contoh: 1-3, 5, 7-9" },
  "pdf.extracting": { en: "Extracting Pages...", id: "Mengekstrak Halaman..." },
  "pdf.extractBtn": { en: "Extract & Download PDF", id: "Ekstrak & Unduh PDF" },
  "pdf.pageDetails": { en: "Page Details", id: "Rincian Halaman" },
  "pdf.searchPlaceholder": { en: "Search page number...", id: "Cari nomor halaman..." },
  "pdf.filterAll": { en: "All Pages", id: "Semua Halaman" },
  "pdf.filterColor": { en: "Color Only", id: "Hanya Berwarna" },
  "pdf.filterGray": { en: "Grayscale Only", id: "Hanya Grayscale" },
  "pdf.selectLabel": { en: "Select:", id: "Pilih:" },
  "pdf.selectAll": { en: "Select All", id: "Pilih Semua" },
  "pdf.selectColor": { en: "Select Colored Only", id: "Pilih Hanya Berwarna" },
  "pdf.selectGray": { en: "Select Grayscale Only", id: "Pilih Hanya Grayscale" },
  "pdf.clearSelection": { en: "Clear Selection", id: "Bersihkan Pilihan" },
  "pdf.page": { en: "Page", id: "Halaman" },
  "pdf.colorTag": { en: "Color", id: "Warna" },
  "pdf.grayTag": { en: "Gray", id: "Abu" },
  "pdf.noMatch": { en: "No pages match the active filter.", id: "Tidak ada halaman yang cocok dengan filter aktif." },
  "pdf.uploadOther": { en: "Upload Another File", id: "Unggah File Lain" },
  "pdf.errType": { en: "Invalid file type. Only PDF files are supported.", id: "Tipe file tidak valid. Hanya file PDF yang didukung." },
  "pdf.errAnalyze": { en: "Analysis failed.", id: "Analisis gagal dilakukan." },
  "pdf.errConnectAnalyze": { en: "Failed to connect to the PDF analysis service.", id: "Gagal terhubung dengan layanan analisis PDF." },
  "pdf.errCut": { en: "Failed to extract the PDF.", id: "Gagal memotong PDF." },
  "pdf.errConnectCut": { en: "Failed to connect to the PDF extraction service.", id: "Gagal terhubung dengan layanan pemotong PDF." },

  // ===== MCP Playground =====
  "mcp.kicker": { en: "AI integration demo", id: "Demo integrasi AI" },
  "mcp.intro": {
    en: "Try 10 Agent MCP tools right here. This is a browser simulation of the same typed tool contract the Python server exposes via stdio — the full server is on GitHub.",
    id: "Coba 10 tool Agent MCP langsung di sini. Ini simulasi browser dari kontrak tool terketik yang sama dengan yang diekspos server Python via stdio — server penuh ada di GitHub.",
  },
  "mcp.copyConfig": { en: "Copy Claude config", id: "Salin config Claude" },
  "mcp.argsPlaceholder": { en: "arguments...", id: "argumen..." },
  "mcp.argsLabel": { en: "Arguments for {name}", id: "Argumen {name}" },
  "mcp.footer": {
    en: "The simulation runs locally in your browser (math/text/clock are fully real; sys_ping points to /status for a real check). The Python MCP server uses identical names + JSON schemas via stdio.",
    id: "Simulasi berjalan lokal di browser (math/text/clock sepenuhnya nyata; sys_ping mengarah ke /status untuk cek asli). Server MCP Python memakai nama + skema JSON yang identik via stdio.",
  },

  // ===== Feedback =====
  "feedback.intro": {
    en: "Send reviews and feedback about this site and its tools — your message lands in my inbox and I read it directly.",
    id: "Kirim ulasan dan masukan tentang situs dan tool-tool di sini — pesanmu masuk ke inbox-ku dan kubaca langsung.",
  },
  "feedback.sentTitle": { en: "Feedback Sent", id: "Feedback Terkirim" },
  "feedback.sentBody": { en: "Thank you for your input — it really helps.", id: "Terima kasih atas masukannya — sangat membantu." },
  "feedback.sendAnother": { en: "Send more feedback", id: "Kirim feedback lainnya" },
  "feedback.name": { en: "Your Name", id: "Nama Anda" },
  "feedback.rating": { en: "Your Rating", id: "Penilaianmu" },
  "feedback.pickRating": { en: "Pick a rating first", id: "Pilih rating dulu" },
  "feedback.of5": { en: "{n} of 5", id: "{n} dari 5" },
  "feedback.category": { en: "Category", id: "Kategori" },
  "feedback.catGeneral": { en: "General", id: "Umum" },
  "feedback.catReview": { en: "Site / tool review", id: "Ulasan situs / tool" },
  "feedback.catBug": { en: "Bug report", id: "Laporan bug" },
  "feedback.catFeature": { en: "Feature request", id: "Permintaan fitur" },
  "feedback.message": { en: "Message / feedback", id: "Pesan / masukan" },
  "feedback.error": {
    en: "Failed to send feedback. Please try again in a moment, or reach me via the Contact page.",
    id: "Gagal mengirim feedback. Silakan coba lagi sebentar, atau hubungi lewat halaman Contact.",
  },
  "feedback.sending": { en: "Sending...", id: "Mengirim..." },
  "feedback.send": { en: "Send Feedback", id: "Kirim Feedback" },

  // ===== Kartu file chat (FileCards) =====
  "file.tooLarge": { en: "File is too large to display", id: "File terlalu besar untuk ditampilkan" },
  "file.binary": { en: "Binary file — preview unavailable", id: "File biner — pratinjau tidak tersedia" },
  "file.noPreview": { en: "Preview unavailable", id: "Pratinjau tidak tersedia" },
  "file.reviewTitle": { en: "Review this file (full code + metadata)", id: "Review file ini (kode + metadata lengkap)" },
  "file.closePreview": { en: "Close preview", id: "Tutup pratinjau" },
  "file.viewPreview": { en: "View preview", id: "Lihat pratinjau" },
  "file.download": { en: "Download {name}", id: "Unduh {name}" },
  "file.omittedLarge": { en: "Content omitted — file too large (> 64 KB)", id: "Konten dihilangkan — file terlalu besar (> 64 KB)" },
  "file.omittedBinary": { en: "Content omitted — binary file", id: "Konten dihilangkan — file biner" },
  "file.notIncluded": { en: "Content not included by the backend", id: "Konten tidak disertakan backend" },
  "file.closeReview": { en: "Close review", id: "Tutup review" },
  "file.restoreWindow": { en: "Restore window", id: "Pulihkan jendela" },
  "file.minimize": { en: "Minimize", id: "Perkecil" },
  "file.dragResize": { en: "Drag to resize", id: "Seret untuk mengubah ukuran" },

  // ===== Labs (/labs — calon beranda labs.amamiya.web.id) =====
  "labs.kicker": { en: "AMAMIYA LABS", id: "AMAMIYA LABS" },
  "labs.title": { en: "Labs", id: "Labs" },
  "labs.intro": {
    en: "A playground for experiments — design studies, prototypes, and small tools in progress, long before they graduate to the main site.",
    id: "Taman bermain eksperimen — studi desain, prototipe, dan tool kecil yang sedang dikembangkan, jauh sebelum naik ke situs utama.",
  },
  "labs.open": { en: "Open experiment", id: "Buka eksperimen" },
  "labs.enter": { en: "Enter the Lab", id: "Masuk ke Lab" },
  "labs.backLanding": { en: "Back to landing", id: "Kembali ke landing" },
  "labs.moreTitle": { en: "More experiments", id: "Eksperimen lainnya" },
  "labs.statusLive": { en: "Available", id: "Tersedia" },
  "labs.logoLabDesc": {
    en: "Playground for the Amamiya logo: size and padding previews, backgrounds, animation variants, and PNG/SVG export.",
    id: "Halaman coba-coba logo Amamiya: pratinjau ukuran dan padding, latar, varian animasi, dan ekspor PNG/SVG.",
  },
  "labs.moreSoon": {
    en: "More experiments are brewing — this page is where they will land first.",
    id: "Eksperimen lain sedang disiapkan — halaman ini tempat mereka mendarat pertama kali.",
  },

  // ===== 404 & error =====
  "nf.title": { en: "Page not found", id: "Halaman tidak ditemukan" },
  "err.title": { en: "Something went wrong", id: "Terjadi kesalahan" },
  "err.body": {
    en: "Sorry, this page failed to load because of an unexpected error. Try reloading — if it still fails, head back home.",
    id: "Maaf, halaman ini gagal dimuat karena kesalahan tak terduga. Coba muat ulang — bila masih gagal, kembali ke beranda.",
  },
  "err.digest": { en: "Reference code: {digest}", id: "Kode rujukan: {digest}" },
  "err.retry": { en: "Try again", id: "Coba lagi" },
  "nf.body": {
    en: "The address you are heading to does not exist or has been moved. Double-check the URL, or head back home.",
    id: "Alamat yang kamu tuju tidak ada atau sudah dipindahkan. Periksa kembali URL-nya, atau kembali ke beranda.",
  },
  "nf.home": { en: "Back Home", id: "Ke Beranda" },
  "nf.tools": { en: "See Tools", id: "Lihat Tools" },
} as const satisfies Record<string, Entry>;

export type DictKey = keyof typeof DICT;
