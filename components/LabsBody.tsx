"use client";

import { useEffect, useRef, useState } from "react";

// Badan halaman /labs: landing kosong calon subdomain lab —
// logo berdampingan kata AMAMIYA LABS. Tanpa navbar: Navbar dan
// AgentFab ikut disembunyikan untuk awalan /labs.
//
// ENTRANCE meniru halaman utama (permintaan user 27 Nov 2026):
// logo SVG terakit dengan varian ACAK per muat (rakit masuk /
// jatuh / geser — keyframes yang sama dengan hero, jarak tempuh
// diskala ke ukuran logo di sini), lalu kata AMAMIYA dibangun
// huruf demi huruf, disusul LABS. Ukuran dikunci ke emblem
// visual: font AMAMIYA = setengah tinggi emblem (80px pada
// emblem 160px), semua dalam em supaya rasio terkunci.
// SVG memakai viewBox potong emblem yang sama dengan HeroLogo
// (99 228 1402 1235): kotak 2.515em x 2.215em digeser -0.108em
// menelan bantalan crop, menyisakan emblem tepat 2.3em x 2em.
//
// LATAR: efek render karakter seperti grid halaman utama
// (permintaan user 27 Nov 2026) — kata-kata termaterialisasi
// lewat fase titik -> balok dua warna -> karakter, mengikuti
// sapuan berkala dan pointer. Warna mengikuti font wordmark:
// AMAMIYA putih kertas, LABS teal aksen2. Ada lubang di tengah
// (diukur dari elemen lockup) supaya grid tidak menabrak logo.

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
.labs-huruf { display: inline-block; animation: labsHuruf 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes labsHuruf { from { opacity: 0; transform: translateY(0.16em); } to { opacity: 1; transform: none; } }
.labs-grid { animation: labsFade 0.9s ease both; }
@keyframes labsFade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .labs-logo-el, .labs-huruf { opacity: 1 !important; animation: none !important; }
}
`;

function Huruf({
  kata,
  mulai,
  jeda,
}: {
  kata: string;
  mulai: number;
  jeda: number;
}) {
  return (
    <>
      {kata.split("").map((h, i) => (
        <span
          key={i}
          className="labs-huruf"
          style={{ animationDelay: `${mulai + i * jeda}s` }}
        >
          {h}
        </span>
      ))}
    </>
  );
}

// ===== Latar grid render karakter (canvas) =====
const GRID_COLORS = {
  amamiya: [238, 244, 255],
  labs: [0, 187, 162],
} as const;

function LabsGrid({
  holeRef,
}: {
  holeRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let cols = 0;
    let rows = 0;
    let cellW = 0;
    let cellH = 0;
    let fontPx = 16;
    let words: { text: string; labs: boolean }[] = [];
    let heat = new Float32Array(0);
    let hole = { x: 0, y: 0, w: 0, h: 0 };
    const pointer = { x: -9999, y: -9999 };

    const hash = (n: number) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.max(1, Math.round(W * dpr));
      canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cellW = Math.max(118, Math.min(178, W / 8));
      cellH = Math.round(cellW * 0.34);
      fontPx = Math.max(13, Math.min(18, cellW / 9.6));
      cols = Math.ceil(W / cellW) + 1;
      rows = Math.ceil(H / cellH) + 1;
      words = [];
      heat = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const labs = hash(i) < 0.24;
        words.push({ text: labs ? "LABS" : "AMAMIYA", labs });
      }
      const el = holeRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        hole = {
          x: r.left - rect.left - 26,
          y: r.top - rect.top - 22,
          w: r.width + 52,
          h: r.height + 44,
        };
      }
    };

    const inHole = (cx: number, cy: number) =>
      cx > hole.x && cx < hole.x + hole.w && cy > hole.y && cy < hole.y + hole.h;

    const drawWord = (
      x: number,
      y: number,
      w: { text: string; labs: boolean },
      alpha: number,
    ) => {
      const c = w.labs ? GRID_COLORS.labs : GRID_COLORS.amamiya;
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
      ctx.fillText(w.text, x, y);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      ctx.font = `${fontPx}px monospace`;
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "3px";
      } catch {
        /* abaikan: peramban tanpa letterSpacing canvas */
      }
      ctx.textBaseline = "middle";
      // Sapuan materialisasi berkala (diagonal), berhenti 3 dtk.
      const diag = cols + rows;
      const cycle = (t / 1000) % 7;
      const front = cycle < 3.4 ? (cycle / 3.4) * (diag + 4) - 2 : -99;
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const i = gy * cols + gx;
          const cx = gx * cellW + cellW / 2;
          const cy = gy * cellH + cellH / 2;
          if (inHole(cx, cy)) continue;
          const w = words[i];
          // Panas dari sapuan + pointer.
          if (Math.abs(gx + gy - front) < 1.1) heat[i] = Math.max(heat[i], 0.92);
          const dx = (cx - pointer.x) / cellW;
          const dy = (cy - pointer.y) / cellH;
          const d2 = dx * dx + dy * dy;
          if (d2 < 7.3) heat[i] = Math.max(heat[i], 1 - d2 / 7.3);
          const h = heat[i];
          heat[i] = h * 0.965;
          const x = gx * cellW + 8;
          const c = w.labs ? GRID_COLORS.labs : GRID_COLORS.amamiya;
          if (h < 0.04) {
            drawWord(x, cy, w, w.labs ? 0.32 : 0.27);
          } else if (h < 0.38) {
            // Fase titik.
            const r = 1 + (h / 0.38) * 5;
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.3 + h})`;
            ctx.beginPath();
            ctx.arc(x + fontPx * 0.4, cy, r, 0, Math.PI * 2);
            ctx.fill();
          } else if (h < 0.72) {
            // Fase balok dua warna selebar kata.
            const frac = (h - 0.38) / 0.34;
            const tw = ctx.measureText(w.text).width + 12;
            const bh = fontPx * 1.5;
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.88)`;
            ctx.fillRect(x - 3, cy - bh / 2, tw * frac * 0.62, bh);
            ctx.fillStyle = `rgba(${Math.round(c[0] * 0.55)},${Math.round(c[1] * 0.55)},${Math.round(c[2] * 0.55)},0.88)`;
            ctx.fillRect(x - 3 + tw * frac * 0.62, cy - bh / 2, tw * frac * 0.38, bh);
          } else {
            // Fase karakter penuh.
            drawWord(x, cy, w, 0.3 + ((h - 0.72) / 0.28) * 0.65);
          }
        }
      }
    };

    let raf = 0;
    let running = true;
    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduced) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    if (reduced) {
      // Satu bingkai diam: semua kata dalam keadaan istirahat.
      heat = new Float32Array(cols * rows);
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onMove, { passive: true });
      document.addEventListener("visibilitychange", onVis);
    }
    window.addEventListener("resize", resize);
    // Lubang diukur ulang sesudah font/animasi awal selesai —
    // posisi lockup bisa bergeser sedikit saat huruf terbangun.
    const rehole = window.setTimeout(resize, 2600);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
      window.clearTimeout(rehole);
    };
  }, [holeRef]);

  return (
    <canvas
      ref={canvasRef}
      className="labs-grid pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

export default function LabsBody() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const lockupRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
  }, []);

  return (
    <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5">
      <style>{ANIM_CSS}</style>
      <LabsGrid holeRef={lockupRef} />
      <div
        ref={lockupRef}
        className="relative flex items-center"
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
            <Huruf kata="AMAMIYA" mulai={1.3} jeda={0.055} />
          </p>
          <p className="m-0 text-[1em] leading-none font-bold tracking-[0.02em] text-accent2">
            <Huruf kata="LABS" mulai={1.95} jeda={0.05} />
          </p>
        </div>
      </div>
    </main>
  );
}
