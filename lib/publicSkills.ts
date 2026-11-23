import { apiUrl } from "@/lib/api";
import { skillsData, type Skill, type SkillCategory } from "@/lib/skills";

/* Skill publik dari registry dashboard (backend Vienna Agent):
   GET /v1/skills — semua skill aktif + penanda unggulan.
   Field aman-publik saja (backend tidak mengirim data internal).

   Ketahanan: bila backend tidak terjangkau (mis. laptop mati),
   pemanggil memakai fallback statis dari lib/skills.ts agar
   section About tidak kosong — pola yang sama seperti projects. */

export type PublicSkill = {
  id: number;
  name: string;
  level: number;
  description_id: string | null;
  description_en: string | null;
  category: string;
  sort_order: number;
  is_featured: boolean;
  featured_order: number | null;
};

const KNOWN_CATEGORIES: readonly string[] = [
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

/** Semua skill publik; null = backend tak terjangkau (pakai fallback). */
export async function fetchPublicSkills(): Promise<PublicSkill[] | null> {
  try {
    const res = await fetch(apiUrl("/v1/skills"), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: PublicSkill[] };
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
}

/** Petakan bentuk publik backend ke bentuk Skill yang dipakai AboutSection. */
export function publicToSkill(s: PublicSkill): Skill {
  const category = (
    KNOWN_CATEGORIES.includes(s.category) ? s.category : "Other"
  ) as Skill["category"];
  return {
    name: s.name,
    level: Math.max(0, Math.min(100, s.level || 0)),
    desc: { id: s.description_id ?? "", en: s.description_en ?? "" },
    category,
    featured: s.is_featured || undefined,
    featuredOrder: s.is_featured ? (s.featured_order ?? undefined) : undefined,
  };
}

/** Urutan tampil publik: sort_order menanjak, lalu nama. */
export function sortPublicSkills(rows: PublicSkill[]): PublicSkill[] {
  return [...rows].sort(
    (a, b) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
  );
}

export type { Skill, SkillCategory };
export { skillsData };
