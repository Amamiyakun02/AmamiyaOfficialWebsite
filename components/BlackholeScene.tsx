"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   HALAMAN UJI BLACK HOLE (/blackhole) — 31 Okt 2026.
   Bancuh uji untuk calon elemen keempat tema alam semesta situs ini:
   BLACK HOLE menggantikan SATU HURUF dengan siklus yang sama seperti
   spiral/sparkle/atom:
     idle → glitch (±150 ms) → tumbuh (±550 ms) → hold (debu disk
          mengorbit) → menguncup (±400 ms) → glitch → idle
   TAMPAK DEPAN (referensi user): bola hitam di pusat huruf dikelilingi
   cincin cahaya melingkar (distorsi cahaya disk), dan disk akresi
   tampak dari tepinya sebagai pita terang yang memotong tepat di
   tengah bola. Gerakan hanya rotasi pada porosnya. Panel bawah untuk
   menyetel: ukuran, lebar disk, glow, lama hold, maks aktif.
   Klik huruf mana pun untuk memicu black hole tepat di huruf itu.
   ===================================================================== */

const WORD = "AMAMIYA";
const GLYPHS = "AMAMIYA";
const CW = 170;
const CH = 38;
const FONT_SIZE = 20;
const FONT = `${FONT_SIZE}px monospace`;
const LETTER_SPACING = 9;
const TEXT_Y = (CH - FONT_SIZE) / 2 + FONT_SIZE * 0.8;
const INK = "233,233,242";
const BASE_ALPHA = 0.44;
const BASE_ALPHA_RANGE = 0.16;
const GLITCH_EVERY_MS = 240;
const GLITCH_CELLS = 10;
const GLITCH_MS = 150;
const GROW_MS = 550;
const SHRINK_MS = 400;
const P_MIN = 0.25;
const AUTO_EVERY_MS = 700;
/* black hole tampak depan: tidak ada kemiringan — gerak hanya
   rotasi pada poros (revisi user) */

