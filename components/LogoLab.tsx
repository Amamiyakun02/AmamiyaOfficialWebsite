"use client";

import { useState } from "react";

// Halaman coba-coba logo Amamiya (SVG kaku final, disetujui user
// 25 Nov 2026): pratinjau interaktif untuk menguji ukuran, padding,
// latar, dan animasi sebelum logo dipakai di tempat lain. Markup SVG
// di bawah persis file amamiya-logo-kaku-nobg.svg (3 path + 3 gradasi
// #00FFAA -> #003796); LOGO_SVG adalah string aslinya untuk unduhan.
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1600"><linearGradient id="g0" gradientUnits="userSpaceOnUse" x1="797" y1="316" x2="797" y2="1028"><stop offset="0" stop-color="#00ffaa"/><stop offset="1" stop-color="#003796"/></linearGradient><linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="183" y1="1387" x2="797" y2="1028"><stop offset="0" stop-color="#00ffaa"/><stop offset="1" stop-color="#003796"/></linearGradient><linearGradient id="g2" gradientUnits="userSpaceOnUse" x1="1414" y1="1383" x2="797" y2="1028"><stop offset="0" stop-color="#00ffaa"/><stop offset="1" stop-color="#003796"/></linearGradient><path fill-rule="evenodd" fill="url(#g0)" d="M470,845 L793,288 L1109,814 L999,966 L939,853 Z M650,732 L882,741 L932,739 L785,499 Z"/><path fill-rule="evenodd" fill="url(#g1)" d="M803,1401 L159,1400 L456,864 L643,883 L575,992 Z M615,1302 L506,1097 L480,1054 L346,1302 Z"/><path fill-rule="evenodd" fill="url(#g2)" d="M1120,835 L1441,1401 L828,1401 L751,1232 L879,1237 Z M1128,1047 L1005,1243 L981,1288 L1262,1280 Z"/></svg>`;

