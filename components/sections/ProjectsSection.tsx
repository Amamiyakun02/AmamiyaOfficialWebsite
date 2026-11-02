"use client";

import { useState } from "react";
import Link from "next/link";
import { projectsData, type ProjectCategory } from "@/lib/projects";
import SectionTitle from "@/components/SectionTitle";

// Halaman daftar proyek — data case-study asli dari WebPortofolio lama
// (lib/projects.ts), gaya visual mengikuti bahasa design Wonder:
// gelap, kartu kaca, aksen biru.
const FILTERS: ("All" | ProjectCategory)[] = [
  "All",
  "AI/ML",
  "Web",
  "Mobile",
];

export default function ProjectsSection({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const shown =
    filter === "All"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);
  return (
    <div className="section-inner">
      <SectionTitle text="Projects" />
      <p className="page-desc">
        Full case studies — problem, architecture, tech stack, and
        results — from projects I have built and run.
      </p>

      <div className="chips-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={filter === f ? "chip chip-on" : "chip"}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="proj-grid">
        {shown.map((p) => {
          const Icon = p.icon;
          return (
            <article key={p.id} className="proj-card">
              <div className="proj-card-top">
                <span className="proj-icon">
                  <Icon size={20} />
                </span>
                {p.featured && <span className="proj-featured">★ Featured</span>}
                <span className="proj-cat">{p.category}</span>
              </div>
              <h3>
                <button type="button" className="link-btn title-btn" onClick={() => onSelect(p.id)}>{p.title}</button>
              </h3>
              <p className="proj-tagline">{p.tagline.en}</p>
              <p className="proj-desc">{p.description.en}</p>
              <div className="tech-row">
                {p.tech.slice(0, 4).map((t) => (
                  <span key={t} className="tech-chip">
                    {t}
                  </span>
                ))}
                {p.tech.length > 4 && (
                  <span className="tech-chip">+{p.tech.length - 4}</span>
                )}
              </div>
              <div className="proj-links">
                <button type="button" className="link-btn" onClick={() => onSelect(p.id)}>Case study →</button>
                {p.githubUrl && (
                  <a href={p.githubUrl} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                )}
                {p.liveUrl && (
                  <a href={p.liveUrl} target="_blank" rel="noreferrer">
                    Live
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
