"use client";

import { useEffect, useState } from "react";

// Badan halaman /labs: landing kosong calon subdomain lab —
// logo berdampingan kata AMAMIYA LABS. Tanpa navbar: Navbar dan
// AgentFab ikut disembunyikan untuk awalan /labs.
//
// ENTRANCE meniru halaman utama (permintaan user 27 Nov 2026):
// logo SVG terakit dengan varian ACAK per muat (rakit masuk /
// jatuh / geser — keyframes yang sama dengan hero, jarak tempuh
// diskala ke ukuran logo di sini), lalu kata AMAMIYA dan LABS
// di-RENDER huruf demi huruf dengan efek render karakter ala
// grid halaman utama: tiap huruf melewati fase titik -> balok
// dua warna -> karakter jadi. Warna render mengikuti font
// wordmark: AMAMIYA putih kertas, LABS teal aksen2.
// Latar SENGAJA polos: grid latar + highlight pointer sempat
// dibuat lalu dimatikan user di hari yang sama — efek render
// hanya untuk lockup ini, bukan background.
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
@media (prefers-reduced-motion: reduce) {
  .labs-logo-el { opacity: 1 !important; animation: none !important; }
}
`;

// Satu kata yang hurufnya di-render satu per satu:
// fase 0 kosong -> 1 titik -> 2 balok dua warna -> 3 karakter.
// Huruf asli menjadi pengukur lebar (opacity 0) supaya kata
// tidak bergeser saat fase berganti.
function KataRender({
  kata,
  mulai,
  terang,
  gelap,
}: {
  kata: string;
  mulai: number; // detik
  terang: string;
  gelap: string;
}) {
  const [fase, setFase] = useState<number[]>(() => kata.split("").map(() => 0));

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFase(kata.split("").map(() => 3));
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const set = (i: number, f: number) =>
      setFase((prev) => {
        const next = [...prev];
        next[i] = f;
        return next;
      });
    kata.split("").forEach((_, i) => {
      const base = (mulai + i * 0.09) * 1000;
      timers.push(setTimeout(() => set(i, 1), base));
      timers.push(setTimeout(() => set(i, 2), base + 130));
      timers.push(setTimeout(() => set(i, 3), base + 300));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {kata.split("").map((h, i) => (
        <span key={i} className="relative inline-block">
          <span className={fase[i] === 3 ? undefined : "opacity-0"}>{h}</span>
          {fase[i] === 1 && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="block h-[0.09em] w-[0.09em] rounded-full"
                style={{ background: terang }}
              />
            </span>
          )}
          {fase[i] === 2 && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="block h-[0.68em] w-[0.6em]"
                style={{
                  background: `linear-gradient(90deg, ${terang} 62%, ${gelap} 62%)`,
                }}
              />
            </span>
          )}
        </span>
      ))}
    </>
  );
}

export default function LabsBody() {
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
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
              <path fillRule="evenodd" fill="url(#lg2)" d="M1120,835 L1441,1393 L828,1403 L751,1232 L879,1237 Z M1128,1047 L1005,1243 L981,1288 L1262,1280 Z" />
            </g>
          </svg>
        </div>
        <div className="ml-[0.12em] flex h-[2em] translate-y-[0.1em] flex-col justify-between">
          <p className="m-0 text-[1em] leading-none font-extrabold tracking-[0.08em] text-paper">
            <KataRender kata="AMAMIYA" mulai={1.3} terang="#EEF4FF" gelap="#83868C" />
          </p>
          <p className="m-0 text-[1em] leading-none font-bold tracking-[0.02em] text-accent2">
            <KataRender kata="LABS" mulai={2.2} terang="#00BBA2" gelap="#00675A" />
          </p>
        </div>
      </div>
    </main>
  );
}
