"use client";

import { useState } from "react";
import Link from "next/link";
import { toolsData } from "@/lib/tools";
import { useLang } from "@/lib/i18n";
import SectionTitle from "@/components/SectionTitle";

// Halaman indeks Tools — semua tool dari WebPortofolio lama terdaftar di
// lib/tools.ts. Yang sudah dipindah berstatus "live" dan bisa dibuka;
// sisanya menyusul bertahap. Tampilan awal dibatasi TOOL_LIMIT kartu
// (tool live lebih dulu) agar grid rapi 3x3; sisanya lewat tombol
// "Lihat semua tool", pola yang sama seperti section Keahlian.
const TOOL_LIMIT = 9;

export default function ToolsSection() {
  const { lang, t: tr } = useLang();
  const [expanded, setExpanded] = useState(false);
  const ordered = [...toolsData].sort(
    (a, b) => (a.status === "live" ? 0 : 1) - (b.status === "live" ? 0 : 1)
  );
  const shown = expanded ? ordered : ordered.slice(0, TOOL_LIMIT);
  return (
    <div className="mx-auto w-[min(1200px,100%)] px-7 py-16 max-[760px]:px-[18px] max-[760px]:py-11">
      <SectionTitle text="Tools" />
      <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
        {tr("tools.intro")}
      </p>
      <div className="grid grid-cols-1 gap-4 min-[761px]:grid-cols-2 min-[1080px]:grid-cols-3">
        {shown.map((t) => {
          const Icon = t.icon;
          const live = t.status === "live";
          return (
            <article
              key={t.slug}
              className="flex flex-col rounded-2xl border border-line2 bg-[rgba(13,13,16,0.78)] p-[18px] transition-[border-color,transform] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[3px] hover:border-[#354C8C]"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(0,255,170,0.25)] bg-[rgba(0,255,170,0.12)] text-accent3">
                  <Icon size={20} />
                </span>
                <span
                  className={`ml-auto rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] ${
                    live
                      ? "border-[rgba(52,211,153,0.35)] bg-[rgba(52,211,153,0.1)] text-[#00FFAA]"
                      : "border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24]"
                  }`}
                >
                  {live ? tr("tools.live") : tr("tools.migrating")}
                </span>
              </div>
              <h3 className="mt-[14px] mb-[6px] text-[17px] font-bold">
                {live ? (
                  <Link
                    className="text-paper no-underline hover:text-accent3"
                    href={`/tools/${t.slug}`}
                  >
                    {t.name}
                  </Link>
                ) : (
                  t.name
                )}
              </h3>
              <p className="m-0 flex-1 text-[13px] leading-[1.6] text-[#9DB1D9]">
                {lang === "en" ? t.descEn : t.desc}
              </p>
              {live && (
                <div className="mt-4 flex gap-4 text-[13px] font-semibold">
                  <Link
                    className="text-accent3 no-underline hover:underline"
                    href={`/tools/${t.slug}`}
                  >
                    {tr("tools.open")}
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {toolsData.length > TOOL_LIMIT && (
        <div className="mt-6 text-center">
          <button
            type="button"
            className="cursor-pointer rounded-full border border-line3 bg-[rgba(16,16,20,0.7)] px-5 py-2.5 text-[13px] font-semibold text-[#C3D2F0] hover:border-[#41538A]"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? tr("common.showLess") : tr("tools.showAll")}
          </button>
        </div>
      )}
    </div>
  );
}
