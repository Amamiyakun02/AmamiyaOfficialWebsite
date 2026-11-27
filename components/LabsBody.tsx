"use client";

import { useEffect, useRef, useState } from "react";

// Badan halaman /labs: landing kosong calon subdomain lab —
// logo berdampingan kata AMAMIYA LABS. Tanpa navbar: Navbar dan
// AgentFab ikut disembunyikan untuk awalan /labs.
//
// ENTRANCE berurutan (permintaan user 27 Nov 2026): dibuka
// SINGULARITAS pekat di tengah selama 0,5 dtk, lalu ledakan
// sel dari tengah layar (komponen LabsLedakan),
// SESUDAH itu logo muncul dan terakit DI TENGAH layar dengan
// SATU-SATUNYA animasi "rakit dari pusat" (diambil dari Logo
// Lab /lab/logo: ketiga potongan berangkat dari gugus pusat
// berskala 0,35 lalu menyebar ke tempatnya; offset diskala ke
// ukuran logo di sini), lalu logo BERGESER ke posisi
// lockup-nya sekarang, dan terakhir kata AMAMIYA dan LABS
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

const ANIM_CSS = `
.labs-logo-el { transform-box: fill-box; transform-origin: center; }
.labs-logo-pusat .el-a { animation: labsPusatA 1.1s cubic-bezier(0.22, 1, 0.36, 1) both; }
.labs-logo-pusat .el-b { animation: labsPusatB 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.labs-logo-pusat .el-c { animation: labsPusatC 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
@keyframes labsPusatA { from { opacity: 0; transform: translateY(208px) scale(0.35); } to { opacity: 1; transform: none; } }
@keyframes labsPusatB { from { opacity: 0; transform: translate(202px, -117px) scale(0.35); } to { opacity: 1; transform: none; } }
@keyframes labsPusatC { from { opacity: 0; transform: translate(-186px, -107px) scale(0.35); } to { opacity: 1; transform: none; } }
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

// Ledakan sel dari tengah (entrance KHUSUS /labs), dibuka
// SINGULARITAS: inti pekat bercahaya di tengah layar selama
// 0,5 dtk — titik-titik materi tersedot masuk, cahaya memadat
// (glow menyusut, inti memutih) — lalu MELEDAK: kilatan cincin
// disusul kisi sel materialisasi (matriks titik, balok dua
// nada, lalu karakter) yang menyebar radial dari tengah lalu
// memudar. Isi selnya "#" dulu sebagai uji coba (BUKAN kata
// AMAMIYA). Sekali jalan sesudah halaman dimuat, bukan loop;
// hormati prefers-reduced-motion.
function gambarSel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cw: number,
  ch: number,
  p: number,
  alpha: number,
) {
  if (p < 0.42) {
    const a =
      alpha *
      (p < 0.12 ? p / 0.12 : p < 0.3 ? 1 : 1 - (p - 0.3) / 0.12);
    if (a > 0.01) {
      ctx.fillStyle = `rgba(0, 159, 138, ${(0.95 * a).toFixed(3)})`;
      const w = cw * 0.62, h = ch * 0.4, r = Math.max(1, cw * 0.045);
      for (let i = 0; i < 4; i++)
        for (let j = 0; j < 2; j++) {
          ctx.beginPath();
          ctx.arc(
            x - w / 2 + (w / 3) * i,
            y - h / 2 + h * j,
            r,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
    }
  }
  if (p >= 0.3 && p < 0.84) {
    const masuk = Math.min(1, (p - 0.3) / 0.18);
    const a = alpha * (p < 0.68 ? 1 : 1 - (p - 0.68) / 0.16);
    if (a > 0.01) {
      const w = cw * 0.84 * masuk, h = ch * 0.56;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#008488";
      ctx.fillRect(x - w / 2, y - h / 2, w * 0.55, h);
      ctx.fillStyle = "#005e84";
      ctx.fillRect(x - w / 2 + w * 0.55, y - h / 2, w * 0.45, h);
      ctx.globalAlpha = 1;
    }
  }
  if (p >= 0.6) {
    const a = alpha * Math.min(1, (p - 0.6) / 0.24);
    if (a > 0.01) {
      ctx.fillStyle = `rgba(0, 217, 145, ${a.toFixed(3)})`;
      ctx.font = `${Math.round(cw * 0.95)}px monospace`;
      ctx.fillText("#", x, y + cw * 0.03);
    }
  }
}

function LabsLedakan() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    let W = 0, H = 0, CW = 0, CH = 0, cols = 0, rows = 0;
    const setup = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      cv.width = Math.round(W * DPR);
      cv.height = Math.round(H * DPR);
      cols = Math.max(12, Math.round(W / 38));
      CW = W / cols;
      CH = CW * 1.3;
      rows = Math.ceil(H / CH);
    };
    setup();
    const cx = W / 2, cy = H / 2;
    const maxD = Math.hypot(cx, cy) || 1;
    const DUR = 900;
    const FADE = 550;
    const SPEED = 1500;
    const T_SING = 500; // singularitas memadat (ms)
    const T_FLASH = 150; // kilatan awal ledakan (ms)
    const T0 = performance.now();
    let raf = 0;
    // Singularitas: materi tersedot ke pusat (46 titik sudut
    // emas dalam cakram) sambil inti memadat — glow menyusut
    // 54->18 px, inti mengecil 7->3,5 px dan memutih.
    const gambarSingularitas = (q: number, t: number) => {
      for (let i = 0; i < 46; i++) {
        const sudut = i * 2.399963;
        const r0 = 42 + ((i * 67) % 150);
        const r = r0 * (1 - q * q) + 5;
        const a = 0.12 + 0.8 * q;
        ctx.fillStyle = `rgba(0, 217, 145, ${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(sudut) * r,
          cy + Math.sin(sudut) * r,
          1.4 + (i % 3) * 0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      const denyut = 1 + 0.05 * Math.sin(t / 38);
      const glowR = (54 - 36 * q) * denyut;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, `rgba(0, 255, 170, ${(0.55 + 0.3 * q).toFixed(3)})`);
      g.addColorStop(0.4, "rgba(0, 187, 162, 0.28)");
      g.addColorStop(1, "rgba(0, 155, 160, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#00d991";
      ctx.beginPath();
      ctx.arc(cx, cy, 7 - 2 * q, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(239, 255, 248, ${(0.55 + 0.45 * q).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 3.6 - 1.1 * q, 0, Math.PI * 2);
      ctx.fill();
    };
    // Kilatan ledakan: cincin terang mengembang cepat + sisa
    // pijar inti yang memudar.
    const gambarKilatan = (p: number) => {
      ctx.strokeStyle = `rgba(0, 255, 170, ${((1 - p) * 0.9).toFixed(3)})`;
      ctx.lineWidth = 3 - 1.8 * p;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + p * 110, 0, Math.PI * 2);
      ctx.stroke();
      const sisa = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      sisa.addColorStop(
        0,
        `rgba(239, 255, 248, ${((1 - p) * 0.55).toFixed(3)})`,
      );
      sisa.addColorStop(1, "rgba(0, 255, 170, 0)");
      ctx.fillStyle = sisa;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.fill();
    };
    const frame = (now: number) => {
      const t = now - T0;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let selesai = true;
      if (t < T_SING) {
        gambarSingularitas(t / T_SING, t);
        selesai = false;
      } else if (t < T_SING + T_FLASH) {
        gambarKilatan((t - T_SING) / T_FLASH);
        selesai = false;
      }
      if (t >= T_SING) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = (c + 0.5) * CW, y = (r + 0.5) * CH;
          const mulai =
            T_SING + (Math.hypot(x - cx, y - cy) / maxD) * SPEED;
          const p = (t - mulai) / DUR;
          if (p < 0) {
            selesai = false;
            continue;
          }
          if (p >= 1) {
            const pf = (t - mulai - DUR) / FADE;
            if (pf >= 1) continue;
            selesai = false;
            gambarSel(ctx, x, y, CW, CH, 1, 1 - pf);
          } else {
            selesai = false;
            gambarSel(ctx, x, y, CW, CH, p, 1);
          }
        }
      }
      }
      if (!selesai) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", setup);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    />
  );
}

