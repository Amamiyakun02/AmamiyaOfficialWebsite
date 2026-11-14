"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  fetchAllProjects,
  staticAsPublic,
  type PublicProject,
} from "@/lib/publicProjects";
import { PublicProjectCard } from "@/components/sections/ProjectsSection";
import SectionTitle from "@/components/SectionTitle";

// Halaman /projects — semua project publik dari registry dashboard
// (GET /v1/projects; unggulan lebih dulu). Backend tak terjangkau ->
// fallback daftar statis lib/projects.ts + catatan kecil.
export default function AllProjects() {
  const [phase, setPhase] = useState<"loading" | "live" | "fallback">(
    "loading",
  );
  const [items, setItems] = useState<PublicProject[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchAllProjects().then((rows) => {
      if (!alive) return;
      if (rows === null) {
        setItems(staticAsPublic(false));
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
    <div className="vd-page">
      <div className="vd-inner">
        <Link href="/#projects" className="chat-back">
          <ArrowLeft size={14} /> Kembali ke Beranda
        </Link>
        <SectionTitle text="Projects" />
        <p className="page-desc">
          Semua project publikku — yang di-pin sebagai Top Project tampil
          lebih dulu. Daftar ini dikelola dari System Dashboard-ku.
        </p>
        {phase === "fallback" && (
          <p className="page-desc">
            (Menampilkan daftar cadangan — server backend sedang tidak
            terjangkau.)
          </p>
        )}
        {phase === "loading" ? (
          <p className="page-desc">Memuat daftar project…</p>
        ) : items.length === 0 ? (
          <p className="page-desc">Belum ada project publik.</p>
        ) : (
          <>
            <p className="page-desc">Menampilkan {items.length} project.</p>
            <div className="proj-grid">
              {items.map((p) => (
                <PublicProjectCard key={p.id} p={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
