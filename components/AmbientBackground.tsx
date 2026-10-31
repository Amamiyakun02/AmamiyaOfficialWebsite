"use client";

import { useEffect, useRef } from "react";

/* =====================================================================
   LATAR AMBIEN SECTION BAWAH (permintaan user 31 Okt, dua tahap):
   1) Ladang titik lembut di BELAKANG semua section di bawah hero —
      tema ramah dan ringan; titik berdenyut, menyala mengikuti mouse,
      sesekali mekar (bloom). Konten section mengambang di depannya.
   2) Huruf-huruf acak (aset kita: A/M/I/Y + sisipan DEV/BUILD/CODE)
      tersebar kacau di latar; saat mouse menyorot, tujuh huruf
      terdekat yang cocok menyusun diri membentuk kata "AMAMIYA" di
      sekitar kursor, lalu bubar lagi saat kursor pergi. Di perangkat
      sentuh/tanpa mouse, formasi muncul sendiri sesekali (auto-form).
      Terinspirasi mekanik highlight di blog Muse Wonder — bukan
      meniru asetnya, memakai pola & aset situs ini sendiri.

   Ringan, mengikuti kaidah performa situs ini:
   - satu kanvas fixed sebesar viewport (bukan sebesar halaman)
   - semua partikel di koordinat dokumen — ikut bergulir bersama
     halaman — dan HANYA digambar di bawah hero (hero tidak berubah)
   - gambar ulang maks ±20fps; prefers-reduced-motion statis
   ===================================================================== */

const DOT_SPACING = 46;
const LETTER_SPACING = 92;
const GLOW_R = 170;
const WORD = "AMAMIYA";
const SLOT_DX = 17;
const INSERTS = ["DEV", "BUILD", "CODE"];

