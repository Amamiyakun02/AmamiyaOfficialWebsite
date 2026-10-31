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
const GLOW_R = 210;

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
      // Ukuran CSS elemen harus = viewport (lihat .ambient-bg di
      // globals.css) — kalau tidak, di DPR pecahan kanvas tertampil
      // sebesar backing store dan highlight bergeser dari kursor.
      cvs.style.width = `${viewW}px`;
      cvs.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced) drawStatic();
    };

    const heroBottom = () => (hero ? hero.offsetTop + hero.offsetHeight : 0);

    /* --- Tiga glyph mini (spiral/sparkle/atom): titik-titik latar di
       dalam radius kursor BERUBAH BENTUK menjadi salah satunya
       (permintaan user — bukan glyph yang muncul melayang sendiri).
       Skala kecil (maks ±20px) agar ringan, hanya di latar ambien
       bawah (hero tidak disentuh). Digambar ringkas, tanpa shadow. --- */
    const drawSpiral = (x: number, y: number, R: number, a: number, t: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * 0.00025);
      // inti lebih terang & padat (versi lama terlalu tipis — keluhan user)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.6);
      g.addColorStop(0, `rgba(215, 230, 255, ${0.8 * a})`);
      g.addColorStop(1, "rgba(215, 230, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * 0.6, 0, 7);
      ctx.fill();
      // lengan digambar juga sebagai garis halus agar bentuk spiral
      // terbaca jelas di ukuran kecil, bukan hanya titik-titik lepas
      ctx.strokeStyle = `rgba(190, 208, 245, ${0.5 * a})`;
      ctx.lineWidth = Math.max(1, R * 0.1);
      for (let arm = 0; arm < 4; arm++) {
        ctx.beginPath();
        for (let i = 1; i <= 11; i++) {
          const f = i / 11;
          const ang = (arm * Math.PI) / 2 + f * 2.2;
          const px = Math.cos(ang) * R * f;
          const py = Math.sin(ang) * R * f * 0.82;
          if (i === 1) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      // bintang lengan lebih besar & terang dari versi lama
      ctx.fillStyle = "rgba(205, 220, 250, 1)";
      for (let arm = 0; arm < 4; arm++) {
        for (let i = 1; i <= 11; i++) {
          const f = i / 11;
          const ang = (arm * Math.PI) / 2 + f * 2.2;
          ctx.globalAlpha = a * (0.5 + 0.5 * hash2(arm * 12 + i, 3, 11));
          ctx.beginPath();
          ctx.arc(Math.cos(ang) * R * f, Math.sin(ang) * R * f * 0.82, Math.max(0.7, R * 0.085 * (1 - f * 0.35)), 0, 7);
          ctx.fill();
        }
      }
      // nukleus padat
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(225, 238, 255, 1)";
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(1, R * 0.14), 0, 7);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    };
    const drawSparkle = (x: number, y: number, R: number, a: number, t: number) => {
      const p = 1 + 0.06 * Math.sin(t * 0.002);
      const ry = R * 1.12 * p;
      const rx = R * 0.8 * p;
      const c = 0.3;
      ctx.save();
      ctx.translate(x, y);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.3);
      g.addColorStop(0, `rgba(160, 195, 255, ${0.35 * a})`);
      g.addColorStop(1, "rgba(160, 195, 255, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.3, 0, 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -ry);
      ctx.quadraticCurveTo(rx * c, -ry * c, rx, 0);
      ctx.quadraticCurveTo(rx * c, ry * c, 0, ry);
      ctx.quadraticCurveTo(-rx * c, ry * c, -rx, 0);
      ctx.quadraticCurveTo(-rx * c, -ry * c, 0, -ry);
      ctx.closePath();
      ctx.fillStyle = `rgba(205, 222, 255, ${0.92 * a})`;
      ctx.fill();
      ctx.restore();
    };
    const drawAtom = (x: number, y: number, R: number, a: number, t: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.lineWidth = 1;
      const rot = t * 0.0006;
      for (let k = 0; k < 3; k++) {
        const th = rot + (k * Math.PI) / 3;
        ctx.strokeStyle = `rgba(190, 205, 240, ${0.7 * a})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, R, R * 0.38, th, 0, 7);
        ctx.stroke();
        const ea = t * 0.0016 + k * 2.1;
        const ex = Math.cos(ea) * R;
        const ey = Math.sin(ea) * R * 0.38;
        const cs = Math.cos(th);
        const sn = Math.sin(th);
        ctx.beginPath();
        ctx.arc(ex * cs - ey * sn, ex * sn + ey * cs, 1.4, 0, 7);
        ctx.fillStyle = `rgba(210, 226, 255, ${a})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, 7);
      ctx.fillStyle = `rgba(220, 232, 255, ${a})`;
      ctx.fill();
      ctx.restore();
    };

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
        // Intensitas glow memudar saat mouse diam. POSISI highlight
        // memakai posisi mouse MENTAH (tanpa lerp/ekor) agar glyph
        // selalu tepat di titiknya — keluhan user 31 Okt: kemunculan
        // glyph jauh dari lokasi kursor (misslocation).
        const target = now - lastMove < 2600 && lastMove > 0 ? 1 : 0;
        glowAlpha += (target - glowAlpha) * 0.08;
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
          let infl = 0;
          if (animated && glowAlpha > 0.01) {
            const ddx = x - mouseX;
            const ddy = y - mouseY;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < GLOW_R) {
              infl = 1 - d / GLOW_R;
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
          // Titik di dalam radius kursor BERUBAH BENTUK menjadi glyph
          // (jenis per titik dari hash: spiral/sparkle/atom) — bukan
          // muncul dari ketiadaan: makin dekat ke pusat radius makin
          // besar glyph-nya; jumlah glyph = jumlah titik yang masuk
          // radius. Titik di luar ambang digambar sebagai titik biasa.
          if (animated && glowAlpha > 0.02 && infl > 0.3) {
            const k = (infl - 0.3) / 0.7;
            const R = 3 + k * 9.5;
            const ga = glowAlpha * (0.3 + 0.7 * k);
            const gt = hash2(ix, iy, 12);
            const tt = now + hash2(ix, iy, 13) * 4000;
            if (gt < 0.34) drawSpiral(x, y, R, ga, tt);
            else if (gt < 0.67) drawSparkle(x, y, R * 0.95, ga, tt);
            else drawAtom(x, y, R, ga, tt);
          } else {
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(196, 205, 224, ${Math.min(0.85, a).toFixed(3)})`;
            ctx.fill();
          }
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
            const ddx = x - mouseX;
            const ddy = y - mouseY;
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