// Animasi memakai CSS keyframes pada grup per elemen (transform-box:
// fill-box supaya tiap elemen berputar/berskala pada porosnya sendiri).
// Fokus animasi (keputusan user 26 Nov 2026): keluarga "rakit" (masuk
// terakit, beberapa varian) + "putar pelan". Semua kelas hanya hidup
// di halaman ini.
const ANIM_CSS = `
.logo-lab-el { transform-box: fill-box; transform-origin: center; }
.anim-rakit .el-a { animation: lab-rakit-a calc(1.15s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) both; }
.anim-rakit .el-b { animation: lab-rakit-b calc(1.15s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.14s / var(--lab-speed, 1)) both; }
.anim-rakit .el-c { animation: lab-rakit-c calc(1.15s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.28s / var(--lab-speed, 1)) both; }
@keyframes lab-rakit-a { from { opacity: 0; transform: translateY(-46px) rotate(-32deg) scale(0.72); } to { opacity: 1; transform: none; } }
@keyframes lab-rakit-b { from { opacity: 0; transform: translate(-40px, 34px) rotate(28deg) scale(0.72); } to { opacity: 1; transform: none; } }
@keyframes lab-rakit-c { from { opacity: 0; transform: translate(40px, 34px) rotate(-28deg) scale(0.72); } to { opacity: 1; transform: none; } }
.logo-lab-spin { transform-box: fill-box; transform-origin: center; }
.anim-putar .logo-lab-spin { animation: lab-putar calc(14s / var(--lab-speed, 1)) linear infinite; }
.anim-gabungan .logo-lab-spin { animation: lab-putar calc(14s / var(--lab-speed, 1)) linear calc(1.45s / var(--lab-speed, 1)) infinite; }
@keyframes lab-putar { to { transform: rotate(360deg); } }
.anim-rakit-putar .el-a { animation: lab-swirl-a calc(1.3s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) both; }
.anim-rakit-putar .el-b { animation: lab-swirl-b calc(1.3s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.13s / var(--lab-speed, 1)) both; }
.anim-rakit-putar .el-c { animation: lab-swirl-c calc(1.3s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.26s / var(--lab-speed, 1)) both; }
@keyframes lab-swirl-a { from { opacity: 0; transform: translateY(-300px) rotate(-120deg) scale(0.5); } to { opacity: 1; transform: none; } }
@keyframes lab-swirl-b { from { opacity: 0; transform: translate(-260px, 190px) rotate(120deg) scale(0.5); } to { opacity: 1; transform: none; } }
@keyframes lab-swirl-c { from { opacity: 0; transform: translate(260px, 190px) rotate(-120deg) scale(0.5); } to { opacity: 1; transform: none; } }
.anim-rakit-jatuh .el-a { animation: lab-jatuh-a calc(1.05s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) both; }
.anim-rakit-jatuh .el-b { animation: lab-jatuh-b calc(1.05s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.16s / var(--lab-speed, 1)) both; }
.anim-rakit-jatuh .el-c { animation: lab-jatuh-c calc(1.05s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.32s / var(--lab-speed, 1)) both; }
@keyframes lab-jatuh-a { 0% { opacity: 0; transform: translateY(-430px); } 55% { opacity: 1; transform: translateY(14px); } 78% { transform: translateY(-7px); } 100% { opacity: 1; transform: none; } }
@keyframes lab-jatuh-b { 0% { opacity: 0; transform: translateY(-430px); } 55% { opacity: 1; transform: translateY(14px); } 78% { transform: translateY(-7px); } 100% { opacity: 1; transform: none; } }
@keyframes lab-jatuh-c { 0% { opacity: 0; transform: translateY(-430px); } 55% { opacity: 1; transform: translateY(14px); } 78% { transform: translateY(-7px); } 100% { opacity: 1; transform: none; } }
.anim-rakit-pusat .el-a { animation: lab-pusat-a calc(1.1s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) both; }
.anim-rakit-pusat .el-b { animation: lab-pusat-b calc(1.1s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.1s / var(--lab-speed, 1)) both; }
.anim-rakit-pusat .el-c { animation: lab-pusat-c calc(1.1s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.2s / var(--lab-speed, 1)) both; }
@keyframes lab-pusat-a { from { opacity: 0; transform: translateY(330px) scale(0.35); } to { opacity: 1; transform: none; } }
@keyframes lab-pusat-b { from { opacity: 0; transform: translate(320px, -185px) scale(0.35); } to { opacity: 1; transform: none; } }
@keyframes lab-pusat-c { from { opacity: 0; transform: translate(-295px, -170px) scale(0.35); } to { opacity: 1; transform: none; } }
.anim-rakit-geser .el-a { animation: lab-geser-a calc(1s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) both; }
.anim-rakit-geser .el-b { animation: lab-geser-b calc(1s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.14s / var(--lab-speed, 1)) both; }
.anim-rakit-geser .el-c { animation: lab-geser-c calc(1s / var(--lab-speed, 1)) cubic-bezier(0.22, 1, 0.36, 1) calc(0.28s / var(--lab-speed, 1)) both; }
@keyframes lab-geser-a { from { opacity: 0; transform: translateY(-380px); } to { opacity: 1; transform: none; } }
@keyframes lab-geser-b { from { opacity: 0; transform: translateX(-380px); } to { opacity: 1; transform: none; } }
@keyframes lab-geser-c { from { opacity: 0; transform: translateX(380px); } to { opacity: 1; transform: none; } }
`;

type AnimKey =
  | "diam" | "rakit" | "rakit-putar" | "rakit-jatuh" | "rakit-pusat" | "rakit-geser" | "putar" | "gabungan";
const ANIM: Record<AnimKey, { label: string; kelas: string }> = {
  diam: { label: "Diam", kelas: "" },
  rakit: { label: "Rakit masuk", kelas: "anim-rakit" },
  "rakit-putar": { label: "Rakit berputar", kelas: "anim-rakit-putar" },
  "rakit-jatuh": { label: "Rakit jatuh", kelas: "anim-rakit-jatuh" },
  "rakit-pusat": { label: "Rakit dari pusat", kelas: "anim-rakit-pusat" },
  "rakit-geser": { label: "Rakit geser", kelas: "anim-rakit-geser" },
  putar: { label: "Putar pelan", kelas: "anim-putar" },
  gabungan: { label: "Rakit → Putar", kelas: "anim-rakit anim-gabungan" },
};