export default function LabsBody() {
  const refA = useRef<HTMLParagraphElement>(null);
  const refL = useRef<HTMLParagraphElement>(null);
  // Koreografi entrance: fase 0 logo belum muncul (bungkusnya
  // digeser agar pusat logo tepat di tengah layar), fase 1 logo
  // terakit di tengah, fase 2 logo bergeser ke posisi lockup.
  const [fase, setFase] = useState(0);
  const [dx, setDx] = useState(0);
  const refLogo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFase(2);
      return;
    }
    const ukur = () => {
      const el = refLogo.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      // Rect yang terukur sudah memuat transform berjalan, jadi
      // pusat layout = pusat rect - dx lama; dx baru = selisih
      // pusat layar terhadap pusat layout itu.
      setDx((lama) => {
        const pusat = r.left + r.width / 2 - lama;
        return Math.round(window.innerWidth / 2 - pusat);
      });
    };
    ukur();
    window.addEventListener("resize", ukur);
    const t1 = setTimeout(() => setFase(1), 1900);
    const t2 = setTimeout(() => setFase(2), 3350);
    return () => {
      window.removeEventListener("resize", ukur);
      clearTimeout(t1);
      clearTimeout(t2);
    };
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
      // Gap antar kata diperkecil dari sisi AMAMIYA saja: baris
      // atas turun sejauh RAPAT em, sedangkan LABS TETAP menempel
      // alas emblem (pilihan user — LABS tidak boleh terangkat).
      const RAPAT = 0.28;
      const geser =
        arah === "atas" ? -celah / fs + RAPAT : celah / fs;
      el.style.transform = `translateY(${geser.toFixed(4)}em)`;
    };
    sejajarkan(refA.current, "AMAMIYA", "atas");
    sejajarkan(refL.current, "LABS", "bawah");
  }, []);

  return (
    <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5">
      <style>{ANIM_CSS}</style>
      <LabsLedakan />
      <div
        className="relative flex items-center"
        style={{ fontSize: "clamp(30px, 8.9vw, 80px)" }}
      >
        <div
          ref={refLogo}
          className="relative h-[2em] w-[2.3em] flex-none"
          style={{
            transform:
              fase === 2 ? "translateX(0px)" : `translateX(${dx}px)`,
            transition:
              fase === 2
                ? "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
          }}
        >
          {fase >= 1 && (
          <svg
            viewBox="99 228 1402 1235"
            role="img"
            aria-label="Logo Amamiya"
            className="labs-logo-pusat absolute -top-[0.108em] -left-[0.108em] block h-[2.215em] w-[2.515em] max-w-none"
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
            <g className="labs-logo-el el-a">
              <path fillRule="evenodd" fill="url(#lg0)" d="M470,845 L793,288 L1109,814 L999,966 L939,853 Z M650,732 L882,741 L932,739 L785,499 Z" />
            </g>
            <g className="labs-logo-el el-b">
              <path fillRule="evenodd" fill="url(#lg1)" d="M803,1401 L159,1400 L456,864 L643,883 L575,992 Z M615,1302 L506,1097 L480,1054 L346,1302 Z" />
            </g>
            <g className="labs-logo-el el-c">
              <path fillRule="evenodd" fill="url(#lg2)" d="M1120,835 L1441,1401 L828,1401 L751,1232 L879,1237 Z M1128,1047 L1005,1243 L981,1288 L1262,1280 Z" />
            </g>
          </svg>
          )}
        </div>
        <div className="ml-[0.05em] flex h-[2em] flex-col justify-between">
          <p ref={refA} className="m-0 text-[1em] leading-none font-extrabold tracking-[0.02em] text-paper">
            <KataRender
              kata="AMAMIYA"
              mulai={4.15}
              titik="rgba(238,238,248,0.95)"
              blokTerang="#C3D2F0"
              blokGelap="#8298C0"
            />
          </p>
          <p ref={refL} className="m-0 text-[1em] leading-none font-bold tracking-[0.02em] text-accent2">
            <KataRender
              kata="LABS"
              mulai={5}
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
