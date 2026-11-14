import { apiUrl } from "@/lib/api";
import { projectsData } from "@/lib/projects";

/* Project publik dari registry dashboard (backend Vienna Agent):
   GET /v1/projects/featured — Top 4 pin admin (section Projects beranda)
   GET /v1/projects          — semua project publik (halaman /projects)
   Field aman-publik saja (backend tidak pernah mengirim local_path).

   Ketahanan: bila backend tidak terjangkau (mis. laptop mati), pemanggil
   memakai fallback statis dari lib/projects.ts agar section tidak kosong. */

export type PublicProject = {
  id: number;
  name: string;
  description: string | null;
  tech_stack: string | null;
  repo_url: string | null;
  status: string;
  links: Record<string, string>;
  demo_video_url: string | null;
  demo_video_thumbnail: string | null;
  is_featured: boolean;
  featured_order: number | null;
};

async function fetchPublic(path: string): Promise<PublicProject[] | null> {
  try {
    const res = await fetch(apiUrl(path), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { items?: PublicProject[] };
    return Array.isArray(data.items) ? data.items : null;
  } catch {
    return null;
  }
}

/** Top Project dari dashboard; null = backend tak terjangkau (pakai fallback). */
export function fetchFeaturedProjects(): Promise<PublicProject[] | null> {
  return fetchPublic("/v1/projects/featured");
}

/** Semua project publik; null = backend tak terjangkau (pakai fallback). */
export function fetchAllProjects(): Promise<PublicProject[] | null> {
  return fetchPublic("/v1/projects");
}

export function techList(techStack: string | null): string[] {
  if (!techStack) return [];
  return techStack
    .split(/[+,]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/* Fallback statis: petakan projectsData (showcase lama) ke bentuk publik.
   Dipakai HANYA saat backend tidak terjangkau. */
export function staticAsPublic(featuredOnly: boolean): PublicProject[] {
  const rows = featuredOnly
    ? projectsData.filter((p) => p.featured)
    : projectsData;
  return rows.map((p, i) => {
    const links: Record<string, string> = {};
    if (p.liveUrl) links.demo = p.liveUrl;
    return {
    id: -1 - i,
    name: p.title,
    description: p.description.id,
    tech_stack: p.tech.join(", "),
    repo_url: p.githubUrl || null,
    status: "active",
    links,
    demo_video_url: null,
    demo_video_thumbnail: null,
    is_featured: p.featured,
    featured_order: p.featured ? i + 1 : null,
    };
  });
}
