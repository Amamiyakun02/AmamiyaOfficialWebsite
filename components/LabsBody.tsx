"use client";

import { useEffect, useRef, useState } from "react";

// Badan halaman /labs: landing kosong calon subdomain lab —
// logo berdampingan kata AMAMIYA LABS. Tanpa navbar: Navbar dan
// AgentFab ikut disembunyikan untuk awalan /labs.
//
// ENTRANCE meniru halaman utama (permintaan user 27 Nov 2026):
// logo SVG terakit dengan varian ACAK per muat (rakit masuk /
// jatuh / geser — keyframes yang sama dengan hero, jarak tempuh
// diskala ke ukuran logo di sini), lalu kata AMAMIYA dan LABS
// di-RENDER huruf demi huruf.
//
// RENDER HURUF = salinan persis mekanisme judul halaman utama
// (analisa 27 Nov 2026 atas globals.css .t-dots/.t-block/.t-char
// + drawHeatCell WonderScene): TIGA lapisan per huruf berjalan
// serentak dalam SATU garis waktu 0,6 dtk dengan jeda jenjang
// 85 mdtk/huruf — matriks titik 4x2 (tDots: muncul 0-12%, larut
// 30-42%), balok dua nada (tBlock: tumbuh scaleX 30-48%, larut
// 68-84%, belah 55/45), karakter (tCharIn: masuk 60-100% sambil
// naik 0,06em dari skala 0,94). Fase-fasenya BERTUMPUK — itu
// yang membuatnya luwes, bukan langkah potong-potong.
// Warna mengikuti font wordmark (permintaan user): AMAMIYA
// memakai nilai judul utama apa adanya (titik 238,238,248 +
// balok #C3D2F0/#8298C0, karakter putih kertas), LABS memakai
// teal aksen2 untuk ketiga lapisannya (#00BBA2 / #00675A).
// Latar SENGAJA polos: grid latar + highlight pointer sempat
// dibuat lalu dimatikan user di hari yang sama.
//
// Ukuran dikunci ke emblem visual: font AMAMIYA = setengah
// tinggi emblem (80px pada emblem 160px), semua dalam em
// supaya rasio terkunci. SVG memakai viewBox potong emblem
// yang sama dengan HeroLogo (99 228 1402 1235): kotak 2.515em
// x 2.215em digeser -0.108em menelan bantalan crop, menyisakan
// emblem tepat 2.3em x 2em.

const VARIANTS = ["rakit", "jatuh", "geser"] as const;
type Variant = (typeof VARIANTS)[number];

