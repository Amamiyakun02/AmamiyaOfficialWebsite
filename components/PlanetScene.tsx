"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   HALAMAN UJI PLANET (/planet) — 31 Okt 2026.
   Bancuh uji untuk calon elemen keempat tema alam semesta situs ini
   (spiral=galaksi, sparkle=cahaya, atom=kuantum — planet adalah
   tingkat "dunia" di antara cahaya/bintang dan galaksi):
   PLANET BERCINCIN menggantikan SATU HURUF dengan siklus yang sama
   seperti spiral/sparkle/atom:
     idle → glitch (±150 ms) → tumbuh (±550 ms) → hold (cincin
          bergoyang sangat pelan) → menguncup (±400 ms) → glitch → idle
   Bola planet di pusat huruf; cincin elips miring digambar dua tahap
   (belakang lalu depan bola) agar terasa 3D. Panel bawah untuk
   menyetel: ukuran, lebar cincin, glow, lama hold, maks aktif.
   Klik huruf mana pun untuk memicu planet tepat di huruf itu.
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
/* kemiringan dasar cincin planet (radian) */
const RING_TILT = -0.32;

type Cell = { x: number; y: number; a: number; shown: boolean };
type Phase = "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
type Planet = {
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
export default function PlanetScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoOn, setAutoOn] = useState(true);
  const [sizeMul, setSizeMul] = useState(1);
  const [ring, setRing] = useState(1.15);
  const [glow, setGlow] = useState(2.5);
  const [holdSec, setHoldSec] = useState(1.2);
  const [maxActive, setMaxActive] = useState(5);
  const autoRef = useRef(autoOn);
  const sizeRef = useRef(sizeMul);
  const ringRef = useRef(ring);
  const glowRef = useRef(glow);
  const holdRef = useRef(holdSec);
  const maxRef = useRef(maxActive);
  autoRef.current = autoOn;
  sizeRef.current = sizeMul;
  ringRef.current = ring;
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
    const planets = new Map<number, Planet>();
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

    /* --- bentuk planet bercincin: bola bergradasi + cincin elips ---
       Cincin digambar dua tahap agar terasa 3D: separuh belakang bola
       sebelum badan planet, separuh depannya sesudahnya. Kemiringan
       cincin bergoyang sangat pelan selama hold. */
    function drawPlanet(
      c: Cell,
      s: Planet,
      scale: number,
      alpha: number,
      now: number,
    ) {
      const g = ctx!;
      const cx = letterCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      const capH = capHeight();
      const R = Math.max(1.5, capH * 0.62 * sizeRef.current * scale);
      const ringRx = R * 1.55 * ringRef.current;
      const ringRy = ringRx * 0.34;
      const tilt = RING_TILT + 0.035 * Math.sin(now / 520 + s.seed);
      g.save();
      /* cincin belakang (separuh atas elips, di belakang bola) */
      for (const pass of [
        { w: R * 0.34, a: 0.5, m: 1 },
        { w: R * 0.16, a: 0.3, m: 1.14 },
      ]) {
        g.beginPath();
        g.ellipse(cx, cy, ringRx * pass.m, ringRy * pass.m, tilt, Math.PI, 2 * Math.PI);
        g.strokeStyle = `rgba(190, 208, 245, ${pass.a * alpha})`;
        g.lineWidth = Math.max(0.7, pass.w);
        g.stroke();
      }
      /* badan planet: bola bergradasi cahaya dari kiri-atas */
      g.shadowColor = "rgba(150, 190, 255, 0.85)";
      g.shadowBlur = glowRef.current * 2;
      const body = g.createRadialGradient(
        cx - R * 0.38, cy - R * 0.38, R * 0.15,
        cx, cy, R * 1.05,
      );
      body.addColorStop(0, `rgba(228, 238, 255, ${alpha})`);
      body.addColorStop(0.5, `rgba(158, 180, 222, ${alpha})`);
      body.addColorStop(1, `rgba(86, 102, 148, ${alpha})`);
      g.beginPath();
      g.arc(cx, cy, R, 0, 7);
      g.fillStyle = body;
      g.fill();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      /* pita gas raksasa: dua lengkung gelap melintang di bola */
      g.save();
      g.beginPath();
      g.arc(cx, cy, R, 0, 7);
      g.clip();
      for (const band of [
        { dy: -R * 0.34, h: R * 0.3, a: 0.16 },
        { dy: R * 0.28, h: R * 0.36, a: 0.2 },
      ]) {
        g.beginPath();
        g.ellipse(cx, cy + band.dy, R * 1.05, band.h, 0, 0, 7);
        g.fillStyle = `rgba(52, 66, 105, ${band.a * alpha})`;
        g.fill();
      }
      /* bayang terminator kanan-bawah */
      const term = g.createRadialGradient(
        cx + R * 0.55, cy + R * 0.6, R * 0.1,
        cx + R * 0.3, cy + R * 0.3, R * 1.25,
      );
      term.addColorStop(0, `rgba(10, 14, 30, ${0.34 * alpha})`);
      term.addColorStop(1, "rgba(10, 14, 30, 0)");
      g.fillStyle = term;
      g.fillRect(cx - R, cy - R, R * 2, R * 2);
      g.restore();
      /* cincin depan (separuh bawah elips, menimpa bola) */
      for (const pass of [
        { w: R * 0.34, a: 0.85, m: 1 },
        { w: R * 0.16, a: 0.45, m: 1.14 },
      ]) {
        g.beginPath();
        g.ellipse(cx, cy, ringRx * pass.m, ringRy * pass.m, tilt, 0, Math.PI);
        g.strokeStyle = `rgba(205, 222, 250, ${pass.a * alpha})`;
        g.lineWidth = Math.max(0.7, pass.w);
        g.stroke();
      }
      g.restore();
    }

    function stepPlanet(idx: number, s: Planet, now: number) {
      const c = cells[idx];
      if (!c) {
        planets.delete(idx);
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
            planets.delete(idx);
            draw(c, c.a);
          }
        }
        return;
      }
      if (s.phase === "grow") {
        const t = Math.min(1, elapsed / GROW_MS);
        const scale = P_MIN + (1 - P_MIN) * easeOutCubic(t);
        draw(c, c.a, maskedWord(s.letter));
        drawPlanet(c, s, scale, 1, now);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        const pulse = 1 + 0.03 * Math.sin(now / 260);
        draw(c, c.a, maskedWord(s.letter));
        drawPlanet(c, s, pulse, 0.94 + 0.06 * Math.sin(now / 330), now);
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
      drawPlanet(c, s, scale, 1, now);
      if (t >= 1) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    function ensureLoop() {
      if (rafId !== null) return;
      const loop = (now: number) => {
        for (const [idx, s] of Array.from(planets)) stepPlanet(idx, s, now);
        rafId = planets.size > 0 ? requestAnimationFrame(loop) : null;
      };
      rafId = requestAnimationFrame(loop);
    }

    function spawn(idx?: number, letter?: number) {
      if (reduced || planets.size >= maxRef.current) return;
      if (!cells.length) return;
      for (let tries = 0; tries < 24; tries++) {
        const i = idx ?? (Math.random() * cells.length) | 0;
        const c = cells[i];
        if (!c || planets.has(i) || glitchUntil.has(i)) {
          if (idx !== undefined) return;
          continue;
        }
        let near = false;
        for (const other of planets.keys()) {
          if (
            Math.abs((other % cols) - (i % cols)) <= 1 &&
            Math.abs(Math.floor(other / cols) - Math.floor(i / cols)) <= 1
          ) {
            near = true;
            break;
          }
        }
        if (near && idx === undefined) continue;
        planets.set(i, {
          letter: letter ?? (Math.random() * WORD.length) | 0,
          phase: "glitchIn",
          phaseStart: performance.now(),
          holdMs: holdRef.current * 1000 * (0.8 + Math.random() * 0.4),
          lastGlitchDraw: 0,
          seed: Math.random() * 1000,
        });
        draw(c, c.a, maskedWord(planets.get(i)!.letter));
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
        if (c && !planets.has(i)) draw(c, c.a);
      }
      for (let k = 0; k < GLITCH_CELLS; k++) {
        const i = (Math.random() * cells.length) | 0;
        const c = cells[i];
        if (!c || planets.has(i) || glitchUntil.has(i)) continue;
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
      planets.clear();
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
            Uji Planet — klik huruf mana pun: planet bercincin
            menggantikan huruf itu
          </span>
        </header>
        <div className="panel">
          <button type="button" onClick={() => apiRef.current?.spawn()}>
            Picu planet
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
            Cincin: {ring.toFixed(2)}×
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={ring}
              onChange={(e) => setRing(Number(e.target.value))}
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
