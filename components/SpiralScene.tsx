"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   HALAMAN UJI SPIRAL (/spiral) — 30 Okt 2026.
   Grid kata yang sama dengan halaman utama, ditambah efek SPIRAL per
   sel dengan state machine:
     idle → glitch (±150 ms) → tumbuh (±600 ms) → hold (1,5–3 dtk)
          → menguncup (±700 ms, putaran berlawanan) → glitch → idle
   PRINSIP SWITCH (bukan overlay): selama sel dalam urutan spiral,
   katanya TIDAK digambar sama sekali — sel dibersihkan, spiral adalah
   PENGGANTI teks. Glitch acak & highlight mouse melewati sel spiral.
   RINGAN: loop rAF hanya berjalan selama ada spiral aktif, dan hanya
   menggambar ulang sel yang aktif (dirty-cell).
   ===================================================================== */

const WORD = "AMAMIYA";
const GLYPHS = "AMAMIYA01";
const CW = 170;
const CH = 38;
const FONT_SIZE = 20;
const FONT = `${FONT_SIZE}px monospace`;
const LETTER_SPACING = 9;
const TEXT_Y = (CH - FONT_SIZE) / 2 + FONT_SIZE * 0.8;
const INK = "206,206,214";
const BASE_ALPHA = 0.3;
const BASE_ALPHA_RANGE = 0.15;
const GLITCH_EVERY_MS = 120;
const GLITCH_CELLS = 24;

// --- parameter spiral (sesuai catatan rancangan di vault) ---
const SPIRAL_MAX_TURNS = Math.PI * 4.6; // ±2,3 putaran penuh
const SPIRAL_P_MIN = 0.2; // mulai/berhenti di p=0,2 — sel tidak terasa kosong sesaat
const GLITCH_IN_MS = 150;
const GROW_MS = 600;
const SHRINK_MS = 700;
const GLITCH_OUT_MS = 150;
const AUTO_EVERY_MS = 700; // pemicu otomatis berkala (selaras halaman utama)
const STAGGER_MS = 90; // jeda antar sel saat rombongan dipicu