type Cell = { x: number; y: number; a: number; shown: boolean };
type Phase = "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
type Blackhole = {
  letter: number;
  phase: Phase;
  phaseStart: number;
  holdMs: number;
  lastGlitchDraw: number;
  seed: number;
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export default function BlackholeScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoOn, setAutoOn] = useState(true);
  const [sizeMul, setSizeMul] = useState(1);
  const [disk, setDisk] = useState(1.15);
  const [glow, setGlow] = useState(2.5);
  const [holdSec, setHoldSec] = useState(1.2);
  const [maxActive, setMaxActive] = useState(5);
  const autoRef = useRef(autoOn);
  const sizeRef = useRef(sizeMul);
  const diskRef = useRef(disk);
  const glowRef = useRef(glow);
  const holdRef = useRef(holdSec);
  const maxRef = useRef(maxActive);
  autoRef.current = autoOn;
  sizeRef.current = sizeMul;
  diskRef.current = disk;
  glowRef.current = glow;
  holdRef.current = holdSec;
  maxRef.current = maxActive;
  const apiRef = useRef<{
    spawn: (idx?: number, letter?: number) => void;
    spawnBatch: () => void;
  } | null>(null);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cells: Cell[] = [];
    let cols = 0;
    const blackholes = new Map<number, Blackhole>();
    const glitchUntil = new Map<number, number>();
    let rafId: number | null = null;

    function setText() {
      ctx!.font = FONT;
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch { /* abaikan */ }
      ctx!.textAlign = "left";
      ctx!.textBaseline = "alphabetic";
      ctx!.shadowBlur = 0;
      ctx!.shadowColor = "rgba(0,0,0,0)";
    }
    function draw(c: Cell, alpha: number, text: string = WORD) {
      ctx!.clearRect(c.x, c.y, CW, CH);
      setText();
      ctx!.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
      ctx!.fillText(
        text,
        c.x + (CW - ctx!.measureText(text).width) / 2,
        c.y + TEXT_Y,
      );
      c.shown = true;
    }
    function maskedWord(k: number, ch?: string): string {
      const arr = WORD.split("");
      arr[k] = ch ?? " ";
      return arr.join("");
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

    /* --- geometri huruf (dari advance murni, letterSpacing 0) --- */
    let a0Cache: number | null = null;
    function charAdvance0() {
      if (a0Cache === null) {
        ctx!.font = FONT;
        try {
          (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            "0px";
        } catch { /* abaikan */ }
        a0Cache = ctx!.measureText(WORD).width / WORD.length;
        try {
          (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            `${LETTER_SPACING}px`;
        } catch { /* abaikan */ }
      }
      return a0Cache;
    }
    function letterCenterX(c: Cell, i: number) {
      const a0 = charAdvance0();
      const step = a0 + LETTER_SPACING;
      return c.x + CW / 2 - (step * WORD.length) / 2 + step * i + a0 / 2;
    }
    let capHCache: number | null = null;
    function capHeight() {
      if (capHCache === null) {
        ctx!.font = FONT;
        const m = ctx!.measureText("A");
        const h =
          (m.actualBoundingBoxAscent ?? 14) +
          (m.actualBoundingBoxDescent ?? 0);
        capHCache = h > 4 ? h : 14;
      }
      return capHCache;
    }

    /* --- bentuk black hole TAMPAK DEPAN (revisi user dari referensi
       Gargantua): distorsi cahaya membentuk cincin bercahaya melingkar
       mengelilingi bola hitam, dan disk akresi terlihat dari tepinya
       sebagai pita terang tipis yang MEMOTONG TEPAT DI TENGAH bola.
       Gerakan hanya ROTASI PADA POROS: debu mengorbit melingkar pada
       cincin cahaya dan mengalir menyamping di sepanjang pita —
       tanpa kemiringan/goyangan. */
    function drawBlackhole(
      c: Cell,
      s: Blackhole,
      scale: number,
      alpha: number,
      now: number,
    ) {
      const g = ctx!;
      const cx = letterCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      const capH = capHeight();
      const R = Math.max(1.5, capH * 0.55 * sizeRef.current * scale);
      const ringR = R * 1.38;
      const bandRx = R * 2.7 * diskRef.current;
      const bandRy = Math.max(1, R * 0.16);
      const hN = (n: number) => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      const bandGrad = (mul: number) => {
        const gr = g.createLinearGradient(cx - bandRx, cy, cx + bandRx, cy);
        gr.addColorStop(0, "rgba(190, 214, 252, 0)");
        gr.addColorStop(0.16, `rgba(190, 214, 252, ${0.28 * mul * alpha})`);
        gr.addColorStop(0.5, `rgba(228, 240, 255, ${0.8 * mul * alpha})`);
        gr.addColorStop(0.84, `rgba(190, 214, 252, ${0.28 * mul * alpha})`);
        gr.addColorStop(1, "rgba(190, 214, 252, 0)");
        return gr;
      };
      g.save();
      /* halo redup di belakang keseluruhan */
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, bandRx * 1.02);
      halo.addColorStop(0, `rgba(170, 200, 255, ${0.13 * alpha})`);
      halo.addColorStop(1, "rgba(170, 200, 255, 0)");
      g.fillStyle = halo;
      g.beginPath();
      g.arc(cx, cy, bandRx * 1.02, 0, 7);
      g.fill();
      /* pita disk bagian belakang (di belakang bola & cincin) */
      g.beginPath();
      g.ellipse(cx, cy, bandRx, bandRy, 0, 0, 7);
      g.fillStyle = bandGrad(0.55);
      g.fill();
      /* cincin cahaya melingkar (cahaya disk yang terdistorsi
         mengelilingi bola): tiga lapisan konsentris + penekanan
         busur atas & bawah seperti referensi */
      for (const p of [
        { m: 0.94, w: R * 0.1, a: 0.3 },
        { m: 1, w: R * 0.17, a: 0.5 },
        { m: 1.07, w: R * 0.08, a: 0.22 },
      ]) {
        g.beginPath();
        g.arc(cx, cy, ringR * p.m, 0, 7);
        g.strokeStyle = `rgba(205, 226, 252, ${p.a * alpha})`;
        g.lineWidth = Math.max(0.7, p.w);
        g.stroke();
      }
      for (const seg of [
        { a0: -Math.PI * 0.72, a1: -Math.PI * 0.28 },
        { a0: Math.PI * 0.28, a1: Math.PI * 0.72 },
      ]) {
        g.beginPath();
        g.arc(cx, cy, ringR, seg.a0, seg.a1);
        g.strokeStyle = `rgba(232, 243, 255, ${0.8 * alpha})`;
        g.lineWidth = Math.max(0.8, R * 0.2);
        g.stroke();
      }
      /* debu mengorbit pada cincin — rotasi murni pada poros */
      for (let i = 0; i < 14; i++) {
        const rf = 0.92 + hN(s.seed * 17 + i * 3 + 1) * 0.16;
        const th = hN(s.seed * 29 + i * 7 + 2) * Math.PI * 2 - now * 0.0012;
        const dx = cx + Math.cos(th) * ringR * rf;
        const dy = cy + Math.sin(th) * ringR * rf;
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.005 + hN(s.seed + i * 11) * 22));
        g.beginPath();
        g.arc(dx, dy, Math.max(0.4, R * 0.07 + 0.35), 0, 7);
        g.fillStyle = `rgba(220, 235, 255, ${(alpha * tw * 0.9).toFixed(3)})`;
        g.fill();
      }
      /* bola hitam (horizon) + tepi foton tipis */
      g.beginPath();
      g.arc(cx, cy, R, 0, 7);
      g.fillStyle = `rgba(1, 1, 3, ${alpha})`;
      g.fill();
      g.shadowColor = "rgba(170, 205, 255, 0.95)";
      g.shadowBlur = glowRef.current * 2.5;
      g.beginPath();
      g.arc(cx, cy, R * 1.02, 0, 7);
      g.strokeStyle = `rgba(238, 246, 255, ${0.9 * alpha})`;
      g.lineWidth = Math.max(0.8, R * 0.12);
      g.stroke();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      /* pita disk bagian depan: memotong tepat di tengah bola */
      g.beginPath();
      g.ellipse(cx, cy, bandRx, bandRy, 0, 0, 7);
      g.fillStyle = bandGrad(1);
      g.fill();
      g.beginPath();
      g.ellipse(cx, cy, bandRx * 0.92, bandRy * 0.45, 0, 0, 7);
      g.fillStyle = bandGrad(1.15);
      g.fill();
      /* materi mengalir menyamping di sepanjang pita (rotasi disk) */
      for (let i = 0; i < 5; i++) {
        const sp = 0.000045 * (1 + hN(s.seed * 41 + i) * 0.7);
        const fx = ((hN(s.seed * 53 + i * 7) + now * sp) % 1) * 2 - 1;
        const dx = cx + fx * bandRx * 0.94;
        const dy = cy + (hN(s.seed * 61 + i * 3) - 0.5) * bandRy * 0.8;
        const env = 1 - Math.abs(fx);
        g.beginPath();
        g.arc(dx, dy, Math.max(0.4, R * 0.08), 0, 7);
        g.fillStyle = `rgba(230, 242, 255, ${(alpha * env * 0.85).toFixed(3)})`;
        g.fill();
      }
      g.restore();
    }

    function stepBlackhole(idx: number, s: Blackhole, now: number) {
      const c = cells[idx];
      if (!c) {
        blackholes.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          draw(
            c,
            c.a,
            maskedWord(s.letter, GLYPHS[(Math.random() * GLYPHS.length) | 0]),
          );
          s.lastGlitchDraw = now;
        }
        if (elapsed >= GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            blackholes.delete(idx);
            draw(c, c.a);
          }
        }
        return;
      }
      if (s.phase === "grow") {
        const t = Math.min(1, elapsed / GROW_MS);
        const scale = P_MIN + (1 - P_MIN) * easeOutCubic(t);
        draw(c, c.a, maskedWord(s.letter));
        drawBlackhole(c, s, scale, 1, now);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        const pulse = 1 + 0.03 * Math.sin(now / 260);
        draw(c, c.a, maskedWord(s.letter));
        drawBlackhole(c, s, pulse, 0.94 + 0.06 * Math.sin(now / 330), now);
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      // shrink
      const t = Math.min(1, elapsed / SHRINK_MS);
      const scale = 1 - (1 - P_MIN) * easeInOutCubic(t);
      draw(c, c.a, maskedWord(s.letter));
      drawBlackhole(c, s, scale, 1, now);
      if (t >= 1) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    function ensureLoop() {
      if (rafId !== null) return;
      const loop = (now: number) => {
        for (const [idx, s] of Array.from(blackholes)) stepBlackhole(idx, s, now);
        rafId = blackholes.size > 0 ? requestAnimationFrame(loop) : null;
      };
      rafId = requestAnimationFrame(loop);
    }

    function spawn(idx?: number, letter?: number) {
      if (reduced || blackholes.size >= maxRef.current) return;
      if (!cells.length) return;
      for (let tries = 0; tries < 24; tries++) {
        const i = idx ?? (Math.random() * cells.length) | 0;
        const c = cells[i];
        if (!c || blackholes.has(i) || glitchUntil.has(i)) {
          if (idx !== undefined) return;
          continue;
        }
        let near = false;
        for (const other of blackholes.keys()) {
          if (
            Math.abs((other % cols) - (i % cols)) <= 1 &&
            Math.abs(Math.floor(other / cols) - Math.floor(i / cols)) <= 1
          ) {
            near = true;
            break;
          }
        }
        if (near && idx === undefined) continue;
        blackholes.set(i, {
          letter: letter ?? (Math.random() * WORD.length) | 0,
          phase: "glitchIn",
          phaseStart: performance.now(),
          holdMs: holdRef.current * 1000 * (0.8 + Math.random() * 0.4),
          lastGlitchDraw: 0,
          seed: Math.random() * 1000,
        });
        draw(c, c.a, maskedWord(blackholes.get(i)!.letter));
        ensureLoop();
        return;
      }
    }
    function spawnBatch() {
      for (let k = 0; k < 5; k++) spawn();
    }
    apiRef.current = { spawn, spawnBatch };

    /* --- glitch ambient ringan (bertenggat, seperti halaman utama) --- */
    const glitchTimer = setInterval(() => {
      if (document.hidden || !cells.length) return;
      const now = performance.now();
      for (const [i, until] of Array.from(glitchUntil)) {
        if (now < until) continue;
        glitchUntil.delete(i);
        const c = cells[i];
        if (c && !blackholes.has(i)) draw(c, c.a);
      }
      for (let k = 0; k < GLITCH_CELLS; k++) {
        const i = (Math.random() * cells.length) | 0;
        const c = cells[i];
        if (!c || blackholes.has(i) || glitchUntil.has(i)) continue;
        const roll = Math.random();
        if (roll < 0.45) draw(c, c.a);
        else if (roll < 0.72) {
          glitchUntil.set(i, now + 400 + Math.random() * 500);
          draw(c, c.a, glitchText());
        } else if (roll < 0.84) {
          glitchUntil.set(i, now + 400 + Math.random() * 500);
          draw(c, c.a, deleteText());
        }
      }
    }, GLITCH_EVERY_MS);

    function build() {
      cvs!.width = window.innerWidth;
      cvs!.height = window.innerHeight;
      cols = Math.ceil(cvs!.width / CW);
      const list: Cell[] = [];
      for (let y = 0; y * CH < cvs!.height; y++) {
        for (let x = 0; x * CW < cvs!.width; x++) {
          list.push({
            x: x * CW,
            y: y * CH,
            a: BASE_ALPHA + Math.random() * BASE_ALPHA_RANGE,
            shown: false,
          });
        }
      }
      cells = list;
      blackholes.clear();
      glitchUntil.clear();
      for (const c of cells) draw(c, c.a);
    }

    function onPointerDown(e: PointerEvent) {
      const col = Math.floor(e.clientX / CW);
      const row = Math.floor(e.clientY / CH);
      if (col < 0 || col >= cols) return;
      const idx = row * cols + col;
      const c = cells[idx];
      if (!c) return;
      const a0 = charAdvance0();
      const step = a0 + LETTER_SPACING;
      const wordLeft = c.x + CW / 2 - (step * WORD.length) / 2;
      let letter = Math.floor((e.clientX - wordLeft) / step);
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
    window.addEventListener("pointerdown", onPointerDown);
    const autoTimer = setInterval(() => {
      if (!document.hidden && autoRef.current) spawn();
    }, AUTO_EVERY_MS);
    const kickoff = window.setTimeout(() => spawn(), 900);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointerdown", onPointerDown);
      clearInterval(glitchTimer);
      clearInterval(autoTimer);
      clearTimeout(kickoff);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />
      <div className="page spiral-page">
        <header className="spiral-head">
          <a href="/">← Amamiya</a>
          <span>
            Uji Black Hole — klik huruf mana pun: black hole
            menggantikan huruf itu
          </span>
        </header>
        <div className="panel">
          <button type="button" onClick={() => apiRef.current?.spawn()}>
            Picu black hole
          </button>
          <button type="button" onClick={() => apiRef.current?.spawnBatch()}>
            Picu rombongan
          </button>
          <button type="button" onClick={() => setAutoOn((v) => !v)}>
            Otomatis: {autoOn ? "ON" : "OFF"}
          </button>
          <label>
            Ukuran: {sizeMul.toFixed(1)}×
            <input
              type="range"
              min={0.6}
              max={1.8}
              step={0.1}
              value={sizeMul}
              onChange={(e) => setSizeMul(Number(e.target.value))}
            />
          </label>
          <label>
            Disk: {disk.toFixed(2)}×
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={disk}
              onChange={(e) => setDisk(Number(e.target.value))}
            />
          </label>
          <label>
            Glow: {glow.toFixed(1)}
            <input
              type="range"
              min={0}
              max={6}
              step={0.5}
              value={glow}
              onChange={(e) => setGlow(Number(e.target.value))}
            />
          </label>
          <label>
            Hold: {holdSec} dtk
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.25}
              value={holdSec}
              onChange={(e) => setHoldSec(Number(e.target.value))}
            />
          </label>
          <label>
            Maks aktif: {maxActive}
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={maxActive}
              onChange={(e) => setMaxActive(Number(e.target.value))}
            />
          </label>
        </div>
      </div>
    </>
  );
}