function hash2(ix: number, iy: number, salt: number) {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + salt * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

type Bloom = { x: number; y: number; start: number };
type LetterState = { x: number; y: number; a: number };

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
    // mouse dalam koordinat VIEWPORT (untuk glow titik) …
    let mouseX = -9999;
    let mouseY = -9999;
    let glowX = -9999;
    let glowY = -9999;
    let glowAlpha = 0;
    let lastMove = 0;
    let lastSpawn = 0;
    const blooms: Bloom[] = [];
    // … dan dalam koordinat DOKUMEN (untuk formasi huruf)
    let formCX = -9999;
    let formCY = -9999;
    let formActiveUntil = 0;
    let autoAnchor: { x: number; y: number; until: number } | null = null;
    let lastAuto = 0;
    const assigned = new Map<string, number>(); // key huruf -> indeks slot
    const letterState = new Map<string, LetterState>();

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

    type Letter = {
      key: string;
      ch: string;
      hx: number;
      hy: number;
      phase: number;
      insert: string | null;
    };

    const collectLetters = (docTop: number, docBottom: number): Letter[] => {
      const out: Letter[] = [];
      const iy0 = Math.floor(docTop / LETTER_SPACING);
      const iy1 = Math.ceil(docBottom / LETTER_SPACING);
      const ix1 = Math.ceil(viewW / LETTER_SPACING);
      for (let iy = iy0; iy <= iy1; iy++) {
        for (let ix = 0; ix <= ix1; ix++) {
          const hx = ix * LETTER_SPACING + LETTER_SPACING / 2 + (hash2(ix, iy, 5) - 0.5) * 52;
          const hy = iy * LETTER_SPACING + LETTER_SPACING / 2 + (hash2(ix, iy, 6) - 0.5) * 52;
          const isInsert = hash2(ix, iy, 9) > 0.93;
          out.push({
            key: `${ix}:${iy}`,
            ch: WORD[Math.floor(hash2(ix, iy, 7) * WORD.length)],
            hx,
            hy,
            phase: hash2(ix, iy, 8) * Math.PI * 2,
            insert: isInsert ? INSERTS[Math.floor(hash2(ix, iy, 10) * INSERTS.length)] : null,
          });
        }
      }
      return out;
    };

    const drawField = (now: number, animated: boolean) => {
      const scrollTop = scroller.scrollTop;
      const hb = heroBottom();
      ctx.clearRect(0, 0, viewW, viewH);
      if (scrollTop + viewH <= hb + 8) return;
      const docTop = Math.max(scrollTop, hb);
      const docBottom = scrollTop + viewH;

      /* ---------- lapisan titik ---------- */
      const iy0 = Math.floor(docTop / DOT_SPACING);
      const iy1 = Math.ceil(docBottom / DOT_SPACING);
      const ix1 = Math.ceil(viewW / DOT_SPACING);
      if (animated) {
        const target = now - lastMove < 2600 && lastMove > 0 ? 1 : 0;
        glowAlpha += (target - glowAlpha) * 0.08;
        if (glowX < -1000 && target === 1) {
          glowX = mouseX;
          glowY = mouseY;
        }
        glowX += (mouseX - glowX) * 0.16;
        glowY += (mouseY - glowY) * 0.16;
        if (now - lastSpawn > 2400 && blooms.length < 3) {
          lastSpawn = now;
          const bx = Math.floor(Math.random() * ix1);
          const by = iy0 + Math.floor(Math.random() * Math.max(1, iy1 - iy0));
          blooms.push({ x: bx * DOT_SPACING + DOT_SPACING / 2, y: by * DOT_SPACING + DOT_SPACING / 2, start: now });
        }
      }
      for (let iy = iy0; iy <= iy1; iy++) {
        for (let ix = 0; ix <= ix1; ix++) {
          const dx = ix * DOT_SPACING + DOT_SPACING / 2 + (hash2(ix, iy, 1) - 0.5) * 20;
          const dy = iy * DOT_SPACING + DOT_SPACING / 2 + (hash2(ix, iy, 2) - 0.5) * 20;
          if (dy < hb + 6) continue;
          const x = dx;
          const y = dy - scrollTop;
          const phase = hash2(ix, iy, 3) * Math.PI * 2;
          let r = 0.9 + hash2(ix, iy, 4) * 1.1;
          let a = animated
            ? 0.04 + 0.04 * (0.5 + 0.5 * Math.sin(now * 0.00045 + phase))
            : 0.07;
          if (animated && glowAlpha > 0.01) {
            const ddx = x - glowX;
            const ddy = y - glowY;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < GLOW_R) {
              const infl = 1 - d / GLOW_R;
              a += infl * infl * 0.42 * glowAlpha;
              r += infl * 1.4 * glowAlpha;
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
                a += k * 0.26;
                r += k * 1.8;
              }
            }
          }
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(196, 205, 224, ${Math.min(0.85, a).toFixed(3)})`;
          ctx.fill();
        }
      }
      for (let i = blooms.length - 1; i >= 0; i--) {
        if (now - blooms[i].start > 2300) blooms.splice(i, 1);
      }

      /* ---------- lapisan huruf ---------- */
      const letters = collectLetters(docTop - 60, docBottom + 60);

      // Tentukan pusat formasi: kursor (dokumen) atau jangkar auto-form.
      let centerX = -9999;
      let centerY = -9999;
      if (animated) {
        const mouseDocX = mouseX;
        const mouseDocY = mouseY + scrollTop;
        if (now - lastMove < 2400 && lastMove > 0) {
          if (formCX < -1000) {
            formCX = mouseDocX;
            formCY = mouseDocY;
          }
          formCX += (mouseDocX - formCX) * 0.14;
          formCY += (mouseDocY - formCY) * 0.14;
          formActiveUntil = now + 500;
          centerX = formCX;
          centerY = formCY;
        } else if (autoAnchor && now < autoAnchor.until) {
          centerX = autoAnchor.x;
          centerY = autoAnchor.y;
        } else if (now < formActiveUntil) {
          centerX = formCX;
          centerY = formCY;
        } else {
          assigned.clear();
          if (now - lastAuto > 5500 && now - lastMove > 4000) {
            lastAuto = now;
            autoAnchor = {
              x: viewW * (0.18 + Math.random() * 0.64),
              y: docTop + 90 + Math.random() * Math.max(60, docBottom - docTop - 180),
              until: now + 3000,
            };
          }
        }
        // Isi slot yang kosong dari huruf terdekat berkarakter cocok.
        if (centerX > -1000) {
          const usedSlots = new Set(assigned.values());
          for (let s = 0; s < WORD.length; s++) {
            if (usedSlots.has(s)) continue;
            const sx = centerX + (s - 3) * SLOT_DX;
            const sy = centerY - 30;
            let best: Letter | null = null;
            let bestD = 400;
            for (const L of letters) {
              if (L.insert || L.ch !== WORD[s] || assigned.has(L.key)) continue;
              const d = Math.hypot(L.hx - sx, L.hy - sy);
              if (d < bestD) {
                bestD = d;
                best = L;
              }
            }
            if (best) assigned.set(best.key, s);
          }
          // Lepas huruf yang slotnya sudah terlalu jauh (pusat berpindah).
          for (const [key, s] of Array.from(assigned.entries())) {
            const sx = centerX + (s - 3) * SLOT_DX;
            const sy = centerY - 30;
            const st = letterState.get(key);
            if (st && Math.hypot(st.x - sx, st.y - sy) > 460) assigned.delete(key);
          }
        }
      }

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const L of letters) {
        const driftX = animated ? Math.sin(now * 0.00021 + L.phase) * 6 : 0;
        const driftY = animated ? Math.cos(now * 0.00017 + L.phase * 1.3) * 6 : 0;
        let st = letterState.get(L.key);
        if (!st) {
          st = { x: L.hx, y: L.hy, a: 0 };
          letterState.set(L.key, st);
        }
        const slot = assigned.get(L.key);
        let tx = L.hx + driftX;
        let ty = L.hy + driftY;
        let ta = animated ? 0.09 + 0.05 * (0.5 + 0.5 * Math.sin(now * 0.0004 + L.phase)) : 0.11;
        if (slot !== undefined && centerX > -1000) {
          tx = centerX + (slot - 3) * SLOT_DX;
          ty = centerY - 30;
          ta = 0.92;
        }
        if (animated) {
          st.x += (tx - st.x) * 0.13;
          st.y += (ty - st.y) * 0.13;
          st.a += (ta - st.a) * 0.18;
        } else {
          st.x = tx;
          st.y = ty;
          st.a = ta;
        }
        if (st.y < hb + 8) continue;
        const x = st.x;
        const y = st.y - scrollTop;
        if (y < -30 || y > viewH + 30) continue;
        if (L.insert) {
          ctx.font = "600 10px monospace";
          ctx.fillStyle = `rgba(160, 175, 205, ${(st.a * 0.9).toFixed(3)})`;
          ctx.fillText(L.insert, x, y);
        } else if (slot !== undefined) {
          ctx.font = "700 13px monospace";
          ctx.shadowColor = "rgba(140, 180, 255, 0.8)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = `rgba(196, 218, 255, ${Math.min(0.95, st.a).toFixed(3)})`;
          ctx.fillText(L.ch, x, y);
          ctx.shadowBlur = 0;
        } else {
          ctx.font = "600 12px monospace";
          ctx.fillStyle = `rgba(190, 198, 218, ${Math.min(0.3, st.a).toFixed(3)})`;
          ctx.fillText(L.ch, x, y);
        }
      }
      // Pangkas state huruf yang jauh dari pandangan.
      if (animated && letterState.size > 900) {
        for (const [key, st] of Array.from(letterState.entries())) {
          if ((st.y < docTop - 500 || st.y > docBottom + 500) && !assigned.has(key)) {
            letterState.delete(key);
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
