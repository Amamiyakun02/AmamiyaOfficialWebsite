"use client";

import { useEffect, useRef, useState } from "react";

/* =====================================================================
   KONFIGURASI BACKGROUND — ubah bagian ini untuk mengutak-atik pola
   ===================================================================== */
const WORD = "AMAMIYA"; // kata yang diulang menjadi pola grid
// MODE DIAM: bila true, kata AMAMIYA tidak berubah sama sekali — glitch
// substitusi/hapus, scramble, kata sisipan, front, gelombang, dan heat
// kursor SEMUA mati; hanya SPIRAL yang hidup. (Sempat diaktifkan user
// 30 Okt malam saat memburu bug sisa glitch, lalu diminta dimatikan lagi
// malam yang sama setelah spiral terbungkus rapi & glitch dibuat
// bertenggat — efek ambient hidup lagi dengan pagar pengamannya.)
const STATIC_TEXT = false;
const GLYPHS = "AMAMIYA"; // karakter pengganti glitch — hanya huruf penyusun kata (simbol & angka dihapus atas permintaan user)
const FONT_SIZE = 20; // ukuran font grid (px)
const CW = 170; // lebar satu sel (px) — kira-kira selebar kata + letter-spacing
const CH = 38; // tinggi satu sel / spasi antarbaris (px)
const FONT = `${FONT_SIZE}px monospace`;
const LETTER_SPACING = 9; // spasi antarhuruf kata grid (px) — gaya Wonder: huruf renggang
const TEXT_Y = (CH - FONT_SIZE) / 2 + FONT_SIZE * 0.8; // baseline teks, terpusat vertikal di sel
const INK = "233,233,242"; // warna grid (R,G,B) — nyaris putih kebiruan, cerah seperti bintang (permintaan user)
const BASE_ALPHA = 0.44; // opasitas dasar minimum per sel (dinaikkan: grid lebih cerah)
const BASE_ALPHA_RANGE = 0.16; // rentang acak opasitas dasar
const GLITCH_EVERY_MS = 240; // interval efek glitch (diturunkan dari 120: tempo perubahan teks lebih tenang, tidak bikin pusing)
const GLITCH_CELLS = 14; // jumlah sel yang disentuh tiap interval (dari 24)
const ALT_WORDS = ["DEV", "BUILD", "CODE"]; // kata sisipan yang muncul lebih terang
const ALT_BOOST = 0.38; // tambahan opasitas kata sisipan
const ALT_MS = 2200; // durasi dasar kata sisipan (ditambah acak 0–3,3 detik → total ±2,2–5,5 detik)
const HEAT_RX = 78; // jangkauan panas per HURUF: ±3 huruf lebih dari kursor -> tambalan ±6 huruf ke samping (pengamatan user dari video Wonder asli)
const HEAT_RY = 57; // ±1,5 baris -> tambalan ±3 blok huruf ke atas/bawah
const HEAT_DECAY = 0.9; // heat dikalikan ini tiap frame rAF — jejak kursor memudar
const HEAT_MIN = 0.08; // di bawah ambang ini sel kembali ke huruf asli
const HEAT_MAX_MS = 1400; // batas waktu keras: sel panas WAJIB pulih sebelum ini, walau frame lambat
const HEAT_RAMP = ["░", "▒", "▓", "█"]; // kepadatan blok mengikuti heat
const HEAT_GLITCH = ["▌", "▐", "▚", ":", "⠿"]; // karakter kedip acak sesekali di sel panas
const WAVE_BOOST = 0.26; // tambahan opasitas sel saat dilewati gelombang sapuan
const WAVE_BAND = 260; // lebar pita gelombang (px, dalam jarak diagonal dari sudut asal)
const HOLE_MAX_W = 660; // lebar maksimum lubang tengah (px)
const HOLE_MAX_H = 210; // tinggi maksimum lubang tengah (px)
const HOLE_W_RATIO = 0.86; // lebar lubang relatif ke layar (bila layar sempit)
const HOLE_H_RATIO = 0.36; // tinggi lubang relatif ke layar
const HOLE_RADIUS = 28; // radius sudut lubang (px)
const WAVE_TICK_MS = 110; // interval langkah gelombang sapuan (dari 80: sapuan lebih santai)
const WAVE_GAP_MS = 3500; // jeda diam antar sapuan gelombang

