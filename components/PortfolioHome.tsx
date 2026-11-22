"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import WonderScene from "./WonderScene";
import LazySection from "./LazySection";
import { scrollToSection } from "@/lib/scroll";

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

  // Tiba dari halaman lain dengan hash (mis. /#kontak dari halaman
  // tool): gulir ke section itu setelah mount — lompatan jangkar
  // bawaan browser meleset karena section masih placeholder.
  useEffect(() => {
    const h = window.location.hash.replace("#", "");
    if (h && document.getElementById(h)) {
      const t = window.setTimeout(() => scrollToSection(h), 90);
      return () => window.clearTimeout(t);
    }
  }, []);

  const openCase = useCallback((id: string) => {
    setSelectedId(id);
    // beri satu frame agar section ter-mount, lalu gulir ke sana
    requestAnimationFrame(() => {
      setTimeout(() => {
        document
          .getElementById("case-study")
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
      <div id="home" className="hero-wrap">
        <WonderScene />
      </div>

      {/* Section 2: daftar proyek */}
      <LazySection id="projects" minHeight={900}>
        <ProjectsSection onSelect={openCase} />
      </LazySection>

      {/* Section 3: studi kasus — hanya ada bila proyek dipilih, dan
          hanya merender SATU proyek terpilih */}
      {selectedId && (
        <section
          id="case-study"
          className="relative scroll-mt-[70px] border-t border-[#141417]"
        >
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
      <LazySection id="about" minHeight={760}>
        <AboutSection />
      </LazySection>

      {/* Section 6: kontak */}
      <LazySection id="contact" minHeight={560}>
        <ContactSection />
      </LazySection>

      <footer className="mx-auto flex w-[min(1200px,100%)] flex-wrap justify-between gap-2.5 border-t border-[#141417] px-7 pt-[26px] pb-9 text-[12.5px] text-[#8b8b94] max-[760px]:px-[18px]">
        <span>
          © {new Date().getFullYear()} Amamiya
        </span>
        <span className="italic">
          Built once, useful forever.
        </span>
      </footer>
    </div>
  );
}