function LogoSvg({ anim = "diam", speed = 1 }: { anim?: AnimKey; speed?: number }) {
  return (
    <svg
      viewBox="0 0 1600 1600"
      className={`block h-full w-full ${ANIM[anim].kelas}`}
      style={{ "--lab-speed": speed } as React.CSSProperties}
      role="img"
      aria-label="Logo Amamiya"
    >
      <linearGradient id="g0" gradientUnits="userSpaceOnUse" x1="797" y1="316" x2="797" y2="1028">
        <stop offset="0" stopColor="#00ffaa" />
        <stop offset="1" stopColor="#003796" />
      </linearGradient>
      <linearGradient id="g1" gradientUnits="userSpaceOnUse" x1="183" y1="1387" x2="797" y2="1028">
        <stop offset="0" stopColor="#00ffaa" />
        <stop offset="1" stopColor="#003796" />
      </linearGradient>
      <linearGradient id="g2" gradientUnits="userSpaceOnUse" x1="1414" y1="1383" x2="797" y2="1028">
        <stop offset="0" stopColor="#00ffaa" />
        <stop offset="1" stopColor="#003796" />
      </linearGradient>
      <g className="logo-lab-spin">
      <g className="logo-lab-el el-a">
        <path fillRule="evenodd" fill="url(#g0)" d="M470,845 L793,288 L1109,814 L999,966 L939,853 Z M650,732 L882,741 L932,739 L785,499 Z" />
      </g>
      <g className="logo-lab-el el-b">
        <path fillRule="evenodd" fill="url(#g1)" d="M803,1401 L159,1400 L456,864 L643,883 L575,992 Z M615,1302 L506,1097 L480,1054 L346,1302 Z" />
      </g>
      <g className="logo-lab-el el-c">
        <path fillRule="evenodd" fill="url(#g2)" d="M1120,835 L1441,1401 L828,1401 L751,1232 L879,1237 Z M1128,1047 L1005,1243 L981,1288 L1262,1280 Z" />
      </g>
      </g>
    </svg>
  );
}

type BgKey = "hitam" | "navy" | "putih" | "transparan";
const BG: Record<BgKey, { label: string; css: string; hex: string | null }> = {
  hitam: { label: "Hitam situs", css: "#0a0a0b", hex: "#0a0a0b" },
  navy: { label: "Navy logo", css: "#0A1847", hex: "#0A1847" },
  putih: { label: "Putih", css: "#ffffff", hex: "#ffffff" },
  transparan: {
    label: "Transparan",
    css: "repeating-conic-gradient(#22336A 0% 25%, #16296B 0% 50%) 0 0 / 24px 24px",
    hex: null,
  },
};

function buildExportSvg(paddingPct: number, bgHex: string | null): string {
  const pad = Math.round((paddingPct / 100) * 1600);
  const vb = `${-pad} ${-pad} ${1600 + pad * 2} ${1600 + pad * 2}`;
  let svg = LOGO_SVG.replace('viewBox="0 0 1600 1600"', `viewBox="${vb}"`);
  if (bgHex) {
    const rect = `<rect x="${-pad}" y="${-pad}" width="${1600 + pad * 2}" height="${1600 + pad * 2}" fill="${bgHex}"/>`;
    svg = svg.replace(/>(<linearGradient)/, `>${rect}$1`);
  }
  return svg;
}

