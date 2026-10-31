"use client";

import { useState } from "react";
import { skillsData, type SkillCategory } from "@/lib/skills";

// Halaman Tentang — konten dari WebPortofolio lama: deskripsi profil,
// matriks keahlian (dengan filter kategori seperti aslinya), dan
// linimasa pengalaman.
const CATS: SkillCategory[] = ["All", "AI/ML", "Web", "Systems", "Other"];

const TIMELINE = [
  {
    year: "2024 - Sekarang",
    title: "Freelance AI & Automation Engineer",
    subtitle: "Aplikasi AI kustom & otomatisasi",
    desc: "Membangun alur otomatisasi, workflow RAG, dasbor agen, dan alat manajemen server.",
  },
  {
    year: "2022 - 2024",
    title: "Pengembang Perangkat Lunak & Seluler",
    subtitle: "Aplikasi web & lintas-platform",
    desc: "Membangun frontend web dan aplikasi utilitas mobile berbasis database dengan Flutter.",
  },
  {
    year: "2021",
    title: "Linux & Otomatisasi",
    subtitle: "Scripting & setup sistem",
    desc: "Fokus pada shell scripting, setup server, dan alat CLI kecil.",
  },
];

export default function AboutSection() {
  const [cat, setCat] = useState<SkillCategory>("All");
  const shown =
    cat === "All" ? skillsData : skillsData.filter((s) => s.category === cat);
  return (
    <div className="section-inner section-narrow">
      <h2 className="page-title">Tentang Saya</h2>
      <p className="page-desc">
        Saya suka membangun alat praktis yang menyelesaikan masalah nyata.
        Sekali buat, berguna selamanya.
      </p>

      <h2 className="sec-title">Keahlian</h2>
      <div className="chips-row">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={cat === c ? "chip chip-on" : "chip"}
            onClick={() => setCat(c)}
          >
            {c === "All" ? "Semua" : c}
          </button>
        ))}
      </div>
      <div className="skill-grid">
        {shown.map((s) => (
          <article key={s.name} className="skill-card">
            <div className="skill-top">
              <h3>{s.name}</h3>
              <span className="skill-level">{s.level}%</span>
            </div>
            <div className="skill-bar">
              <span style={{ width: `${s.level}%` }} />
            </div>
            <p>{s.desc.id}</p>
            <span className="proj-cat">{s.category}</span>
          </article>
        ))}
      </div>

      <h2 className="sec-title">Pengalaman</h2>
      <div className="timeline">
        {TIMELINE.map((t) => (
          <article key={t.title} className="tl-item">
            <span className="tl-year">{t.year}</span>
            <div>
              <h3>{t.title}</h3>
              <p className="tl-sub">{t.subtitle}</p>
              <p>{t.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
