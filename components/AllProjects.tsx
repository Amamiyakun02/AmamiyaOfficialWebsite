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
import { useLang } from "@/lib/i18n";

// Halaman /projects — semua project publik dari registry dashboard
// (GET /v1/projects; unggulan lebih dulu). Backend tak terjangkau ->
// fallback daftar statis lib/projects.ts + catatan kecil.
export default function AllProjects() {
  const { t: tr } = useLang();
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
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1080px] px-4 pt-[18px] pb-14">
        <Link href="/#projects" className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-fog no-underline hover:text-white">
          <ArrowLeft size={14} /> {tr("common.backHome")}
        </Link>
        <SectionTitle text="Projects" />
        <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
          {tr("projects.allIntro")}
        </p>
        {phase === "fallback" && (
          <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
            {tr("projects.allFallback")}
          </p>
        )}
        {phase === "loading" ? (
          <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">{tr("projects.allLoading")}</p>
        ) : items.length === 0 ? (
          <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">{tr("projects.allEmpty")}</p>
        ) : (
          <>
            <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">{tr("projects.allCount", { count: items.length })}</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 max-[760px]:grid-cols-1">
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