type Cell = { x: number; y: number; a: number; shown: boolean };
type Phase = "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
type Spiral = {
  letter: number; // indeks huruf di dalam kata yang digantikan spiral
  phase: Phase;
  phaseStart: number;
  rot: number;
  holdMs: number;
  lastGlitchDraw: number;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function SpiralScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoOn, setAutoOn] = useState(true);
  const [maxActive, setMaxActive] = useState(7);
  const [holdSec, setHoldSec] = useState(1.2);
  const [style, setStyle] = useState<"lengan" | "spiral">("lengan"); // bawaan: 8 lengan bersih
  const autoRef = useRef(autoOn);
  const maxRef = useRef(maxActive);
  const holdRef = useRef(holdSec);
  const styleRef = useRef(style);
  autoRef.current = autoOn;
  maxRef.current = maxActive;
  holdRef.current = holdSec;
  styleRef.current = style;
  const apiRef = useRef<{ spawn: (idx?: number, letter?: number) => void; spawnBatch: () => void } | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cells: Cell[] = [];
    let cols = 0;
    const spirals = new Map<number, Spiral>();
    const hiLevels = new Map<number, number>();
    let mouse: { x: number; y: number } | null = null;

    function draw(c: Cell, alpha: number, text: string = WORD) {
      if (!ctx) return;
      ctx.clearRect(c.x, c.y, CW, CH);
      ctx.font = FONT;
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch { /* abaikan */ }
      ctx.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
      ctx.fillText(text, c.x + (CW - ctx.measureText(text).width) / 2, c.y + TEXT_Y);
      c.shown = true;
    }

    function glitchText() {
      return WORD.replace(/./g, (ch) =>
        Math.random() < 0.35 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : ch,
      );
    }
    function deleteText() {
      const arr = WORD.split("");
      arr[(Math.random() * arr.length) | 0] = " ";
      if (Math.random() < 0.4) arr[(Math.random() * arr.length) | 0] = " ";
      return arr.join("");
    }

    /* --- geometri slot huruf di dalam sel kata ---
       Spiral menggantikan SATU HURUF (sesuai spek), bukan seluruh kata.
       Lebar slot diturunkan dari lebar kata utuh terukur (geometri yang
       sama dengan halaman utama): adv = total/7, glyph = adv - spacing. */
    function slotMetrics() {
      if (!ctx) return { total: 0, adv: 0, charW: 0 };
      ctx.font = FONT;
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch { /* abaikan */ }
      const total = ctx.measureText(WORD).width;
      const adv = total / WORD.length;
      return { total, adv, charW: adv - LETTER_SPACING };
    }
    function slotGeom(c: Cell, i: number) {
      const { total, adv, charW } = slotMetrics();
      const gx = c.x + (CW - total) / 2 + adv * i;
      return { gx, charW, cx: gx + charW / 2, cy: c.y + CH / 2 + 1 };
    }
    function clearSlot(c: Cell, i: number) {
      if (!ctx) return;
      const { gx, charW } = slotGeom(c, i);
      ctx.clearRect(gx - 1, c.y, charW + 2, CH);
    }
    function drawLetterAt(c: Cell, i: number, ch: string, alpha: number) {
      if (!ctx) return;
      const { gx } = slotGeom(c, i);
      ctx.font = FONT;
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
      } catch { /* abaikan */ }
      ctx.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
      ctx.fillText(ch, gx, c.y + TEXT_Y);
    }
    function drawWordSkip(c: Cell, skip: number) {
      if (!ctx) return;
      ctx.clearRect(c.x, c.y, CW, CH);
      for (let i = 0; i < WORD.length; i++) {
        if (i !== skip) drawLetterAt(c, i, WORD[i], c.a);
      }
      c.shown = true;
    }

    function build() {
      if (!cvs || !ctx) return;
      cvs.width = window.innerWidth;
      cvs.height = window.innerHeight;
      cols = Math.ceil(cvs.width / CW);
      cells = [];
      for (let y = 0; y * CH < cvs.height; y++) {
        for (let x = 0; x * CW < cvs.width; x++) {
          cells.push({
            x: x * CW,
            y: y * CH,
            a: BASE_ALPHA + Math.random() * BASE_ALPHA_RANGE,
            shown: false,
          });
        }
      }
      spirals.clear();
      hiLevels.clear();
      for (const c of cells) draw(c, c.a);
    }

    /* ---------------- mesin spiral ---------------- */
    let rafId: number | null = null;
    let lastFrame = 0;

    function hasActiveNeighbor(idx: number) {
      const cx = idx % cols;
      for (const [other] of spirals) {
        if (other === idx) continue;
        const ox = other % cols;
        const oy = Math.floor(other / cols);
        const iy = Math.floor(idx / cols);
        if (Math.abs(ox - cx) <= 1 && Math.abs(oy - iy) <= 1) return true;
      }
      return false;
    }

    function spawn(idx?: number, letter?: number) {
      if (reduced || !cells.length) return;
      if (spirals.size >= maxRef.current) return;
      let target = idx;
      if (target === undefined) {
        for (let tries = 0; tries < 24; tries++) {
          const cand = (Math.random() * cells.length) | 0;
          if (!spirals.has(cand) && !hasActiveNeighbor(cand)) {
            target = cand;
            break;
          }
        }
        if (target === undefined) return;
      }
      if (spirals.has(target)) return;
      const li = letter ?? ((Math.random() * WORD.length) | 0);
      spirals.set(target, {
        letter: li,
        phase: "glitchIn",
        phaseStart: performance.now(),
        rot: Math.random() * Math.PI * 2,
        holdMs: holdRef.current * 1000,
        lastGlitchDraw: 0,
      });
      hiLevels.delete(target);
      drawWordSkip(cells[target], li); // kata digambar ulang TANPA huruf itu
      ensureLoop();
    }

    function spawnBatch() {
      const n = maxRef.current - spirals.size;
      for (let i = 0; i < n; i++) {
        window.setTimeout(() => spawn(), i * STAGGER_MS);
      }
    }
    apiRef.current = { spawn, spawnBatch };

    function drawGlyph(c: Cell, s: Spiral, p: number, rot: number, alpha: number) {
      if (!ctx) return;
      clearSlot(c, s.letter); // HANYA slot huruf itu yang dibersihkan
      const { cx, cy } = slotGeom(c, s.letter);
      ctx.fillStyle = `rgba(238,238,244,${alpha.toFixed(3)})`;
      ctx.strokeStyle = `rgba(238,238,244,${alpha.toFixed(3)})`;
      ctx.shadowColor = "rgba(238,238,244,0.8)";

      if (styleRef.current === "lengan") {
        // 8 LENGAN GALAKSI di slot huruf. Slot huruf itu TEGAK (tinggi >
        // lebar), jadi elips galaksinya VERTIKAL: lebar ±R menyesuaikan
        // lebar slot, tinggi ±R×1,55. Elips dipasang sekali sebelum
        // putaran lengan, seperti sebelumnya.
        const R = 9.2;
        const R0 = 1.1; // jari-jari awal lengan
        const ARM_TURNS = Math.PI * 2 * 0.38; // sapuan ±137°
        const upto = ARM_TURNS * p;
        ctx.lineWidth = 1.35;
        ctx.lineCap = "round";
        ctx.shadowBlur = 1.2; // hanya sel aktif — murah
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(0.8, 1.55); // dipersempit: massa figur di atas-bawah
        ctx.rotate(rot);
        // Lengan digambar per potongan kecil dengan alpha yang MEMUDAR
        // saat potongan mengarah ke kiri/kanan layar (perbaikan user:
        // sisi kiri-kanan terlalu tebal) — terang penuh hanya untuk
        // bagian yang mengarah ke atas/bawah.
        const steps = 48;
        const CHUNK = 4;
        for (let a = 0; a < 8; a++) {
          ctx.save();
          ctx.rotate((a * Math.PI) / 4);
          for (let s0 = 0; s0 < steps; s0 += CHUNK) {
            const thMid = (upto * (s0 + CHUNK / 2)) / steps;
            const screenAng = thMid + rot + (a * Math.PI) / 4;
            const fade =
              1 - 0.85 * Math.pow(Math.abs(Math.cos(screenAng)), 1.3);
            ctx.strokeStyle = `rgba(238,238,244,${(alpha * Math.max(0.08, fade)).toFixed(3)})`;
            ctx.beginPath();
            for (let i = s0; i <= Math.min(steps, s0 + CHUNK); i++) {
              const th = (upto * i) / steps;
              const r = R0 * Math.pow(R / R0, th / ARM_TURNS);
              const px = r * Math.cos(th);
              const py = r * Math.sin(th);
              if (i === s0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
        // inti galaksi terang di tengah slot
        ctx.beginPath();
        ctx.arc(cx, cy, 1.3 * Math.max(0.35, p), 0, Math.PI * 2);
        ctx.fill();
        return;
      }

      // Mode spiral asli: satu lengan Archimedean ±2,3 putaran,
      // diperkecil ke slot huruf.
      const steps = 80;
      const upto = SPIRAL_MAX_TURNS * p;
      ctx.lineWidth = 1.3;
      ctx.shadowBlur = 3;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const th = (upto * i) / steps;
        const r = 8.6 * Math.pow(th / SPIRAL_MAX_TURNS, 0.92);
        const px = r * Math.cos(th);
        const py = r * Math.sin(th);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.restore();
    }

    function stepSpiral(idx: number, s: Spiral, now: number, dt: number) {
      const c = cells[idx];
      if (!c) return;
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        const dur = s.phase === "glitchIn" ? GLITCH_IN_MS : GLITCH_OUT_MS;
        if (now - s.lastGlitchDraw > 50) {
          // glitch hanya pada huruf itu: satu karakter acak di slotnya
          clearSlot(c, s.letter);
          drawLetterAt(
            c,
            s.letter,
            GLYPHS[(Math.random() * GLYPHS.length) | 0],
            Math.min(0.85, c.a + 0.35),
          );
          s.lastGlitchDraw = now;
        }
        if (elapsed >= dur) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            spirals.delete(idx);
            draw(c, c.a); // switch kembali ke huruf asli
          }
        }
        return;
      }
      if (s.phase === "grow") {
        const t = Math.min(1, elapsed / GROW_MS);
        const p = SPIRAL_P_MIN + (1 - SPIRAL_P_MIN) * easeOutCubic(t);
        s.rot += dt * (3.4 * (1 - t) + 0.5); // cepat lalu melambat
        drawGlyph(c, s, p, s.rot, 0.92);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        s.rot += dt * 0.5; // berputar pelan
        const pulse = 0.86 + 0.1 * Math.sin(now / 280);
        drawGlyph(c, s, 1, s.rot, pulse);
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "shrink") {
        const t = Math.min(1, elapsed / SHRINK_MS);
        const p = 1 - (1 - SPIRAL_P_MIN) * easeInOutCubic(t);
        s.rot -= dt * 2.3; // berlawanan arah — terasa terurai
        drawGlyph(c, s, p, s.rot, 0.92);
        if (t >= 1) {
          s.phase = "glitchOut";
          s.phaseStart = now;
          s.lastGlitchDraw = 0;
        }
      }
    }

    function ensureLoop() {
      if (rafId !== null) return;
      lastFrame = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - lastFrame) / 1000);
        lastFrame = now;
        for (const [idx, s] of Array.from(spirals)) stepSpiral(idx, s, now, dt);
        if (spirals.size > 0) {
          rafId = requestAnimationFrame(loop);
        } else {
          rafId = null;
        }
      };
      rafId = requestAnimationFrame(loop);
    }

    /* ---------------- glitch acak (melewati sel spiral) ---------------- */
    const glitchTimer = reduced
      ? null
      : setInterval(() => {
          if (document.hidden || !cells.length) return;
          for (let i = 0; i < GLITCH_CELLS; i++) {
            const idx = (Math.random() * cells.length) | 0;
            const c = cells[idx];
            if (spirals.has(idx) || hiLevels.has(idx)) continue;
            const roll = Math.random();
            if (roll < 0.4) draw(c, c.a);
            else if (roll < 0.65) draw(c, c.a, glitchText());
            else if (roll < 0.75) draw(c, c.a, deleteText());
            else if (roll < 0.9) {
              // substitusi matriks sederhana (konsisten dgn halaman utama)
              draw(c, c.a, WORD.replace(/./g, (ch) =>
                Math.random() < 0.3 ? ":" : ch,
              ));
            } else draw(c, c.a, glitchText());
          }
        }, GLITCH_EVERY_MS);

    /* ---------------- highlight mouse (melewati sel spiral) ---------------- */
    let fadeTimer: ReturnType<typeof setInterval> | null = null;
    function hiTarget(idx: number) {
      if (!mouse) return 0;
      const c = cells[idx];
      const cx = c.x + CW / 2;
      const cy = c.y + CH / 2;
      const d = Math.hypot(mouse.x - cx, mouse.y - cy);
      const t = Math.max(0, 1 - d / 170);
      return Math.pow(t, 1.5);
    }
    function stepFade() {
      const cand = new Set<number>(hiLevels.keys());
      if (mouse) {
        const c0 = Math.max(0, Math.floor((mouse.x - 170) / CW));
        const c1 = Math.min(cols - 1, Math.floor((mouse.x + 170) / CW));
        const r0 = Math.max(0, Math.floor((mouse.y - 170) / CH));
        const r1 = Math.floor((mouse.y + 170) / CH);
        for (let r = r0; r <= r1; r++)
          for (let cc = c0; cc <= c1; cc++) cand.add(r * cols + cc);
      }
      let moving = false;
      for (const idx of cand) {
        const c = cells[idx];
        if (!c) continue;
        if (spirals.has(idx)) {
          hiLevels.delete(idx);
          continue;
        }
        const target = hiTarget(idx);
        const cur = hiLevels.get(idx) ?? 0;
        const next = cur + (target - cur) * 0.35;
        if (Math.abs(next - cur) > 0.02 || (next <= 0.01 && target === 0 && cur > 0)) {
          moving = true;
          if (next <= 0.01 && target === 0) {
            hiLevels.delete(idx);
            draw(c, c.a);
          } else {
            hiLevels.set(idx, next);
            draw(c, c.a + next * (0.95 - c.a));
          }
        }
      }
      if (!moving && fadeTimer) {
        clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }
    function onPointerMove(e: PointerEvent) {
      mouse = { x: e.clientX, y: e.clientY };
      if (!fadeTimer && !reduced) fadeTimer = setInterval(stepFade, 50);
    }
    function onPointerDown(e: PointerEvent) {
      const col = Math.floor(e.clientX / CW);
      const row = Math.floor(e.clientY / CH);
      if (col < 0 || col >= cols) return;
      const idx = row * cols + col;
      const c = cells[idx];
      if (!c) return;
      // huruf yang diklik = slot di bawah posisi x klik
      const { total, adv } = slotMetrics();
      const startX = c.x + (CW - total) / 2;
      let letter = Math.floor((e.clientX - startX) / adv);
      letter = Math.max(0, Math.min(WORD.length - 1, letter));
      spawn(idx, letter);
    }

    build();
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown);
    const autoTimer = setInterval(() => {
      if (!document.hidden && autoRef.current) spawn();
    }, AUTO_EVERY_MS);
    // picu satu spiral pembuka supaya efek langsung terlihat
    const kickoff = window.setTimeout(() => spawn(), 900);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      if (glitchTimer) clearInterval(glitchTimer);
      if (fadeTimer) clearInterval(fadeTimer);
      clearInterval(autoTimer);
      clearTimeout(kickoff);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />
      <div className="page spiral-page">
        <header className="spiral-head">
          <a href="/">← Amamiya</a>
          <span>Uji Spiral — klik huruf mana pun: spiral menggantikan huruf itu</span>
        </header>
        <div className="panel">
          <button type="button" onClick={() => apiRef.current?.spawn()}>
            Picu spiral
          </button>
          <button type="button" onClick={() => apiRef.current?.spawnBatch()}>
            Picu rombongan
          </button>
          <button type="button" onClick={() => setAutoOn((v) => !v)}>
            Otomatis: {autoOn ? "ON" : "OFF"}
          </button>
          <button
            type="button"
            onClick={() => setStyle("lengan")}
            style={
              style === "lengan"
                ? { background: "#0081fb", borderColor: "#0081fb" }
                : undefined
            }
          >
            8 lengan
          </button>
          <button
            type="button"
            onClick={() => setStyle("spiral")}
            style={
              style === "spiral"
                ? { background: "#0081fb", borderColor: "#0081fb" }
                : undefined
            }
          >
            Spiral asli
          </button>
          <label>
            Maks aktif: {maxActive}
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={maxActive}
              onChange={(e) => setMaxActive(Number(e.target.value))}
            />
          </label>
          <label>
            Hold: {holdSec} dtk
            <input
              type="range"
              min={1}
              max={3}
              step={0.5}
              value={holdSec}
              onChange={(e) => setHoldSec(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
    </>
  );
}
