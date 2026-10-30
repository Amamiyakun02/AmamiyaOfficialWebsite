"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   DEFINISI SISTEM (rombak ulang 30 Okt — mengikuti gaya Muse Wonder)

   GRID  : bidang karakter yang menerus memenuhi hero. Teks pola
           "AMAMIYA " (kata + satu spasi) diulang tanpa putus di tiap
           baris, seperti grid karakter halaman Wonder asli.
   CELL  : SATU karakter. Punya posisi, karakter pola, opasitas dasar,
           dan keadaan efek. Semua efek mengalamati cell (karakter),
           bukan kata — tambalan glitch bisa menyeberang batas kata.
   ITEM GLITCH (katalog):
     1. SPIRAL — aspek utama: satu karakter digantikan galaksi
        vertikal (switch sungguhan) dengan fase glitch -> tumbuh ->
        bertahan -> menguncup -> glitch -> kembali.
     2. HEAT — highlight kursor per karakter: tambalan ±6 huruf ke
        samping x ±3 baris, glyph blok/dither mengikuti panas,
        sekali per lintasan, memudar lalu kembali.
     3. SISIPAN — kata DEV/BUILD/CODE menimpa run karakter pola,
        muncul berjenjang mengikuti arah diagonal, lalu reda.
     4. SUBSTITUSI — karakter acak sesekali berganti glyph lain
        (huruf/angka/simbol) sebentar, ala "W1NDER" di aslinya.
     5. SCRAMBLE — beberapa karakter berputar huruf acak ±0,3-0,5 dtk.
   Semua masa hidup efek = tenggat waktu (performance.now), bukan
   hitungan tick. DPR dikunci 1; hanya cell yang berubah digambar
   ulang; loop berhenti saat tidak ada efek aktif / tab tersembunyi.
   ===================================================================== */
const PATTERN = "AMAMIYA "; // teks pola grid (kata + spasi), diulang menerus
const GLYPH_POOL = "AMAMIYA"; // huruf penyusun kata — pool glitch & scramble
const SUBST_POOL = "AMAMIYA0123456789#*:^"; // pool substitusi (huruf dominan, angka/simbol sesekali)
const INSERT_WORDS = ["DEV", "BUILD", "CODE"]; // kata sisipan
const INSERT_BOOST = 0.32; // tambahan opasitas kata sisipan
const FONT_SIZE = 20;
const CH = 38; // tinggi baris (px)
const FONT = `${FONT_SIZE}px monospace`;
const LETTER_SPACING = 9;
const TEXT_Y = (CH - FONT_SIZE) / 2 + FONT_SIZE * 0.8;
const INK = "206,206,214";
const BASE_ALPHA = 0.3;
const BASE_ALPHA_RANGE = 0.15;

// --- heat (highlight kursor per karakter) ---
const HEAT_RX = 78; // ±3 karakter ke samping -> tambalan ±6 huruf
const HEAT_RY = 57; // ±1,5 baris -> tambalan ±3 baris
const HEAT_DECAY = 0.9;
const HEAT_MIN = 0.08;
const HEAT_MAX_MS = 1400;
const HEAT_RAMP = ["░", "▒", "▓", "█"];
const HEAT_GLITCH = ["▌", "▐", "▚", ":", "⠿"];

// --- lubang judul di tengah hero ---
const HOLE_MAX_W = 660;
const HOLE_MAX_H = 210;
const HOLE_W_RATIO = 0.86;
const HOLE_H_RATIO = 0.36;
const HOLE_RADIUS = 28;

// --- spiral galaksi per karakter (aspek utama; geometri final) ---
const SPIRAL_EVERY_MS = 700;
const SPIRAL_MAX = 7;
const SPIRAL_GLITCH_MS = 150;
const SPIRAL_GROW_MS = 500;
const SPIRAL_SHRINK_MS = 550;
const SPIRAL_P_MIN = 0.12;

type SpiralState = {
  phase: "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
  phaseStart: number;
  rot: number;
  holdMs: number;
  lastGlitchDraw: number;
};

