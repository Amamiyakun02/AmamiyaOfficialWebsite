"use client";

import { ArrowDown } from "lucide-react";
import { scrollToSection } from "@/lib/scroll";

/* =====================================================================
   TOMBOL AKSI UTAMA di hero — awalnya (2 Nov 2026) tiga aksi dalam
   satu dock kapsul kaca (Lihat Proyek + Coba Assistant + Unduh CV).
   Penyesuaian user 21 Nov 2026: di tengah tinggal SATU tombol ini,
   diperbesar sebagai aksi utama tunggal:
   - Lihat Proyek : gulir mulus ke section #projects.
   - Unduh CV     : pindah ke navbar kanan atas, di kiri ikon GitHub.
   - Coba Assistant: jadi ikon mengambang (vienna.svg) kanan bawah
     layar — lihat components/AgentFab.tsx.
   Muncul terakhir setelah intro judul + cip selesai (diatur CSS
   .hero-ctas dengan gerbang .title-on, meniru pola .fx-card).
   ===================================================================== */
export default function HeroCtas() {
  return (
    <div className="hero-ctas">
      <button
        type="button"
        className="hero-cta is-primary"
        onClick={() => scrollToSection("projects")}
      >
        <ArrowDown size={19} />
        Lihat Proyek
      </button>
    </div>
  );
}
