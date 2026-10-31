"use client";

import { useEffect, useRef, useState } from "react";
import { Archivo_Black } from "next/font/google";
import FxCards from "./FxCards";

// Font balok untuk kata besar di tengah lubang (permintaan user 31 Okt)
const blockFont = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-block",
});

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
const HEAT_GLITCH = ["▌", "▐", "▚", ":", "⠿"]; // karakter kedip acak sesekali di sel panas
const WAVE_BOOST = 0.45; // tambahan opasitas sel saat dilewati gelombang sapuan (0,26 -> 0,45: efek jalan dari sudut DIPERJELAS, permintaan user 30 Okt)
const WAVE_BAND = 200; // lebar pita gelombang (px, dalam jarak diagonal dari sudut asal) — dipersempit dari 260 agar garis depannya lebih tegas
const HOLE_MAX_W = 660; // lebar maksimum lubang tengah (px)
const HOLE_MAX_H = 210; // tinggi maksimum lubang tengah (px)
const HOLE_W_RATIO = 0.86; // lebar lubang relatif ke layar (bila layar sempit)
const HOLE_H_RATIO = 0.36; // tinggi lubang relatif ke layar
const HOLE_RADIUS = 28; // radius sudut lubang (px)
const WAVE_TICK_MS = 110; // interval langkah gelombang sapuan (dari 80: sapuan lebih santai)
const WAVE_GAP_MS = 3500; // jeda diam antar sapuan gelombang

// --- spiral galaksi per huruf (dari halaman uji /spiral) ---
const SPIRAL_EVERY_MS = 400; // jeda pemicu otomatis efek huruf (700 -> 400: kemunculan diperbanyak, permintaan user 30 Okt; timer ini juga memicu sparkle)
const SPIRAL_MAX = 10; // maks spiral huruf aktif bersamaan (7 -> 10, ruang untuk kepadatan baru)
const SPIRAL_GLITCH_MS = 150; // glitch pembuka/penutup urutan spiral
const SPIRAL_GROW_MS = 500; // spiral tumbuh (dipangkas: durasi total lebih singkat)
const SPIRAL_SHRINK_MS = 550; // spiral menguncup (dipangkas)
const SPIRAL_P_MIN = 0.2; // progres awal/akhir spiral (slot tidak terasa kosong sesaat)

// --- sparkle Gemini per huruf (dari halaman uji /spark) ---
// Konfigurasi hasil setelan user di bancuh uji (30 Okt): ukuran 1,3x,
// lekuk 0,10, glow 4, hold 1,5 detik, maks 10 aktif. Berjalan BERSAMA
// spiral: satu cell boleh berisi spiral + sparkle di huruf berbeda,
// tapi tidak pernah di huruf yang sama.
const SPARK_MAX = 10; // maks sparkle aktif bersamaan — disamaratakan 10/10/10 untuk ketiga efek (permintaan user 30 Okt)
const SPARK_SIZE = 1.3; // ukuran relatif ke tinggi huruf (setelan user)
const SPARK_PINCH = 0.1; // kedalaman lekuk cekung sisi sparkle (setelan user)
const SPARK_GLOW = 4; // shadowBlur sparkle (setelan user)
const SPARK_HOLD_MS = 1500; // lama tampil penuh (setelan user, divariasi ±20%)
const SPARK_GLITCH_MS = 150; // glitch pembuka/penutup (selaras spiral)
const SPARK_GROW_MS = 450; // sparkle tumbuh masuk
const SPARK_SHRINK_MS = 400; // sparkle menguncup
const SPARK_P_MIN = 0.25; // skala awal/akhir sparkle
const SPARK_ASPECT = 0.86; // lebar = 0,86 x tinggi (proporsi logo Gemini)
const GRID_COLS = 8; // kolom KATA desktop = 8 (perombakan 31 Okt: total 10 lajur termasuk 2 lajur margin kosong kiri-kanan); lebar sel = lebar stage / (kolom + 2) dan semua ukuran diskalakan proporsional. Kolom adaptif per lebar stage (build): ponsel 6 kata, tablet 6 kata.
const FONT_SHRINK = 0.94; // font sedikit diperkecil dari skala murni lajur (permintaan user 31 Okt)
const ROW_STRETCH = 1.15; // tinggi baris sedikit diperbesar dari rapat murni (1,0) agar jumlah baris berkurang, tapi gap-nya tidak sebesar 1,3 — titik tengah pilihan user 31 Okt ("gap rows-nya diperkecil" setelah mencoba 1,3)

// --- atom Rutherford per huruf (dari halaman uji /atom) ---
// Konfigurasi hasil setelan user di bancuh uji (30 Okt): ukuran 1,3x,
// elips 0,25, putaran 3,0x, glow 4, hold 1,5 detik, maks 10.
const ATOM_MAX = 10; // maks atom aktif bersamaan (disamaratakan 10/10/10)
const ATOM_SIZE = 1.3; // ukuran relatif ke tinggi huruf (setelan user)
const ATOM_FLAT = 0.25; // kegepengan orbit elips (setelan user)
const ATOM_SPIN = 3.0; // kecepatan putaran atom + elektron (setelan user)
const ATOM_GLOW = 4; // shadowBlur atom (setelan user)
const ATOM_HOLD_MS = 1500; // lama tampil penuh (setelan user, divariasi ±20%)
const ATOM_GLITCH_MS = 150; // glitch pembuka/penutup (selaras efek lain)
const ATOM_GROW_MS = 450; // atom tumbuh masuk
const ATOM_SHRINK_MS = 400; // atom menguncup
const ATOM_P_MIN = 0.25; // skala awal/akhir atom
const ATOM_ORBITS = 3; // 3 orbit elips bersilangan 60° (ciri logo React)

// --- black hole tampak depan per huruf (dari halaman uji /blackhole) ---
// Elemen KEEMPAT tema alam semesta (31 Okt): konfigurasi hasil setelan
// user di bancuh uji /blackhole — ukuran 0,8x, disk 0,90x, glow 0,5,
// maks 10; hold DISAMAKAN elemen yang sudah ada (1,5 detik). Tampak
// depan ala Gargantua: cincin cahaya melingkar + pita disk memotong
// tengah; gerak hanya rotasi pada poros.
const BH_MAX = 10; // maks black hole aktif bersamaan (disamaratakan 10)
const BH_SIZE = 0.8; // ukuran relatif horizon ke tinggi huruf (setelan user)
const BH_DISK = 0.9; // lebar pita disk relatif (setelan user)
const BH_GLOW = 0.5; // glow tepi foton (setelan user)
const BH_HOLD_MS = 1500; // lama tampil penuh — disamakan sparkle/atom
const BH_GLITCH_MS = 150; // glitch pembuka/penutup (selaras efek lain)
const BH_GROW_MS = 450; // black hole tumbuh masuk
const BH_SHRINK_MS = 400; // black hole menguncup
const BH_P_MIN = 0.25; // skala awal/akhir black hole
/* ===================================================================== */

type Cell = { x: number; y: number; a: number; shown: boolean; hole: boolean };
type SlotHeat = { heat: number; glyph: string; born: number; order: number[] }; // panas per slot huruf; order = urutan menyala 8 titiknya
type HeatState = { slots: (SlotHeat | null)[] }; // keadaan panas sebuah kata (per slot)

/* =====================================================================
   KATA BESAR INTERAKTIF (31 Okt, permintaan user): tiap huruf judul
   AMAMIYA yang disentuh kursor BERUBAH menjadi salah satu dari 3 glyph
   efek (spiral/sparkle/atom, dipilih acak) dan MENETAP selama kursor
   diam di huruf itu; saat kursor berpindah, huruf kembali ke aslinya
   lewat kedip GLITCH singkat (huruf pengganti acak + goyangan kecil).
   Mengikuti saklar "Highlight mouse" dan prefers-reduced-motion.
   ===================================================================== */
type TitleFxKind = "spiral" | "spark" | "atom" | "blackhole";