type Cell = {
  x: number;
  y: number;
  ch: string; // karakter pola cell ini
  a: number; // opasitas dasar
  hole: boolean;
  shown: boolean;
  // heat
  heat: number;
  heatGlyph: string;
  heatBorn: number;
  spent: boolean; // sudah menyala pada lintasan kursor kali ini
  // tampilan sementara (sisipan / substitusi / scramble)
  temp: string;
  tempAlpha: number;
  tempFrom: number;
  tempUntil: number;
  tempCycle: boolean;
  tempDrawn: boolean;
  // spiral
  spiral: SpiralState | null;
};

export default function WonderScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const colsRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const redrawsRef = useRef(0);
  const mouseOnRef = useRef(true);
  const debugOnRef = useRef(false);

  const [mouseOn, setMouseOn] = useState(true);
  const [debugOn, setDebugOn] = useState(false);
  const [debugText, setDebugText] = useState("—");

  useEffect(() => {
    mouseOnRef.current = mouseOn;
    if (!mouseOn) {
      // matikan semua heat yang sedang menyala: gambar ulang karakter pola
      const g = canvasRef.current?.getContext("2d");
      if (g) {
        g.font = FONT;
        try {
          (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            `${LETTER_SPACING}px`;
        } catch {
          /* abaikan */
        }
        g.textAlign = "left";
        g.textBaseline = "alphabetic";
        g.shadowBlur = 0;
        g.shadowColor = "rgba(0,0,0,0)";
        for (const c of cellsRef.current) {
          if (c.heat > 0) {
            c.heat = 0;
            if (!c.hole && !c.spiral && !(c.tempUntil > performance.now())) {
              g.clearRect(c.x, c.y, 40, CH);
              g.fillStyle = `rgba(${INK},${c.a.toFixed(3)})`;
              g.fillText(c.ch, c.x, c.y + TEXT_Y);
            }
          }
        }
      }
    }
  }, [mouseOn]);

  useEffect(() => {
    debugOnRef.current = debugOn;
    if (!debugOn) setDebugText("—");
  }, [debugOn]);

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let PITCH = 24; // lebar satu karakter termasuk spasi (diukur saat build)
    let CHARW = PITCH - LETTER_SPACING; // lebar tinta satu karakter

    function setTextState(g: CanvasRenderingContext2D) {
      g.font = FONT;
      try {
        (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch {
        /* browser non-Chromium: abaikan */
      }
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      // Bayangan HARUS mati: drawSpiralGlyph menyalakan shadowBlur dan
      // state canvas menetap — tanpa reset, gambar berikutnya ikut
      // berbayang (bug "teks tidak normal" yang sudah terbukti).
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
    }

    // Primitif gambar satu-satunya: satu karakter pada cell-nya.
    function drawChar(c: Cell, ch: string, alpha: number) {
      if (c.hole) return;
      const g = ctx!;
      g.clearRect(c.x, c.y, PITCH, CH);
      setTextState(g);
      g.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
      g.fillText(ch, c.x, c.y + TEXT_Y);
      redrawsRef.current++;
    }
    function renderCell(c: Cell) {
      c.shown = true;
      drawChar(c, c.ch, c.a);
    }

    /* ---------------- BUILD GRID ---------------- */
    let revealTimer: ReturnType<typeof setInterval> | null = null;
    function stopReveal() {
      if (revealTimer) {
        clearInterval(revealTimer);
        revealTimer = null;
      }
    }
    let lastCorner = -1;
    function nextCorner() {
      let cn = (Math.random() * 4) | 0;
      while (cn === lastCorner) cn = (Math.random() * 4) | 0;
      lastCorner = cn;
      return cn;
    }
    function distFrom(corner: number, x: number, y: number) {
      const W = cvs!.width;
      const H = cvs!.height;
      return corner === 0
        ? x + y
        : corner === 1
          ? W - x + y
          : corner === 2
            ? x + (H - y)
            : W - x + (H - y);
    }

    function build(instant = false) {
      cvs!.width = window.innerWidth;
      cvs!.height = window.innerHeight;
      ctx!.font = FONT;
      try {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch {
        /* abaikan */
      }
      // pitch karakter = lebar teks pola terukur / jumlah karakternya
      PITCH = ctx!.measureText(PATTERN).width / PATTERN.length;
      CHARW = PITCH - LETTER_SPACING;
      const holeW = Math.min(HOLE_MAX_W, cvs!.width * HOLE_W_RATIO);
      const holeH = Math.min(HOLE_MAX_H, cvs!.height * HOLE_H_RATIO);
      const holeX = (cvs!.width - holeW) / 2;
      const holeY = (cvs!.height - holeH) / 2;
      const inHole = (px: number, py: number) => {
        if (px < holeX || px > holeX + holeW || py < holeY || py > holeY + holeH)
          return false;
        const nx = Math.max(holeX + HOLE_RADIUS, Math.min(px, holeX + holeW - HOLE_RADIUS));
        const ny = Math.max(holeY + HOLE_RADIUS, Math.min(py, holeY + holeH - HOLE_RADIUS));
        const dx = px - nx;
        const dy = py - ny;
        return dx * dx + dy * dy <= HOLE_RADIUS * HOLE_RADIUS;
      };
      // bersihkan semua keadaan efek: grid diganti total
      hotCells.clear();
      spentCells.clear();
      tempCells.clear();
      spiralCells.clear();
      insertActiveChars = 0;
      if (heatRaf !== null) {
        cancelAnimationFrame(heatRaf);
        heatRaf = null;
      }
      if (spiralRaf !== null) {
        cancelAnimationFrame(spiralRaf);
        spiralRaf = null;
      }
      stopReveal();
      const cells: Cell[] = [];
      const cols = Math.ceil(cvs!.width / PITCH) + 1;
      colsRef.current = cols;
      for (let r = 0; r * CH < cvs!.height + CH; r++) {
        for (let col = 0; col < cols; col++) {
          const x = col * PITCH;
          const y = r * CH;
          cells.push({
            x,
            y,
            ch: PATTERN[col % PATTERN.length],
            a: BASE_ALPHA + Math.random() * BASE_ALPHA_RANGE,
            hole: inHole(x + CHARW / 2, y + CH / 2),
            shown: false,
            heat: 0,
            heatGlyph: "",
            heatBorn: 0,
            spent: false,
            temp: "",
            tempAlpha: 0,
            tempFrom: 0,
            tempUntil: 0,
            tempCycle: false,
            tempDrawn: false,
            spiral: null,
          });
        }
      }
      cellsRef.current = cells;
      if (instant || reduced) {
        for (const c of cells) if (!c.hole) renderCell(c);
        return;
      }
      // animasi masuk: sapuan diagonal sudut-ke-sudut ±1 detik
      const maxDiag = cvs!.width + cvs!.height;
      const step = maxDiag / 25;
      const corner = nextCorner();
      let diag = 0;
      revealTimer = setInterval(() => {
        diag += step;
        for (const c of cells) {
          if (c.shown || c.hole) continue;
          if (distFrom(corner, c.x, c.y) <= diag) renderCell(c);
        }
        if (diag >= maxDiag) stopReveal();
      }, 40);
    }

    /* ================= SPIRAL — ASPEK UTAMA =================
       Satu karakter digantikan galaksi vertikal (switch sungguhan:
       karakter tidak digambar sama sekali selama urutan berjalan).
       Fase: glitch ±150 ms -> tumbuh ±500 ms -> bertahan 0,8-1,5 dtk
       -> menguncup ±550 ms -> glitch -> karakter kembali. Geometri
       final yang disetujui user: 8 lengan logaritmik tipis, elips
       vertikal (0,8 x 1,55) dipasang sekali sebelum putaran, massa
       lengan diredupkan saat mengarah ke kiri/kanan layar. */
    const spiralCells = new Set<number>();
    let spiralRaf: number | null = null;
    let spiralLastFrame = 0;
    const easeOutCubicS = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOutCubicS = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function drawSpiralGlyph(c: Cell, s: SpiralState, p: number, rot: number, alpha: number) {
      const g = ctx!;
      g.clearRect(c.x, c.y, PITCH, CH);
      const cx = c.x + CHARW / 2;
      const cy = c.y + CH / 2 + 1;
      g.fillStyle = `rgba(238,238,244,${alpha.toFixed(3)})`;
      g.shadowColor = "rgba(238,238,244,0.8)";
      const R = 9.2;
      const R0 = 1.1;
      const ARM_TURNS = Math.PI * 2 * 0.38;
      const upto = ARM_TURNS * p;
      g.lineWidth = 1.35;
      g.lineCap = "round";
      g.shadowBlur = 1.2;
      g.save();
      g.translate(cx, cy);
      g.scale(0.8, 1.55);
      g.rotate(rot);
      const steps = 48;
      const CHUNK = 4;
      for (let a = 0; a < 8; a++) {
        g.save();
        g.rotate((a * Math.PI) / 4);
        for (let s0 = 0; s0 < steps; s0 += CHUNK) {
          const thMid = (upto * (s0 + CHUNK / 2)) / steps;
          const screenAng = thMid + rot + (a * Math.PI) / 4;
          const fade = 1 - 0.85 * Math.pow(Math.abs(Math.cos(screenAng)), 1.3);
          g.strokeStyle = `rgba(238,238,244,${(alpha * Math.max(0.08, fade)).toFixed(3)})`;
          g.beginPath();
          for (let i = s0; i <= Math.min(steps, s0 + CHUNK); i++) {
            const th = (upto * i) / steps;
            const r = R0 * Math.pow(R / R0, th / ARM_TURNS);
            const px = r * Math.cos(th);
            const py = r * Math.sin(th);
            if (i === s0) g.moveTo(px, py);
            else g.lineTo(px, py);
          }
          g.stroke();
        }
        g.restore();
      }
      g.restore();
      g.beginPath();
      g.arc(cx, cy, 1.3 * Math.max(0.35, p), 0, Math.PI * 2);
      g.fill();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      redrawsRef.current++;
    }

    function stepSpiral(idx: number, s: SpiralState, now: number, dt: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole || !c.spiral) {
        spiralCells.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          drawChar(
            c,
            GLYPH_POOL[(Math.random() * GLYPH_POOL.length) | 0],
            Math.min(0.85, c.a + 0.35),
          );
          s.lastGlitchDraw = now;
        }
        if (elapsed >= SPIRAL_GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            c.spiral = null;
            spiralCells.delete(idx);
            renderCell(c); // karakter asli kembali
          }
        }
        return;
      }
      if (s.phase === "grow") {
        const t = Math.min(1, elapsed / SPIRAL_GROW_MS);
        const p = SPIRAL_P_MIN + (1 - SPIRAL_P_MIN) * easeOutCubicS(t);
        s.rot += dt * (3.4 * (1 - t) + 0.5);
        drawSpiralGlyph(c, s, p, s.rot, 0.92);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        s.rot += dt * 0.5;
        drawSpiralGlyph(c, s, 1, s.rot, 0.86 + 0.1 * Math.sin(now / 280));
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "shrink") {
        const t = Math.min(1, elapsed / SPIRAL_SHRINK_MS);
        const p = 1 - (1 - SPIRAL_P_MIN) * easeInOutCubicS(t);
        s.rot -= dt * 2.3;
        drawSpiralGlyph(c, s, p, s.rot, 0.92);
        if (t >= 1) {
          s.phase = "glitchOut";
          s.phaseStart = now;
          s.lastGlitchDraw = 0;
        }
      }
    }
    function ensureSpiralLoop() {
      if (spiralRaf !== null) return;
      spiralLastFrame = performance.now();
      const loop = (now: number) => {
        const dt = Math.min(0.05, (now - spiralLastFrame) / 1000);
        spiralLastFrame = now;
        for (const idx of Array.from(spiralCells)) {
          const c = cellsRef.current[idx];
          if (c?.spiral) stepSpiral(idx, c.spiral, now, dt);
          else spiralCells.delete(idx);
        }
        spiralRaf = spiralCells.size > 0 ? requestAnimationFrame(loop) : null;
      };
      spiralRaf = requestAnimationFrame(loop);
    }
    function spawnSpiral() {
      if (reduced || spiralCells.size >= SPIRAL_MAX) return;
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols) return;
      for (let tries = 0; tries < 30; tries++) {
        const idx = (Math.random() * cells.length) | 0;
        const c = cells[idx];
        if (!c || c.hole || !c.shown || c.spiral) continue;
        if (c.heat > 0 || c.tempUntil > performance.now()) continue;
        // jangan berdekatan dengan spiral lain
        let nearOther = false;
        for (const other of spiralCells) {
          if (
            Math.abs((other % cols) - (idx % cols)) <= 2 &&
            Math.abs(Math.floor(other / cols) - Math.floor(idx / cols)) <= 1
          ) {
            nearOther = true;
            break;
          }
        }
        if (nearOther) continue;
        c.spiral = {
          phase: "glitchIn",
          phaseStart: performance.now(),
          rot: Math.random() * Math.PI * 2,
          holdMs: 800 + Math.random() * 700,
          lastGlitchDraw: 0,
        };
        spiralCells.add(idx);
        ensureSpiralLoop();
        break;
      }
    }
    const spiralTimer = reduced
      ? null
      : setInterval(() => {
          if (document.hidden) return;
          // WATCHDOG: bila loop rAF mati > 2,5 dtk sementara spiral
          // tercatat aktif, paksa selesaikan semua (karakter kembali).
          if (spiralCells.size > 0 && performance.now() - spiralLastFrame > 2500) {
            for (const idx of Array.from(spiralCells)) {
              const c = cellsRef.current[idx];
              if (c) {
                c.spiral = null;
                if (!c.hole) renderCell(c);
              }
            }
            spiralCells.clear();
            spiralRaf = null;
          }
          spawnSpiral();
        }, SPIRAL_EVERY_MS);

    /* ============ TAMPILAN SEMENTARA: SISIPAN · SUBSTITUSI · SCRAMBLE ============
       Semua berbasis tenggat waktu dan dilayani satu ticker lambat
       (120 ms). Cell yang sedang ditempati spiral/heat tidak disentuh. */
    const tempCells = new Set<number>();
    let nextInsertAt = performance.now() + 2500;
    let insertActiveChars = 0;

    function cellBusy(c: Cell, now: number) {
      return !!c.spiral || c.heat > 0 || c.tempUntil > now;
    }
    function setTemp(
      idx: number,
      ch: string,
      alpha: number,
      from: number,
      until: number,
      cycle = false,
    ) {
      const c = cellsRef.current[idx];
      if (!c) return;
      c.temp = ch;
      c.tempAlpha = alpha;
      c.tempFrom = from;
      c.tempUntil = until;
      c.tempCycle = cycle;
      c.tempDrawn = false;
      tempCells.add(idx);
    }
    function spawnInsert(now: number) {
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols || insertActiveChars > 60) return;
      const word = INSERT_WORDS[(Math.random() * INSERT_WORDS.length) | 0];
      const rows = Math.floor(cells.length / cols);
      const row = (Math.random() * rows) | 0;
      const startCol = (Math.random() * Math.max(1, cols - word.length)) | 0;
      const corner = nextCorner();
      let placed = 0;
      for (let k = 0; k < word.length; k++) {
        const idx = row * cols + startCol + k;
        const c = cells[idx];
        if (!c || c.hole || !c.shown || cellBusy(c, now)) continue;
        // muncul berjenjang mengikuti jarak diagonal dari sudut acak
        const from = now + distFrom(corner, c.x, c.y) * 0.22;
        setTemp(
          idx,
          word[k],
          Math.min(0.65, c.a + INSERT_BOOST),
          from,
          from + 1700 + Math.random() * 1900,
        );
        placed++;
      }
      insertActiveChars += placed;
    }
    function stepTemp() {
      if (document.hidden) return;
      const now = performance.now();
      const cells = cellsRef.current;
      for (const idx of Array.from(tempCells)) {
        const c = cells[idx];
        if (!c || c.hole) {
          tempCells.delete(idx);
          continue;
        }
        if (c.spiral) {
          // spiral mengambil alih cell: batalkan temp tanpa menggambar
          c.tempUntil = 0;
          c.tempCycle = false;
          tempCells.delete(idx);
          continue;
        }
        if (now >= c.tempUntil) {
          const wasInsert = !c.tempCycle && c.tempUntil - c.tempFrom > 1000;
          c.tempUntil = 0;
          c.tempCycle = false;
          c.tempDrawn = false;
          tempCells.delete(idx);
          if (wasInsert) insertActiveChars = Math.max(0, insertActiveChars - 1);
          if (c.heat <= 0) renderCell(c);
          continue;
        }
        if (now >= c.tempFrom) {
          if (c.tempCycle) {
            drawChar(c, GLYPH_POOL[(Math.random() * GLYPH_POOL.length) | 0], c.tempAlpha);
          } else if (!c.tempDrawn) {
            c.tempDrawn = true;
            drawChar(c, c.temp, c.tempAlpha);
          }
        }
      }
      if (reduced) return;
      // pemicu sisipan berkala
      if (now >= nextInsertAt) {
        spawnInsert(now);
        nextInsertAt = now + 2600 + Math.random() * 2600;
      }
      // substitusi: beberapa karakter berganti glyph sebentar
      for (let k = 0; k < 3; k++) {
        const idx = (Math.random() * cells.length) | 0;
        const c = cells[idx];
        if (!c || c.hole || !c.shown || cellBusy(c, now)) continue;
        setTemp(
          idx,
          SUBST_POOL[(Math.random() * SUBST_POOL.length) | 0],
          Math.min(0.7, c.a + 0.18),
          now,
          now + 280 + Math.random() * 250,
        );
      }
      // scramble: beberapa karakter berputar huruf acak sebentar
      if (Math.random() < 0.3) {
        for (let k = 0; k < 2; k++) {
          const idx = (Math.random() * cells.length) | 0;
          const c = cells[idx];
          if (!c || c.hole || !c.shown || cellBusy(c, now)) continue;
          setTemp(idx, "", Math.min(0.7, c.a + 0.1), now, now + 300 + Math.random() * 200, true);
        }
      }
    }
    const tempTimer = setInterval(stepTemp, 120);

    /* ================= HEAT — HIGHLIGHT KURSOR PER KARAKTER =================
       Tambalan ±6 huruf ke samping x ±3 baris mengikuti kursor (panas
       dihitung per karakter dari titik tengahnya). Sekali per lintasan:
       karakter yang sudah menyala ditandai spent dan tidak dipanaskan
       lagi sampai kursor keluar dari jangkauannya. Jejak memudar
       x0,9/frame dengan batas keras HEAT_MAX_MS. */
    const hotCells = new Set<number>();
    const spentCells = new Set<number>();
    let heatRaf: number | null = null;
    let lastMoveAt = 0;

    function stepHeat() {
      const cells = cellsRef.current;
      const cols = colsRef.current;
      const m = mouseRef.current;
      const now = performance.now();
      // bebaskan karakter spent yang kursornya sudah jauh / pergi
      for (const idx of Array.from(spentCells)) {
        const c = cells[idx];
        if (!c || !m) {
          spentCells.delete(idx);
          if (c) c.spent = false;
          continue;
        }
        const dx = (c.x + CHARW / 2 - m.x) / HEAT_RX;
        const dy = (c.y + CH / 2 - m.y) / HEAT_RY;
        if (dx * dx + dy * dy >= 1) {
          spentCells.delete(idx);
          c.spent = false;
        }
      }
      // panaskan karakter di sekitar kursor
      if (cells.length && cols && m && mouseOnRef.current && !reduced) {
        const c0 = Math.max(0, Math.floor((m.x - HEAT_RX) / PITCH));
        const c1 = Math.min(cols - 1, Math.floor((m.x + HEAT_RX) / PITCH));
        const r0 = Math.max(0, Math.floor((m.y - HEAT_RY) / CH));
        const r1 = Math.floor((m.y + HEAT_RY) / CH);
        for (let r = r0; r <= r1; r++) {
          for (let cc = c0; cc <= c1; cc++) {
            const idx = r * cols + cc;
            const c = cells[idx];
            if (!c || c.hole || !c.shown) continue;
            if (c.spent || c.heat > 0 || cellBusy(c, now)) continue;
            const dx = (c.x + CHARW / 2 - m.x) / HEAT_RX;
            const dy = (c.y + CH / 2 - m.y) / HEAT_RY;
            const dd = dx * dx + dy * dy;
            if (dd >= 1) continue;
            const h = 1 - Math.sqrt(dd) + (Math.random() - 0.5) * 0.35;
            if (h <= 0.05) continue;
            c.heat = Math.min(1, Math.max(0.02, h));
            c.heatGlyph = "";
            c.heatBorn = now;
            hotCells.add(idx);
          }
        }
      }
      // dinginkan + gambar karakter panas saja
      for (const idx of Array.from(hotCells)) {
        const c = cells[idx];
        if (!c || c.hole) {
          hotCells.delete(idx);
          continue;
        }
        if (c.spiral || c.tempUntil > now) {
          c.heat = 0;
          hotCells.delete(idx);
          continue; // tampilannya diambil alih sistem lain
        }
        c.heat *= HEAT_DECAY;
        if (c.heat < HEAT_MIN || now - c.heatBorn > HEAT_MAX_MS) {
          c.heat = 0;
          hotCells.delete(idx);
          c.spent = true;
          spentCells.add(idx);
          renderCell(c);
          continue;
        }
        if (!c.heatGlyph || Math.random() < 0.2) {
          const jitter = (Math.random() - 0.5) * 0.25;
          const h = Math.max(0, Math.min(1, c.heat + jitter));
          c.heatGlyph =
            Math.random() < 0.12
              ? HEAT_GLITCH[(Math.random() * HEAT_GLITCH.length) | 0]
              : HEAT_RAMP[Math.min(3, (h * 4) | 0)];
        }
        drawChar(c, c.heatGlyph, Math.min(0.9, 0.25 + c.heat * 0.6));
      }
      heatRaf =
        hotCells.size > 0 || performance.now() - lastMoveAt < 150
          ? requestAnimationFrame(stepHeat)
          : null;
    }
    function ensureHeat() {
      if (heatRaf === null && !reduced) {
        lastMoveAt = performance.now();
        heatRaf = requestAnimationFrame(stepHeat);
      }
    }
    function onPointerMove(e: PointerEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      lastMoveAt = performance.now();
      ensureHeat();
    }
    function onPointerLeave() {
      mouseRef.current = null;
      ensureHeat();
    }

    /* ---------------- LISTENERS & CLEANUP ---------------- */
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => build(true), 150);
    }
    function onVisibility() {
      if (!document.hidden) ensureHeat();
    }
    const debugTimer = setInterval(() => {
      if (!debugOnRef.current) return;
      setDebugText(
        `${redrawsRef.current} karakter digambar/detik · ${cellsRef.current.length} cell total`,
      );
      redrawsRef.current = 0;
    }, 1000);

    build();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (spiralTimer) clearInterval(spiralTimer);
      if (spiralRaf !== null) cancelAnimationFrame(spiralRaf);
      clearInterval(tempTimer);
      if (heatRaf !== null) cancelAnimationFrame(heatRaf);
      stopReveal();
      clearInterval(debugTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />

      <div className="page">
        <header className="nav">
          <div className="nav-left">
            <span className="brand">
              <span className="brand-mark">∞</span> Amamiya
            </span>
            <nav>
              <a href="#spiral">Spiral</a>
              <a href="#grid">Grid &amp; Cell</a>
              <a href="#glitch">Glitch</a>
              <a href="#performa">Performa</a>
            </nav>
          </div>
          <a className="nav-cta" href="#spiral">
            Coba Demo
          </a>
        </header>

        <section className="hero">
          <h1>Amamiya</h1>
          <a className="scroll-hint" href="#tentang" aria-label="Gulir ke bawah">
            ↓
          </a>
        </section>
      </div>

      <div className="panel">
        <button type="button" onClick={() => setMouseOn((v) => !v)}>
          Highlight mouse: {mouseOn ? "ON" : "OFF"}
        </button>
        <button type="button" onClick={() => setDebugOn((v) => !v)}>
          Debug: {debugOn ? "ON" : "OFF"}
        </button>
        <output>{debugText}</output>
      </div>
    </>
  );
}
