"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   KONFIGURASI BACKGROUND — ubah bagian ini untuk mengutak-atik pola
   ===================================================================== */
const WORD = "AMAMIYA"; // kata yang diulang menjadi pola grid
const GLYPHS = "AMAMIYA"; // karakter pengganti glitch — hanya huruf penyusun kata (simbol & angka dihapus atas permintaan user)
const FONT_SIZE = 20; // ukuran font grid (px)
const CW = 170; // lebar satu sel (px) — kira-kira selebar kata + letter-spacing
const CH = 38; // tinggi satu sel / spasi antarbaris (px)
const FONT = `${FONT_SIZE}px monospace`;
const LETTER_SPACING = 9; // spasi antarhuruf kata grid (px) — gaya Wonder: huruf renggang
const TEXT_Y = (CH - FONT_SIZE) / 2 + FONT_SIZE * 0.8; // baseline teks, terpusat vertikal di sel
const INK = "206,206,214"; // warna grid (R,G,B) — abu-abu terang di atas hitam
const BASE_ALPHA = 0.3; // opasitas dasar minimum per sel
const BASE_ALPHA_RANGE = 0.15; // rentang acak opasitas dasar
const GLITCH_EVERY_MS = 240; // interval efek glitch (diturunkan dari 120: tempo perubahan teks lebih tenang, tidak bikin pusing)
const GLITCH_CELLS = 14; // jumlah sel yang disentuh tiap interval (dari 24)
const ALT_WORDS = ["DEV", "BUILD", "CODE"]; // kata sisipan yang muncul lebih terang
const ALT_BOOST = 0.32; // tambahan opasitas kata sisipan
const ALT_TICKS = 9; // durasi dasar kata sisipan (ditambah acak 0–14 tick @240 ms → total ±2,2–5,5 detik)
const MOUSE_RADIUS = 170; // radius highlight di sekitar kursor (px)
const HI_PEAK = 0.95; // opasitas puncak highlight tepat di pusat kursor (nyaris putih)
const HI_FADE_STEP = 0.35; // kecepatan sel mengejar target highlight tiap tick fade (50 ms)
const WAVE_BOOST = 0.22; // tambahan opasitas sel saat dilewati gelombang sapuan
const WAVE_BAND = 260; // lebar pita gelombang (px, dalam jarak diagonal dari sudut asal)
const HOLE_MAX_W = 660; // lebar maksimum lubang tengah (px)
const HOLE_MAX_H = 210; // tinggi maksimum lubang tengah (px)
const HOLE_W_RATIO = 0.86; // lebar lubang relatif ke layar (bila layar sempit)
const HOLE_H_RATIO = 0.36; // tinggi lubang relatif ke layar
const HOLE_RADIUS = 28; // radius sudut lubang (px)
const WAVE_TICK_MS = 110; // interval langkah gelombang sapuan (dari 80: sapuan lebih santai)
const WAVE_GAP_MS = 3500; // jeda diam antar sapuan gelombang
const MATRIX_H_RATIO = 0.72; // tinggi matriks titik: 72% dari ukuran font (± setinggi huruf kapital)
// --- spiral galaksi per huruf (dari halaman uji /spiral) ---
const SPIRAL_EVERY_MS = 700; // jeda pemicu otomatis spiral huruf (dipercepat lagi: lebih rame)
const SPIRAL_MAX = 7; // maks spiral huruf aktif bersamaan
const SPIRAL_GLITCH_MS = 150; // glitch pembuka/penutup urutan spiral
const SPIRAL_GROW_MS = 500; // spiral tumbuh (dipangkas: durasi total lebih singkat)
const SPIRAL_SHRINK_MS = 550; // spiral menguncup (dipangkas)
const SPIRAL_P_MIN = 0.2; // progres awal/akhir spiral (slot tidak terasa kosong sesaat)
/* ===================================================================== */

type Cell = { x: number; y: number; a: number; shown: boolean; hole: boolean };

