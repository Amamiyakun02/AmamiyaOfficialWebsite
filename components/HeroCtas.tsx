"use client";

import Link from "next/link";
import { ArrowDown, MessageCircle, Download } from "lucide-react";
import { scrollToSection } from "@/lib/scroll";

/* =====================================================================
   TOMBOL AKSI PERTAMA di hero — ditambahkan 2 Nov 2026 atas pilihan
   user dari opsi yang ditawarkan (kombinasi: Proyek + Assistant +
   Unduh CV). Berjejer di tengah, tepat di bawah cip FxCards, dan
   muncul terakhir setelah intro judul + cip selesai (diatur CSS
   .hero-ctas dengan gerbang .title-on, meniru pola .fx-card).
   - Lihat Proyek : gulir mulus ke section #projects (aksi utama).
   - Coba Assistant: fitur live andalan situs -> /tools/assistant.
   - Unduh CV     : unduh langsung /profesional-cv.pdf dari public.
   ===================================================================== */
export default function HeroCtas() {
  return (
    <div className="hero-ctas">
      <button
        type="button"
        className="hero-cta is-primary"
        onClick={() => scrollToSection("projects")}
      >
        <ArrowDown size={15} />
        Lihat Proyek
      </button>
      <Link href="/tools/assistant" className="hero-cta">
        <MessageCircle size={15} />
        Coba Assistant
      </Link>
      <a href="/profesional-cv.pdf" download className="hero-cta">
        <Download size={15} />
        Unduh CV
      </a>
    </div>
  );
}
