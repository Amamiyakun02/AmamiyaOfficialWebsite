import type { Metadata } from "next";
import AllProjects from "@/components/AllProjects";

export const metadata: Metadata = {
  title: "Projects | Amamiya",
  description:
    "Semua project publik Amamiya — daftar lengkap dari registry System Dashboard, project unggulan (Top Project) tampil lebih dulu.",
};

// Halaman daftar semua project publik (pendamping section Projects di
// beranda yang hanya menampilkan Top 4 dari dashboard). Data dari
// GET /v1/projects (backend Vienna Agent), fallback statis di klien.
export default function ProjectsPage() {
  return <AllProjects />;
}