function drawTitleGlyph(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  kind: TitleFxKind,
  now: number,
) {
  const cx = W / 2;
  const cy = H / 2;
  const S = Math.min(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.shadowColor = "rgba(245,245,255,0.85)";
  if (kind === "spiral") {
    // Skala glyph DISAMAKAN antar jenis (permintaan user 31 Okt):
    // spiral dan atom berbagi diameter batas 0,68 x S; sparkle
    // badannya sengaja lebih besar (lihat cabang spark) karena
    // bentuknya tipis sehingga terlihat lebih kecil bila sama.
    const R = S * 0.34;
    const R0 = R * 0.1;
    const rot = now / 1600;
    const TURNS = Math.PI * 2 * 0.38;
    const steps = 48;
    const CHUNK = 4;
    ctx.lineCap = "round";
    for (let a = 0; a < 4; a++) {
      const off = (a * Math.PI) / 2;
      for (let s0 = 0; s0 < steps; s0 += CHUNK) {
        const thMid = (TURNS * (s0 + CHUNK / 2)) / steps;
        const rMid = R0 * Math.pow(R / R0, thMid / TURNS);
        const path = new Path2D();
        for (let i = s0; i <= Math.min(steps, s0 + CHUNK); i++) {
          const th = (TURNS * i) / steps;
          const r = R0 * Math.pow(R / R0, th / TURNS);
          const ang = rot + off + th;
          const x = cx + r * Math.cos(ang);
          const y = cy + r * Math.sin(ang);
          if (i === s0) path.moveTo(x, y);
          else path.lineTo(x, y);
        }
        ctx.shadowBlur = 0;
        ctx.lineWidth = Math.max(1.2, 0.38 * rMid);
        ctx.strokeStyle = "rgba(245,245,255,0.15)";
        ctx.stroke(path);
        ctx.lineWidth = Math.max(1, 0.2 * rMid);
        ctx.strokeStyle = "rgba(245,245,255,0.32)";
        ctx.stroke(path);
        ctx.shadowBlur = 5;
        ctx.lineWidth = Math.max(1.1, 0.07 * rMid);
        ctx.strokeStyle = "rgba(245,245,255,0.95)";
        ctx.stroke(path);
        ctx.shadowBlur = 0;
        const hsh = Math.sin(a * 127.1 + s0 * 311.7) * 43758.5453;
        const h1 = hsh - Math.floor(hsh);
        if (h1 < 0.65 && rMid > R * 0.2) {
          const th = thMid;
          const o2 = (h1 - 0.32) * 0.55 * rMid;
          const bx = rMid * Math.cos(th) - Math.sin(th) * o2;
          const by = rMid * Math.sin(th) + Math.cos(th) * o2;
          const wx = cx + bx * Math.cos(rot + off) - by * Math.sin(rot + off);
          const wy = cy + bx * Math.sin(rot + off) + by * Math.cos(rot + off);
          ctx.beginPath();
          ctx.arc(wx, wy, 0.7 + h1 * 0.9, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(245,245,255,0.85)";
          ctx.fill();
        }
      }
    }
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 0.24, R * 0.13, 0, 0, Math.PI * 2);
    ctx.shadowBlur = 8;
    ctx.fillStyle = "rgba(245,245,255,0.8)";
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  } else if (kind === "spark") {
    const pulse = 1 + 0.06 * Math.sin(now / 300);
    // Sparkle dibuat GEMUK (lekuk 0,30) dan tinggi 0,92 x S: bintang
    // ramping berlekuk 0,10 massanya hanya sepertiga spiral/atom
    // sehingga selalu terlihat jauh lebih kecil di mata walau
    // diameter batasnya sama (observasi user 31 Okt, dua putaran).
    const ry = S * 0.46 * pulse;
    const rx = ry * 0.88;
    const p = 0.3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(0.04 * Math.sin(now / 450));
    ctx.beginPath();
    ctx.moveTo(0, -ry);
    ctx.quadraticCurveTo(rx * p, -ry * p, rx, 0);
    ctx.quadraticCurveTo(rx * p, ry * p, 0, ry);
    ctx.quadraticCurveTo(-rx * p, ry * p, -rx, 0);
    ctx.quadraticCurveTo(-rx * p, -ry * p, 0, -ry);
    ctx.closePath();
    ctx.shadowBlur = 4;
    ctx.fillStyle = `rgba(245,245,255,${0.92 + 0.08 * Math.sin(now / 260)})`;
    ctx.fill();
    ctx.restore();
    ctx.shadowBlur = 0;
  } else if (kind === "atom") {
    const R = S * 0.34;
    const f = 0.25;
    const rot = now / 1400;
    ctx.shadowBlur = 4;
    ctx.strokeStyle = "rgba(245,245,255,0.95)";
    ctx.fillStyle = "rgba(245,245,255,0.95)";
    ctx.lineWidth = Math.max(1.4, S * 0.016);
    for (let k = 0; k < 3; k++) {
      const ang = rot + (k * Math.PI) / 3;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R, R * f, ang, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(1.6, R * 0.15), 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const ang = rot + (k * Math.PI) / 3;
      const th = (now / 1000) * (0.9 + k * 0.17) * 1.6 + k * 2.1;
      const ex = R * Math.cos(th);
      const ey = R * f * Math.sin(th);
      const sx = cx + ex * Math.cos(ang) - ey * Math.sin(ang);
      const sy = cy + ex * Math.sin(ang) + ey * Math.cos(ang);
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.3, R * 0.085), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  } else {
    // Black hole TAMPAK DEPAN (elemen keempat): bola hitam dikelilingi
    // cincin cahaya melingkar (diameter batas 0,68 x S, sama seperti
    // spiral/atom), pita disk terang memotong tepat di tengah, debu
    // mengorbit — rotasi murni pada poros.
    const R = S * 0.246;
    const ringR = R * 1.38;
    const bandRx = S * 0.48;
    const bandRy = Math.max(1.2, R * 0.2);
    const hT = (n: number) => {
      const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return v - Math.floor(v);
    };
    const band = (mul: number) => {
      const gr = ctx.createLinearGradient(cx - bandRx, cy, cx + bandRx, cy);
      gr.addColorStop(0, "rgba(245,245,255,0)");
      gr.addColorStop(0.16, `rgba(245,245,255,${0.28 * mul})`);
      gr.addColorStop(0.5, `rgba(245,245,255,${0.85 * mul})`);
      gr.addColorStop(0.84, `rgba(245,245,255,${0.28 * mul})`);
      gr.addColorStop(1, "rgba(245,245,255,0)");
      return gr;
    };
    ctx.beginPath();
    ctx.ellipse(cx, cy, bandRx, bandRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = band(0.55);
    ctx.fill();
    ctx.shadowBlur = 4;
    for (const p of [
      { m: 0.94, w: 0.1, a: 0.3 },
      { m: 1, w: 0.17, a: 0.5 },
      { m: 1.07, w: 0.08, a: 0.22 },
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR * p.m, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(245,245,255,${p.a})`;
      ctx.lineWidth = Math.max(1, R * p.w);
      ctx.stroke();
    }
    for (const seg of [
      { a0: -Math.PI * 0.72, a1: -Math.PI * 0.28 },
      { a0: Math.PI * 0.28, a1: Math.PI * 0.72 },
    ]) {
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, seg.a0, seg.a1);
      ctx.strokeStyle = "rgba(245,245,255,0.85)";
      ctx.lineWidth = Math.max(1.1, R * 0.2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(245,245,255,0.9)";
    for (let i = 0; i < 8; i++) {
      const rf = 0.92 + hT(i * 3 + 1) * 0.16;
      const th = hT(i * 7 + 2) * Math.PI * 2 - now * 0.0012;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(th) * ringR * rf, cy + Math.sin(th) * ringR * rf, Math.max(1, R * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(4,4,9,0.97)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.02, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(245,245,255,0.9)";
    ctx.lineWidth = Math.max(1.1, R * 0.12);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy, bandRx, bandRy, 0, 0, Math.PI * 2);
    ctx.fillStyle = band(1);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy, bandRx * 0.92, bandRy * 0.45, 0, 0, Math.PI * 2);
    ctx.fillStyle = band(1.15);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function TitleLetter({
  ch,
  enabled,
  index,
}: {
  ch: string;
  enabled: boolean;
  index: number;
}) {
  const [mode, setMode] = useState<"idle" | "in" | "fx" | "out">("idle");
  const [kind, setKind] = useState<TitleFxKind>("spiral");
  const [gch, setGch] = useState(ch);
  const [gj, setGj] = useState({ x: 0, y: 0, o: 1 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const modeRef = useRef<"idle" | "in" | "fx" | "out">("idle");

  const clearTimers = () => {
    timersRef.current.forEach((t) => window.clearInterval(t));
    timersRef.current = [];
  };

  // animasi glyph selama mode fx (rAF ±30fps, berhenti saat lepas)
  useEffect(() => {
    if (mode !== "fx") return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cvs.clientWidth || 100;
    const H = cvs.clientHeight || 100;
    cvs.width = W * dpr;
    cvs.height = H * dpr;
    ctx.scale(dpr, dpr);
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      if (now - last >= 33) {
        last = now;
        drawTitleGlyph(ctx, W, H, kind, now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, kind]);

  // saklar highlight dimatikan di tengah jalan -> huruf kembali normal
  useEffect(() => {
    if (!enabled && mode !== "idle") {
      clearTimers();
      modeRef.current = "idle";
      setMode("idle");
      setGch(ch);
    }
  }, [enabled, mode, ch]);

  useEffect(() => clearTimers, []);

  // Glitch berjenjang: huruf pengganti acak + goyangan yang MEREDA
  // (amplitudo menyusut tiap kedip) + opacity pulih — transisi terasa
  // mulus, tidak memotong. Dipakai dua arah: masuk (cepat) & keluar
  // (lebih lama, atas koreksi user "glitchnya terlalu cepat").
  const startGlitch = (ticks: number, stepMs: number, done: () => void) => {
    clearTimers();
    let t = 0;
    const iv = window.setInterval(() => {
      t++;
      if (t >= ticks) {
        window.clearInterval(iv);
        done();
        return;
      }
      const decay = 1 - t / ticks;
      const pool = "AMAMIYA";
      setGch(pool[Math.floor(Math.random() * pool.length)]);
      setGj({
        x: (Math.random() * 0.14 - 0.07) * decay,
        y: (Math.random() * 0.1 - 0.05) * decay,
        o: 0.55 + 0.45 * (t / ticks),
      });
    }, stepMs);
    timersRef.current.push(iv);
  };

  const enter = () => {
    if (!enabled) return;
    if (modeRef.current === "fx" || modeRef.current === "in") return;
    const kinds: TitleFxKind[] = ["spiral", "spark", "atom", "blackhole"];
    setKind(kinds[Math.floor(Math.random() * kinds.length)]);
    modeRef.current = "in";
    setMode("in");
    // glitch masuk singkat (±120ms) lalu glyph tampil menetap
    startGlitch(3, 40, () => {
      modeRef.current = "fx";
      setMode("fx");
    });
  };

  const doLeave = () => {
    if (modeRef.current !== "fx" && modeRef.current !== "in") return;
    modeRef.current = "out";
    setMode("out");
    // glitch keluar lebih lama & mereda (±400ms) menuju huruf asli
    startGlitch(9, 45, () => {
      modeRef.current = "idle";
      setMode("idle");
      setGch(ch);
      setGj({ x: 0, y: 0, o: 1 });
    });
  };

  // SENTUHAN (mobile): hover tidak ada di layar sentuh — ketukan
  // memicu pointerenter lalu pointerleave nyaris seketika, jadi glyph
  // tak pernah sempat terlihat (keluhan user 31 Okt). Kini pointerdown
  // dari sentuhan mengaktifkan efek dan MENAHANNYA ±1,1 detik sejak
  // ketukan terakhir; leave yang datang lebih awal ditunda sampai
  // masa tahan habis, lalu glitch keluar seperti biasa.
  const touchHoldUntilRef = useRef(0);
  const holdTimerRef = useRef<number | null>(null);
  const leave = () => {
    const wait = touchHoldUntilRef.current - performance.now();
    if (wait > 30) {
      if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        leave();
      }, wait);
      return;
    }
    touchHoldUntilRef.current = 0;
    doLeave();
  };
  const down = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    touchHoldUntilRef.current = performance.now() + 1100;
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    enter();
  };
  const enterHover = () => {
    touchHoldUntilRef.current = 0;
    enter();
  };

  const glitching = mode === "in" || mode === "out";
  return (
    <span
      className={`t-letter${mode === "fx" ? " is-fx" : ""}`}
      style={{ "--i": index } as React.CSSProperties}
      onPointerEnter={enterHover}
      onPointerLeave={leave}
      onPointerDown={down}
      onPointerCancel={leave}
    >
      {/* Lapisan intro pre-build (CSS, kelas t-play di h1): matriks
          titik -> balok dua nada -> karakter muncul mengisinya,
          meniru reveal "Safety at the Frontier" di halaman Wonder. */}
      <span className="t-dots" aria-hidden="true" />
      <span className="t-block" aria-hidden="true" />
      <span
        className="t-char"
        style={
          glitching
            ? {
                transform: `translate(${gj.x}em, ${gj.y}em)`,
                opacity: gj.o,
              }
            : undefined
        }
      >
        {glitching ? gch : ch}
      </span>
      {mode === "fx" && (
        <canvas ref={canvasRef} className="t-fx" aria-hidden="true" />
      )}
    </span>
  );
}

function TitleWord({ enabled }: { enabled: boolean }) {
  return (
    <>
      {"AMAMIYA".split("").map((ch, i) => (
        <TitleLetter key={i} ch={ch} enabled={enabled} index={i} />
      ))}
    </>
  );
}

export default function WonderScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cellsRef = useRef<Cell[]>([]);
  const colsRef = useRef(0);
  // Batas efek aktif PER JENIS mengikuti ukuran grid: desktop 10/10/10
  // (keputusan user), grid kecil (ponsel/tablet) diturunkan agar proporsi
  // & performa tetap sehat — diatur ulang di build().
  const fxCapRef = useRef(10);
  // Pembagi tick pemicu efek: 1 = tiap tick (400ms), 2 = tiap dua tick
  // (800ms) di layar kecil — diatur di build() mengikuti lebar stage.
  const spawnDivRef = useRef(1);
  const hiRef = useRef<Map<number, HeatState>>(new Map()); // idx sel -> keadaan panas kursor
  // Metrik grid dasar (skala 1) + metrik aktif hasil skala 9 kolom:
  // drawCell (di luar effect utama) membaca gridRef; effect utama
  // memakai bayangan variabel lokal yang diselaraskan build().
  const gridBase = {
    cw: CW,
    ch: CH,
    font: FONT,
    fs: FONT_SIZE,
    ls: LETTER_SPACING,
    ty: TEXT_Y,
    hrx: HEAT_RX,
    hry: HEAT_RY,
  };
  const gridRef = useRef({ ...gridBase, scale: 1 });
  // Cache lebar teks terukur per (font|teks): measureText dipanggil di
  // jalur gambar terpanas (drawCell) — lebar kata yang sama tidak perlu
  // diukur ulang ribuan kali. Kunci memuat font agar skala baru otomatis
  // memakai entri baru; cache dibersihkan bila terlalu besar.
  const widthCacheRef = useRef(new Map<string, number>());
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const redrawsRef = useRef(0);
  const mouseOnRef = useRef(true);
  const debugOnRef = useRef(false);

  const [mouseOn, setMouseOn] = useState(true);
  const [debugOn, setDebugOn] = useState(false);
  const [debugText, setDebugText] = useState("—");
  const [reducedMotion, setReducedMotion] = useState(false);
  // Intro judul: kata besar AMAMIYA baru muncul SETELAH animasi masuk
  // grid selesai (afterReveal) — dipicu sekali dari dalam effect utama.
  const [titlePlay, setTitlePlay] = useState(false);
  const [titleReady, setTitleReady] = useState(false);
  const titlePlayedRef = useRef(false);

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  }, []);

  // Cadangan pengaman: bila sinyal afterReveal entah bagaimana tidak
  // tiba, judul tetap muncul (tidak boleh kosong selamanya).
  useEffect(() => {
    const t = window.setTimeout(() => {
      if (!titlePlayedRef.current) {
        titlePlayedRef.current = true;
        setTitlePlay(true);
      }
    }, 2600);
    return () => window.clearTimeout(t);
  }, []);

  // Hover huruf aktif hanya setelah seluruh intro selesai dimainkan.
  useEffect(() => {
    if (!titlePlay) return;
    if (reducedMotion) {
      setTitleReady(true);
      return;
    }
    const t = window.setTimeout(() => setTitleReady(true), 1250);
    return () => window.clearTimeout(t);
  }, [titlePlay, reducedMotion]);

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

    // VISIBILITAS STAGE (portofolio satu halaman, 31 Okt): saat stage
    // ter-scroll keluar layar, semua tick berkala scene berhenti bekerja
    // (spawn/glitch/scramble/gelombang membaca flag ini) — halaman
    // panjang tidak membayar biaya animasi yang tidak terlihat.
    let stageVisible = true;
    const stageIO = new IntersectionObserver(
      (es) => {
        stageVisible = es[0].isIntersecting;
      },
      { threshold: 0.02 },
    );
    if (cvs.parentElement) stageIO.observe(cvs.parentElement);

    // Metrik grid dinamis — bayangan variabel dari konstanta modul.
    // build() menghitungnya dari aturan 9 kolom; semua geometri di
    // effect ini membaca variabel lokal ini.
    let gScale = 1;
    // Ukuran stage dalam piksel CSS — SEMUA geometri (sel, lubang,
    // sapuan, gelombang) bekerja dalam satuan ini. Piksel backing
    // canvas = viewW/viewH x dpr (lihat build), ctx ditransformasikan
    // agar koordinat gambar tetap satuan CSS.
    let viewW = 0;
    let viewH = 0;
    let CW = gridRef.current.cw;
    let CH = gridRef.current.ch;
    let FONT = gridRef.current.font;
    let FONT_SIZE = gridRef.current.fs;
    let LETTER_SPACING = gridRef.current.ls;
    let TEXT_Y = gridRef.current.ty;
    let HEAT_RX = gridRef.current.hrx;
    let HEAT_RY = gridRef.current.hry;

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
      // KETAJAMAN LAYAR (perbaikan "burik di mobile" 31 Okt): dulu DPR
      // dikunci 1 demi ringan — di desktop tak terasa, tapi di HP
      // berlayar retina (DPR ±3) canvas 1x di-upscale paksa 3x sehingga
      // seluruh grid terlihat buram, apalagi font grid ponsel kini
      // kecil. Sekarang backing canvas mengikuti DPR layar DIBATASI
      // maks 2x (2x sudah tajam; 3x = 9x piksel terlalu berat untuk
      // keuntungan visual yang kecil). Ukuran logis tetap piksel CSS
      // dari elemen canvas (isi <main> di bawah navbar).
      viewW = cvs!.clientWidth || window.innerWidth;
      viewH = cvs!.clientHeight || window.innerHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs!.width = Math.round(viewW * dpr);
      cvs!.height = Math.round(viewH * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // STRUKTUR LAJUR (perombakan user 31 Okt): selebar stage dibagi
      // menjadi lajur-lajur sama lebar; lajur PALING KIRI dan PALING
      // KANAN selalu KOSONG sebagai margin, lajur di tengahnya berisi
      // kata. Desktop: 10 lajur = 2 margin + 8 kata; tablet 8 lajur
      // (6 kata); ponsel 8 lajur (6 kata — diperbanyak dari 4 atas
      // koreksi user dari screenshot HP-nya: font terlalu besar).
      // Lebar sel = lebar stage /
      // jumlah lajur; semua metrik diskalakan proporsional dari lebar
      // sel, dan FONT sedikit diperkecil (faktor FONT_SHRINK) dari
      // skala murninya atas permintaan user.
      const cols =
        viewW < 640 ? 6 : viewW < 1080 ? 6 : GRID_COLS;
      const tracks = cols + 2; // + lajur margin kiri & kanan
      gScale = viewW / (tracks * gridBase.cw);
      CW = viewW / tracks;
      CH = gridBase.ch * gScale * ROW_STRETCH;
      FONT_SIZE = gridBase.fs * gScale * FONT_SHRINK;
      FONT = `${FONT_SIZE}px monospace`;
      LETTER_SPACING = gridBase.ls * gScale * FONT_SHRINK;
      TEXT_Y = (CH - FONT_SIZE) / 2 + FONT_SIZE * 0.8;
      HEAT_RX = gridBase.hrx * gScale;
      HEAT_RY = gridBase.hry * gScale;
      gridRef.current = {
        cw: CW,
        ch: CH,
        font: FONT,
        fs: FONT_SIZE,
        ls: LETTER_SPACING,
        ty: TEXT_Y,
        hrx: HEAT_RX,
        hry: HEAT_RY,
        scale: gScale,
      };
      slotCache = null;
      a0Cache = null;
      capHCache = null;
      ctx!.font = FONT;
      // letter-spacing renggang ala Wonder (Chromium; browser lain mengabaikan)
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        `${LETTER_SPACING}px`;
      ctx!.textBaseline = "alphabetic";
      // LUBANG TENGAH: area di balik konten hero dikosongkan — sel yang
      // titik tengahnya masuk lubang (persegi bersudut membulat di tengah
      // layar) tidak pernah digambar, jadi grid tampak berlubang.
      // Lebar lubang kini = 4 LAJUR MENYATU di tengah (permintaan user:
      // "bagian tengah panjangnya 4 cell yg di-merge"), tepiannya sejajar
      // garis lajur. Di ponsel lubang = 4 dari 6 lajur kata (lebih
      // ramping dari sebelumnya yang selebar seluruh kata) dan lebih
      // RENDAH, karena margin kosong di sekeliling kata tengah terasa
      // terlalu besar di layar portrait (koreksi user 31 Okt).
      const holeCols = Math.min(4, cols);
      const holeW = holeCols * CW;
      const holeH =
        viewW < 640
          ? Math.min(96, Math.max(84, viewH * 0.2))
          : Math.max(120, Math.min(HOLE_MAX_H, viewH * HOLE_H_RATIO));
      // (Ponsel: lubang WAJIB lebih tinggi dari blok judul + ikon
      // (±50px) tapi tidak kelewat tinggi — rumus persen murni pernah
      // menghasilkan ±49px sehingga ikon tumpah menimpa grid, lalu
      // versi lantai 92px + 26% membuat margin atas-bawah lubang
      // terlalu besar. Kini setara memotong ±2 baris dari tengah:
      // lantai 84px, rasio 20%, cap 96px — margin tersisa ±18px.)
      // (Lantai 120px di cabang lebar: di layar PENDEK seperti HP
      // landscape, rumus 36% tinggi stage bisa menyusut sampai ±79px
      // padahal blok judul + ikon butuh lebih — judul/ikon tumpah
      // keluar lubang dan menimpa baris grid. Lantai ini memastikan
      // lubang tidak pernah lebih kecil dari isinya.)
      const holeX = CW + ((cols - holeCols) / 2) * CW;
      const holeY = (viewH - holeH) / 2;
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
      colsRef.current = cols;
      // POTONG BARIS TEPI di tablet & ponsel (permintaan user 31 Okt):
      // 3 baris teratas dan 4 baris terbawah TIDAK digambar, jadi blok
      // grid mengetat di sekitar komposisi tengah dan sel yang digambar
      // makin sedikit. Desktop utuh dari tepi ke tepi seperti biasa.
      // SYARAT: potongan hanya berlaku bila baris cukup banyak (>= 16)
      // — di layar pendek (HP landscape) total baris memang sedikit;
      // memotongnya di sana membuat grid HABIS sama sekali (bug yang
      // terlihat saat verifikasi landscape 31 Okt).
      const totalRows = Math.floor(viewH / CH);
      // Ponsel portrait: potongan lebih tipis (2/2) agar blok grid
      // lebih mengisi stage dan tidak terasa mengambang seperti di
      // tab/desktop yang tanpa potongan (penyesuaian 31 Okt).
      const trimTopRows =
        totalRows >= 16 ? (viewW < 640 ? 2 : viewW < 1080 ? 3 : 0) : 0;
      const trimBottomRows =
        totalRows >= 16 ? (viewW < 640 ? 2 : viewW < 1080 ? 4 : 0) : 0;
      const gridLimitY = viewH - trimBottomRows * CH;
      // Hanya baris yang MUAT UTUH yang digambar: tinggi stage jarang
      // pas kelipatan tinggi baris, dan baris terakhir yang mulai
      // sebelum tepi bawah tapi menjorok keluar akan terpotong tepi
      // kanvas di tengah huruf (terlihat di screenshot desktop user).
      for (let y = trimTopRows; (y + 1) * CH <= gridLimitY + 0.5; y++) {
        for (let x = 0; x < cols; x++) {
          cells.push({
            x: (x + 1) * CW, // +1 lajur: lajur pertama adalah margin kiri
            y: y * CH,
            a: BASE_ALPHA + Math.random() * BASE_ALPHA_RANGE,
            shown: false,
            hole: inHole((x + 1) * CW + CW / 2, y * CH + CH / 2),
          });
        }
      }
      cellsRef.current = cells;
      visibleCells = cells.filter((c) => !c.hole).length;
      // Beban proses mengikuti ukuran layar (permintaan user 31 Okt):
      // grid kecil (ponsel/tablet) = efek serentak lebih sedikit DAN
      // pemicu spawn lebih jarang (pembagi tick lebih besar).
      // (berbasis lebar stage, bukan jumlah sel — struktur lajur baru
      // mengubah jumlah sel tanpa mengubah kelas perangkatnya)
      fxCapRef.current = viewW < 640 ? 4 : viewW < 1080 ? 6 : 10;
      spawnDivRef.current = viewW < 640 ? 2 : viewW < 1080 ? 1 : 1;
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
      sparkActive.clear();
      atomActive.clear();
      blackholeActive.clear();
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
      const W = viewW;
      const H = viewH;
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
      // Animasi masuk grid SELESAI -> giliran kata besar di tengah
      // muncul dengan intro pre-build-nya (sekali saja per muat).
      if (!titlePlayedRef.current) {
        titlePlayedRef.current = true;
        setTitlePlay(true);
      }
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
    // === Kata bertopeng (mekanisme efek huruf sekarang) ===
    // Huruf tuan rumah efek TIDAK dihapus/digambar per slot dari hitungan
    // lebar manual — cara itu meleset beberapa piksel dari posisi huruf
    // yang benar-benar digambar browser dan menyisakan goresan. Huruf
    // disembunyikan dengan menggantinya menjadi SPASI lalu kata dirender
    // ulang lewat draw() biasa: satu fillText yang sama persis dengan kata
    // utuh, jadi posisi huruf lain identik piksel per piksel. Untuk sel
    // berefek ganda (spiral + sparkle), renderFxCell menyusun topengnya
    // dari semua efek aktif di sel itu.
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
        // PERBAIKAN BUG MOBILE (31 Okt, dari screenshot HP user): dulu
        // tinta <= 4px diganti konstanta MUTLAK 14 — di ponsel font grid
        // memang hanya ±5px (tintanya ±3,6px), jadi capHeight selalu 14
        // dan SEMUA efek (spiral/sparkle/atom, semuanya berpatokan
        // capHeight) membengkak ±4x lipat dari huruf di sekitarnya.
        // Sekarang: pakai hasil ukur apa adanya; bila metrik tak
        // tersedia, turunkan dari skala grid (13,5 x gScale ≈ tinta
        // huruf pada basis desain) — proporsional di semua ukuran.
        capHCache = h > 0.5 ? h : 13.5 * gScale;
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
        if (document.hidden || !stageVisible) return;
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
      jitter: string; // karakter kedip yang sedang tampil di fase glitch
    };
    const spiralActive = new Map<number, SpiralState>();
    type SparkState = {
      letter: number;
      phase: "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
      phaseStart: number;
      holdMs: number;
      lastGlitchDraw: number;
      jitter: string;
    };
    const sparkActive = new Map<number, SparkState>();
    type AtomState = {
      letter: number;
      phase: "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
      phaseStart: number;
      holdMs: number;
      lastGlitchDraw: number;
      jitter: string;
      baseRot: number; // orientasi awal atom (acak per kemunculan)
    };
    const atomActive = new Map<number, AtomState>();
    type BhState = {
      letter: number;
      phase: "glitchIn" | "grow" | "hold" | "shrink" | "glitchOut";
      phaseStart: number;
      holdMs: number;
      lastGlitchDraw: number;
      jitter: string;
      seed: number; // benih acak posisi debu orbit per kemunculan
    };
    const blackholeActive = new Map<number, BhState>();
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
      // Faktor skala komponen MUTLAK (glow & lantai tebal garis):
      // 1 di desktop, mengecil proporsional di layar kecil agar efek
      // tidak jadi gumpalan cahaya di mobile.
      const sMin = Math.min(1, gScale);
      const glowS = 4 * sMin;
      g.fillStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.shadowColor = "rgba(245,245,255,0.8)";
      // Tinggi galaksi = tinggi huruf di sekitarnya (permintaan user):
      // skala Y dihitung dari tinggi tinta huruf kapital "A" pada font
      // grid yang benar-benar terpakai, jadi diameter vertikal galaksi
      // (2 * R * skalaY) persis setinggi huruf tetangganya. Lengan tetap
      // digambar per potongan dengan alpha memudar saat mengarah ke
      // kiri/kanan layar — terang penuh di atas/bawah saja.
      const R = 9.2 * gScale;
      const R0 = 1.1 * gScale;
      const ARM_TURNS = Math.PI * 2 * 0.38;
      const upto = ARM_TURNS * p;
      g.lineWidth = 1.35 * gScale;
      g.lineCap = "round";
      g.shadowBlur = glowS; // glow disamakan dengan sparkle & atom agar kecerahan konsisten (permintaan user); kini diskalakan sMin
      g.save();
      g.translate(cx, cy);
      g.scale(0.8, capHeight() / 2 / R);
      g.rotate(rot);
      const steps = 48;
      const CHUNK = 4;
      // 4 lengan saja (permintaan user): 8 lengan terlalu padat —
      // galaksi terlihat seperti lingkaran penuh, bukan spiral berlengan.
      // Lengan DIGEMUKKAN ala galaksi (permintaan user 30 Okt, referensi
      // foto galaksi spiral): tiap potongan lengan digambar 3 LAPIS —
      // badan cahaya lebar lembut + badan tengah + garis inti terang —
      // plus taburan bintang kecil di sepanjang lengan. Lebar lapis
      // mengikuti radius setempat (ramping di dekat pusat, melebar ke
      // luar); jarak tegak lurus antar lengan ±0,56 r sehingga total
      // lebar halo (2 x 0,19 r) TIDAK membuat lengan saling menyatu.
      for (let a = 0; a < 4; a++) {
        g.save();
        g.rotate((a * Math.PI) / 2);
        for (let s0 = 0; s0 < steps; s0 += CHUNK) {
          const thMid = (upto * (s0 + CHUNK / 2)) / steps;
          const rMid = R0 * Math.pow(R / R0, thMid / ARM_TURNS);
          const screenAng = thMid + rot + (a * Math.PI) / 2;
          const fade = 1 - 0.85 * Math.pow(Math.abs(Math.cos(screenAng)), 1.3);
          const fAlpha = alpha * Math.max(0.08, fade);
          const path = new Path2D();
          for (let i = s0; i <= Math.min(steps, s0 + CHUNK); i++) {
            const th = (upto * i) / steps;
            const r = R0 * Math.pow(R / R0, th / ARM_TURNS);
            const px = r * Math.cos(th);
            const py = r * Math.sin(th);
            if (i === s0) path.moveTo(px, py);
            else path.lineTo(px, py);
          }
          // lapis 1: badan cahaya lebar & lembut (tanpa bayangan — lebar
          // + alpha rendahnya sendiri yang memberi kesan lembut)
          g.shadowBlur = 0;
          g.lineWidth = Math.max(0.8 * sMin, 0.38 * rMid);
          g.strokeStyle = `rgba(245,245,255,${(fAlpha * 0.16).toFixed(3)})`;
          g.stroke(path);
          // lapis 2: badan tengah
          g.lineWidth = Math.max(0.7 * sMin, 0.2 * rMid);
          g.strokeStyle = `rgba(245,245,255,${(fAlpha * 0.34).toFixed(3)})`;
          g.stroke(path);
          // lapis 3: garis inti terang (satu-satunya yang bercahaya)
          g.shadowBlur = glowS;
          g.lineWidth = Math.max(0.9 * gScale, 0.07 * rMid);
          g.strokeStyle = `rgba(245,245,255,${fAlpha.toFixed(3)})`;
          g.stroke(path);
          g.shadowBlur = 0;
          // taburan bintang: posisi deterministik dari (lengan, potongan)
          // agar bintang ikut berputar bersama galaksi, tidak berkedip acak
          const hsh = Math.sin(a * 127.1 + s0 * 311.7) * 43758.5453;
          const h1 = hsh - Math.floor(hsh);
          if (h1 < 0.6 && rMid > 2.2 * gScale) {
            const off = (h1 - 0.3) * 0.55 * rMid;
            const mx = rMid * Math.cos(thMid) - Math.sin(thMid) * off;
            const my = rMid * Math.sin(thMid) + Math.cos(thMid) * off;
            g.beginPath();
            g.arc(mx, my, (0.45 + h1 * 0.5) * gScale, 0, Math.PI * 2);
            g.fillStyle = `rgba(245,245,255,${(fAlpha * 0.8).toFixed(3)})`;
            g.fill();
          }
        }
        g.restore();
      }
      // inti galaksi: elips terang memanjang (seperti pusat galaksi di
      // foto referensi) — digambar dalam frame yang sudah terotasi `rot`,
      // jadi memanjangnya selaras dengan putaran lengan
      g.save();
      g.beginPath();
      g.ellipse(0, 0, 2.7 * gScale, 1.5 * gScale, 0, 0, Math.PI * 2);
      g.shadowBlur = glowS;
      g.fillStyle = `rgba(245,245,255,${(alpha * 0.75).toFixed(3)})`;
      g.fill();
      g.restore();
      g.restore();
      g.beginPath();
      g.arc(cx, cy, 1.3 * gScale * Math.max(0.35, p), 0, Math.PI * 2);
      g.fill();
      // matikan bayangan spiral di sumbernya juga (jangan bocor ke gambar lain)
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      redrawsRef.current++;
    }
    // Sparkle 4 titik ala Gemini — digambar di slot hurufnya; sel (kata
    // bertopengnya) sudah dilukis renderFxCell sebelum fungsi ini.
    function drawSparkGlyph(
      c: Cell,
      s: SparkState,
      scale: number,
      rot: number,
      alpha: number,
    ) {
      const g = ctx!;
      const cx = spiralCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      const ry = (capHeight() * SPARK_SIZE * scale) / 2;
      const rx = ry * SPARK_ASPECT;
      const p = SPARK_PINCH;
      g.save();
      g.translate(cx, cy);
      g.rotate(rot);
      g.beginPath();
      g.moveTo(0, -ry);
      g.quadraticCurveTo(rx * p, -ry * p, rx, 0);
      g.quadraticCurveTo(rx * p, ry * p, 0, ry);
      g.quadraticCurveTo(-rx * p, ry * p, -rx, 0);
      g.quadraticCurveTo(-rx * p, -ry * p, 0, -ry);
      g.closePath();
      g.shadowColor = "rgba(245,245,255,0.85)";
      g.shadowBlur = SPARK_GLOW * Math.min(1, gScale);
      g.fillStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.fill();
      g.restore();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      redrawsRef.current++;
    }

    // Atom Rutherford ala logo React — nukleus + 3 orbit elips +
    // elektron; seluruhnya berputar mengikuti waktu (now). Sel (kata
    // bertopengnya) sudah dilukis renderFxCell sebelum fungsi ini.
    function drawAtomGlyph(
      c: Cell,
      s: AtomState,
      scale: number,
      alpha: number,
      now: number,
    ) {
      const g = ctx!;
      const cx = spiralCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      const R = (capHeight() * ATOM_SIZE * scale) / 2;
      const rot = s.baseRot + (now / 1000) * 0.45 * ATOM_SPIN;
      g.save();
      g.shadowColor = "rgba(245,245,255,0.85)";
      g.shadowBlur = ATOM_GLOW * Math.min(1, gScale);
      g.strokeStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.fillStyle = `rgba(245,245,255,${alpha.toFixed(3)})`;
      g.lineWidth = 1.2 * gScale;
      for (let k = 0; k < ATOM_ORBITS; k++) {
        const ang = rot + (k * Math.PI) / 3;
        g.beginPath();
        g.ellipse(cx, cy, R, R * ATOM_FLAT, ang, 0, Math.PI * 2);
        g.stroke();
      }
      // nukleus
      g.beginPath();
      g.arc(cx, cy, Math.max(0.8 * Math.min(1, gScale), R * 0.15), 0, Math.PI * 2);
      g.fill();
      // elektron: satu per orbit, sudutnya bergerak mengelilingi
      for (let k = 0; k < ATOM_ORBITS; k++) {
        const ang = rot + (k * Math.PI) / 3;
        const th =
          (now / 1000) * (0.9 + k * 0.17) * Math.max(0.15, ATOM_SPIN) +
          k * 2.1;
        const ex = R * Math.cos(th);
        const ey = R * ATOM_FLAT * Math.sin(th);
        const sx = cx + ex * Math.cos(ang) - ey * Math.sin(ang);
        const sy = cy + ex * Math.sin(ang) + ey * Math.cos(ang);
        g.beginPath();
        g.arc(sx, sy, Math.max(0.7 * Math.min(1, gScale), R * 0.085), 0, Math.PI * 2);
        g.fill();
      }
      g.restore();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      redrawsRef.current++;
    }

    // Black hole TAMPAK DEPAN di slot huruf (versi hero dari bancuh
    // uji /blackhole dengan setelan user: ukuran 0,8, disk 0,90, glow
    // 0,5): cincin cahaya melingkar mengelilingi horizon hitam, pita
    // disk memotong tepat di tengah, debu mengorbit — rotasi poros.
    function drawBlackholeGlyph(
      c: Cell,
      s: BhState,
      scale: number,
      alpha: number,
      now: number,
    ) {
      const g = ctx!;
      const cx = spiralCenterX(c, s.letter);
      const cy = c.y + CH / 2 + 1;
      const sMin = Math.min(1, gScale);
      const R = Math.max(1.2, capHeight() * 0.55 * BH_SIZE * scale);
      const ringR = R * 1.38;
      const bandRx = R * 2.7 * BH_DISK;
      const bandRy = Math.max(0.8 * sMin, R * 0.16);
      const hN = (n: number) => {
        const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
        return v - Math.floor(v);
      };
      const bandGrad = (mul: number) => {
        const gr = g.createLinearGradient(cx - bandRx, cy, cx + bandRx, cy);
        gr.addColorStop(0, "rgba(196,218,252,0)");
        gr.addColorStop(0.16, `rgba(196,218,252,${(0.28 * mul * alpha).toFixed(3)})`);
        gr.addColorStop(0.5, `rgba(232,242,255,${(0.8 * mul * alpha).toFixed(3)})`);
        gr.addColorStop(0.84, `rgba(196,218,252,${(0.28 * mul * alpha).toFixed(3)})`);
        gr.addColorStop(1, "rgba(196,218,252,0)");
        return gr;
      };
      g.save();
      const halo = g.createRadialGradient(cx, cy, 0, cx, cy, bandRx);
      halo.addColorStop(0, `rgba(170,200,255,${(0.13 * alpha).toFixed(3)})`);
      halo.addColorStop(1, "rgba(170,200,255,0)");
      g.fillStyle = halo;
      g.beginPath();
      g.arc(cx, cy, bandRx, 0, 7);
      g.fill();
      /* pita disk belakang */
      g.beginPath();
      g.ellipse(cx, cy, bandRx, bandRy, 0, 0, 7);
      g.fillStyle = bandGrad(0.55);
      g.fill();
      /* cincin cahaya melingkar: 3 lapisan + busur atas/bawah */
      for (const p of [
        { m: 0.94, w: R * 0.1, a: 0.3 },
        { m: 1, w: R * 0.17, a: 0.5 },
        { m: 1.07, w: R * 0.08, a: 0.22 },
      ]) {
        g.beginPath();
        g.arc(cx, cy, ringR * p.m, 0, 7);
        g.strokeStyle = `rgba(205,226,252,${(p.a * alpha).toFixed(3)})`;
        g.lineWidth = Math.max(0.6 * sMin, p.w);
        g.stroke();
      }
      for (const seg of [
        { a0: -Math.PI * 0.72, a1: -Math.PI * 0.28 },
        { a0: Math.PI * 0.28, a1: Math.PI * 0.72 },
      ]) {
        g.beginPath();
        g.arc(cx, cy, ringR, seg.a0, seg.a1);
        g.strokeStyle = `rgba(232,243,255,${(0.8 * alpha).toFixed(3)})`;
        g.lineWidth = Math.max(0.7 * sMin, R * 0.2);
        g.stroke();
      }
      /* debu mengorbit pada cincin — rotasi murni pada poros */
      for (let i = 0; i < 10; i++) {
        const rf = 0.92 + hN(s.seed * 17 + i * 3 + 1) * 0.16;
        const th = hN(s.seed * 29 + i * 7 + 2) * Math.PI * 2 - now * 0.0012;
        const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(now * 0.005 + hN(s.seed + i * 11) * 22));
        g.beginPath();
        g.arc(cx + Math.cos(th) * ringR * rf, cy + Math.sin(th) * ringR * rf, Math.max(0.4 * sMin, R * 0.07), 0, 7);
        g.fillStyle = `rgba(220,235,255,${(alpha * tw * 0.9).toFixed(3)})`;
        g.fill();
      }
      /* horizon hitam + tepi foton */
      g.beginPath();
      g.arc(cx, cy, R, 0, 7);
      g.fillStyle = `rgba(1,1,3,${alpha.toFixed(3)})`;
      g.fill();
      g.shadowColor = "rgba(170,205,255,0.95)";
      g.shadowBlur = BH_GLOW * 2.5 * sMin;
      g.beginPath();
      g.arc(cx, cy, R * 1.02, 0, 7);
      g.strokeStyle = `rgba(238,246,255,${(0.9 * alpha).toFixed(3)})`;
      g.lineWidth = Math.max(0.7 * sMin, R * 0.12);
      g.stroke();
      g.shadowBlur = 0;
      g.shadowColor = "rgba(0,0,0,0)";
      /* pita disk depan: memotong tepat di tengah + inti terang */
      g.beginPath();
      g.ellipse(cx, cy, bandRx, bandRy, 0, 0, 7);
      g.fillStyle = bandGrad(1);
      g.fill();
      g.beginPath();
      g.ellipse(cx, cy, bandRx * 0.92, bandRy * 0.45, 0, 0, 7);
      g.fillStyle = bandGrad(1.15);
      g.fill();
      /* materi mengalir menyamping di sepanjang pita */
      for (let i = 0; i < 4; i++) {
        const sp = 0.000045 * (1 + hN(s.seed * 41 + i) * 0.7);
        const fx = ((hN(s.seed * 53 + i * 7) + now * sp) % 1) * 2 - 1;
        g.beginPath();
        g.arc(cx + fx * bandRx * 0.94, cy + (hN(s.seed * 61 + i * 3) - 0.5) * bandRy * 0.8, Math.max(0.4 * sMin, R * 0.08), 0, 7);
        g.fillStyle = `rgba(230,242,255,${(alpha * (1 - Math.abs(fx)) * 0.85).toFixed(3)})`;
        g.fill();
      }
      g.restore();
      redrawsRef.current++;
    }

    // GAMBAR KOMPOSIT SEL EFEK: satu-satunya jalur menggambar sel yang
    // memiliki spiral dan/atau sparkle. Kata bertopeng menyembunyikan
    // huruf milik SEMUA efek aktif di sel itu (karakter kedip untuk yang
    // sedang fase glitch), lalu tiap bentuk digambar di slot hurufnya
    // masing-masing — spiral dan sparkle bisa berbagi satu kata di huruf
    // berbeda (mis. AMA[spiral]IY[spark]) tanpa saling menghapus, dan
    // tidak pernah berebut huruf yang sama (dijaga saat spawn).
    function renderFxCell(idx: number, now: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole) return;
      const sp = spiralActive.get(idx);
      const sk = sparkActive.get(idx);
      const at = atomActive.get(idx);
      const bh = blackholeActive.get(idx);
      if (!sp && !sk && !at && !bh) {
        draw(c, c.a);
        return;
      }
      const arr = WORD.split("");
      if (sp)
        arr[sp.letter] =
          sp.phase === "glitchIn" || sp.phase === "glitchOut" ? sp.jitter : " ";
      if (sk)
        arr[sk.letter] =
          sk.phase === "glitchIn" || sk.phase === "glitchOut" ? sk.jitter : " ";
      if (at)
        arr[at.letter] =
          at.phase === "glitchIn" || at.phase === "glitchOut" ? at.jitter : " ";
      if (bh)
        arr[bh.letter] =
          bh.phase === "glitchIn" || bh.phase === "glitchOut" ? bh.jitter : " ";
      draw(c, c.a, arr.join(""));
      if (sp && sp.phase !== "glitchIn" && sp.phase !== "glitchOut") {
        const elapsed = now - sp.phaseStart;
        if (sp.phase === "grow") {
          const t = Math.min(1, elapsed / SPIRAL_GROW_MS);
          drawSpiralGlyph(
            c,
            sp,
            SPIRAL_P_MIN + (1 - SPIRAL_P_MIN) * easeOutCubicS(t),
            sp.rot,
            1,
          );
        } else if (sp.phase === "hold") {
          drawSpiralGlyph(c, sp, 1, sp.rot, 0.92 + 0.08 * Math.sin(now / 280));
        } else {
          const t = Math.min(1, elapsed / SPIRAL_SHRINK_MS);
          drawSpiralGlyph(
            c,
            sp,
            1 - (1 - SPIRAL_P_MIN) * easeInOutCubicS(t),
            sp.rot,
            1,
          );
        }
      }
      if (sk && sk.phase !== "glitchIn" && sk.phase !== "glitchOut") {
        const elapsed = now - sk.phaseStart;
        if (sk.phase === "grow") {
          const t = Math.min(1, elapsed / SPARK_GROW_MS);
          const e = easeOutCubicS(t);
          drawSparkGlyph(
            c,
            sk,
            SPARK_P_MIN + (1 - SPARK_P_MIN) * e,
            -0.3 * (1 - e),
            1,
          );
        } else if (sk.phase === "hold") {
          drawSparkGlyph(
            c,
            sk,
            1 + 0.05 * Math.sin(now / 240),
            0.03 * Math.sin(now / 400),
            0.92 + 0.08 * Math.sin(now / 310),
          );
        } else {
          const t = Math.min(1, elapsed / SPARK_SHRINK_MS);
          const e = easeInOutCubicS(t);
          drawSparkGlyph(c, sk, 1 - (1 - SPARK_P_MIN) * e, 0.25 * e, 1);
        }
      }
      if (at && at.phase !== "glitchIn" && at.phase !== "glitchOut") {
        const elapsed = now - at.phaseStart;
        if (at.phase === "grow") {
          const t = Math.min(1, elapsed / ATOM_GROW_MS);
          drawAtomGlyph(
            c,
            at,
            ATOM_P_MIN + (1 - ATOM_P_MIN) * easeOutCubicS(t),
            1,
            now,
          );
        } else if (at.phase === "hold") {
          drawAtomGlyph(c, at, 1, 0.92 + 0.08 * Math.sin(now / 310), now);
        } else {
          const t = Math.min(1, elapsed / ATOM_SHRINK_MS);
          drawAtomGlyph(c, at, 1 - (1 - ATOM_P_MIN) * easeInOutCubicS(t), 1, now);
        }
      }
      if (bh && bh.phase !== "glitchIn" && bh.phase !== "glitchOut") {
        const elapsed = now - bh.phaseStart;
        if (bh.phase === "grow") {
          const t = Math.min(1, elapsed / BH_GROW_MS);
          drawBlackholeGlyph(
            c,
            bh,
            BH_P_MIN + (1 - BH_P_MIN) * easeOutCubicS(t),
            1,
            now,
          );
        } else if (bh.phase === "hold") {
          drawBlackholeGlyph(c, bh, 1, 0.92 + 0.08 * Math.sin(now / 310), now);
        } else {
          const t = Math.min(1, elapsed / BH_SHRINK_MS);
          drawBlackholeGlyph(c, bh, 1 - (1 - BH_P_MIN) * easeInOutCubicS(t), 1, now);
        }
      }
    }

    // Langkah keadaan spiral — hanya memajukan fase/rotasi/kedip, TANPA
    // menggambar: gambar komposit dilakukan renderFxCell sekali per sel
    // per frame, supaya spiral & sparkle satu sel tidak saling menimpa.
    function stepSpiralFx(idx: number, s: SpiralState, now: number, dt: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole) {
        spiralActive.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          s.jitter = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          s.lastGlitchDraw = now;
        }
        if (elapsed >= SPIRAL_GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            spiralActive.delete(idx); // renderFxCell memulihkan hurufnya
          }
        }
        return;
      }
      if (s.phase === "grow") {
        const t = Math.min(1, elapsed / SPIRAL_GROW_MS);
        s.rot += dt * (3.4 * (1 - t) + 0.5);
        if (t >= 1) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        s.rot += dt * 0.5;
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      const t = Math.min(1, elapsed / SPIRAL_SHRINK_MS);
      s.rot -= dt * 2.3;
      if (t >= 1) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    // Langkah keadaan sparkle — pola yang sama seperti spiral.
    function stepSparkFx(idx: number, s: SparkState, now: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole) {
        sparkActive.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          s.jitter = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          s.lastGlitchDraw = now;
        }
        if (elapsed >= SPARK_GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            sparkActive.delete(idx);
          }
        }
        return;
      }
      if (s.phase === "grow") {
        if (elapsed >= SPARK_GROW_MS) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      if (elapsed >= SPARK_SHRINK_MS) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    // Langkah keadaan atom — pola yang sama seperti sparkle.
    function stepAtomFx(idx: number, s: AtomState, now: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole) {
        atomActive.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          s.jitter = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          s.lastGlitchDraw = now;
        }
        if (elapsed >= ATOM_GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            atomActive.delete(idx);
          }
        }
        return;
      }
      if (s.phase === "grow") {
        if (elapsed >= ATOM_GROW_MS) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      if (elapsed >= ATOM_SHRINK_MS) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    // Langkah keadaan black hole — pola yang sama seperti atom.
    function stepBhFx(idx: number, s: BhState, now: number) {
      const c = cellsRef.current[idx];
      if (!c || c.hole) {
        blackholeActive.delete(idx);
        return;
      }
      const elapsed = now - s.phaseStart;
      if (s.phase === "glitchIn" || s.phase === "glitchOut") {
        if (now - s.lastGlitchDraw > 50) {
          s.jitter = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          s.lastGlitchDraw = now;
        }
        if (elapsed >= BH_GLITCH_MS) {
          if (s.phase === "glitchIn") {
            s.phase = "grow";
            s.phaseStart = now;
          } else {
            blackholeActive.delete(idx);
          }
        }
        return;
      }
      if (s.phase === "grow") {
        if (elapsed >= BH_GROW_MS) {
          s.phase = "hold";
          s.phaseStart = now;
        }
        return;
      }
      if (s.phase === "hold") {
        if (elapsed >= s.holdMs) {
          s.phase = "shrink";
          s.phaseStart = now;
        }
        return;
      }
      if (elapsed >= BH_SHRINK_MS) {
        s.phase = "glitchOut";
        s.phaseStart = now;
        s.lastGlitchDraw = 0;
      }
    }
    // Loop gabungan spiral + sparkle + atom + black hole: majukan keadaan semua
    // efek, lalu gambar komposit tiap sel yang tersentuh tepat sekali
    // per frame.
    function ensureSpiralLoop() {
      if (spiralRaf !== null) return;
      spiralLastFrame = performance.now();
      const loop = (now: number) => {
        // OPTIMASI (30 Okt): loop efek dibatasi ±30fps. Menggambar
        // ~20-30 sel berefek dengan shadowBlur pada 60fps terus-menerus
        // membuat tab terasa makin berat seiring waktu dibuka (CPU/GPU
        // jenuh berkelanjutan). Semua animasi efek berbasis waktu
        // absolut/dt, jadi 30fps tetap mulus dan tepat waktu sementara
        // beban gambar turun separuh.
        if (now - spiralLastFrame < 33) {
          spiralRaf = requestAnimationFrame(loop);
          return;
        }
        const dt = Math.min(0.05, (now - spiralLastFrame) / 1000);
        spiralLastFrame = now;
        const touched = new Set<number>();
        for (const [idx, s] of Array.from(spiralActive)) {
          stepSpiralFx(idx, s, now, dt);
          touched.add(idx);
        }
        for (const [idx, s] of Array.from(sparkActive)) {
          stepSparkFx(idx, s, now);
          touched.add(idx);
        }
        for (const [idx, s] of Array.from(atomActive)) {
          stepAtomFx(idx, s, now);
          touched.add(idx);
        }
        for (const [idx, s] of Array.from(blackholeActive)) {
          stepBhFx(idx, s, now);
          touched.add(idx);
        }
        for (const idx of touched) renderFxCell(idx, now);
        spiralRaf =
          spiralActive.size > 0 || sparkActive.size > 0 || atomActive.size > 0 || blackholeActive.size > 0
            ? requestAnimationFrame(loop)
            : null;
      };
      spiralRaf = requestAnimationFrame(loop);
    }
    // true bila ada efek huruf aktif di sel TETANGGA (sel yang sama
    // dikecualikan — spiral & sparkle boleh berbagi satu kata).
    function nearFx(idx: number, cols: number) {
      for (const map of [spiralActive, sparkActive, atomActive, blackholeActive] as const) {
        for (const other of map.keys()) {
          if (other === idx) continue;
          if (
            Math.abs((other % cols) - (idx % cols)) <= 1 &&
            Math.abs(Math.floor(other / cols) - Math.floor(idx / cols)) <= 1
          )
            return true;
        }
      }
      return false;
    }
    // Pilih huruf acak yang TIDAK dipakai penghuni lain sel ini —
    // aturan hidup bersama ketiga efek: satu kata boleh berisi spiral
    // + sparkle + atom, tapi tidak pernah di huruf yang sama.
    function pickFreeLetter(others: ({ letter: number } | undefined)[]) {
      const used = new Set<number>();
      for (const o of others) if (o) used.add(o.letter);
      let letter = (Math.random() * WORD.length) | 0;
      for (let k = 0; k < WORD.length && used.has(letter); k++)
        letter = (letter + 1) % WORD.length;
      return letter;
    }
    function spawnSpiral() {
      if (reduced || spiralActive.size >= Math.min(SPIRAL_MAX, fxCapRef.current)) return;
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols) return;
      // Sesekali (18%) sengaja dipasangkan ke kata yang sedang berisi
      // efek lain — user ingin efek-efeknya bisa tampil bersama dalam
      // satu kata di huruf berbeda (sel berefek dijamin bersih dari
      // sistem lain karena semua sistem melewati sel berefek).
      const hosts: number[] = [];
      for (const m of [sparkActive, atomActive, blackholeActive] as const)
        for (const idx of m.keys()) if (!spiralActive.has(idx)) hosts.push(idx);
      if (hosts.length > 0 && Math.random() < 0.18) {
        const idx = hosts[(Math.random() * hosts.length) | 0];
        const c = cells[idx];
        if (c && !c.hole && c.shown) {
          spiralActive.set(idx, {
            letter: pickFreeLetter([sparkActive.get(idx), atomActive.get(idx), blackholeActive.get(idx)]),
            phase: "glitchIn",
            phaseStart: performance.now(),
            rot: Math.random() * Math.PI * 2,
            holdMs: 800 + Math.random() * 700,
            lastGlitchDraw: 0,
            jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          });
          renderFxCell(idx, performance.now());
          ensureSpiralLoop();
          return;
        }
      }
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
        const letter = (Math.random() * WORD.length) | 0;
        // TIDAK BOLEH berebut huruf yang sedang dipakai efek lain di
        // sel yang sama (huruf lain di kata yang sama boleh)
        const sk = sparkActive.get(idx);
        const at = atomActive.get(idx);
        const bh = blackholeActive.get(idx);
        if ((sk && sk.letter === letter) || (at && at.letter === letter) || (bh && bh.letter === letter))
          continue;
        if (nearFx(idx, cols)) continue; // jangan bersebelahan efek lain
        spiralActive.set(idx, {
          letter,
          phase: "glitchIn",
          phaseStart: performance.now(),
          rot: Math.random() * Math.PI * 2,
          holdMs: 800 + Math.random() * 700, // hold singkat saja (permintaan user)
          lastGlitchDraw: 0,
          jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        });
        renderFxCell(idx, performance.now());
        ensureSpiralLoop();
        break;
      }
    }
    function spawnSpark() {
      if (reduced || sparkActive.size >= Math.min(SPARK_MAX, fxCapRef.current)) return;
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols) return;
      // Pasangan cermin spawnSpiral: sesekali menumpang kata berefek lain.
      const hosts: number[] = [];
      for (const m of [spiralActive, atomActive, blackholeActive] as const)
        for (const idx of m.keys()) if (!sparkActive.has(idx)) hosts.push(idx);
      if (hosts.length > 0 && Math.random() < 0.18) {
        const idx = hosts[(Math.random() * hosts.length) | 0];
        const c = cells[idx];
        if (c && !c.hole && c.shown) {
          sparkActive.set(idx, {
            letter: pickFreeLetter([spiralActive.get(idx), atomActive.get(idx), blackholeActive.get(idx)]),
            phase: "glitchIn",
            phaseStart: performance.now(),
            holdMs: SPARK_HOLD_MS * (0.8 + Math.random() * 0.4),
            lastGlitchDraw: 0,
            jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          });
          renderFxCell(idx, performance.now());
          ensureSpiralLoop();
          return;
        }
      }
      for (let tries = 0; tries < 24; tries++) {
        const idx = (Math.random() * cells.length) | 0;
        const c = cells[idx];
        if (!c || c.hole || !c.shown) continue;
        if (
          altActive.has(idx) ||
          frontActive.has(idx) ||
          scrambling.has(idx) ||
          hiRef.current.has(idx) ||
          sparkActive.has(idx) ||
          bandSet.has(idx)
        )
          continue;
        const letter = (Math.random() * WORD.length) | 0;
        const sp = spiralActive.get(idx);
        const at = atomActive.get(idx);
        const bh = blackholeActive.get(idx);
        if ((sp && sp.letter === letter) || (at && at.letter === letter) || (bh && bh.letter === letter))
          continue;
        if (nearFx(idx, cols)) continue;
        sparkActive.set(idx, {
          letter,
          phase: "glitchIn",
          phaseStart: performance.now(),
          holdMs: SPARK_HOLD_MS * (0.8 + Math.random() * 0.4),
          lastGlitchDraw: 0,
          jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        });
        renderFxCell(idx, performance.now());
        ensureSpiralLoop();
        break;
      }
    }
    function spawnAtom() {
      if (reduced || atomActive.size >= Math.min(ATOM_MAX, fxCapRef.current)) return;
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols) return;
      // Pasangan cermin: sesekali menumpang kata berefek lain.
      const hosts: number[] = [];
      for (const m of [spiralActive, sparkActive, blackholeActive] as const)
        for (const idx of m.keys()) if (!atomActive.has(idx)) hosts.push(idx);
      if (hosts.length > 0 && Math.random() < 0.18) {
        const idx = hosts[(Math.random() * hosts.length) | 0];
        const c = cells[idx];
        if (c && !c.hole && c.shown) {
          atomActive.set(idx, {
            letter: pickFreeLetter([spiralActive.get(idx), sparkActive.get(idx), blackholeActive.get(idx)]),
            phase: "glitchIn",
            phaseStart: performance.now(),
            holdMs: ATOM_HOLD_MS * (0.8 + Math.random() * 0.4),
            lastGlitchDraw: 0,
            jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
            baseRot: Math.random() * Math.PI,
          });
          renderFxCell(idx, performance.now());
          ensureSpiralLoop();
          return;
        }
      }
      for (let tries = 0; tries < 24; tries++) {
        const idx = (Math.random() * cells.length) | 0;
        const c = cells[idx];
        if (!c || c.hole || !c.shown) continue;
        if (
          altActive.has(idx) ||
          frontActive.has(idx) ||
          scrambling.has(idx) ||
          hiRef.current.has(idx) ||
          atomActive.has(idx) ||
          bandSet.has(idx)
        )
          continue;
        const letter = (Math.random() * WORD.length) | 0;
        const sp = spiralActive.get(idx);
        const sk = sparkActive.get(idx);
        const bh = blackholeActive.get(idx);
        if ((sp && sp.letter === letter) || (sk && sk.letter === letter) || (bh && bh.letter === letter))
          continue;
        if (nearFx(idx, cols)) continue;
        atomActive.set(idx, {
          letter,
          phase: "glitchIn",
          phaseStart: performance.now(),
          holdMs: ATOM_HOLD_MS * (0.8 + Math.random() * 0.4),
          lastGlitchDraw: 0,
          jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          baseRot: Math.random() * Math.PI,
        });
        renderFxCell(idx, performance.now());
        ensureSpiralLoop();
        break;
      }
    }
    function spawnBlackhole() {
      if (reduced || blackholeActive.size >= Math.min(BH_MAX, fxCapRef.current)) return;
      const cells = cellsRef.current;
      const cols = colsRef.current;
      if (!cells.length || !cols) return;
      // Pasangan cermin spawnAtom: sesekali menumpang kata berefek lain.
      const hosts: number[] = [];
      for (const m of [spiralActive, sparkActive, atomActive] as const)
        for (const idx of m.keys()) if (!blackholeActive.has(idx)) hosts.push(idx);
      if (hosts.length > 0 && Math.random() < 0.18) {
        const idx = hosts[(Math.random() * hosts.length) | 0];
        const c = cells[idx];
        if (c && !c.hole && c.shown) {
          blackholeActive.set(idx, {
            letter: pickFreeLetter([spiralActive.get(idx), sparkActive.get(idx), atomActive.get(idx)]),
            phase: "glitchIn",
            phaseStart: performance.now(),
            holdMs: BH_HOLD_MS * (0.8 + Math.random() * 0.4),
            lastGlitchDraw: 0,
            jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
            seed: Math.random() * 100,
          });
          renderFxCell(idx, performance.now());
          ensureSpiralLoop();
          return;
        }
      }
      for (let tries = 0; tries < 24; tries++) {
        const idx = (Math.random() * cells.length) | 0;
        const c = cells[idx];
        if (!c || c.hole || !c.shown) continue;
        if (
          altActive.has(idx) ||
          frontActive.has(idx) ||
          scrambling.has(idx) ||
          hiRef.current.has(idx) ||
          blackholeActive.has(idx) ||
          bandSet.has(idx)
        )
          continue;
        const letter = (Math.random() * WORD.length) | 0;
        const sp = spiralActive.get(idx);
        const sk = sparkActive.get(idx);
        const at = atomActive.get(idx);
        if ((sp && sp.letter === letter) || (sk && sk.letter === letter) || (at && at.letter === letter))
          continue;
        if (nearFx(idx, cols)) continue;
        blackholeActive.set(idx, {
          letter,
          phase: "glitchIn",
          phaseStart: performance.now(),
          holdMs: BH_HOLD_MS * (0.8 + Math.random() * 0.4),
          lastGlitchDraw: 0,
          jitter: GLYPHS[(Math.random() * GLYPHS.length) | 0],
          seed: Math.random() * 100,
        });
        renderFxCell(idx, performance.now());
        ensureSpiralLoop();
        break;
      }
    }
    let spawnTickCount = 0;
    const spiralTimer = reduced
      ? null
      : setInterval(() => {
          if (document.hidden || !stageVisible) return;
          // WATCHDOG SPIRAL: loop rAF bisa berhenti tanpa kabar (tab
          // tertutup jendela lain / rAF kelaparan) sementara spiral masih
          // tercatat aktif — selnya membeku sebagai "kata tanpa huruf"
          // tanpa batas waktu dan semua sistem lain melewatinya. Bila
          // frame terakhir sudah terlalu lama, paksa selesaikan semua
          // spiral: huruf dikembalikan dan antrean dibersihkan.
          if (
            (spiralActive.size > 0 ||
              sparkActive.size > 0 ||
              atomActive.size > 0 ||
              blackholeActive.size > 0) &&
            performance.now() - spiralLastFrame > 2500
          ) {
            const stuck = new Set([
              ...spiralActive.keys(),
              ...sparkActive.keys(),
              ...atomActive.keys(),
              ...blackholeActive.keys(),
            ]);
            spiralActive.clear();
            sparkActive.clear();
            atomActive.clear();
            blackholeActive.clear();
            spiralRaf = null;
            for (const idx of stuck) {
              const c = cellsRef.current[idx];
              if (c && !c.hole) draw(c, c.a);
            }
          }
          // Layar kecil: lewati sebagian tick — laju kemunculan efek
          // (dan beban gambarnya) menyesuaikan ukuran view.
          spawnTickCount++;
          if (spawnTickCount % spawnDivRef.current !== 0) return;
          spawnSpiral();
          spawnSpark();
          spawnAtom();
          spawnBlackhole();
        }, SPIRAL_EVERY_MS);

    // KUNCI RINGAN #2: interval lambat + sedikit sel acak, BUKAN loop 60fps
    // yang menggambar ulang seluruh layar.
    let glitchTimer: ReturnType<typeof setInterval> | null = null;
    function startGlitch() {
      if (reduced || glitchTimer) return;
      glitchTimer = setInterval(() => {
        if (document.hidden || !stageVisible) return;
        const cells = cellsRef.current;
        if (!cells.length) return;
        const occupied = (idx: number) =>
          altActive.has(idx) ||
          scrambling.has(idx) ||
          frontActive.has(idx) ||
          spiralActive.has(idx) ||
          sparkActive.has(idx) ||
          atomActive.has(idx);
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
      const W = viewW;
      const H = viewH;
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
        if (sparkActive.has(idx)) continue; // sel sparkle juga
        if (atomActive.has(idx)) continue; // sel atom juga
        const c = cells[idx];
        if (c && c.shown) draw(c, c.a);
      }
      bandSet = new Set();
    }

    function stepWave() {
      if (document.hidden || !stageVisible) return;
      const cells = cellsRef.current;
      const maxDiag = viewW + viewH;
      waveFront += maxDiag / 20; // satu sapuan penuh ±1,6 detik
      const next = new Set<number>();
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (
          !c.shown ||
          altActive.has(i) ||
          frontActive.has(i) ||
          spiralActive.has(i) ||
          sparkActive.has(i) ||
          atomActive.has(i) ||
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
        if (Math.random() < 0.26 && frontActive.size < maxFront) {
          // AKTIVASI FRONT: sel jadi kata sisipan selama ±1,7–3,6 detik —
          // inilah "gerakan" khas Wonder: aktivitas merambat bersama sapuan.
          frontActive.set(
            idx,
            performance.now() + 1700 + Math.random() * 1900,
          );
          draw(
            c,
            Math.min(0.78, c.a + ALT_BOOST),
            ALT_WORDS[(Math.random() * ALT_WORDS.length) | 0],
          );
        } else {
          draw(c, Math.min(0.78, c.a + WAVE_BOOST));
        }
      }
      for (const idx of bandSet) {
        if (
          next.has(idx) ||
          hiRef.current.has(idx) ||
          frontActive.has(idx) ||
          spiralActive.has(idx) ||
          sparkActive.has(idx) ||
          atomActive.has(idx)
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
    // dipetakan ke matriks 8 titik terang: makin dekat kursor makin
    // banyak titik menyala (puncaknya blok padat), dengan
    // peluang kecil karakter glitch agar berkedip. Digambar per slot
    // huruf supaya tekstur kata grid tetap utuh; hanya sel panas yang
    // diproses tiap frame rAF — tetap ringan.
    let heatRaf: number | null = null;
    let lastMoveAt = 0;
    let lastHeatFrame = 0; // cap waktu frame heat terakhir (untuk throttle 30fps + decay berbasis dt)
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
        // EFEK 8 TITIK (permintaan user dari gambar referensi Wonder):
        // huruf panas digambar sebagai matriks 8 titik (2 kolom x 4
        // baris) — jumlah titik menyala mengikuti panasnya, urutan
        // menyala acak per slot (ditentukan saat slot dinyalakan) agar
        // teksturnya organik; panas hampir penuh menjadi blok padat.
        // Warnanya nyaris putih terang (lebih menyala dari blok ░▒▓█
        // versi sebelumnya yang tampak kusam).
        if (Math.random() < 0.08) {
          // kedip huruf glitch sesekali, dipertahankan dari versi lama
          const a = Math.min(1, 0.5 + s.heat * 0.5);
          g.fillStyle = `rgba(245,245,255,${a.toFixed(3)})`;
          g.fillText(
            HEAT_GLITCH[(Math.random() * HEAT_GLITCH.length) | 0],
            slotX(c, i),
            c.y + TEXT_Y,
          );
          continue;
        }
        const h = Math.max(0, Math.min(1, s.heat));
        const a = 0.65 + 0.35 * h;
        g.fillStyle = `rgba(245,245,255,${a.toFixed(3)})`;
        const x0 = slotX(c, i);
        const charW = slotMetrics().charW;
        const capH = capHeight();
        if (h >= 0.92) {
          // puncak panas: blok padat terang (seperti referensi)
          const bw = charW * 0.96;
          const bh = capH * 1.08;
          g.fillRect(
            x0 + (charW - bw) / 2,
            c.y + TEXT_Y - capH - (bh - capH) / 2,
            bw,
            bh,
          );
          continue;
        }
        const lit = Math.max(1, Math.round(h * 8));
        const dx = charW * 0.24;
        const rowStep = capH / 4;
        const top = c.y + TEXT_Y - capH;
        const r = Math.max(1.2, charW * 0.17); // titik besar & tegas seperti referensi
        for (let d = 0; d < lit; d++) {
          const p = s.order[d];
          const px = x0 + charW / 2 + (p % 2 === 0 ? -dx : dx);
          const py = top + rowStep * (((p / 2) | 0) + 0.5);
          g.beginPath();
          g.arc(px, py, r, 0, Math.PI * 2);
          g.fill();
        }
      }
      redrawsRef.current++;
    }
    function stepHeat() {
      // OPTIMASI (30 Okt): loop heat juga dibatasi ±30fps; pendinginan
      // diskalakan dengan dt (pangkat) agar kecepatan memudarnya sama
      // seperti 60fps sebelumnya.
      const frameNow = performance.now();
      if (lastHeatFrame !== 0 && frameNow - lastHeatFrame < 33) {
        heatRaf = requestAnimationFrame(stepHeat);
        return;
      }
      const heatDt = lastHeatFrame === 0 ? 16.7 : frameNow - lastHeatFrame;
      lastHeatFrame = frameNow;
      const heatDecay = Math.pow(HEAT_DECAY, heatDt / 16.7);
      const cells = cellsRef.current;
      const cols = colsRef.current;
      const m = mouseRef.current;
      const now = frameNow;
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
        // c1 dikurangi 1 lajur: kolom kata mulai setelah margin kiri
        const c1 = Math.min(cols - 1, Math.floor((m.x + HEAT_RX) / CW) - 1);
        const r0 = Math.max(0, Math.floor((m.y - HEAT_RY) / CH));
        const r1 = Math.floor((m.y + HEAT_RY) / CH);
        for (let r = r0; r <= r1; r++) {
          for (let cc = c0; cc <= c1; cc++) {
            const idx = r * cols + cc;
            const cell = cells[idx];
            if (!cell || cell.hole || !cell.shown) continue;
            if (
              spiralActive.has(idx) ||
              sparkActive.has(idx) ||
              atomActive.has(idx) ||
              altActive.has(idx) ||
              frontActive.has(idx) ||
              scrambling.has(idx) ||
              bandSet.has(idx)
            )
              continue; // jangan rebut kata yang sedang tampil khusus (termasuk spiral/sparkle/atom)
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
              // urutan menyala 8 titik diacak sekali saat slot menyala
              const order = [0, 1, 2, 3, 4, 5, 6, 7];
              for (let k = order.length - 1; k > 0; k--) {
                const j = (Math.random() * (k + 1)) | 0;
                const tmp = order[k];
                order[k] = order[j];
                order[j] = tmp;
              }
              hc.slots[i] = {
                heat: Math.min(1, Math.max(0.02, h)),
                glyph: "",
                born: now,
                order,
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
          sparkActive.has(idx) ||
          atomActive.has(idx) ||
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
          s.heat *= heatDecay;
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
          if (document.hidden || !stageVisible) return;
          const cells = cellsRef.current;
          for (let i = 0; i < cells.length; i++) {
            const c = cells[i];
            if (!c || c.hole || !c.shown) continue;
            if (
              spiralActive.has(i) ||
              sparkActive.has(i) ||
              atomActive.has(i) ||
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
      stageIO.disconnect();
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
    const G = gridRef.current; // metrik aktif (hasil skala 9 kolom)
    ctx.clearRect(c.x, c.y, G.cw, G.ch);
    // Set SEMUA state teks secara eksplisit di sini: posisi kata dihitung dari
    // measureText, jadi font/letterSpacing ambient yang tertinggal dari jalur
    // gambar lain (atau reset state canvas) bisa menggeser kata keluar selnya.
    ctx.font = G.font;
    (ctx as unknown as { letterSpacing: string }).letterSpacing =
      `${G.ls}px`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    // Bayangan HARUS mati di sini: drawSpiralGlyph menyalakan shadowBlur
    // untuk cahaya spiral dan state canvas itu MENETAP — tanpa reset ini
    // semua kata yang digambar setelahnya tercetak dengan bayangan cahaya
    // (tampak lebih tebal/ganda, "tidak normal") selamanya.
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
    ctx.fillStyle = `rgba(${INK},${alpha.toFixed(3)})`;
    // kata selalu terpusat horizontal di tengah selnya (lebar dari cache)
    const cache = widthCacheRef.current;
    const key = `${G.font}|${text}`;
    let w = cache.get(key);
    if (w === undefined) {
      w = ctx.measureText(text).width;
      if (cache.size > 400) cache.clear();
      cache.set(key, w);
    }
    ctx.fillText(text, c.x + (G.cw - w) / 2, c.y + G.ty);
    redrawsRef.current++;
  }

  return (
    /* Stage: satu-satunya isi halaman Home — scene grid memenuhi sisa
       layar di bawah navbar (navbar kini tinggal di layout root). */
    <main className="stage">
      <canvas ref={canvasRef} className="stage-canvas" aria-hidden="true" />

      {/* Di dalam lubang grid HANYA kata besar AMAMIYA berfont balok —
          pill status, teks peran, dan tombol CTA sudah dihapus (31 Okt);
          kata ini diperbesar mengisi lubang dengan margin tersisa. */}
      <div
        className={`stage-title ${blockFont.variable}${titlePlay ? " title-on" : ""}`}
      >
        <h1
          className={
            !titlePlay
              ? "t-pre"
              : reducedMotion
                ? "t-instant"
                : titleReady
                  ? "t-done"
                  : "t-play"
          }
        >
          <TitleWord enabled={mouseOn && !reducedMotion && titleReady} />
        </h1>
        {/* 3 ikon efek berjejer tepat di bawah kata besar (31 Okt) */}
        <FxCards />
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
  );
}
