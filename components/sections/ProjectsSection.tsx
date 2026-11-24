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
      <div className="mt-[26px] mb-[22px] flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`cursor-pointer rounded-full border px-[15px] py-[7px] text-[13px] font-semibold hover:border-[#4a4a55] ${
              filter === f
                ? "border-accent bg-accent text-white"
                : "border-line3 bg-[rgba(16,16,20,0.7)] text-[#d7d7dd]"
            }`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 min-[761px]:grid-cols-2">
        {shown.map((p) => {
          const Icon = p.icon;
          return (
            <article
              key={p.id}
              className="flex flex-col rounded-2xl border border-line2 bg-[rgba(13,13,16,0.78)] p-[18px] transition-[border-color,transform] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[3px] hover:border-[#3d3d47]"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(0,129,251,0.25)] bg-[rgba(0,129,251,0.12)] text-accent3">
                  <Icon size={20} />
                </span>
                {p.featured && (
                  <span className="text-[11px] font-bold tracking-[0.03em] text-[#fbbf24]">
                    ★ Unggulan
                  </span>
                )}
                <span className="ml-auto text-[11px] font-bold tracking-[0.06em] text-[#8b8b94] uppercase">
                  {p.category}
                </span>
              </div>
              <h3 className="mt-[14px] mb-[6px] text-[17px] font-bold">
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-left [font-family:inherit] text-[17px] font-bold text-paper hover:text-accent3"
                  onClick={() => onSelect(p.id)}
                >
                  {p.title}
                </button>
              </h3>
              <p className="m-0 mb-2 text-[13.5px] font-semibold text-[#d7d7dd]">
                {p.tagline.id}
              </p>
              <p className="m-0 flex-1 text-[13px] leading-[1.6] text-[#a7a7b0]">
                {p.description.id}
              </p>
              <div className="mt-[14px] flex flex-wrap gap-1.5">
                {p.tech.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-[#26262c] bg-white/[0.05] px-[9px] py-[3px] text-[11px] font-semibold text-[#c9c9d0]"
                  >
                    {t}
                  </span>
                ))}
                {p.tech.length > 4 && (
                  <span className="rounded-full border border-[#26262c] bg-white/[0.05] px-[9px] py-[3px] text-[11px] font-semibold text-[#c9c9d0]">
                    +{p.tech.length - 4}
                  </span>
                )}
              </div>
              <div className="mt-4 flex gap-4 text-[13px] font-semibold">
                <button
                  type="button"
                  className="cursor-pointer border-0 bg-transparent p-0 text-left [font-family:inherit] text-[13px] font-semibold text-accent3 hover:underline"
                  onClick={() => onSelect(p.id)}
                >
                  Studi kasus →
                </button>
                {p.githubUrl && (
                  <a
                    className="text-accent3 no-underline hover:underline"
                    href={p.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                )}
                {p.liveUrl && (
                  <a
                    className="text-accent3 no-underline hover:underline"
                    href={p.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
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
  // Gambar kartu: image_url dari dashboard (Modul Media) lebih dulu;
  // tanpa itu, thumbnail video demo seperti sebelumnya; keduanya
  // kosong = kartu polos persis tampilan lama.
  const cardImage = p.image_url ?? p.demo_video_thumbnail;
  return (
    <article className="flex flex-col rounded-2xl border border-line2 bg-[rgba(13,13,16,0.78)] p-[18px] transition-[border-color,transform] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[3px] hover:border-[#3d3d47]">
      {cardImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="mb-3 block h-[140px] w-full rounded-[10px] border border-line2 object-cover"
          src={cardImage}
          alt=""
          loading="lazy"
        />
      )}
      <div className="flex items-center gap-2.5">
        <span className="inline-grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(0,129,251,0.25)] bg-[rgba(0,129,251,0.12)] text-accent3">
          <Layers size={20} />
        </span>
        {p.is_featured && (
          <span className="text-[11px] font-bold tracking-[0.03em] text-[#fbbf24]">
            ★ TOP{p.featured_order ? ` #${p.featured_order}` : ""}
          </span>
        )}
        <span className="ml-auto text-[11px] font-bold tracking-[0.06em] text-[#8b8b94] uppercase">
          {STATUS_LABEL[p.status] ?? p.status}
        </span>
      </div>
      <h3 className="mt-[14px] mb-[6px] text-[17px] font-bold">{p.name}</h3>
      {p.description && (
        <p className="m-0 flex-1 text-[13px] leading-[1.6] text-[#a7a7b0]">
          {p.description}
        </p>
      )}
      {tech.length > 0 && (
        <div className="mt-[14px] flex flex-wrap gap-1.5">
          {tech.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-[#26262c] bg-white/[0.05] px-[9px] py-[3px] text-[11px] font-semibold text-[#c9c9d0]"
            >
              {t}
            </span>
          ))}
          {tech.length > 4 && (
            <span className="rounded-full border border-[#26262c] bg-white/[0.05] px-[9px] py-[3px] text-[11px] font-semibold text-[#c9c9d0]">
              +{tech.length - 4}
            </span>
          )}
        </div>
      )}
      <div className="mt-4 flex gap-4 text-[13px] font-semibold">
        {p.repo_url && (
          <a
            className="text-accent3 no-underline hover:underline"
            href={p.repo_url}
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        )}
        {p.links?.demo && (
          <a
            className="text-accent3 no-underline hover:underline"
            href={p.links.demo}
            target="_blank"
            rel="noreferrer"
          >
            Live
          </a>
        )}
        {p.links?.docs && (
          <a
            className="text-accent3 no-underline hover:underline"
            href={p.links.docs}
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
        )}
        {p.demo_video_url && (
          <a
            className="text-accent3 no-underline hover:underline"
            href={p.demo_video_url}
            target="_blank"
            rel="noreferrer"
          >
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
    <div className="mx-auto w-[min(1200px,100%)] px-7 py-16 max-[760px]:px-[18px] max-[760px]:py-11">
      <SectionTitle text="Projects" />
      <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#a7a7b0]">
        Project unggulan yang kupilih langsung dari dashboard-ku — empat
        terbaik yang sedang dan sudah kubangun. Daftar lengkapnya ada di
        halaman Projects.
      </p>

      {phase === "loading" && (
        <div
          className="grid grid-cols-1 gap-4 min-[761px]:grid-cols-2"
          aria-hidden="true"
        >
          {[0, 1, 2, 3].map((i) => (
            <article
              key={i}
              className="flex min-h-[150px] flex-col gap-3 rounded-2xl border border-line2 bg-[rgba(13,13,16,0.78)] p-[18px]"
            >
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
          <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#a7a7b0]">
            Belum ada project unggulan yang di-pin dari dashboard.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 min-[761px]:grid-cols-2">
            {items.map((p) => (
              <PublicProjectCard key={p.id} p={p} />
            ))}
          </div>
        ))}

      {phase === "live" && (
        <div className="mt-[22px] flex justify-center">
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,129,251,0.55)] bg-[rgba(0,129,251,0.12)] px-[26px] py-[11px] text-[14.5px] font-bold text-[#7db9ff] no-underline transition-[background,border-color,color] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-accent hover:bg-[rgba(0,129,251,0.22)] hover:text-[#cfe6ff]"
            href="/projects"
          >
            More Projects →
          </Link>
        </div>
      )}
    </div>
  );
}
