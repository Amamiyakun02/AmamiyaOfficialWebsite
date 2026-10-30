# Wonder Background — Next.js

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
