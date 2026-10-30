"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   HALAMAN UJI ATOM (/atom) — 30 Okt 2026.
   Bancuh uji efek pengganti huruf ketiga: ATOM RUTHERFORD ala logo
   React — inti (nukleus) di tengah + 3 orbit elips yang bersilangan
   60 derajat, dengan titik elektron yang mengelilingi tiap orbit.
   Warna putih, siklus hidup sama seperti spiral/sparkle:
     idle → glitch (±150 ms) → tumbuh (±450 ms) → hold (orbit berputar
     pelan, elektron mengelilingi) → menguncup (±400 ms) → glitch → idle
   Teknik sama seperti halaman utama: huruf tuan rumah disembunyikan
   lewat kata bertopeng, pusat bentuk dari advance murni huruf, ukuran
   dari tinggi tinta huruf kapital. Panel bawah untuk menyetel:
   ukuran, kegepengan elips, kecepatan putar, glow, hold, maks aktif,
   dan saklar elektron. Klik huruf mana pun untuk memicu di tempat.
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
const GROW_MS = 450;
const SHRINK_MS = 400;
const P_MIN = 0.25;
const AUTO_EVERY_MS = 700;
const ORBITS = 3; // 3 orbit elips bersilangan 60° (ciri logo React)

type Cell = { x: number; y: number; a: number; shown: boolean };
type Phase = "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
type Atom = {
  letter: number;
  phase: Phase;
  phaseStart: number;
  holdMs: number;
  lastGlitchDraw: number;
  baseRot: number; // orientasi awal atom (acak per kemunculan)
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export default function AtomScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [autoOn, setAutoOn] = useState(true);
  const [electronsOn, setElectronsOn] = useState(true);
  const [sizeMul, setSizeMul] = useState(1.4);
  const [flat, setFlat] = useState(0.42);
  const [spin, setSpin] = useState(1);
  const [glow, setGlow] = useState(2.2);
  const [holdSec, setHoldSec] = useState(1.5);
  const [maxActive, setMaxActive] = useState(7);
  const autoRef = useRef(autoOn);
  const electronsRef = useRef(electronsOn);
  const sizeRef = useRef(sizeMul);
  const flatRef = useRef(flat);
  const spinRef = useRef(spin);
  const glowRef = useRef(glow);
  const holdRef = useRef(holdSec);
  const maxRef = useRef(maxActive);
  autoRef.current = autoOn;
  electronsRef.current = electronsOn;
  sizeRef.current = sizeMul;
  flatRef.current = flat;
  spinRef.current = spin;
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
    const atoms = new Map<number, Atom>();
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

    /* --- bentuk atom: nukleus + 3 orbit elips + elektron ---
       Seluruh atom berputar pelan (rot dari waktu); tiap orbit miring
       60° dari orbit sebelumnya; elektron menempati posisi sudut yang
       bergerak sepanjang elipsnya masing-masing. */
    function drawAtom(c: Cell, s: Atom, scale: number, alpha: number, now: number) {
      const g = ctx!;
      const cx = letterCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      const R = (capHeight() * sizeRef.current * scale) / 2;
      const f = flatRef.current;
      const rot = s.baseRot + (now / 1000) * 0.45 * spinRef.current;
      g.save();
      g.shadowColor = "rgba(245,245,255,0.85)";
      g.shadowBlur = glowRef.current;
      g.strokeStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.fillStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.lineWidth = 1.2;
      for (let k = 0; k < ORBITS; k++) {
        const ang = rot + (k * Math.PI) / 3;
        g.beginPath();
        g.ellipse(cx, cy, R, R * f, ang, 0, Math.PI * 2);
        g.stroke();
      }
      // nukleus
      g.beginPath();
      g.arc(cx, cy, Math.max(0.8, R * 0.15), 0, Math.PI * 2);
      g.fill();
      // elektron: satu per orbit, sudutnya bergerak
      if (electronsRef.current) {
        for (let k = 0; k < ORBITS; k++) {
          const ang = rot + (k * Math.PI) / 3;
          const th =
            (now / 1000) * (0.9 + k * 0.17) * Math.max(0.15, spinRef.current) +
            k * 2.1;
          const ex = R * Math.cos(th);
          const ey = R * f * Math.sin(th);
          const sx = cx + ex * Math.cos(ang) - ey * Math.sin(ang);
          const sy = cy + ex * Math.sin(ang) + ey * Math.cos(ang);
          g.beginPath();
          g.arc(sx, sy, Math.max(0.7, R * 0.085), 0, Math.PI * 2);
          g.fill();
        }
      }
      g.restore();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
    }

    function stepAtom(idx: number, s: Atom, now: number) {
      const c = cells[idx];
      if (!c) {
        atoms.delete(idx);
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
            atoms.delete(idx);
            draw(c, c.a);
          }
        }
        return;
      }
      if (s.phase === "grow") {
        const t = Math.min(1, elapsed / GROW_MS);
        const scale = P_MIN + (1 - P_MIN) * easeOutCubic(t);
        draw(c, c.a, maskedWord(s.letter));
        drawAtom(c, s, scale, 1, now);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        draw(c, c.a, maskedWord(s.letter));
        drawAtom(c, s, 1, 0.92 + 0.08 * Math.sin(now / 310), now);
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
      drawAtom(c, s, scale, 1, now);
      if (t >= 1) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    function ensureLoop() {
      if (rafId !== null) return;
      const loop = (now: number) => {
        for (const [idx, s] of Array.from(atoms)) stepAtom(idx, s, now);
        rafId = atoms.size > 0 ? requestAnimationFrame(loop) : null;
      };
      rafId = requestAnimationFrame(loop);
    }

    function spawn(idx?: number, letter?: number) {
      if (reduced || atoms.size >= maxRef.current) return;
      if (!cells.length) return;
      for (let tries = 0; tries < 24; tries++) {
        const i = idx ?? (Math.random() * cells.length) | 0;
        const c = cells[i];
        if (!c || atoms.has(i) || glitchUntil.has(i)) {
          if (idx !== undefined) return;
          continue;
        }
        let near = false;
        for (const other of atoms.keys()) {
          if (
            Math.abs((other % cols) - (i % cols)) <= 1 &&
            Math.abs(Math.floor(other / cols) - Math.floor(i / cols)) <= 1
          ) {
            near = true;
            break;
          }
        }
        if (near && idx === undefined) continue;
        atoms.set(i, {
          letter: letter ?? (Math.random() * WORD.length) | 0,
          phase: "glitchIn",
          phaseStart: performance.now(),
          holdMs: holdRef.current * 1000 * (0.8 + Math.random() * 0.4),
          lastGlitchDraw: 0,
          baseRot: Math.random() * Math.PI,
        });
        draw(c, c.a, maskedWord(atoms.get(i)!.letter));
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
        if (c && !atoms.has(i)) draw(c, c.a);
      }
      for (let k = 0; k < GLITCH_CELLS; k++) {
        const i = (Math.random() * cells.length) | 0;
        const c = cells[i];
        if (!c || atoms.has(i) || glitchUntil.has(i)) continue;
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
      atoms.clear();
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
            Uji Atom — klik huruf mana pun: atom Rutherford menggantikan
            huruf itu
          </span>
        </header>
        <div className="panel">
          <button type="button" onClick={() => apiRef.current?.spawn()}>
            Picu atom
          </button>
          <button type="button" onClick={() => apiRef.current?.spawnBatch()}>
            Picu rombongan
          </button>
          <button type="button" onClick={() => setAutoOn((v) => !v)}>
            Otomatis: {autoOn ? "ON" : "OFF"}
          </button>
          <button type="button" onClick={() => setElectronsOn((v) => !v)}>
            Elektron: {electronsOn ? "ON" : "OFF"}
          </button>
          <label>
            Ukuran: {sizeMul.toFixed(1)}×
            <input
              type="range"
              min={0.6}
              max={2.6}
              step={0.1}
              value={sizeMul}
              onChange={(e) => setSizeMul(Number(e.target.value))}
            />
          </label>
          <label>
            Elips: {flat.toFixed(2)}
            <input
              type="range"
              min={0.25}
              max={0.65}
              step={0.01}
              value={flat}
              onChange={(e) => setFlat(Number(e.target.value))}
            />
          </label>
          <label>
            Putaran: {spin.toFixed(1)}×
            <input
              type="range"
              min={0}
              max={3}
              step={0.25}
              value={spin}
              onChange={(e) => setSpin(Number(e.target.value))}
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