const ANIM_CSS = `
.labs-logo-el { transform-box: fill-box; transform-origin: center; }
.labs-logo-rakit .el-a { animation: labsRakitA 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.labs-logo-rakit .el-b { animation: labsRakitB 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.23s both; }
.labs-logo-rakit .el-c { animation: labsRakitC 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both; }
@keyframes labsRakitA { from { opacity: 0; transform: translateY(-28px) rotate(-32deg) scale(0.72); } to { opacity: 1; transform: none; } }
@keyframes labsRakitB { from { opacity: 0; transform: translate(-24px, 20px) rotate(28deg) scale(0.72); } to { opacity: 1; transform: none; } }
@keyframes labsRakitC { from { opacity: 0; transform: translate(24px, 20px) rotate(-28deg) scale(0.72); } to { opacity: 1; transform: none; } }
.labs-logo-jatuh .el-a, .labs-logo-jatuh .el-b, .labs-logo-jatuh .el-c { animation: labsJatuh 0.85s cubic-bezier(0.22, 1, 0.36, 1) both; }
.labs-logo-jatuh .el-a { animation-delay: 0.1s; }
.labs-logo-jatuh .el-b { animation-delay: 0.24s; }
.labs-logo-jatuh .el-c { animation-delay: 0.38s; }
@keyframes labsJatuh { 0% { opacity: 0; transform: translateY(-260px); } 55% { opacity: 1; transform: translateY(8px); } 78% { transform: translateY(-4px); } 100% { opacity: 1; transform: none; } }
.labs-logo-geser .el-a { animation: labsGeserA 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.labs-logo-geser .el-b { animation: labsGeserB 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.23s both; }
.labs-logo-geser .el-c { animation: labsGeserC 0.85s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both; }
@keyframes labsGeserA { from { opacity: 0; transform: translateY(-230px); } to { opacity: 1; transform: none; } }
@keyframes labsGeserB { from { opacity: 0; transform: translateX(-230px); } to { opacity: 1; transform: none; } }
@keyframes labsGeserC { from { opacity: 0; transform: translateX(230px); } to { opacity: 1; transform: none; } }
.labs-dots, .labs-block { position: absolute; left: 50%; top: 50%; opacity: 0; pointer-events: none; }
.labs-dots { width: 0.6em; height: 0.46em; transform: translate(-50%, -54%); background-size: 25% 50%; animation: labsDots 0.6s ease both; }
.labs-block { width: 0.8em; height: 0.72em; transform: translate(-50%, -52%); border-radius: 2px; animation: labsBlock 0.6s ease both; }
.labs-char { display: inline-block; opacity: 0; animation: labsCharIn 0.6s ease both; }
@keyframes labsDots {
  0% { opacity: 0; transform: translate(-50%, -54%) scale(0.6); }
  12% { opacity: 1; transform: translate(-50%, -54%) scale(1); }
  30% { opacity: 1; }
  42%, 100% { opacity: 0; transform: translate(-50%, -54%) scale(1); }
}
@keyframes labsBlock {
  0%, 30% { opacity: 0; transform: translate(-50%, -52%) scaleX(0.15); }
  48% { opacity: 1; transform: translate(-50%, -52%) scaleX(1); }
  68% { opacity: 1; }
  84%, 100% { opacity: 0; transform: translate(-50%, -52%) scaleX(1); }
}
@keyframes labsCharIn {
  0%, 60% { opacity: 0; transform: translateY(0.06em) scale(0.94); }
  84% { opacity: 1; }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .labs-logo-el { opacity: 1 !important; animation: none !important; }
  .labs-dots, .labs-block { display: none !important; }
  .labs-char { opacity: 1 !important; animation: none !important; }
}
`;

// Satu kata yang hurufnya di-render satu per satu ala judul
// halaman utama: tiga lapisan (titik, balok, karakter) berbagi
// jeda yang sama per huruf — mulai + i x 85 mdtk.
function KataRender({
  kata,
  mulai,
  titik,
  blokTerang,
  blokGelap,
}: {
  kata: string;
  mulai: number; // detik
  titik: string;
  blokTerang: string;
  blokGelap: string;
}) {
  return (
    <>
      {kata.split("").map((h, i) => {
        const delay = `${mulai + i * 0.085}s`;
        return (
          <span key={i} className="relative inline-block">
            <span className="labs-char" style={{ animationDelay: delay }}>
              {h}
            </span>
            <span
              className="labs-dots"
              style={{
                animationDelay: delay,
                backgroundImage: `radial-gradient(circle at center, ${titik} 0.036em, transparent 0.043em)`,
              }}
            />
            <span
              className="labs-block"
              style={{
                animationDelay: delay,
                background: `linear-gradient(90deg, ${blokTerang} 0 55%, ${blokGelap} 55% 100%)`,
              }}
            />
          </span>
        );
      })}
    </>
  );
}

