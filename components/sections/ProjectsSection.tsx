"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { projectsData, type ProjectCategory } from "@/lib/projects";
import {
  fetchFeaturedProjects,
  techList,
  type PublicProject,
} from "@/lib/publicProjects";
import SectionTitle from "@/components/SectionTitle";

// Section Projects — sejak 6 Nov 2026 sumber utamanya adalah Top Project
// yang di-pin dari System Dashboard (GET /v1/projects/featured, maks 4),
// sesuai keputusan user menggantikan daftar statis showcase.
// Bila backend tidak terjangkau, section jatuh kembali ke daftar statis
// lama (lib/projects.ts, lengkap dengan studi kasusnya) agar situs tetap
// utuh. Tombol "More Projects" menuju /projects (semua project publik).

const FILTERS: ("Semua" | ProjectCategory)[] = [
  "Semua",
  "AI/ML",
  "Web",
  "Mobile",
];

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  maintenance: "Pemeliharaan",
};

function StaticProjects({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Semua");
  const shown =
    filter === "Semua"
      ? projectsData
      : projectsData.filter((p) => p.category === filter);
  return (
    <>
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
                <button type="button" className="link-btn title-btn" onClick={() => onSelect(p.id)}>{p.title}</button>
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
                <button type="button" className="link-btn" onClick={() => onSelect(p.id)}>Studi kasus →</button>
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
    </>
  );
}

export function PublicProjectCard({ p }: { p: PublicProject }) {
  const tech = techList(p.tech_stack);
  return (
    <article className="proj-card">
      {p.demo_video_thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="proj-card-thumb"
          src={p.demo_video_thumbnail}
          alt=""
          loading="lazy"
        />
      )}
      <div className="proj-card-top">
        <span className="proj-icon">
          <Layers size={20} />
        </span>
        {p.is_featured && (
          <span className="proj-featured">
            ★ TOP{p.featured_order ? ` #${p.featured_order}` : ""}
          </span>
        )}
        <span className="proj-cat">
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
      </div>
      <h3>{p.name}</h3>
      {p.description && <p className="proj-desc">{p.description}</p>}
      {tech.length > 0 && (
        <div className="tech-row">
          {tech.slice(0, 4).map((t) => (
            <span key={t} className="tech-chip">
              {t}
            </span>
          ))}
          {tech.length > 4 && (
            <span className="tech-chip">+{tech.length - 4}</span>
          )}
        </div>
      )}
      <div className="proj-links">
        {p.repo_url && (
          <a href={p.repo_url} target="_blank" rel="noreferrer">
            GitHub
          </a>
        )}
        {p.links?.demo && (
          <a href={p.links.demo} target="_blank" rel="noreferrer">
            Live
          </a>
        )}
        {p.links?.docs && (
          <a href={p.links.docs} target="_blank" rel="noreferrer">
            Docs
          </a>
        )}
        {p.demo_video_url && (
          <a href={p.demo_video_url} target="_blank" rel="noreferrer">
            Video demo
          </a>
        )}
      </div>
    </article>
  );
}

export default function ProjectsSection({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [phase, setPhase] = useState<"loading" | "live" | "fallback">(
    "loading",
  );
  const [items, setItems] = useState<PublicProject[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchFeaturedProjects().then((rows) => {
      if (!alive) return;
      if (rows === null) {
        setPhase("fallback");
      } else {
        setItems(rows);
        setPhase("live");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="section-inner">
      <SectionTitle text="Projects" />
      <p className="page-desc">
        Project unggulan yang kupilih langsung dari dashboard-ku — empat
        terbaik yang sedang dan sudah kubangun. Daftar lengkapnya ada di
        halaman Projects.
      </p>

      {phase === "loading" && (
        <div className="proj-grid" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <article key={i} className="proj-card proj-skeleton">
              <div className="sk-line sk-w40" />
              <div className="sk-line sk-w80" />
              <div className="sk-line sk-w100" />
              <div className="sk-line sk-w60" />
            </article>
          ))}
        </div>
      )}

      {phase === "fallback" && <StaticProjects onSelect={onSelect} />}

      {phase === "live" &&
        (items.length === 0 ? (
          <p className="page-desc">
            Belum ada project unggulan yang di-pin dari dashboard.
          </p>
        ) : (
          <div className="proj-grid">
            {items.map((p) => (
              <PublicProjectCard key={p.id} p={p} />
            ))}
          </div>
        ))}

      {phase === "live" && (
        <div className="more-projects-row">
          <Link className="more-projects-btn" href="/projects">
            More Projects →
          </Link>
        </div>
      )}
    </div>
  );
}