export default function WonderScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const colsRef = useRef(0);
  const hiRef = useRef<Map<number, number>>(new Map()); // idx sel -> level highlight 0..1
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
      // matikan semua highlight yang sedang menyala
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        for (const i of hiRef.current.keys()) {
          const c = cellsRef.current[i];
          if (c) drawCell(ctx, c, c.a);
        }
      }
      hiRef.current.clear();
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

    function draw(c: Cell, alpha: number, text: string = WORD) {
      if (c.hole) return; // sel di lubang tengah tidak pernah digambar
      c.shown = true;
      drawCell(ctx!, c, alpha, text);
    }

    let visibleCells = 0; // jumlah sel di luar lubang, dihitung saat build
    let revealTimer: ReturnType<typeof setInterval> | null = null;
    function stopReveal() {
      if (revealTimer) {
        clearInterval(revealTimer);
        revealTimer = null;
      }
    }

    function build(instant = false) {
      // KUNCI RINGAN #1: DPR dikunci 1 — jangan ikut retina (3x = 9x piksel).
      cvs!.width = window.innerWidth;
      cvs!.height = window.innerHeight;
      ctx!.font = FONT;
      // letter-spacing renggang ala Wonder (Chromium; browser lain mengabaikan)
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${LETTER_SPACING}px`;
      ctx!.textBaseline = "alphabetic";
      // LUBANG TENGAH: area di balik konten hero dikosongkan — sel yang
      // titik tengahnya masuk lubang (persegi bersudut membulat di tengah
      // layar) tidak pernah digambar, jadi grid tampak berlubang.
      const holeW = Math.min(HOLE_MAX_W, cvs!.width * HOLE_W_RATIO);
      const holeH = Math.min(HOLE_MAX_H, cvs!.height * HOLE_H_RATIO);
      const holeX = (cvs!.width - holeW) / 2;
      const holeY = (cvs!.height - holeH) / 2;
      const inHole = (px: number, py: number) => {
        if (px < holeX || px > holeX + holeW || py < holeY || py > holeY + holeH)
          return false;
        const nx = Math.max(
          holeX + HOLE_RADIUS,
          Math.min(px, holeX + holeW - HOLE_RADIUS),
        );
        const ny = Math.max(
          holeY + HOLE_RADIUS,
          Math.min(py, holeY + holeH - HOLE_RADIUS),
        );
        const dx = px - nx;
        const dy = py - ny;
        return dx * dx + dy * dy <= HOLE_RADIUS * HOLE_RADIUS;
      };
      const cells: Cell[] = [];
      colsRef.current = Math.ceil(cvs!.width / CW);
      for (let y = 0; y * CH < cvs!.height; y++) {
        for (let x = 0; x * CW < cvs!.width; x++) {
          cells.push({
            x: x * CW,
            y: y * CH,
            a: BASE_ALPHA + Math.random() * BASE_ALPHA_RANGE,
            shown: false,
            hole: inHole(x * CW + CW / 2, y * CH + CH / 2),
          });
        }
      }
      cellsRef.current = cells;
      visibleCells = cells.filter((c) => !c.hole).length;
      hiRef.current.clear();
      spiralActive.clear(); // sel diganti total saat rebuild — spiral lama gugur
      stopReveal();
      if (instant || reduced) {
        for (const c of cells) draw(c, c.a);
        afterReveal();
        return;
      }
      // ANIMASI MASUK: sel-sel muncul menyapu secara diagonal dari satu
      // sudut layar ke sudut berseberangannya (±1 detik). Sudut awal
      // dipilih acak tiap kali halaman dimuat: 0 = kiri atas,
      // 1 = kanan atas, 2 = kiri bawah, 3 = kanan bawah.
      // Jarak dihitung dalam PIKSEL (bukan indeks sel): sel berukuran
      // 124×30 px, jadi sapuan berbasis indeks akan terlihat condong
      // vertikal seperti tirai, bukan diagonal sudut-ke-sudut.
      // Tiap sel tetap hanya digambar sekali — bukan loop per-frame.
      const W = cvs!.width;
      const H = cvs!.height;
      const corner = nextCorner();
      const maxDiag = W + H;
      const step = maxDiag / 25; // ±25 langkah × 40 ms ≈ 1 detik
      let diag = 0;
      revealTimer = setInterval(() => {
        diag += step;
        for (const c of cells) {
          if (c.shown) continue;
          const d = distFrom(corner, c.x, c.y);
          if (d <= diag) draw(c, c.a);
        }
        if (diag >= maxDiag) {
          stopReveal();
          afterReveal();
        }
      }, 40);
    }

    function afterReveal() {
      startGlitch();
      scheduleWave();
    }

    /* ---------- Efek glitch (semua digambar dari kode, tanpa aset) ----------
       Jenis kerusakan yang dipilih acak per sel:
       substitusi glyph · huruf hilang · posisi huruf jadi MATRIKS TITIK
       acak (satu-satunya bentuk pengganti huruf — bentuk balok sudah
       dihapus atas permintaan user, 29 Okt) · scramble (huruf berputar
       acak sebentar) — plus kata sisipan yang sesekali muncul lebih
       terang di satu sel lalu kembali. */
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
    function scrambleText() {
      const pool = WORD; // selaras GLYPHS: tanpa simbol (permintaan user)
      return WORD.replace(/./g, () => pool[(Math.random() * pool.length) | 0]);
    }

    // Metrik slot huruf: diturunkan dari LEBAR KATA UTUH persis seperti
    // yang digambar draw() (satu-satunya sumber kebenaran). Font grid
    // monospace — tiap huruf sama lebar — jadi lebar per huruf = lebar
    // kata dibagi jumlah huruf, TANPA pembulatan apa pun. (Pembulatan
    // per huruf yang lama menumpuk ±1 px/huruf dan menggeser kata di sel
    // glitch sampai menabrak sel tetangga — di Wonder asli semua huruf
    // tetap sama ukuran dan tidak pernah saling menggeser.)
    let slotCache: { adv: number; charW: number; total: number } | null = null;
    function slotMetrics() {
      if (!slotCache) {
        const g = ctx!;
        g.font = FONT;
        try {
          (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            `${LETTER_SPACING}px`;
        } catch {
          /* browser non-Chromium: abaikan */
        }
        const total = g.measureText(WORD).width;
        const adv = total / WORD.length;
        slotCache = { adv, charW: adv - LETTER_SPACING, total };
      }
      return slotCache;
    }
    function slotX(c: Cell, i: number) {
      const { adv, total } = slotMetrics();
      return c.x + (CW - total) / 2 + adv * i;
    }
    // Gambar huruf-huruf di luar rentang [start, start+count) satu per satu
    // pada slotnya masing-masing, alpha dasar. Slot di dalam rentang tidak
    // digambar sama sekali — digantikan penuh oleh matriks titik.
    function drawPlainSlots(c: Cell, start: number, count: number) {
      const g = ctx!;
      g.font = FONT;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      try {
        (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch {
        /* browser non-Chromium: abaikan */
      }
      g.fillStyle = `rgba(${INK},${c.a.toFixed(3)})`;
      for (let i = 0; i < WORD.length; i++) {
        if (i >= start && i < start + count) continue;
        g.fillText(WORD[i], slotX(c, i), c.y + TEXT_Y);
      }
    }

    // Pilih rentang huruf untuk matriks titik (maks 3). Rentang disimpan
    // oleh pemanggil yang persisten (cluster/front) supaya denyut
    // menggambar ulang rentang yang sama, tidak melompat-lompat.
    function pickSpan(max: number) {
      const count = 1 + ((Math.random() * max) | 0);
      const start = (Math.random() * (WORD.length - count + 1)) | 0;
      return { start, count };
    }

    // Matriks titik (satu-satunya bentuk pengganti huruf): 1–3 posisi huruf
    // berurutan DIGANTIKAN matriks titik selebar huruf aslinya. Polanya
    // ACAK tiap kemunculan — tidak seragam: jumlah kolom 3 atau 4, motif
    // penuh / acak berkerapatan acak / hanya tepi / selang-seling, dan
    // ukuran titik sedikit bervariasi.
    function drawDotLetters(
      c: Cell,
      alpha: number,
      span?: { start: number; count: number },
    ) {
      if (c.hole) return;
      const g = ctx!;
      const { charW } = slotMetrics();
      const { start, count } = span ?? pickSpan(3);
      const gridH = Math.round(FONT_SIZE * MATRIX_H_RATIO);
      const top = c.y + TEXT_Y - gridH;
      const cellH = gridH / 5;
      const colsN = Math.random() < 0.5 ? 3 : 4;
      const modeRoll = Math.random();
      const mode =
        modeRoll < 0.45
          ? "acak"
          : modeRoll < 0.65
            ? "penuh"
            : modeRoll < 0.85
              ? "tepi"
              : "silang";
      const holeP = 0.15 + Math.random() * 0.35; // kerapatan lubang utk mode acak
      const rad = 0.9 + Math.random() * 0.5; // jari-jari titik 0,9–1,4
      const cellW = charW / colsN;
      g.clearRect(c.x, c.y, CW, CH);
      drawPlainSlots(c, start, count);
      g.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
      for (let i = start; i < start + count; i++) {
        const sx = slotX(c, i);
        for (let r = 0; r < 5; r++) {
          for (let col = 0; col < colsN; col++) {
            let on = true;
            if (mode === "acak") on = Math.random() >= holeP;
            else if (mode === "tepi")
              on = r === 0 || r === 4 || col === 0 || col === colsN - 1;
            else if (mode === "silang") on = (r + col) % 2 === 0;
            if (!on) continue;
            g.beginPath();
            g.arc(
              sx + cellW * (col + 0.5),
              top + cellH * (r + 0.5),
              rad,
              0,
              Math.PI * 2,
            );
            g.fill();
          }
        }
      }
      c.shown = true;
      redrawsRef.current++;
    }

    // Scramble: sedikit sel berputar acak ±60 ms sekali selama ±0,3 detik.
    const scrambling = new Map<number, number>(); // idx -> sisa tick
    let scrambleTimer: ReturnType<typeof setInterval> | null = null;
    function startScramble(idx: number) {
      if (scrambling.has(idx)) return;
      scrambling.set(idx, 3 + ((Math.random() * 2) | 0));
      if (scrambleTimer) return;
      scrambleTimer = setInterval(() => {
        if (document.hidden) return;
        for (const [i, left] of Array.from(scrambling)) {
          const c = cellsRef.current[i];
          if (!c || c.hole) {
            scrambling.delete(i);
            continue;
          }
          if (left <= 1) {
            scrambling.delete(i);
            draw(c, c.a); // settle kembali ke kata normal
          } else {
            scrambling.set(i, left - 1);
            draw(c, c.a, scrambleText());
          }
        }
        if (scrambling.size === 0 && scrambleTimer) {
          clearInterval(scrambleTimer);
          scrambleTimer = null;
        }
      }, 100);
    }

    // Kata sisipan: satu sel menampilkan kata lain lebih terang beberapa detik.
    const altActive = new Map<number, number>(); // idx -> sisa tick glitch

    // Keadaan tampilan khusus yang bertahan beberapa detik (cluster & front):
    // sisa tick + jenis + rentang hurufnya, supaya matriks bisa berdenyut
    // (digambar ulang berkala dengan rentang yang sama persis).
    type FxState = {
      t: number;
      kind: "alt" | "dot";
      start: number;
      count: number;
    };

    // Cluster piksel: sekelompok sel tetangga berubah jadi matriks titik per huruf
    // bersama-sama (bercak seperti pixel-art), bertahan beberapa detik,
    // lalu larut satu per satu.
    const clusterActive = new Map<number, FxState>();

    // Front aktivitas berjalan (ala Wonder): sel yang dilewati gelombang
    // sapuan bisa "teraktivasi" — tampil sebagai kata sisipan /
    // matriks titik selama beberapa detik — jadi sapuan terasa seperti
    // gelombang aktivitas yang merambat melintasi grid, bukan sekadar pita
    // yang lebih terang, lalu reda kembali di belakangnya.
    const frontActive = new Map<number, FxState>();

    /* ============ SPIRAL GALAKSI PER HURUF ============
       Dari halaman uji /spiral, diterapkan ke halaman utama atas
       permintaan user (30 Okt). Satu huruf di dalam kata digantikan
       pusaran galaksi vertikal: glitch ±150 ms -> tumbuh ±600 ms ->
       hold ±1,6-3 detik -> menguncup ±700 ms (putaran berlawanan) ->
       glitch -> huruf kembali. SWITCH sungguhan: huruf itu tidak
       digambar sama sekali selama urutan berjalan, dan semua sistem
       lain (glitch, cluster, front, gelombang, highlight) melewati
       selnya. Loop rAF hanya hidup selama ada spiral aktif. */
    type SpiralState = {
      letter: number;
      phase: "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
      phaseStart: number;
      rot: number;
      holdMs: number;
      lastGlitchDraw: number;
    };
    const spiralActive = new Map<number, SpiralState>();
    let spiralRaf: number | null = null;
    let spiralLastFrame = 0;
    const easeOutCubicS = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInOutCubicS = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    function clearSpiralSlot(c: Cell, i: number) {
      const { charW } = slotMetrics();
      ctx!.clearRect(slotX(c, i) - 1, c.y, charW + 2, CH);
    }
    function drawSpiralChar(c: Cell, i: number, ch: string, alpha: number) {
      const g = ctx!;
      g.font = FONT;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      try {
        (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch { /* abaikan */ }
      g.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
      g.fillText(ch, slotX(c, i), c.y + TEXT_Y);
    }
    function drawSpiralGlyph(
      c: Cell,
      s: SpiralState,
      p: number,
      rot: number,
      alpha: number,
    ) {
      const g = ctx!;
      clearSpiralSlot(c, s.letter);
      const { charW } = slotMetrics();
      const cx = slotX(c, s.letter) + charW / 2;
      const cy = c.y + CH / 2 + 1;
      g.fillStyle = `rgba(238,238,244,${alpha.toFixed(3)})`;
      g.shadowColor = "rgba(238,238,244,0.8)";
      // Galaksi vertikal di slot huruf tegak (tinggi > lebar): elips
      // (0,8 x 1,55) dipasang sekali sebelum putaran; lengan digambar
      // per potongan dengan alpha memudar saat mengarah ke kiri/kanan
      // layar — terang penuh di atas/bawah saja (koreksi user).
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
      redrawsRef.current++;
    }
    function stepSpiralMain(idx: number, s: SpiralState, now: number, dt: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole) {
        spiralActive.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          clearSpiralSlot(c, s.letter);
          drawSpiralChar(
            c,
            s.letter,
            GLYPHS[(Math.random() * GLYPHS.length) | 0],
            Math.min(0.85, c.a + 0.35),
          );
          s.lastGlitchDraw = now;
        }
        if (elapsed >= SPIRAL_GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            spiralActive.delete(idx);
            draw(c, c.a); // huruf asli kembali
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
        for (const [idx, s] of Array.from(spiralActive)) {
          stepSpiralMain(idx, s, now, dt);
        }
        spiralRaf = spiralActive.size > 0 ? requestAnimationFrame(loop) : null;
      };
      spiralRaf = requestAnimationFrame(loop);
    }
    function spawnSpiral() {
      if (reduced || spiralActive.size >= SPIRAL_MAX) return;
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols) return;
      for (let tries = 0; tries < 24; tries++) {
        const idx = (Math.random() * cells.length) | 0;
        const c = cells[idx];
        if (!c || c.hole || !c.shown) continue;
        if (
          altActive.has(idx) ||
          clusterActive.has(idx) ||
          frontActive.has(idx) ||
          scrambling.has(idx) ||
          hiRef.current.has(idx) ||
          spiralActive.has(idx) ||
          bandSet.has(idx)
        )
          continue;
        // jangan bersebelahan dengan spiral lain (pola halaman uji)
        let nearOther = false;
        for (const other of spiralActive.keys()) {
          if (
            Math.abs((other % cols) - (idx % cols)) <= 1 &&
            Math.abs(Math.floor(other / cols) - Math.floor(idx / cols)) <= 1
          ) {
            nearOther = true;
            break;
          }
        }
        if (nearOther) continue;
        const letter = (Math.random() * WORD.length) | 0;
        spiralActive.set(idx, {
          letter,
          phase: "glitchIn",
          phaseStart: performance.now(),
          rot: Math.random() * Math.PI * 2,
          holdMs: 800 + Math.random() * 700, // hold singkat saja (permintaan user)
          lastGlitchDraw: 0,
        });
        ctx!.clearRect(c.x, c.y, CW, CH);
        drawPlainSlots(c, letter, 1); // kata tanpa huruf itu
        ensureSpiralLoop();
        break;
      }
    }
    const spiralTimer = reduced
      ? null
      : setInterval(() => {
          if (!document.hidden) spawnSpiral();
        }, SPIRAL_EVERY_MS);

    // KUNCI RINGAN #2: interval lambat + sedikit sel acak, BUKAN loop 60fps
    // yang menggambar ulang seluruh layar.
    let glitchTimer: ReturnType<typeof setInterval> | null = null;
    function startGlitch() {
      if (reduced || glitchTimer) return;
      glitchTimer = setInterval(() => {
        if (document.hidden) return;
        const cells = cellsRef.current;
        if (!cells.length) return;
        const occupied = (idx: number) =>
          altActive.has(idx) ||
          clusterActive.has(idx) ||
          scrambling.has(idx) ||
          frontActive.has(idx) ||
          spiralActive.has(idx);
        // urus kata sisipan & cluster yang sedang tampil: hitung mundur, pulihkan
        for (const [i, left] of Array.from(altActive)) {
          if (left <= 1) {
            altActive.delete(i);
            const c = cells[i];
            if (c && !c.hole) draw(c, c.a);
          } else altActive.set(i, left - 1);
        }
        // hitung mundur cluster & front; matriks yang bertahan
        // BERDENYUT halus: digambar ulang tiap 2 tick dengan alpha
        // berosilasi ±20% pada rentang huruf yang sama (tidak melompat)
        for (const [map, del] of [
          [clusterActive, (i: number) => clusterActive.delete(i)],
          [frontActive, (i: number) => frontActive.delete(i)],
        ] as const) {
          for (const [i, st] of Array.from(map)) {
            const c = cells[i];
            if (st.t <= 1) {
              del(i);
              if (c && !c.hole) draw(c, c.a);
              continue;
            }
            st.t -= 1;
            if (st.kind === "dot" && st.t % 2 === 0 && c && !c.hole) {
              const pulse =
                0.8 + 0.2 * (0.5 + 0.5 * Math.sin(st.t * 0.9 + i * 1.7));
              const a = Math.min(0.85, (c.a + 0.4) * pulse);
              drawDotLetters(c, a, st);
            }
          }
        }
        // kata sisipan: muncul berkelompok kecil (1–3 sel), bertahan
        // ±2,2–5,8 detik; jumlah aktif dibatasi ±8% sel yang terlihat
        const maxAlt = Math.max(3, Math.floor(visibleCells * 0.08));
        if (altActive.size < maxAlt && Math.random() < 0.06) {
          const group = 1 + ((Math.random() * 3) | 0);
          for (let k = 0; k < group; k++) {
            const idx = (Math.random() * cells.length) | 0;
            const c = cells[idx];
            if (!c || c.hole || hiRef.current.has(idx) || occupied(idx)) {
              continue;
            }
            altActive.set(idx, ALT_TICKS + ((Math.random() * 14) | 0));
            draw(
              c,
              Math.min(0.65, c.a + ALT_BOOST),
              ALT_WORDS[(Math.random() * ALT_WORDS.length) | 0],
            );
          }
        }
        // (Cluster matriks titik DIHAPUS atas permintaan user — satu-satunya
        // efek khusus yang tersisa adalah spiral huruf.)
        for (let i = 0; i < GLITCH_CELLS; i++) {
          const idx = (Math.random() * cells.length) | 0;
          const c = cells[idx];
          if (c.hole || hiRef.current.has(idx) || occupied(idx)) {
            continue; // lewati lubang, highlight mouse, & sel yang sedang tampil khusus
          }
          const roll = Math.random();
          if (roll < 0.42) draw(c, c.a); // pulihkan ke kata normal
          else if (roll < 0.66) draw(c, c.a, glitchText()); // substitusi glyph
          else if (roll < 0.76) draw(c, c.a, deleteText()); // huruf hilang
          else startScramble(idx); // scramble (matriks titik DIHAPUS atas permintaan user — efek khusus yang tersisa hanya spiral)
        }
      }, GLITCH_EVERY_MS);
    }
    function stopGlitch() {
      if (glitchTimer) {
        clearInterval(glitchTimer);
        glitchTimer = null;
      }
    }

    // Pemilihan sudut acak anti-tekak: sudut berikutnya tidak pernah sama
    // dengan sudut sapuan sebelumnya (berlaku untuk animasi masuk maupun
    // gelombang sapuan, karena keduanya memakai fungsi ini).
    let lastCorner = -1;
    function nextCorner() {
      let c = (Math.random() * 4) | 0;
      while (c === lastCorner) c = (Math.random() * 4) | 0;
      lastCorner = c;
      return c;
    }

    // Jarak diagonal sebuah titik dari salah satu sudut layar, dalam
    // piksel. Penomoran sudut mengikuti kuadran trigonometri:
    // 0 = kiri atas (kuadran 2), 1 = kanan atas (kuadran 1),
    // 2 = kiri bawah (kuadran 3), 3 = kanan bawah (kuadran 4).
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

    // GELOMBANG SAPUAN DIAGONAL: pita diagonal selebar WAVE_BAND (dalam
    // jarak piksel dari sudut asal) menyapu layar dari satu sudut ke sudut
    // berseberangannya — kuadran 2 → 4, kuadran 1 → 3, atau sebaliknya —
    // dipilih acak tiap sapuan. Hanya sel yang masuk/keluar pita yang
    // digambar ulang — tetap sejalan dengan prinsip "sentuh seperlunya".
    let waveTimer: ReturnType<typeof setInterval> | null = null;
    let waveTimeout: ReturnType<typeof setTimeout> | null = null;
    let waveCorner = 0;
    let waveFront = 0;
    let bandSet = new Set<number>();

    function restoreBand() {
      const cells = cellsRef.current;
      for (const idx of bandSet) {
        if (hiRef.current.has(idx)) continue; // jangan timpa highlight mouse
        if (frontActive.has(idx)) continue; // aktivasi front dipulihkan oleh hitung mundurnya sendiri
        if (spiralActive.has(idx)) continue; // sel spiral mengurus tampilannya sendiri
        const c = cells[idx];
        if (c && c.shown) draw(c, c.a);
      }
      bandSet = new Set();
    }

    function stepWave() {
      if (document.hidden) return;
      const cells = cellsRef.current;
      const maxDiag = cvs!.width + cvs!.height;
      waveFront += maxDiag / 20; // satu sapuan penuh ±1,6 detik
      const next = new Set<number>();
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (
          !c.shown ||
          altActive.has(i) ||
          clusterActive.has(i) ||
          frontActive.has(i) ||
          spiralActive.has(i)
        )
          continue;
        const d = distFrom(waveCorner, c.x, c.y);
        if (d <= waveFront && d > waveFront - WAVE_BAND) next.add(i);
      }
      for (const idx of next) {
        if (bandSet.has(idx) || hiRef.current.has(idx)) continue;
        const c = cells[idx];
        if (Math.random() < 0.5) {
          // AKTIVASI FRONT: sel jadi kata sisipan selama ±1,7–3,6 detik —
          // inilah "gerakan" khas Wonder: aktivitas merambat bersama sapuan.
          // (Varian matriks titik DIHAPUS atas permintaan user.)
          const t = 7 + ((Math.random() * 8) | 0); // tick @240 ms -> ±1,7–3,6 detik, sama seperti sebelumnya
          frontActive.set(idx, { t, kind: "alt", start: 0, count: 0 });
          draw(
            c,
            Math.min(0.65, c.a + ALT_BOOST),
            ALT_WORDS[(Math.random() * ALT_WORDS.length) | 0],
          );
        } else {
          draw(c, Math.min(0.45, c.a + WAVE_BOOST));
        }
      }
      for (const idx of bandSet) {
        if (
          next.has(idx) ||
          hiRef.current.has(idx) ||
          frontActive.has(idx) ||
          spiralActive.has(idx)
        )
          continue;
        const c = cells[idx];
        if (c) draw(c, c.a);
      }
      bandSet = next;
      if (waveFront - WAVE_BAND > maxDiag) endWave();
    }

    function startWave() {
      if (reduced || waveTimer) return;
      waveCorner = nextCorner();
      waveFront = 0;
      bandSet = new Set();
      waveTimer = setInterval(stepWave, WAVE_TICK_MS);
    }

    function endWave() {
      if (waveTimer) {
        clearInterval(waveTimer);
        waveTimer = null;
      }
      restoreBand();
      scheduleWave();
    }

    function scheduleWave() {
      if (reduced) return;
      if (waveTimeout) clearTimeout(waveTimeout);
      waveTimeout = setTimeout(startWave, WAVE_GAP_MS);
    }

    function stopWaveAll() {
      if (waveTimer) {
        clearInterval(waveTimer);
        waveTimer = null;
      }
      if (waveTimeout) {
        clearTimeout(waveTimeout);
        waveTimeout = null;
      }
      restoreBand();
    }

    // HIGHLIGHT MOUSE HALUS (ala Wonder): tiap sel punya level 0..1 yang
    // mengejar target — target dihitung dari jarak ke kursor dengan falloff
    // kuadrat (tengah paling terang, tepi memudar). Tick fade 50 ms hanya
    // berjalan selama ada sel yang sedang menyala/bergerak, dan hanya sel
    // yang levelnya berubah yang digambar ulang — tetap ringan.
    let fadeTimer: ReturnType<typeof setInterval> | null = null;
    function hiTarget(idx: number): number {
      const m = mouseRef.current;
      const cell = cellsRef.current[idx];
      if (!m || !cell || !mouseOnRef.current || reduced) return 0;
      const dx = cell.x + CW / 2 - m.x;
      const dy = cell.y + CH / 2 - m.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= MOUSE_RADIUS) return 0;
      const t = 1 - d / MOUSE_RADIUS;
      return Math.pow(t, 1.5); // falloff lebar: area tengah ikut terang, tepi memudar
    }
    function stepFade() {
      const cells = cellsRef.current;
      const cols = colsRef.current;
      const levels = hiRef.current;
      if (!cells.length || !cols) return;
      const cand = new Set<number>(levels.keys());
      const m = mouseRef.current;
      if (m && mouseOnRef.current && !reduced) {
        const c0 = Math.max(0, Math.floor((m.x - MOUSE_RADIUS) / CW));
        const c1 = Math.min(cols - 1, Math.floor((m.x + MOUSE_RADIUS) / CW));
        const r0 = Math.max(0, Math.floor((m.y - MOUSE_RADIUS) / CH));
        const r1 = Math.floor((m.y + MOUSE_RADIUS) / CH);
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const idx = r * cols + c;
            const cell = cells[idx];
            if (cell && cell.shown) cand.add(idx);
          }
        }
      }
      let anyMoving = false;
      for (const idx of cand) {
        const cell = cells[idx];
        if (!cell) {
          levels.delete(idx);
          continue;
        }
        if (
          altActive.has(idx) ||
          clusterActive.has(idx) ||
          frontActive.has(idx) ||
          spiralActive.has(idx)
        ) {
          levels.delete(idx); // tampilan khusus tidak ditimpa highlight
          continue;
        }
        const target = hiTarget(idx);
        const cur = levels.get(idx) ?? 0;
        let next = cur + (target - cur) * HI_FADE_STEP;
        if (Math.abs(target - next) < 0.03) next = target;
        if (next <= 0.01 && target === 0) {
          if (cur > 0) draw(cell, cell.a);
          levels.delete(idx);
          continue;
        }
        levels.set(idx, next);
        if (Math.abs(next - cur) > 0.02) {
          // terang dihitung menuju puncak absolut — selalu kontras di atas
          // opasitas dasar sel, tidak peduli sel itu dasarnya terang/redup
          draw(cell, cell.a + next * (HI_PEAK - cell.a));
          anyMoving = true;
        } else if (Math.abs(target - next) > 0.02) {
          anyMoving = true; // masih merayap menuju target
        }
      }
      if (!anyMoving && fadeTimer) {
        clearInterval(fadeTimer);
        fadeTimer = null;
      }
    }
    function ensureFade() {
      if (!fadeTimer && !reduced) fadeTimer = setInterval(stepFade, 50);
    }

    function onPointerMove(e: PointerEvent) {
      mouseRef.current = { x: e.clientX, y: e.clientY };
      ensureFade();
    }
    function onPointerLeave() {
      mouseRef.current = null;
      ensureFade();
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      // debounce: jangan rebuild tiap piksel; rebuild saat resize tanpa animasi masuk
      resizeTimer = setTimeout(() => {
        build(true);
        startGlitch();
        scheduleWave();
      }, 150);
    }

    // KUNCI RINGAN #4: berhenti total saat tab tidak aktif.
    function onVisibility() {
      if (document.hidden) {
        stopGlitch();
        stopWaveAll();
      } else {
        startGlitch();
        scheduleWave();
      }
    }

    const debugTimer = setInterval(() => {
      if (!debugOnRef.current) return;
      setDebugText(
        `${redrawsRef.current} sel digambar/detik · ${cellsRef.current.length} sel total`,
      );
      redrawsRef.current = 0;
    }, 1000);

    build();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopGlitch();
      if (spiralTimer) clearInterval(spiralTimer);
      if (spiralRaf !== null) cancelAnimationFrame(spiralRaf);
      if (scrambleTimer) clearInterval(scrambleTimer);
      if (fadeTimer) clearInterval(fadeTimer);
      stopReveal();
      stopWaveAll();
      clearInterval(debugTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function drawCell(
    ctx: CanvasRenderingContext2D,
    c: Cell,
    alpha: number,
    text: string = WORD,
  ) {
    ctx.clearRect(c.x, c.y, CW, CH);
    // Set SEMUA state teks secara eksplisit di sini: posisi kata dihitung dari
    // measureText, jadi font/letterSpacing ambient yang tertinggal dari jalur
    // gambar lain (atau reset state canvas) bisa menggeser kata keluar selnya.
    ctx.font = FONT;
    (ctx as unknown as { letterSpacing: string }).letterSpacing =
      `${LETTER_SPACING}px`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
    // kata selalu terpusat horizontal di tengah selnya
    const w = ctx.measureText(text).width;
    ctx.fillText(text, c.x + (CW - w) / 2, c.y + TEXT_Y);
    redrawsRef.current++;
  }

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
              <a href="#cara-kerja">Cara kerja ▾</a>
              <a href="#performa">Performa</a>
            </nav>
          </div>
          <a className="nav-cta" href="#cara-kerja">
            Coba Demo
          </a>
        </header>

        <main>
          <section className="hero">
            <h1>Amamiya</h1>
          </section>

          <section id="cara-kerja" className="section">
            <h2>Cara kerja</h2>
            <div className="cards">
              <article className="card">
                <h3>1 · Gambar sekali</h3>
                <p>
                  Grid di-render satu kali saat load dan resize (di-debounce).
                  Tidak ada gambar latar, tidak ada video, tidak ada ribuan
                  elemen DOM — hanya satu canvas. Area di balik teks utama
                  dikosongkan, jadi grid tampak berlubang di tengah.
                </p>
              </article>
              <article className="card">
                <h3>2 · Sentuh seperlunya</h3>
                <p>
                  Animasi memakai interval lambat: ±24 sel acak digambar ulang
                  tiap 120&nbsp;ms — diganti glyph glitch (<code>AMA^IYA</code>),
                  huruf hilang, atau posisi hurufnya berubah jadi matriks
                  titik acak yang terang ala Wonder —
                  lalu kembali normal dengan sendirinya.
                  Kata sisipan (<code>DEV</code>, <code>BUILD</code>,{" "}
                  <code>CODE</code>) muncul berkelompok
                  lebih terang, dan kadang beberapa sel tetangga rusak
                  bersamaan membentuk bercak piksel seperti pixel-art.
                </p>
              </article>
              <article className="card">
                <h3>3 · Lokal di sekitar kursor</h3>
                <p>
                  Highlight mouse hanya menghitung sel dalam radius 170&nbsp;px
                  di sekitar kursor — sub-grid kecil, bukan seluruh layar.
                  Terangnya bergradasi mengikuti jarak dan menyala/memudar
                  dengan lembut, tidak menyentak.
                </p>
              </article>
            </div>
          </section>

          <section id="performa" className="section">
            <h2>Kenapa ringan?</h2>
            <p className="body-text">
              Background interaktif biasanya berat karena menggambar ulang
              seluruh layar 60 kali per detik, memakai resolusi retina penuh,
              dan tetap berjalan saat tab tidak terlihat. Di sini keempatnya
              dihindari: DPR canvas dikunci 1, tidak ada loop per-frame,
              animasi berhenti saat tab tidak aktif, dan{" "}
              <code>prefers-reduced-motion</code> dihormati. Buktinya bisa kamu
              lihat sendiri — nyalakan tombol <strong>Debug</strong> di kiri
              bawah dan bandingkan angka "sel digambar/detik" dengan total
              sel di layar.
            </p>
          </section>
        </main>

        <footer className="footer">
          Demo background grid tipografi · Next.js + Canvas 2D
        </footer>
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
