"use client";

import { useEffect, useRef } from "react";

/* =====================================================================
   LATAR AMBIEN SECTION BAWAH (permintaan user 31 Okt): ladang titik
   lembut + huruf-huruf acak (A/M/I/Y + sisipan DEV/BUILD/CODE) di
   BELAKANG semua section di bawah hero — tema lebih ramah dan ringan
   dari grid tipografi di atas. Konten section mengambang di depannya;
   titik dan huruf menyala mengikuti mouse (glow tembus terlihat di
   sela-sela kartu), berdenyut pelan, dan sesekali mekar (bloom).
   Huruf-hurufnya SENGAJA tetap tersebar acak — mekanik menyusun
   kata saat mouse menyorot pernah dicoba dan dicabut user (lag);
   huruf di sini murni lapisan hash statis seperti titik: tanpa
   state, tanpa pelacakan, dihitung sebaris per frame.

   Ringan, mengikuti kaidah performa situs ini:
   - satu kanvas fixed sebesar viewport (bukan sebesar halaman)
   - partikel di koordinat dokumen — ikut bergulir bersama halaman
     seperti latar sungguhan — dan HANYA digambar di bawah hero
     (docY > tinggi hero), jadi hero Wonder tidak berubah sama sekali
   - gambar ulang maks ±20fps, berhenti saat tab tersembunyi (rAF)
   - prefers-reduced-motion: bidang statis tanpa denyut/glow/bloom
   ===================================================================== */

const SPACING = 46;
const LETTER_SPACING = 110;
const LETTER_CHARS = "AMAMIYA";
const INSERTS = ["DEV", "BUILD", "CODE"];
const GLOW_R = 170;

