"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import WonderScene from "./WonderScene";
import LazySection from "./LazySection";

/* ================================================================
   PORTOFOLIO SATU HALAMAN (permintaan user 31 Okt): semua isi jadi
   section dalam satu page — Beranda (panggung Wonder), Proyek,
   Studi Kasus (pilihan), Tools, Tentang, Kontak — dengan rendering
   PER SECTION: section berat diimpor sebagai chunk terpisah
   (next/dynamic) dan hanya di-mount saat mendekati viewport
   (LazySection), jadi muatan awal hanya panggung Wonder saja.
   ================================================================ */
const AmbientBackground = dynamic(() => import("./AmbientBackground"), {
  ssr: false,
});
const ProjectsSection = dynamic(() => import("./sections/ProjectsSection"), {
  ssr: false,
});
const ToolsSection = dynamic(() => import("./sections/ToolsSection"), {
  ssr: false,
});
const AboutSection = dynamic(() => import("./sections/AboutSection"), {
  ssr: false,
});
const ContactSection = dynamic(() => import("./sections/ContactSection"), {
  ssr: false,
});
const ProjectDetailSection = dynamic(
  () => import("./sections/ProjectDetailSection"),
  { ssr: false },
);

export default function PortfolioHome() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openCase = useCallback((id: string) => {
    setSelectedId(id);
    // beri satu frame agar section ter-mount, lalu gulir ke sana
    requestAnimationFrame(() => {
      setTimeout(() => {
        document
          .getElementById("studi-kasus")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    });
  }, []);

  return (
    <div className="home-scroll">
      {/* Latar ambien titik lembut di belakang section-section bawah
          (digambar hanya di bawah hero — hero tidak berubah) */}
      <AmbientBackground />
      {/* Section 1: panggung Wonder (hero) — selalu dirender penuh */}
      <div id="beranda" className="hero-wrap">
        <WonderScene />
      </div>

      {/* Section 2: daftar proyek */}
      <LazySection id="proyek" minHeight={900}>
        <ProjectsSection onSelect={openCase} />
      </LazySection>

      {/* Section 3: studi kasus — hanya ada bila proyek dipilih, dan
          hanya merender SATU proyek terpilih */}
      {selectedId && (
        <section id="studi-kasus" className="lz-section">
          <ProjectDetailSection
            projectId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        </section>
      )}

      {/* Section 4: tools */}
      <LazySection id="tools" minHeight={640}>
        <ToolsSection />
      </LazySection>

      {/* Section 5: tentang */}
      <LazySection id="tentang" minHeight={760}>
        <AboutSection />
      </LazySection>

      {/* Section 6: kontak */}
      <LazySection id="kontak" minHeight={560}>
        <ContactSection />
      </LazySection>

      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} Amamiya — dibangun dengan Next.js di
          atas panggung grid tipografi interaktif.
        </span>
        <span className="footer-motto">
          Sekali buat, berguna selamanya.
        </span>
      </footer>
    </div>
  );
}
