"use client";

import Link from "next/link";
import { ArrowDown, FlaskConical } from "lucide-react";
import { scrollToSection } from "@/lib/scroll";
import { useLang } from "@/lib/i18n";

/* =====================================================================
   TOMBOL AKSI UTAMA di hero — awalnya (2 Nov 2026) tiga aksi dalam
   satu dock kapsul kaca. Penyesuaian user 21 Nov 2026: tinggal satu
   tombol "Lihat Proyek" di tengah. 26 Nov 2026 dock disembunyikan
   (SHOW_HERO_CTA=false) dan kekosongannya diisi kata grid.
   27 Nov 2026 (permintaan user sesudah Labs live): dock tampil lagi
   dengan DUA aksi — jalan ke Projects di bawah dan ke Labs:
   - Lihat Proyek : gulir mulus ke section #projects.
   - Kunjungi Labs: tautan ke landing Labs (/labs).
   (Unduh CV tetap di navbar; Coba Assistant tetap ikon mengambang
   di kanan bawah layar — lihat components/AgentFab.tsx.)
   Muncul terakhir setelah intro judul selesai (diatur CSS
   .hero-ctas dengan gerbang .title-on, meniru pola .fx-card).
   ===================================================================== */
export default function HeroCtas() {
  const { t } = useLang();
  return (
    <div className="hero-ctas">
      <button
        type="button"
        className="hero-cta is-primary"
        onClick={() => scrollToSection("projects")}
      >
        <ArrowDown size={19} />
        {t("hero.ctaProjects")}
      </button>
      <Link href="/labs" className="hero-cta">
        <FlaskConical size={19} />
        {t("hero.ctaLabs")}
      </Link>
    </div>
  );
}