function hash2(ix: number, iy: number, salt: number) {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

type Bloom = { x: number; y: number; start: number };

export default function AmbientBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const scroller = cvs.parentElement;
    if (!scroller) return;
    const hero = scroller.querySelector<HTMLElement>(".hero-wrap");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let viewW = 0;
    let viewH = 0;
    let raf = 0;
    let lastFrame = 0;
    let mouseX = -9999;
    let mouseY = -9999;
    let glowX = -9999;
    let glowY = -9999;
    let glowAlpha = 0;
    let lastMove = 0;
    let lastSpawn = 0;
    const blooms: Bloom[] = [];

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      cvs.width = Math.round(viewW * dpr);
      cvs.height = Math.round(viewH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawStatic();
    };

    const heroBottom = () => (hero ? hero.offsetTop + hero.offsetHeight : 0);

    const drawField = (now: number, animated: boolean) => {
      const scrollTop = scroller.scrollTop;
      const hb = heroBottom();
      ctx.clearRect(0, 0, viewW, viewH);
      // Belum sampai section bawah → tidak ada yang digambar (hero utuh).
      if (scrollTop + viewH <= hb + 8) return;
      const docTop = Math.max(scrollTop, hb);
      const docBottom = scrollTop + viewH;
      const ix0 = 0;
      const ix1 = Math.ceil(viewW / SPACING);
      const iy0 = Math.floor(docTop / SPACING);
      const iy1 = Math.ceil(docBottom / SPACING);

      if (animated) {
        // glow mengikuti mouse dengan lerp halus; memudar saat diam
        const target = now - lastMove < 2600 && lastMove > 0 ? 1 : 0;
        glowAlpha += (target - glowAlpha) * 0.08;
        if (glowX < -1000 && target === 1) {
          glowX = mouseX;
          glowY = mouseY;
        }
        glowX += (mouseX - glowX) * 0.16;
        glowY += (mouseY - glowY) * 0.16;
        // mekar sesekali di area yang terlihat
        if (now - lastSpawn > 2400 && blooms.length < 3) {
          lastSpawn = now;
          const bx = Math.floor(Math.random() * ix1);
          const by = iy0 + Math.floor(Math.random() * Math.max(1, iy1 - iy0));
          blooms.push({ x: bx * SPACING + SPACING / 2, y: by * SPACING + SPACING / 2, start: now });
        }
      }

      for (let iy = iy0; iy <= iy1; iy++) {
        for (let ix = ix0; ix <= ix1; ix++) {
          const jx = (hash2(ix, iy, 1) - 0.5) * 20;
          const jy = (hash2(ix, iy, 2) - 0.5) * 20;
          const dx = ix * SPACING + SPACING / 2 + jx;
          const dy = iy * SPACING + SPACING / 2 + jy;
          if (dy < hb + 6) continue;
          const x = dx;
          const y = dy - scrollTop;
          const phase = hash2(ix, iy, 3) * Math.PI * 2;
          let r = 0.9 + hash2(ix, iy, 4) * 1.1;
          let a = animated
            ? 0.05 + 0.05 * (0.5 + 0.5 * Math.sin(now * 0.00045 + phase))
            : 0.085;
          if (animated && glowAlpha > 0.01) {
            const ddx = x - glowX;
            const ddy = y - glowY;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < GLOW_R) {
              const infl = 1 - d / GLOW_R;
              a += infl * infl * 0.5 * glowAlpha;
              r += infl * 1.6 * glowAlpha;
            }
          }
          if (animated) {
            for (const b of blooms) {
              const age = now - b.start;
              if (age < 0 || age > 2300) continue;
              const ddx = dx - b.x;
              const ddy = dy - b.y;
              if (Math.abs(ddx) > 60 || Math.abs(ddy) > 60) continue;
              const d = Math.sqrt(ddx * ddx + ddy * ddy);
              if (d < 60) {
                const k = Math.sin((age / 2300) * Math.PI) * (1 - d / 60);
                a += k * 0.3;
                r += k * 2.0;
              }
            }
          }
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(196, 205, 224, ${Math.min(0.85, a).toFixed(3)})`;
          ctx.fill();
        }
      }
      // bersihkan bloom yang selesai
      for (let i = blooms.length - 1; i >= 0; i--) {
        if (now - blooms[i].start > 2300) blooms.splice(i, 1);
      }

      /* Lapisan huruf acak — murni hash per sel seperti titik (tanpa
         state/formasi): melayang pelan dari fungsi waktu, dan di dekat
         mouse hanya mencerah seperti titik, tidak berkumpul. */
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const ly0 = Math.floor(docTop / LETTER_SPACING);
      const ly1 = Math.ceil(docBottom / LETTER_SPACING);
      const lx1 = Math.ceil(viewW / LETTER_SPACING);
      for (let iy = ly0; iy <= ly1; iy++) {
        for (let ix = 0; ix <= lx1; ix++) {
          const hx = ix * LETTER_SPACING + LETTER_SPACING / 2 + (hash2(ix, iy, 5) - 0.5) * 56;
          const hy = iy * LETTER_SPACING + LETTER_SPACING / 2 + (hash2(ix, iy, 6) - 0.5) * 56;
          if (hy < hb + 8) continue;
          const phase = hash2(ix, iy, 8) * Math.PI * 2;
          const x = hx + (animated ? Math.sin(now * 0.00021 + phase) * 6 : 0);
          const y = hy - scrollTop + (animated ? Math.cos(now * 0.00017 + phase * 1.3) * 6 : 0);
          if (y < -20 || y > viewH + 20) continue;
          let a = animated
            ? 0.085 + 0.05 * (0.5 + 0.5 * Math.sin(now * 0.0004 + phase))
            : 0.11;
          if (animated && glowAlpha > 0.01) {
            const ddx = x - glowX;
            const ddy = y - glowY;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < GLOW_R) {
              const infl = 1 - d / GLOW_R;
              a += infl * infl * 0.38 * glowAlpha;
            }
          }
          if (hash2(ix, iy, 9) > 0.94) {
            ctx.font = "600 10px monospace";
            ctx.fillStyle = `rgba(160, 175, 205, ${Math.min(0.4, a).toFixed(3)})`;
            ctx.fillText(INSERTS[Math.floor(hash2(ix, iy, 10) * INSERTS.length)], x, y);
          } else {
            ctx.font = "600 12px monospace";
            ctx.fillStyle = `rgba(190, 198, 218, ${Math.min(0.55, a).toFixed(3)})`;
            ctx.fillText(LETTER_CHARS[Math.floor(hash2(ix, iy, 7) * LETTER_CHARS.length)], x, y);
          }
        }
      }
    };

    const drawStatic = () => drawField(0, false);

    const onPointer = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastMove = performance.now();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - lastFrame < 50) return;
      lastFrame = now;
      drawField(now, true);
    };

    resize();
    window.addEventListener("resize", resize);
    scroller.addEventListener("pointermove", onPointer, { passive: true });
    scroller.addEventListener("pointerdown", onPointer, { passive: true });
    if (reduced) {
      scroller.addEventListener("scroll", drawStatic, { passive: true });
      drawStatic();
    } else {
      raf = requestAnimationFrame(frame);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      scroller.removeEventListener("pointermove", onPointer);
      scroller.removeEventListener("pointerdown", onPointer);
      scroller.removeEventListener("scroll", drawStatic);
    };
  }, []);

  return <canvas ref={ref} className="ambient-bg" aria-hidden="true" />;
}
