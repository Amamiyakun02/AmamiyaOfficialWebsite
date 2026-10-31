"use client";

import { useState } from "react";
import Link from "next/link";
import { projectsData, type ProjectCategory } from "@/lib/projects";

// Halaman daftar proyek — data case-study asli dari WebPortofolio lama
// (lib/projects.ts), gaya visual mengikuti bahasa design Wonder:
// gelap, kartu kaca, aksen biru.
const FILTERS: ("Semua" | ProjectCategory)[] = [
  "Semua",
  "AI/ML",
  "Web",
  "Mobile",
];

export default function ProjectsPage() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const shown =
    filter === "Semua"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);
  return (
    <main className="page">
      <p className="page-eyebrow">Portofolio</p>
      <h1 className="page-title">Proyek</h1>
      <p className="page-desc">
        Studi kasus lengkap — masalah, arsitektur, tumpukan teknologi, dan
        hasil — dari proyek-proyek yang sudah kubangun dan jalankan.
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
                {p.featured && <span className="proj-featured">★ Unggulan</span>}
                <span className="proj-cat">{p.category}</span>
              </div>
              <h3>
                <Link href={`/projects/${p.id}`}>{p.title}</Link>
              </h3>
              <p className="proj-tagline">{p.tagline.id}</p>
              <p className="proj-desc">{p.description.id}</p>
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
                <Link href={`/projects/${p.id}`}>Studi kasus →</Link>
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
    </main>
  );
}