export default function LabsBody() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const refA = useRef<HTMLParagraphElement>(null);
  const refL = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
  }, []);

  // Sejajarkan TINTA huruf dengan emblem, bukan kotak barisnya:
  // di dalam kotak baris (line-height 1) huruf kapital mengambang
  // — ada ruang metrik font di atas topi huruf dan di bawah garis
  // alasnya, besarnya beda-beda per font perangkat. Ukur dari
  // metrik font yang benar-benar dipakai browser ini, lalu geser
  // AMAMIYA naik sejauh celah atasnya dan LABS turun sejauh celah
  // bawahnya (dalam em, jadi ikut skala di semua ukuran layar).
  useEffect(() => {
    const cv = document.createElement("canvas").getContext("2d");
    if (!cv) return;
    const sejajarkan = (
      el: HTMLParagraphElement | null,
      kata: string,
      arah: "atas" | "bawah",
    ) => {
      if (!el) return;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (!fs) return;
      cv.font = `${cs.fontWeight} ${fs}px ${cs.fontFamily}`;
      const m = cv.measureText(kata);
      if (
        m.fontBoundingBoxAscent === undefined ||
        m.fontBoundingBoxDescent === undefined
      )
        return;
      const baseline =
        (fs - (m.fontBoundingBoxAscent + m.fontBoundingBoxDescent)) / 2 +
        m.fontBoundingBoxAscent;
      const celah =
        arah === "atas"
          ? baseline - m.actualBoundingBoxAscent
          : fs - baseline - m.actualBoundingBoxDescent;
      if (celah > 0)
        el.style.transform = `translateY(${((arah === "atas" ? -celah : celah) / fs).toFixed(4)}em)`;
    };
    sejajarkan(refA.current, "AMAMIYA", "atas");
    sejajarkan(refL.current, "LABS", "bawah");
  }, []);

  return (
    <main className="flex min-h-0 flex-1 items-center justify-center px-5">
      <style>{ANIM_CSS}</style>
      <div
        className="flex items-center"
        style={{ fontSize: "clamp(30px, 8.9vw, 80px)" }}
      >
        <div className="relative h-[2em] w-[2.3em] flex-none">
          <svg
            viewBox="99 228 1402 1235"
            role="img"
            aria-label="Logo Amamiya"
            className={`absolute -top-[0.108em] -left-[0.108em] block h-[2.215em] w-[2.515em] max-w-none ${
              variant ? `labs-logo-${variant}` : ""
            }`}
          >
            <linearGradient id="lg0" gradientUnits="userSpaceOnUse" x1="797" y1="316" x2="797" y2="1028">
              <stop offset="0" stopColor="#00ffaa" />
              <stop offset="1" stopColor="#003796" />
            </linearGradient>
            <linearGradient id="lg1" gradientUnits="userSpaceOnUse" x1="183" y1="1387" x2="797" y2="1028">
              <stop offset="0" stopColor="#00ffaa" />
              <stop offset="1" stopColor="#003796" />
            </linearGradient>
            <linearGradient id="lg2" gradientUnits="userSpaceOnUse" x1="1414" y1="1383" x2="797" y2="1028">
              <stop offset="0" stopColor="#00ffaa" />
              <stop offset="1" stopColor="#003796" />
            </linearGradient>
            <g className="labs-logo-el el-a" opacity={variant ? undefined : 0}>
              <path fillRule="evenodd" fill="url(#lg0)" d="M470,845 L793,288 L1109,814 L999,966 L939,853 Z M650,732 L882,741 L932,739 L785,499 Z" />
            </g>
            <g className="labs-logo-el el-b" opacity={variant ? undefined : 0}>
              <path fillRule="evenodd" fill="url(#lg1)" d="M803,1401 L159,1400 L456,864 L643,883 L575,992 Z M615,1302 L506,1097 L480,1054 L346,1302 Z" />
            </g>
            <g className="labs-logo-el el-c" opacity={variant ? undefined : 0}>
              <path fillRule="evenodd" fill="url(#lg2)" d="M1120,835 L1441,1401 L828,1401 L751,1232 L879,1237 Z M1128,1047 L1005,1243 L981,1288 L1262,1280 Z" />
            </g>
          </svg>
        </div>
        <div className="ml-[0.05em] flex h-[2em] flex-col justify-between">
          <p ref={refA} className="m-0 text-[1em] leading-none font-extrabold tracking-[0.08em] text-paper">
            <KataRender
              kata="AMAMIYA"
              mulai={0.95}
              titik="rgba(238,238,248,0.95)"
              blokTerang="#C3D2F0"
              blokGelap="#8298C0"
            />
          </p>
          <p ref={refL} className="m-0 text-[1em] leading-none font-bold tracking-[0.02em] text-accent2">
            <KataRender
              kata="LABS"
              mulai={1.8}
              titik="rgba(0,187,162,0.95)"
              blokTerang="#00BBA2"
              blokGelap="#00675A"
            />
          </p>
        </div>
      </div>
    </main>
  );
}
