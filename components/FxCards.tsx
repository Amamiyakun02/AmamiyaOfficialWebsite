"use client";

import { useEffect, useRef } from "react";

/* =====================================================================
   IKON EFEK — 30 Okt 2026 sebagai card berpenjelasan di bawah stage;
   31 Okt atas permintaan user: teks judul & penjelasan DIHAPUS, kini
   hanya cip ikon glyph HIDUP (spiral/sparkle/atom + black hole sejak
   elemen keempat diterapkan 31 Okt) berjejer di bawah
   kata besar AMAMIYA di tengah lubang. Nama efek tetap ada sebagai
   tooltip (atribut title). Ringan: satu rAF per cip, ±30fps.
   ===================================================================== */

type Kind = "spiral" | "spark" | "atom" | "blackhole";

// Nama resmi keempat elemen (keputusan user 31 Okt) DIURUTKAN sesuai
// perjalanan skala alam semesta: Macro Cosmos (galaksi, terbesar) →
// Gravity (black hole) → Foton (cahaya/sparkle) → Micro Cosmos (atom,
// terkecil). Urutan ini juga urutan muncul cipnya (1,0/1,2/1,4/1,6 dtk).
const CARDS: { kind: Kind; label: string }[] = [
  { kind: "spiral", label: "Macro Cosmos" },
  { kind: "blackhole", label: "Gravity" },
  { kind: "spark", label: "Foton" },
  { kind: "atom", label: "Micro Cosmos" },
];

