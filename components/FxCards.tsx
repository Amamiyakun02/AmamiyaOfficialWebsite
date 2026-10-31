"use client";

import { useEffect, useRef } from "react";

/* =====================================================================
   3 IKON EFEK — 30 Okt 2026 sebagai card berpenjelasan di bawah stage;
   31 Okt atas permintaan user: teks judul & penjelasan DIHAPUS, kini
   hanya cip ikon glyph HIDUP (spiral/sparkle/atom) berjejer di bawah
   kata besar AMAMIYA di tengah lubang. Nama efek tetap ada sebagai
   tooltip (atribut title). Ringan: satu rAF per cip, ±30fps.
   ===================================================================== */

type Kind = "spiral" | "spark" | "atom";

const CARDS: { kind: Kind; label: string }[] = [
  { kind: "spiral", label: "Spiral" },
  { kind: "spark", label: "Sparkle" },
  { kind: "atom", label: "Atom" },
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
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cvs.clientWidth || 232;
    const H = cvs.clientHeight || 104;
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
          ctx!.lineWidth = Math.max(1.2, 0.38 * rMid);
          ctx!.strokeStyle = "rgba(245,245,255,0.15)";
          ctx!.stroke(path);
          ctx!.lineWidth = Math.max(1, 0.2 * rMid);
          ctx!.strokeStyle = "rgba(245,245,255,0.32)";
          ctx!.stroke(path);
          ctx!.shadowBlur = 5;
          ctx!.lineWidth = Math.max(1.1, 0.07 * rMid);
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
      ctx!.shadowBlur = 8;
      ctx!.fillStyle = "rgba(245,245,255,0.8)";
      ctx!.fill();
      ctx!.restore();
      ctx!.shadowBlur = 0;
    }

    function drawSpark(now: number) {
      const pulse = 1 + 0.06 * Math.sin(now / 300);
      const ry = H * 0.31 * pulse;
      const rx = ry * 0.86;
      const p = 0.1;
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
      ctx!.shadowBlur = 4;
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
      ctx!.shadowBlur = 4;
      ctx!.strokeStyle = "rgba(245,245,255,0.95)";
      ctx!.fillStyle = "rgba(245,245,255,0.95)";
      ctx!.lineWidth = 1.6;
      for (let k = 0; k < 3; k++) {
        const ang = rot + (k * Math.PI) / 3;
        ctx!.beginPath();
        ctx!.ellipse(cx, cy, R, R * f, ang, 0, Math.PI * 2);
        ctx!.stroke();
      }
      ctx!.beginPath();
      ctx!.arc(cx, cy, Math.max(1.6, R * 0.15), 0, Math.PI * 2);
      ctx!.fill();
      for (let k = 0; k < 3; k++) {
        const ang = rot + (k * Math.PI) / 3;
        const th = now / 1000 * (0.9 + k * 0.17) * 1.6 + k * 2.1;
        const ex = R * Math.cos(th);
        const ey = R * f * Math.sin(th);
        const sx = cx + ex * Math.cos(ang) - ey * Math.sin(ang);
        const sy = cy + ex * Math.sin(ang) + ey * Math.cos(ang);
        ctx!.beginPath();
        ctx!.arc(sx, sy, Math.max(1.3, R * 0.085), 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.shadowBlur = 0;
    }

    function frame(now: number) {
      ctx!.clearRect(0, 0, W, H);
      if (kind === "spiral") drawSpiral(now);
      else if (kind === "spark") drawSpark(now);
      else drawAtom(now);
    }

    if (reduced) {
      frame(600);
      return;
    }
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= 33) {
        last = now;
        frame(now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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