// --- spiral galaksi per huruf (dari halaman uji /spiral) ---
const SPIRAL_EVERY_MS = 700; // jeda pemicu otomatis spiral huruf (dipercepat lagi: lebih rame)
const SPIRAL_MAX = 7; // maks spiral huruf aktif bersamaan
const SPIRAL_GLITCH_MS = 150; // glitch pembuka/penutup urutan spiral
const SPIRAL_GROW_MS = 500; // spiral tumbuh (dipangkas: durasi total lebih singkat)
const SPIRAL_SHRINK_MS = 550; // spiral menguncup (dipangkas)
const SPIRAL_P_MIN = 0.2; // progres awal/akhir spiral (slot tidak terasa kosong sesaat)
/* ===================================================================== */

type Cell = { x: number; y: number; a: number; shown: boolean; hole: boolean };
type SlotHeat = { heat: number; glyph: string; born: number }; // panas per slot huruf
type HeatState = { slots: (SlotHeat | null)[] }; // keadaan panas sebuah kata (per slot)

export default function WonderScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const colsRef = useRef(0);
  const hiRef = useRef<Map<number, HeatState>>(new Map()); // idx sel -> keadaan panas kursor
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
      // Ukuran diambil dari elemen canvas sendiri (sekarang canvas adalah
      // isi <main> di bawah navbar, bukan lagi lapisan seukuran jendela).
      cvs!.width = cvs!.clientWidth || window.innerWidth;
      cvs!.height = cvs!.clientHeight || window.innerHeight;
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
      if (heatRaf !== null) {
        cancelAnimationFrame(heatRaf);
        heatRaf = null;
      }
      // SEMUA keadaan efek dibersihkan saat rebuild: sel diganti total,
      // jadi sisa status dari grid lama (kata sisipan, front, scramble,
      // spiral, pita gelombang) hanya akan menggambar di atas sel baru
      // secara keliru. (Sebelumnya hanya spiral & highlight yang dibersihkan.)
      spiralActive.clear();
      altActive.clear();
      frontActive.clear();
      scrambling.clear();
      glitchCells.clear();
      spentSet.clear();
      if (scrambleTimer) {
        clearInterval(scrambleTimer);
        scrambleTimer = null;
      }
      stopWaveAll();
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
      if (STATIC_TEXT) return; // mode diam: tidak ada efek teks ambient
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
    // === Kata bertopeng (mekanisme spiral sekarang) ===
    // Huruf tuan rumah spiral TIDAK lagi dihapus/digambar per slot dari
    // hitungan lebar manual — cara itu meleset beberapa piksel dari posisi
    // huruf yang benar-benar digambar browser, jadi penghapusnya tidak
    // menutupi huruf dengan pas dan menyisakan goresan (fragmen "/" dan
    // "," di sekitar spiral pada screenshot user). Sekarang huruf
    // disembunyikan dengan menggantinya menjadi SPASI lalu kata dirender
    // ulang lewat draw() biasa: satu fillText yang sama persis dengan kata
    // utuh, jadi posisi semua huruf lain identik piksel per piksel dan
    // tidak ada yang perlu "dihapus".
    function maskedWord(k: number, ch?: string): string {
      const arr = WORD.split("");
      arr[k] = ch ?? " ";
      return arr.join("");
    }
    // Pusat galaksi: diturunkan dari advance murni huruf (letterSpacing 0,
    // tanpa ambiguitas spasi-ekor pengukuran) + langkah per huruf.
    let a0Cache: number | null = null;
    function spiralCenterX(c: Cell, i: number) {
      if (a0Cache === null) {
        const g = ctx!;
        g.font = FONT;
        try {
          (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            "0px";
        } catch { /* abaikan */ }
        a0Cache = g.measureText(WORD).width / WORD.length;
        try {
          (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
            `${LETTER_SPACING}px`;
        } catch { /* abaikan */ }
      }
      const step = a0Cache + LETTER_SPACING;
      return c.x + CW / 2 - (step * WORD.length) / 2 + step * i + a0Cache / 2;
    }
    // Tinggi tinta huruf kapital font grid (dari metrik teks "A"):
    // patokan tinggi spiral agar sebesar huruf di sekitarnya.
    let capHCache: number | null = null;
    function capHeight() {
      if (capHCache === null) {
        const g = ctx!;
        g.font = FONT;
        const m = g.measureText("A");
        const h =
          (m.actualBoundingBoxAscent ?? 14) + (m.actualBoundingBoxDescent ?? 0);
        capHCache = h > 4 ? h : 14;
      }
      return capHCache;
    }

    // (Fungsi matriks titik drawDotLetters/pickSpan DIHAPUS TOTAL — efek itu
    // sudah diminta user dihilangkan; tidak ada lagi kode gambar per-slot
    // selain milik spiral, jadi tidak ada jalur yang bisa menggambar huruf
    // di luar geometri kata normal.)

    // Scramble: sedikit sel berputar acak tiap 100 ms selama ±0,3–0,5 detik.
    // PENTING (perbaikan bug "kata tidak normal berlama-lama"): semua masa
    // hidup efek di bawah ini disimpan sebagai TENGGAT WAKTU
    // (performance.now), BUKAN hitungan tick. Versi tick membuat efek
    // berumur jauh lebih panjang setiap kali timer browser diperlambat
    // (tab latar belakang/tertutup jendela lain) — efek menumpuk dan
    // bertahan abnormal. Dengan tenggat, efek selalu berakhir tepat waktu
    // bagaimanapun timer berjalan.
    const scrambling = new Map<number, number>(); // idx -> tenggat
    let scrambleTimer: ReturnType<typeof setInterval> | null = null;
    function startScramble(idx: number) {
      if (scrambling.has(idx)) return;
      scrambling.set(idx, performance.now() + 300 + Math.random() * 200);
      if (scrambleTimer) return;
      scrambleTimer = setInterval(() => {
        if (document.hidden) return;
        const now = performance.now();
        for (const [i, until] of Array.from(scrambling)) {
          const c = cellsRef.current[i];
          if (!c || c.hole) {
            scrambling.delete(i);
            continue;
          }
          if (now >= until) {
            scrambling.delete(i);
            draw(c, c.a); // settle kembali ke kata normal
          } else {
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
    const altActive = new Map<number, number>(); // idx -> tenggat

    // Front aktivitas berjalan (ala Wonder): sel yang dilewati gelombang
    // sapuan bisa "teraktivasi" jadi kata sisipan selama beberapa detik —
    // sapuan terasa seperti gelombang aktivitas yang merambat melintasi
    // grid, lalu reda kembali di belakangnya.
    const frontActive = new Map<number, number>(); // idx -> tenggat

    // Glitch substitusi/hapus huruf: WAJIB bertenggat seperti sistem lain.
    // (Akar bug "kata rusak menetap & menumpuk" yang dilaporkan user:
    // dulu gambar substitusi/hapus digambar sekali tanpa status dan tanpa
    // pemulihan terjadwal — hanya pulih bila kebetulan terpilih lagi.
    // Saat timer browser diperlambat, kata rusak menumpuk dan bertahan
    // sangat lama, hanya tersapu sebagian oleh gelombang diagonal.)
    const glitchCells = new Map<number, number>(); // idx -> tenggat pulih

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

    // Menggambar lengan galaksi saja — sel (termasuk kata bertopengnya)
    // sudah dilukis pemanggil lewat draw() sebelum fungsi ini dipanggil.
    function drawSpiralGlyph(
      c: Cell,
      s: SpiralState,
      p: number,
      rot: number,
      alpha: number,
    ) {
      const g = ctx!;
      const cx = spiralCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      g.fillStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.shadowColor = "rgba(245,245,255,0.8)";
      // Tinggi galaksi = tinggi huruf di sekitarnya (permintaan user):
      // skala Y dihitung dari tinggi tinta huruf kapital "A" pada font
      // grid yang benar-benar terpakai, jadi diameter vertikal galaksi
      // (2 * R * skalaY) persis setinggi huruf tetangganya. Lengan tetap
      // digambar per potongan dengan alpha memudar saat mengarah ke
      // kiri/kanan layar — terang penuh di atas/bawah saja.
      const R = 9.2;
      const R0 = 1.1;
      const ARM_TURNS = Math.PI * 2 * 0.38;
      const upto = ARM_TURNS * p;
      g.lineWidth = 1.35;
      g.lineCap = "round";
      g.shadowBlur = 2.2; // cahaya bintang lebih menyala
      g.save();
      g.translate(cx, cy);
      g.scale(0.8, capHeight() / 2 / R);
      g.rotate(rot);
      const steps = 48;
      const CHUNK = 4;
      // 4 lengan saja (permintaan user): 8 lengan terlalu padat —
      // galaksi terlihat seperti lingkaran penuh, bukan spiral berlengan.
      for (let a = 0; a < 4; a++) {
        g.save();
        g.rotate((a * Math.PI) / 2);
        for (let s0 = 0; s0 < steps; s0 += CHUNK) {
          const thMid = (upto * (s0 + CHUNK / 2)) / steps;
          const screenAng = thMid + rot + (a * Math.PI) / 2;
          const fade = 1 - 0.85 * Math.pow(Math.abs(Math.cos(screenAng)), 1.3);
          g.strokeStyle = `rgba(245,245,255,${(alpha * Math.max(0.08, fade)).toFixed(3)})`;
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
      // matikan bayangan spiral di sumbernya juga (jangan bocor ke gambar lain)
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
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
          // karakter kedip digambar sebagai kata bertopeng: huruf lain
          // tetap di posisi aslinya, hanya slot spiral yang berkedip
          draw(
            c,
            c.a,
            maskedWord(s.letter, GLYPHS[(Math.random() * GLYPHS.length) | 0]),
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
        draw(c, c.a, maskedWord(s.letter)); // kata tanpa huruf tuan rumah
        drawSpiralGlyph(c, s, p, s.rot, 1);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        s.rot += dt * 0.5;
        draw(c, c.a, maskedWord(s.letter));
        drawSpiralGlyph(c, s, 1, s.rot, 0.92 + 0.08 * Math.sin(now / 280));
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
        draw(c, c.a, maskedWord(s.letter));
        drawSpiralGlyph(c, s, p, s.rot, 1);
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
        draw(c, c.a, maskedWord(letter)); // kata utuh tanpa huruf tuan rumah
        ensureSpiralLoop();
        break;
      }
    }
    const spiralTimer = reduced
      ? null
      : setInterval(() => {
          if (document.hidden) return;
          // WATCHDOG SPIRAL: loop rAF bisa berhenti tanpa kabar (tab
          // tertutup jendela lain / rAF kelaparan) sementara spiral masih
          // tercatat aktif — selnya membeku sebagai "kata tanpa huruf"
          // tanpa batas waktu dan semua sistem lain melewatinya. Bila
          // frame terakhir sudah terlalu lama, paksa selesaikan semua
          // spiral: huruf dikembalikan dan antrean dibersihkan.
          if (
            spiralActive.size > 0 &&
            performance.now() - spiralLastFrame > 2500
          ) {
            for (const idx of Array.from(spiralActive.keys())) {
              const c = cellsRef.current[idx];
              if (c && !c.hole) draw(c, c.a);
            }
            spiralActive.clear();
            spiralRaf = null;
          }
          spawnSpiral();
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
          scrambling.has(idx) ||
          frontActive.has(idx) ||
          spiralActive.has(idx);
        // pulihkan kata sisipan & front yang tenggat waktunya sudah lewat
        const now = performance.now();
        for (const map of [altActive, frontActive]) {
          for (const [i, until] of Array.from(map)) {
            if (now < until) continue;
            map.delete(i);
            const c = cells[i];
            if (c && !c.hole) draw(c, c.a);
          }
        }
        // pulihkan glitch substitusi/hapus yang tenggatnya sudah lewat —
        // dijamin kembali normal pada tick pertama setelah tenggat,
        // bagaimanapun lambatnya timer berjalan
        for (const [i, until] of Array.from(glitchCells)) {
          if (now < until) continue;
          glitchCells.delete(i);
          const c = cells[i];
          if (c && !c.hole && !occupied(i) && !hiRef.current.has(i))
            draw(c, c.a);
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
            altActive.set(idx, now + ALT_MS + Math.random() * 3300); // tampil ±2,2–5,5 detik (tenggat waktu)
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
          const maxGlitch = Math.max(4, Math.floor(visibleCells * 0.06));
          if (roll < 0.42) {
            glitchCells.delete(idx);
            draw(c, c.a); // pulihkan ke kata normal
          } else if (roll < 0.66) {
            // substitusi glyph — tampil ±0,4–0,9 detik lalu WAJIB pulih
            if (glitchCells.size < maxGlitch && !glitchCells.has(idx)) {
              glitchCells.set(idx, now + 400 + Math.random() * 500);
              draw(c, c.a, glitchText());
            }
          } else if (roll < 0.76) {
            // huruf hilang — sama, bertenggat
            if (glitchCells.size < maxGlitch && !glitchCells.has(idx)) {
              glitchCells.set(idx, now + 400 + Math.random() * 500);
              draw(c, c.a, deleteText());
            }
          } else startScramble(idx); // scramble (sudah bertenggat)
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
          frontActive.has(i) ||
          spiralActive.has(i) ||
          hiRef.current.has(i)
        )
          continue;
        const d = distFrom(waveCorner, c.x, c.y);
        if (d <= waveFront && d > waveFront - WAVE_BAND) next.add(i);
      }
      // Batas jumlah front aktif bersamaan: tanpa batas ini, satu sapuan
      // (yang melewati SEMUA sel) bisa mengaktivasi ±50% isi grid jadi kata
      // sisipan sekaligus — grid "banjir" kata asing dan terlihat tidak
      // normal (terbukti dari tangkapan diagnostik: 39 front aktif).
      const maxFront = Math.max(4, Math.floor(visibleCells * 0.07));
      for (const idx of next) {
        if (bandSet.has(idx) || hiRef.current.has(idx)) continue;
        const c = cells[idx];
        if (Math.random() < 0.18 && frontActive.size < maxFront) {
          // AKTIVASI FRONT: sel jadi kata sisipan selama ±1,7–3,6 detik —
          // inilah "gerakan" khas Wonder: aktivitas merambat bersama sapuan.
          frontActive.set(
            idx,
            performance.now() + 1700 + Math.random() * 1900,
          );
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

    // HIGHLIGHT KURSOR "HEAT" (dari analisa video Muse Wonder): huruf di
    // sekitar kursor berubah jadi karakter blok/dither. Panas dihitung PER
    // HURUF (bukan per kata) — tambalannya ±6 huruf ke samping dan ±3 baris
    // ke atas/bawah mengikuti kursor, menyeberang batas kata seperti grid
    // karakter aslinya (pengamatan user dari video Wonder). Tiap huruf
    // punya heat 0..1 — dipanaskan oleh kedekatan kursor (1 - jarak +
    // noise, jadi tepinya bergerigi), mendingin ×0,9 tiap frame (jejak
    // memudar pelan), lalu kembali ke huruf asli di bawah ambang. Heat
    // dipetakan ke ░▒▓█: makin dekat kursor makin padat & terang, dengan
    // peluang kecil karakter glitch agar berkedip. Digambar per slot
    // huruf supaya tekstur kata grid tetap utuh; hanya sel panas yang
    // diproses tiap frame rAF — tetap ringan.
    let heatRaf: number | null = null;
    let lastMoveAt = 0;
    // Sel yang sudah menyala pada lintasan kursor kali ini: TIDAK dipanaskan
    // lagi sampai kursor benar-benar keluar dari jangkauannya — efeknya
    // sekali saja per geseran kursor, bukan menyala terus selama kursor dekat.
    const spentSet = new Set<number>(); // kunci slot: idx * WORD.length + slot
    function slotCenterX(c: Cell, i: number) {
      return slotX(c, i) + slotMetrics().charW / 2;
    }
    function drawHeatCell(c: Cell, hc: HeatState) {
      const g = ctx!;
      g.clearRect(c.x, c.y, CW, CH);
      g.font = FONT;
      g.textAlign = "left";
      g.textBaseline = "alphabetic";
      try {
        (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${LETTER_SPACING}px`;
      } catch {
        /* browser non-Chromium: abaikan */
      }
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      for (let i = 0; i < WORD.length; i++) {
        const s = hc.slots[i];
        if (!s) {
          // slot dingin: huruf asli pada opasitas dasar kata
          g.fillStyle = `rgba(${INK},${c.a})`;
          g.fillText(WORD[i], slotX(c, i), c.y + TEXT_Y);
          continue;
        }
        if (!s.glyph || Math.random() < 0.2) {
          // kedip acak: glyph diganti sesekali saja, tidak tiap frame
          const jitter = (Math.random() - 0.5) * 0.25;
          const h = Math.max(0, Math.min(1, s.heat + jitter));
          s.glyph =
            Math.random() < 0.12
              ? HEAT_GLITCH[(Math.random() * HEAT_GLITCH.length) | 0]
              : HEAT_RAMP[Math.min(3, (h * 4) | 0)];
        }
        const a = Math.min(1, 0.35 + s.heat * 0.65);
        g.fillStyle = `rgba(${INK},${a.toFixed(3)})`;
        g.fillText(s.glyph, slotX(c, i), c.y + TEXT_Y);
      }
      redrawsRef.current++;
    }
    function stepHeat() {
      const cells = cellsRef.current;
      const cols = colsRef.current;
      const m = mouseRef.current;
      const now = performance.now();
      // 0) bebaskan slot "habis pakai" yang kursornya sudah jauh / pergi
      for (const key of Array.from(spentSet)) {
        const idx = Math.floor(key / WORD.length);
        const i = key % WORD.length;
        const cell = cells[idx];
        if (!cell || !m) {
          spentSet.delete(key);
          continue;
        }
        const dx = (slotCenterX(cell, i) - m.x) / HEAT_RX;
        const dy = (cell.y + CH / 2 - m.y) / HEAT_RY;
        if (dx * dx + dy * dy >= 1) spentSet.delete(key);
      }
      // 1) panaskan HURUF di sekitar kursor — panas dihitung per slot huruf
      // dari jarak titik tengah huruf ke kursor (elips ±3 huruf x ±1,5
      // baris): tambalannya ±6 huruf ke samping dan ±3 baris ke atas/bawah,
      // bisa menyeberang batas kata seperti grid karakter aslinya.
      // SEKALI per lintasan: slot yang sedang/baru menyala tidak dipanaskan
      // lagi sampai kursor keluar dari jangkauannya.
      if (cells.length && cols && m && mouseOnRef.current && !reduced) {
        const c0 = Math.max(0, Math.floor((m.x - HEAT_RX - CW) / CW));
        const c1 = Math.min(cols - 1, Math.floor((m.x + HEAT_RX) / CW));
        const r0 = Math.max(0, Math.floor((m.y - HEAT_RY) / CH));
        const r1 = Math.floor((m.y + HEAT_RY) / CH);
        for (let r = r0; r <= r1; r++) {
          for (let cc = c0; cc <= c1; cc++) {
            const idx = r * cols + cc;
            const cell = cells[idx];
            if (!cell || cell.hole || !cell.shown) continue;
            if (
              spiralActive.has(idx) ||
              altActive.has(idx) ||
              frontActive.has(idx) ||
              scrambling.has(idx) ||
              bandSet.has(idx)
            )
              continue; // jangan rebut kata yang sedang tampil khusus (termasuk spiral)
            let hc = hiRef.current.get(idx);
            for (let i = 0; i < WORD.length; i++) {
              if (hc?.slots[i]) continue;
              const key = idx * WORD.length + i;
              if (spentSet.has(key)) continue;
              const dx = (slotCenterX(cell, i) - m.x) / HEAT_RX;
              const dy = (cell.y + CH / 2 - m.y) / HEAT_RY;
              const dd = dx * dx + dy * dy;
              if (dd >= 1) continue;
              const h = 1 - Math.sqrt(dd) + (Math.random() - 0.5) * 0.35;
              if (h <= 0.05) continue;
              if (!hc) {
                hc = { slots: new Array(WORD.length).fill(null) };
                hiRef.current.set(idx, hc);
              }
              hc.slots[i] = {
                heat: Math.min(1, Math.max(0.02, h)),
                glyph: "",
                born: now,
              };
            }
          }
        }
      }
      // 2) dinginkan per slot + gambar ulang kata yang masih punya slot panas
      for (const [idx, hc] of Array.from(hiRef.current)) {
        const cell = cells[idx];
        if (!cell || cell.hole) {
          hiRef.current.delete(idx);
          continue;
        }
        if (
          spiralActive.has(idx) ||
          altActive.has(idx) ||
          frontActive.has(idx)
        ) {
          hiRef.current.delete(idx); // tampilannya diambil alih sistem lain
          continue;
        }
        let anyHot = false;
        for (let i = 0; i < WORD.length; i++) {
          const s = hc.slots[i];
          if (!s) continue;
          s.heat *= HEAT_DECAY;
          if (s.heat < HEAT_MIN || now - s.born > HEAT_MAX_MS) {
            hc.slots[i] = null;
            spentSet.add(idx * WORD.length + i); // jangan menyala lagi pada lintasan yang sama
          } else {
            anyHot = true;
          }
        }
        if (!anyHot) {
          hiRef.current.delete(idx);
          draw(cell, cell.a); // semua slot dingin: kata kembali utuh
          continue;
        }
        drawHeatCell(cell, hc);
      }
      heatRaf =
        hiRef.current.size > 0 || performance.now() - lastMoveAt < 150
          ? requestAnimationFrame(stepHeat)
          : null;
    }
    function ensureHeat() {
      if (STATIC_TEXT) return; // mode diam: heat kursor ikut mati
      if (heatRaf === null && !reduced) {
        lastMoveAt = performance.now();
        heatRaf = requestAnimationFrame(stepHeat);
      }
    }

    function onPointerMove(e: PointerEvent) {
      // Koordinat kursor diubah ke ruang canvas (canvas kini mulai di
      // bawah navbar, bukan di pojok jendela).
      const r = cvs!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      lastMoveAt = performance.now();
      ensureHeat();
    }
    function onPointerLeave() {
      mouseRef.current = null;
      ensureHeat();
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    function onResize() {
      if (resizeTimer) clearTimeout(resizeTimer);
      // debounce: jangan rebuild tiap piksel; rebuild saat resize tanpa animasi masuk
      resizeTimer = setTimeout(() => {
        build(true);
        if (!STATIC_TEXT) {
          startGlitch();
          scheduleWave();
        }
      }, 150);
    }

    // KUNCI RINGAN #4: berhenti total saat tab tidak aktif.
    function onVisibility() {
      if (document.hidden) {
        stopGlitch();
        stopWaveAll();
      } else if (!STATIC_TEXT) {
        startGlitch();
        scheduleWave();
        ensureHeat(); // hidupkan lagi loop panas bila sempat terhenti
      }
    }

    const debugTimer = setInterval(() => {
      if (!debugOnRef.current) return;
      setDebugText(
        `${redrawsRef.current} sel digambar/detik · ${cellsRef.current.length} sel total`,
      );
      redrawsRef.current = 0;
    }, 1000);

    // JANITOR: setiap ±6 detik, gambar ulang semua sel yang TIDAK sedang
    // dimiliki sistem efek mana pun. Jaring pengaman terakhir terhadap
    // sisa glitch dari balapan antar-sistem yang tidak terdaftar di peta
    // status mana pun — sisa seperti itu pasti bersih dalam ≤6 detik.
    const janitorTimer = reduced
      ? null
      : setInterval(() => {
          if (document.hidden) return;
          const cells = cellsRef.current;
          for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            if (!c || c.hole || !c.shown) continue;
            if (
              spiralActive.has(i) ||
              altActive.has(i) ||
              frontActive.has(i) ||
              scrambling.has(i) ||
              glitchCells.has(i) ||
              hiRef.current.has(i) ||
              bandSet.has(i)
            )
              continue;
            draw(c, c.a);
          }
        }, 6000);

    build();
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    // Ukuran stage bisa berubah tanpa resize jendela (navbar membungkus,
    // panel berorentasi ulang) — amati elemen canvas-nya langsung.
    // Panggilan pertama RO selalu datang sekali saat observe dimulai:
    // lewati, supaya tidak memotong animasi reveal pembuka.
    let roFirst = true;
    const stageObserver = new ResizeObserver(() => {
      if (roFirst) {
        roFirst = false;
        return;
      }
      onResize();
    });
    stageObserver.observe(cvs!);

    return () => {
      stageObserver.disconnect();
      stopGlitch();
      if (spiralTimer) clearInterval(spiralTimer);
      if (spiralRaf !== null) cancelAnimationFrame(spiralRaf);
      if (scrambleTimer) clearInterval(scrambleTimer);
      if (heatRaf !== null) cancelAnimationFrame(heatRaf);
      stopReveal();
      stopWaveAll();
      if (janitorTimer) clearInterval(janitorTimer);
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
    // Bayangan HARUS mati di sini: drawSpiralGlyph menyalakan shadowBlur
    // untuk cahaya spiral dan state canvas itu MENETAP — tanpa reset ini
    // semua kata yang digambar setelahnya tercetak dengan bayangan cahaya
    // (tampak lebih tebal/ganda, "tidak normal") selamanya.
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
    // kata selalu terpusat horizontal di tengah selnya
    const w = ctx.measureText(text).width;
    ctx.fillText(text, c.x + (CW - w) / 2, c.y + TEXT_Y);
    redrawsRef.current++;
  }

  return (
    <div className="app">
      {/* Navbar: dulu nav melayang di atas background; sekarang bar
          tersendiri di bagian atas page. */}
      <header className="navbar">
        <div className="nav-left">
          <span className="brand">
            <span className="brand-mark">∞</span> Amamiya
          </span>
          <nav>
            <a href="#">Cara kerja ▾</a>
            <a href="#">Performa</a>
          </nav>
        </div>
        <a className="nav-cta" href="#">
          Coba Demo
        </a>
      </header>

      {/* Stage: satu-satunya isi page — scene grid memenuhi sisa layar
          di bawah navbar sebagai konten page itu sendiri. */}
      <main className="stage">
        <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />

        <div className="stage-title">
          <h1>Amamiya</h1>
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
      </main>
    </div>
  );
}
