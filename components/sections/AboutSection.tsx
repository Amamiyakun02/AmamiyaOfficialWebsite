"use client";

import { useState } from "react";
import { skillsData, type SkillCategory } from "@/lib/skills";
import SectionTitle from "@/components/SectionTitle";

// Halaman Tentang — konten dari WebPortofolio lama: deskripsi profil,
// matriks keahlian (dengan filter kategori seperti aslinya), dan
// linimasa pengalaman.
const CATS: SkillCategory[] = ["All", "AI/ML", "Web", "Systems", "Other"];

const TIMELINE = [
  {
    year: "2024 - Present",
    title: "Freelance AI & Automation Engineer",
    subtitle: "Custom AI apps & automation",
    desc: "Building automation pipelines, RAG workflows, agent dashboards, and server management tools.",
  },
  {
    year: "2022 - 2024",
    title: "Software & Mobile Developer",
    subtitle: "Web & cross-platform apps",
    desc: "Building web frontends and database-driven mobile utility apps with Flutter.",
  },
  {
    year: "2021",
    title: "Linux & Otomatisasi",
    subtitle: "Scripting & system setup",
    desc: "Focused on shell scripting, server setup, and small CLI tools.",
  },
];

export default function AboutSection() {
  const [cat, setCat] = useState<SkillCategory>("All");
  const shown =
    cat === "All" ? skillsData : skillsData.filter((s) => s.category === cat);
  return (
    <div className="section-inner section-narrow">
      <SectionTitle text="About" />
      <p className="page-desc">
        I like building practical tools that solve real problems.
        Built once, useful forever.
      </p>

      <h2 className="sec-title">Skills</h2>
      <div className="chips-row">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={cat === c ? "chip chip-on" : "chip"}
            onClick={() => setCat(c)}
          >
            {c === "All" ? "All" : c}
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
            <p>{s.desc.en}</p>
            <span className="proj-cat">{s.category}</span>
          </article>
        ))}
      </div>

      <h2 className="sec-title">Experience</h2>
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
