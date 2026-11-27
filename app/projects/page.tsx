import type { Metadata } from "next";
import AllProjects from "@/components/AllProjects";

export const metadata: Metadata = {
  title: "Projects | Amamiya",
  description:
    "All of Amamiya's public projects — the full list from the System Dashboard registry, with featured projects (Top Projects) first.",
};

// Halaman daftar semua project publik (pendamping section Projects di
// beranda yang hanya menampilkan Top 4 dari dashboard). Data dari
// GET /v1/projects (backend Vienna Agent), fallback statis di klien.
export default function ProjectsPage() {
  return <AllProjects />;
}
