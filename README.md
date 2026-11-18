# Amamiya_Official_Website — Next.js

Website Next.js dengan background grid tipografi ala halaman Muse Wonder
(Meta): satu kata diulang menjadi pola di atas canvas, digambar sekali,
dengan glitch tipis dan highlight mengikuti mouse — tanpa loop 60fps.

## Menjalankan

```bash
npm install
npm run dev     # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## Mengutak-atik background

Semua parameter pola ada di blok `KONFIGURASI BACKGROUND` di bagian atas
`components/WonderScene.tsx`: kata yang diulang (`WORD`), warna (`INK`),
ukuran sel (`CW`/`CH`), jumlah sel glitch, radius highlight mouse, dll.

Dokumentasi lengkap ada di vault Obsidian: `Wonder Background Website.md`.

## Deploy (GitHub + Vercel)

Repo ini di-push ke GitHub (`Amamiyakun02/Amamiya_Official_Website`) dan
terhubung ke Vercel: setiap push ke `main` otomatis ter-deploy.

Environment variable di Vercel (Settings > Environment Variables):

- `NEXT_PUBLIC_API_URL=https://api.amamiya.web.id` — alamat publik backend
  Vienna Agent (di VPS). Tanpa ini, tool yang butuh backend (Assistant,
  Video Downloader, PDF Analysis, Dashboard) tidak berfungsi di Vercel,
  karena rewrites `/v1/*` bawaan hanya berlaku untuk backend satu mesin.
  Backend juga harus mengizinkan domain situs ini di CORS-nya.
- Lihat `.env.example` untuk daftar lengkap variabel.

Domain produksi: `amamiya.web.id` (+ `www`) diarahkan ke Vercel dari
Cloudflare; `api.amamiya.web.id` tetap menunjuk backend di VPS.