function unduh(nama: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nama;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const FAVICON_SIZES = [16, 24, 32, 48, 64, 96];

export default function LogoLab() {
  const [size, setSize] = useState(320);
  const [padding, setPadding] = useState(8);
  const [bg, setBg] = useState<BgKey>("hitam");
  const [anim, setAnim] = useState<AnimKey>("gabungan");
  const [speed, setSpeed] = useState(1);
  const [replay, setReplay] = useState(0);

  const unduhSvg = () =>
    unduh("amamiya-logo-coba.svg", new Blob([buildExportSvg(padding, BG[bg].hex)], { type: "image/svg+xml" }));

  const unduhPng = () => {
    const svg = buildExportSvg(padding, BG[bg].hex);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1024, 1024);
      canvas.toBlob((b) => b && unduh("amamiya-logo-coba-1024.png", b), "image/png");
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  };

  const chip = (aktif: boolean) =>
    `cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold ${
      aktif ? "border-accent bg-accent text-[#052A1E]" : "border-line bg-transparent text-fog hover:text-paper"
    }`;

  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <style>{ANIM_CSS}</style>
      <div className="mx-auto max-w-[1100px] px-5 py-8">
        <a href="/lab" className="text-[13px] font-semibold text-accent2 transition-colors hover:text-accent">
          ← Labs
        </a>
        <h1 className="mt-2 text-[28px] font-bold text-paper">Logo Lab</h1>
        <p className="mt-1 max-w-[640px] text-sm leading-relaxed text-fog">
          Halaman coba-coba untuk SVG logo Amamiya: atur ukuran, padding, latar, dan animasi untuk
          melihat hasilnya sebelum dipakai. Tidak ada tautan ke sini dari navbar — halaman ini hanya
          dijangkau lewat URL langsung.
        </p>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_300px]">
          {/* Pratinjau */}
          <div
            className="flex items-center justify-center rounded-2xl border border-line2 p-6"
            style={{ background: BG[bg].css, minHeight: 420 }}
          >
            <div
              key={`${anim}-${replay}`}
              style={{ width: size, height: size, padding: `${padding}%` }}
              className="box-border"
            >
              <LogoSvg anim={anim} speed={speed} />
            </div>
          </div>

          {/* Kontrol */}
          <div className="flex flex-col gap-5 rounded-2xl border border-line2 bg-panel p-5">
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-paper">Animasi</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(ANIM) as AnimKey[]).map((k) => (
                  <button key={k} onClick={() => setAnim(k)} className={chip(anim === k)}>
                    {ANIM[k].label}
                  </button>
                ))}
              </div>
              <label className="mt-3 block">
                <span className="mb-1 flex justify-between text-xs text-fog">
                  Kecepatan <span>{speed.toFixed(2)}×</span>
                </span>
                <input
                  type="range" min={0.25} max={2.5} step={0.25} value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-[#00FFAA]"
                />
              </label>
              {anim !== "diam" && anim !== "putar" && (
                <button
                  onClick={() => setReplay((r) => r + 1)}
                  className="mt-1 cursor-pointer rounded-lg border border-line bg-transparent px-3 py-1.5 text-xs font-semibold text-paper hover:border-steel"
                >
                  Putar ulang dari awal
                </button>
              )}
            </div>
            <label className="block">
              <span className="mb-1.5 flex justify-between text-[13px] font-semibold text-paper">
                Ukuran pratinjau <span className="text-fog">{size} px</span>
              </span>
              <input
                type="range" min={80} max={560} value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-[#00FFAA]"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex justify-between text-[13px] font-semibold text-paper">
                Padding <span className="text-fog">{padding}%</span>
              </span>
              <input
                type="range" min={0} max={30} value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                className="w-full accent-[#00FFAA]"
              />
              <span className="mt-1 block text-xs text-dim">
                Padding 0% = emblem penuh bingkai; ±22% ≈ versi ikon aplikasi lama yang terasa kecil.
              </span>
            </label>
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-paper">Latar</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(BG) as BgKey[]).map((k) => (
                  <button key={k} onClick={() => setBg(k)} className={chip(bg === k)}>
                    {BG[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-auto flex flex-col gap-2">
              <button
                onClick={unduhPng}
                className="w-full cursor-pointer rounded-lg border-none bg-accent px-4 py-[9px] text-sm font-semibold text-[#052A1E]"
              >
                Unduh PNG 1024
              </button>
              <button
                onClick={unduhSvg}
                className="w-full cursor-pointer rounded-lg border border-line bg-transparent px-4 py-[9px] text-sm font-semibold text-paper hover:border-steel"
              >
                Unduh SVG
              </button>
              <span className="text-xs leading-relaxed text-dim">
                Unduhan mengikuti padding + latar yang sedang dipilih (latar Transparan = PNG tanpa latar).
                Animasi hanya untuk pratinjau di halaman ini.
              </span>
            </div>
          </div>
        </div>

        {/* Strip ukuran favicon */}
        <h2 className="mt-8 text-lg font-bold text-paper">Ukuran asli favicon</h2>
        <p className="mt-1 text-sm text-fog">
          Logo yang sama pada ukuran tampil sebenarnya — untuk menilai keterbacaan di tab browser dan ikon aplikasi.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {(["hitam", "navy"] as BgKey[]).map((k) => (
            <div key={k} className="rounded-2xl border border-line2 p-4" style={{ background: BG[k].css }}>
              <div className="mb-3 text-xs font-semibold tracking-[0.06em] text-fog uppercase">{BG[k].label}</div>
              <div className="flex items-end gap-5">
                {FAVICON_SIZES.map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1.5">
                    <div style={{ width: s, height: s }}>
                      <LogoSvg />
                    </div>
                    <span className="text-[11px] text-dim">{s}px</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
