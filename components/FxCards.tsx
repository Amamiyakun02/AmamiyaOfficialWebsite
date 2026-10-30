"use client";

import { useEffect, useRef } from "react";

/* =====================================================================
   3 CARD EFEK (layer paling depan stage) — 30 Okt 2026.
   Satu card per efek huruf di halaman utama: Spiral, Sparkle, Atom.
   Tiap card memuat pratinjau glyph-nya yang DIGAMBAR HIDUP di canvas
   mini (gerakan sama seperti efek aslinya di grid), judul, dan
   penjelasan singkat. Ringan: satu rAF per card, dibatasi ±30fps,
   berhenti sendiri saat tab disembunyikan (rAF) / komponen dilepas.
   ===================================================================== */

type Kind = "spiral" | "spark" | "atom";

const CARDS: { kind: Kind; title: string; desc: string }[] = [
  {
    kind: "spiral",
    title: "Spiral",
    desc: "Galaksi empat lengan yang sesekali mengambil alih satu huruf: tumbuh memutar, berdiam sejenak, lalu menguncup dan mengembalikan hurufnya.",
  },
  {
    kind: "spark",
    title: "Sparkle",
    desc: "Kilau bintang empat titik ala Gemini yang menggantikan huruf lewat kedip glitch, lalu berkedip lembut selama tampil penuh.",
  },
  {
    kind: "atom",
    title: "Atom",
    desc: "Atom Rutherford ala logo React: nukleus di tengah, tiga orbit elips bersilangan, dan elektron yang terus mengelilingi orbitnya.",
  },
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
      const R = H * 0.34;
      const R0 = R * 0.12;
      const rot = now / 1600;
      const TURNS = Math.PI * 2 * 0.38;
      ctx!.strokeStyle = "rgba(245,245,255,1)";
      ctx!.fillStyle = "rgba(245,245,255,1)";
      ctx!.lineWidth = 2;
      ctx!.lineCap = "round";
      ctx!.shadowColor = "rgba(245,245,255,0.85)";
      ctx!.shadowBlur = 4;
      for (let a = 0; a < 4; a++) {
        const base = (a * Math.PI) / 2 + rot;
        ctx!.beginPath();
        const steps = 44;
        for (let sIdx = 0; sIdx <= steps; sIdx++) {
          const th = (TURNS * sIdx) / steps;
          const r = R0 + (R - R0) * (th / TURNS);
          const x = cx + r * Math.cos(base + th) * 0.82;
          const y = cy + r * Math.sin(base + th);
          if (sIdx === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        // lengan diredupkan saat mengarah horizontal (seperti aslinya:
        // massa cahaya terkumpul di atas-bawah)
        const vert = Math.abs(Math.sin(base + TURNS / 2));
        ctx!.globalAlpha = 0.25 + 0.75 * vert;
        ctx!.stroke();
      }
      ctx!.globalAlpha = 1;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx!.fill();
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
        <article key={c.kind} className="fx-card">
          <GlyphCanvas kind={c.kind} />
          <h3>{c.title}</h3>
          <p>{c.desc}</p>
        </article>
      ))}
    </div>
  );
}
