"use client";

import { useEffect, useState } from "react";
import { skillsData, type Skill, type SkillCategory } from "@/lib/skills";
import {
  fetchPublicSkills,
  publicToSkill,
  sortPublicSkills,
} from "@/lib/publicSkills";
import SectionTitle from "@/components/SectionTitle";

// Halaman Tentang — konten dari WebPortofolio lama: deskripsi profil,
// matriks keahlian (dengan filter kategori seperti aslinya), dan
// linimasa pengalaman.
const CATS: SkillCategory[] = [
  "All",
  "Frontend",
  "Backend",
  "Android",
  "Database",
  "Deployment",
  "System Integration",
  "AI/ML",
  "AI Tools",
  "Other",
];

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

// Maksimal kartu keahlian yang tampil sebelum tombol "Lihat semua".
const SKILL_LIMIT = 10;

export default function AboutSection() {
  const [cat, setCat] = useState<SkillCategory>("All");
  const [expanded, setExpanded] = useState(false);
  // Sumber utama: registry dashboard (GET /v1/skills). Data statis
  // lib/skills.ts hanya fallback bila backend tidak terjangkau/kosong
  // — pola yang sama seperti section Projects.
  const [skills, setSkills] = useState<Skill[]>(skillsData);
  useEffect(() => {
    let alive = true;
    void fetchPublicSkills().then((rows) => {
      if (!alive || !rows || rows.length === 0) return;
      setSkills(sortPublicSkills(rows).map(publicToSkill));
    });
    return () => {
      alive = false;
    };
  }, []);
  const filtered =
    cat === "All" ? skills : skills.filter((s) => s.category === cat);
  // Mode ringkas di "Semua" menampilkan 10 skill unggulan (flag featured,
  // terurut featuredOrder dari dashboard); di kategori lain 10 kartu
  // pertama kategori itu.
  const shown = expanded
    ? filtered
    : cat === "All"
      ? skills
          .filter((s) => s.featured)
          .sort(
            (a, b) => (a.featuredOrder ?? 99) - (b.featuredOrder ?? 99),
          )
          .slice(0, SKILL_LIMIT)
      : filtered.slice(0, SKILL_LIMIT);
  return (
    <div className="mx-auto w-[min(1200px,100%)] px-7 py-16 max-[760px]:px-[18px] max-[760px]:py-11">
      <SectionTitle text="About" />
      <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#a7a7b0]">
        Saya suka membangun alat praktis yang menyelesaikan masalah nyata.
        Sekali buat, berguna selamanya.
      </p>

      <h2 className="mt-10 mb-4 text-xl font-bold">Keahlian</h2>
      <div className="mt-[26px] mb-[22px] flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c}
            type="button"
            className={`cursor-pointer rounded-full border px-[15px] py-[7px] text-[13px] font-semibold hover:border-[#4a4a55] ${
              cat === c
                ? "border-accent bg-accent text-white"
                : "border-line3 bg-[rgba(16,16,20,0.7)] text-[#d7d7dd]"
            }`}
            onClick={() => {
              setCat(c);
              setExpanded(false);
            }}
          >
            {c === "All" ? "Semua" : c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3.5 min-[700px]:grid-cols-2 min-[1080px]:grid-cols-5">
        {shown.map((s) => (
          <article
            key={s.name}
            className="rounded-[14px] border border-line2 bg-[rgba(13,13,16,0.78)] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                {s.iconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-6 w-6 flex-none object-contain"
                    src={s.iconUrl}
                    alt=""
                    loading="lazy"
                  />
                )}
                <h3 className="m-0 text-[14.5px] font-bold">{s.name}</h3>
              </span>
              <span className="text-xs font-bold text-accent3">
                {s.level}%
              </span>
            </div>
            <div className="my-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#0081fb,#38bdf8)]"
                style={{ width: `${s.level}%` }}
              />
            </div>
            <p className="m-0 mb-2.5 text-[12.5px] leading-[1.55] text-[#a7a7b0]">
              {s.desc.id}
            </p>
            <span className="text-[11px] font-bold tracking-[0.06em] text-[#8b8b94] uppercase">
              {s.category}
            </span>
          </article>
        ))}
      </div>
      {filtered.length > shown.length || expanded ? (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="cursor-pointer rounded-full border border-line3 bg-[rgba(16,16,20,0.7)] px-5 py-2.5 text-[13px] font-semibold text-[#d7d7dd] hover:border-[#4a4a55]"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Tampilkan lebih sedikit" : "Lihat semua keahlian"}
          </button>
        </div>
      ) : null}

      <h2 className="mt-10 mb-4 text-xl font-bold">Pengalaman</h2>
      <div className="flex flex-col gap-3.5">
        {TIMELINE.map((t) => (
          <article
            key={t.title}
            className="flex gap-[18px] rounded-[14px] border border-line2 bg-[rgba(13,13,16,0.78)] px-[18px] py-4 max-[760px]:flex-col max-[760px]:gap-1.5"
          >
            <span className="w-[118px] flex-none pt-0.5 text-[12.5px] font-bold text-accent3">
              {t.year}
            </span>
            <div>
              <h3 className="m-0 mb-1 text-[15px]">{t.title}</h3>
              <p className="m-0 mb-1 text-[13px] leading-[1.6] font-semibold text-[#d7d7dd]">
                {t.subtitle}
              </p>
              <p className="m-0 text-[13px] leading-[1.6] text-[#a7a7b0]">
                {t.desc}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