function GlyphCanvas({ kind }: { kind: Kind }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // DPR cip ikon sampai 3x (beda dari stage yang maks 2x): cip ini
    // mungil sehingga murah, dan di HP ber-DPR 3 batas 2x membuat
    // glyph di-upscale paksa dan terlihat buram (observasi user).
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = cvs.clientWidth || 232;
    const H = cvs.clientHeight || 104;
    // Faktor ketajaman glyph kecil: glow & tebal garis minimum
    // diskalakan mengikuti tinggi glyph — tanpa ini, di cip ponsel
    // (±15px) glow 4-8px mendominasi dan detail melebur (burem).
    // Di glyph besar (>= 30px, tab/desktop) faktornya 1 = tak berubah.
    const K = Math.min(1, H / 30);
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.scale(dpr, dpr);
    const cx = W / 2;
    const cy = H / 2;

    function drawSpiral(now: number) {
      // Galaksi GEMUK (meniru foto galaksi spiral): lengan digambar
      // 3 lapis — badan cahaya lebar lembut + badan tengah + garis inti
      // terang — lebar mengikuti radius setempat, plus taburan bintang
      // deterministik di sepanjang lengan dan inti elips terang.
      // Jarak antar lengan ±0,56 r > lebar halo total 0,38 r: lengan
      // tetap terpisah, tidak menyatu.
      const R = H * 0.37;
      const R0 = R * 0.1;
      const rot = now / 1600;
      const TURNS = Math.PI * 2 * 0.38;
      const steps = 48;
      const CHUNK = 4;
      ctx!.lineCap = "round";
      ctx!.shadowColor = "rgba(245,245,255,0.85)";
      for (let a = 0; a < 4; a++) {
        const off = (a * Math.PI) / 2;
        for (let s0 = 0; s0 < steps; s0 += CHUNK) {
          const thMid = (TURNS * (s0 + CHUNK / 2)) / steps;
          const rMid = R0 * Math.pow(R / R0, thMid / TURNS);
          const path = new Path2D();
          for (let i = s0; i <= Math.min(steps, s0 + CHUNK); i++) {
            const th = (TURNS * i) / steps;
            const r = R0 * Math.pow(R / R0, th / TURNS);
            const ang = rot + off + th;
            const x = cx + r * Math.cos(ang);
            const y = cy + r * Math.sin(ang);
            if (i === s0) path.moveTo(x, y);
            else path.lineTo(x, y);
          }
          ctx!.shadowBlur = 0;
          ctx!.lineWidth = Math.max(1.2 * K, 0.38 * rMid);
          ctx!.strokeStyle = "rgba(245,245,255,0.15)";
          ctx!.stroke(path);
          ctx!.lineWidth = Math.max(1 * K, 0.2 * rMid);
          ctx!.strokeStyle = "rgba(245,245,255,0.32)";
          ctx!.stroke(path);
          ctx!.shadowBlur = 5 * K;
          ctx!.lineWidth = Math.max(1.1 * K, 0.07 * rMid);
          ctx!.strokeStyle = "rgba(245,245,255,0.95)";
          ctx!.stroke(path);
          ctx!.shadowBlur = 0;
          const hsh = Math.sin(a * 127.1 + s0 * 311.7) * 43758.5453;
          const h1 = hsh - Math.floor(hsh);
          if (h1 < 0.65 && rMid > R * 0.2) {
            const th = thMid;
            const o2 = (h1 - 0.32) * 0.55 * rMid;
            const bx = rMid * Math.cos(th) - Math.sin(th) * o2;
            const by = rMid * Math.sin(th) + Math.cos(th) * o2;
            const wx = cx + bx * Math.cos(rot + off) - by * Math.sin(rot + off);
            const wy = cy + bx * Math.sin(rot + off) + by * Math.cos(rot + off);
            ctx!.beginPath();
            ctx!.arc(wx, wy, 0.7 + h1 * 0.9, 0, Math.PI * 2);
            ctx!.fillStyle = "rgba(245,245,255,0.85)";
            ctx!.fill();
          }
        }
      }
      // inti galaksi: elips terang memanjang, berputar bersama lengan
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(rot);
      ctx!.beginPath();
      ctx!.ellipse(0, 0, R * 0.24, R * 0.13, 0, 0, Math.PI * 2);
      ctx!.shadowBlur = 8 * K;
      ctx!.fillStyle = "rgba(245,245,255,0.8)";
      ctx!.fill();
      ctx!.restore();
      ctx!.shadowBlur = 0;
    }

    function drawSpark(now: number) {
      const pulse = 1 + 0.06 * Math.sin(now / 300);
      // DISAMAKAN dengan spiral & atom di cip ini (diukur pikselnya
      // 31 Okt: spiral 27x27, atom 29x27, sparkle hanya 18x20 karena
      // ry 0,31 & lekuk ramping 0,10). Kini tinggi 0,86 x H dan
      // lekuk gemuk 0,30 — massa visualnya setara kedua tetangganya.
      const ry = H * 0.43 * pulse;
      const rx = ry * 0.88;
      const p = 0.3;
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(0.04 * Math.sin(now / 450));
      ctx!.beginPath();
      ctx!.moveTo(0, -ry);
      ctx!.quadraticCurveTo(rx * p, -ry * p, rx, 0);
      ctx!.quadraticCurveTo(rx * p, ry * p, 0, ry);
      ctx!.quadraticCurveTo(-rx * p, ry * p, -rx, 0);
      ctx!.quadraticCurveTo(-rx * p, -ry * p, 0, -ry);
      ctx!.closePath();
      ctx!.shadowColor = "rgba(245,245,255,0.85)";
      ctx!.shadowBlur = 4 * K;
      ctx!.fillStyle = `rgba(245,245,255,${0.92 + 0.08 * Math.sin(now / 260)})`;
      ctx!.fill();
      ctx!.restore();
      ctx!.shadowBlur = 0;
    }

    function drawAtom(now: number) {
      const R = H * 0.37;
      const f = 0.25;
      const rot = now / 1400;
      ctx!.shadowColor = "rgba(245,245,255,0.85)";
      ctx!.shadowBlur = 4 * K;
      ctx!.strokeStyle = "rgba(245,245,255,0.95)";
      ctx!.fillStyle = "rgba(245,245,255,0.95)";
      ctx!.lineWidth = Math.max(0.7, 1.6 * K);
      for (let k = 0; k < 3; k++) {
        const ang = rot + (k * Math.PI) / 3;
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, R, R * f, ang, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.beginPath();
      ctx!.arc(cx, cy, Math.max(1.6 * K, R * 0.15), 0, Math.PI * 2);
      ctx!.fill();
      for (let k = 0; k < 3; k++) {
        const ang = rot + (k * Math.PI) / 3;
        const th = now / 1000 * (0.9 + k * 0.17) * 1.6 + k * 2.1;
        const ex = R * Math.cos(th);
        const ey = R * f * Math.sin(th);
        const sx = cx + ex * Math.cos(ang) - ey * Math.sin(ang);
        const sy = cy + ex * Math.sin(ang) + ey * Math.cos(ang);
        ctx!.beginPath();
        ctx!.arc(sx, sy, Math.max(1.3 * K, R * 0.085), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
    }

    function drawBlackhole(now: number) {
      // Black hole TAMPAK DEPAN (elemen keempat, 31 Okt): cincin
      // cahaya melingkar berdiameter 0,74 x H (setara spiral/atom) +
      // bola hitam bertepi foton + pita disk memotong tengah; debu
      // mengorbit — rotasi murni pada poros. Lebar pita dibatasi
      // lebar kanvas cip agar ujungnya tidak terpotong.
      const ringR = H * 0.37;
      const R = ringR / 1.38;
      const bandRx = Math.min(R * 2.7 * 0.9, W * 0.48);
      const bandRy = Math.max(1 * K, R * 0.18);
      const band = (mul: number) => {
        const gr = ctx!.createLinearGradient(cx - bandRx, cy, cx + bandRx, cy);
        gr.addColorStop(0, "rgba(245,245,255,0)");
        gr.addColorStop(0.16, `rgba(245,245,255,${0.28 * mul})`);
        gr.addColorStop(0.5, `rgba(245,245,255,${0.85 * mul})`);
        gr.addColorStop(0.84, `rgba(245,245,255,${0.28 * mul})`);
        gr.addColorStop(1, "rgba(245,245,255,0)");
        return gr;
      };
      const hC = (n: number) => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      ctx!.shadowColor = "rgba(245,245,255,0.85)";
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, bandRx, bandRy, 0, 0, Math.PI * 2);
      ctx!.fillStyle = band(0.55);
      ctx!.fill();
      ctx!.shadowBlur = 4 * K;
      for (const p of [
        { m: 0.94, w: 0.1, a: 0.3 },
        { m: 1, w: 0.17, a: 0.5 },
        { m: 1.07, w: 0.08, a: 0.22 },
      ]) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, ringR * p.m, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(245,245,255,${p.a})`;
        ctx!.lineWidth = Math.max(0.7 * K, R * p.w);
        ctx!.stroke();
      }
      for (const seg of [
        { a0: -Math.PI * 0.72, a1: -Math.PI * 0.28 },
        { a0: Math.PI * 0.28, a1: Math.PI * 0.72 },
      ]) {
        ctx!.beginPath();
        ctx!.arc(cx, cy, ringR, seg.a0, seg.a1);
        ctx!.strokeStyle = "rgba(245,245,255,0.85)";
        ctx!.lineWidth = Math.max(0.8 * K, R * 0.2);
        ctx!.stroke();
      }
      ctx!.fillStyle = "rgba(245,245,255,0.9)";
      for (let i = 0; i < 8; i++) {
        const rf = 0.92 + hC(i * 3 + 1) * 0.16;
        const th = hC(i * 7 + 2) * Math.PI * 2 - now * 0.0012;
        ctx!.beginPath();
        ctx!.arc(cx + Math.cos(th) * ringR * rf, cy + Math.sin(th) * ringR * rf, Math.max(0.9 * K, R * 0.07), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.beginPath();
      ctx!.arc(cx, cy, R, 0, Math.PI * 2);
      ctx!.fillStyle = "rgba(4,4,9,0.97)";
      ctx!.fill();
      ctx!.beginPath();
      ctx!.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(245,245,255,0.9)";
      ctx!.lineWidth = Math.max(0.8 * K, R * 0.12);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, bandRx, bandRy, 0, 0, Math.PI * 2);
      ctx!.fillStyle = band(1);
      ctx!.fill();
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, bandRx * 0.92, bandRy * 0.45, 0, 0, Math.PI * 2);
      ctx!.fillStyle = band(1.15);
      ctx!.fill();
      ctx!.shadowBlur = 0;
    }

    function frame(now: number) {
      ctx!.clearRect(0, 0, W, H);
      if (kind === "spiral") drawSpiral(now);
      else if (kind === "spark") drawSpark(now);
      else if (kind === "atom") drawAtom(now);
      else drawBlackhole(now);
    }

    if (reduced) {
      frame(600);
      return;
    }
    // OPTIMASI (31 Okt, hasil profil): loop cip hanya berjalan saat
    // cip TERLIHAT — sebelumnya 4 loop ini menggambar selamanya walau
    // user sudah scroll jauh ke bawah (cip di hero tak terlihat).
    let raf = 0;
    let last = 0;
    let running = false;
    const loop = (now: number) => {
      if (!running) return;
      if (now - last >= 33) {
        last = now;
        frame(now);
      }
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(
      (es) => (es[0].isIntersecting ? start() : stop()),
      { rootMargin: "80px" },
    );
    io.observe(cvs);
    start();
    return () => {
      stop();
      io.disconnect();
    };
  }, [kind]);

  return <canvas ref={ref} className="fx-card-canvas" aria-hidden="true" />;
}

export default function FxCards() {
  return (
    <div className="fx-cards">
      {CARDS.map((c) => (
        <article key={c.kind} className="fx-card" title={c.label} aria-label={c.label}>
          <GlyphCanvas kind={c.kind} />
        </article>
      ))}
    </div>
  );
}
