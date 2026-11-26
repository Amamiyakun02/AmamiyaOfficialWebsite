"use client";

import { useEffect, useState } from "react";

/* =====================================================================
   LOGO AMAMIYA di hero — menggantikan 4 cip elemen kosmis (FxCards:
   spiral/blackhole/spark/atom) atas permintaan user 26 Nov 2026.
   Logo SVG kaku final (sama seperti /lab/logo) masuk dengan animasi
   rakit yang dipilih ACAK di setiap muat halaman: rakit masuk /
   rakit jatuh / rakit geser (varian dari Logo Lab). Animasi digerbang
   .title-on seperti cip dulu (lihat .hero-logo di globals.css):
   elemen mulai terakit ±1 dtk setelah kata besar selesai dibangun,
   selesai tepat saat tombol CTA muncul. Pilihan acak diambil di
   klien sesudah mount supaya tidak bentrok hidrasi.
   ===================================================================== */

const VARIANTS = ["rakit", "jatuh", "geser"] as const;
type Variant = (typeof VARIANTS)[number];

export default function HeroLogo() {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
  }, []);

  return (
    <div
      className={`hero-logo${variant ? ` hero-logo-${variant}` : ""}`}
      role="img"
      aria-label="Logo Amamiya"
    >
      {/* viewBox DIPOTONG ke kotak emblem + bantalan 60 (99 228 1402
          1235) sejak perbaikan mobile 26 Nov 2026: bingkai asli 1600
          menyimpan ±288/197 ruang kosong atas/bawah yang memakan
          tinggi tumpukan di stage pendek. Koordinat path & gradasi
          tetap di ruang asli — ini murni jendela pandang. */}
      <svg viewBox="99 228 1402 1235" className="hero-logo-svg">
        <linearGradient id="hg0" gradientUnits="userSpaceOnUse" x1="797" y1="316" x2="797" y2="1028">
          <stop offset="0" stopColor="#00ffaa" />
          <stop offset="1" stopColor="#003796" />
        </linearGradient>
        <linearGradient id="hg1" gradientUnits="userSpaceOnUse" x1="183" y1="1387" x2="797" y2="1028">
          <stop offset="0" stopColor="#00ffaa" />
          <stop offset="1" stopColor="#003796" />
        </linearGradient>
        <linearGradient id="hg2" gradientUnits="userSpaceOnUse" x1="1414" y1="1383" x2="797" y2="1028">
          <stop offset="0" stopColor="#00ffaa" />
          <stop offset="1" stopColor="#003796" />
        </linearGradient>
        <g className="hero-logo-el el-a">
          <path fillRule="evenodd" fill="url(#hg0)" d="M470,845 L793,288 L1109,814 L999,966 L939,853 Z M650,732 L882,741 L932,739 L785,499 Z" />
        </g>
        <g className="hero-logo-el el-b">
          <path fillRule="evenodd" fill="url(#hg1)" d="M803,1401 L159,1400 L456,864 L643,883 L575,992 Z M615,1302 L506,1097 L480,1054 L346,1302 Z" />
        </g>
        <g className="hero-logo-el el-c">
          <path fillRule="evenodd" fill="url(#hg2)" d="M1120,835 L1441,1393 L828,1403 L751,1232 L879,1237 Z M1128,1047 L1005,1243 L981,1288 L1262,1280 Z" />
        </g>
      </svg>
    </div>
  );
}
