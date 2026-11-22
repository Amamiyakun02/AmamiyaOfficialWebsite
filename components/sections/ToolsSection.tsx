import Link from "next/link";
import { toolsData } from "@/lib/tools";
import SectionTitle from "@/components/SectionTitle";

// Halaman indeks Tools — semua tool dari WebPortofolio lama terdaftar di
// lib/tools.ts. Yang sudah dipindah berstatus "live" dan bisa dibuka;
// sisanya menyusul bertahap.
export default function ToolsSection() {
  return (
    <div className="mx-auto w-[min(1200px,100%)] px-7 py-16 max-[760px]:px-[18px] max-[760px]:py-11">
      <SectionTitle text="Tools" />
      <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#a7a7b0]">
        Tool-tool yang kubangun dan kupakai sendiri — asisten AI, pengunduh
        video, pengolah PDF dan gambar, sampai playground MCP server-ku.
        Semuanya sedang dipindah ke rumah baru ini secara bertahap.
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 max-[760px]:grid-cols-1">
        {toolsData.map((t) => {
          const Icon = t.icon;
          const live = t.status === "live";
          return (
            <article
              key={t.slug}
              className="flex flex-col rounded-2xl border border-line2 bg-[rgba(13,13,16,0.78)] p-[18px] transition-[border-color,transform] duration-[250ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:-translate-y-[3px] hover:border-[#3d3d47]"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-grid h-10 w-10 place-items-center rounded-[11px] border border-[rgba(0,129,251,0.25)] bg-[rgba(0,129,251,0.12)] text-accent3">
                  <Icon size={20} />
                </span>
                <span
                  className={`ml-auto rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-[0.04em] ${
                    live
                      ? "border-[rgba(52,211,153,0.35)] bg-[rgba(52,211,153,0.1)] text-[#34d399]"
                      : "border-[rgba(251,191,36,0.3)] bg-[rgba(251,191,36,0.1)] text-[#fbbf24]"
                  }`}
                >
                  {live ? "Aktif" : "Tahap migrasi"}
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
              <p className="m-0 flex-1 text-[13px] leading-[1.6] text-[#a7a7b0]">
                {t.desc}
              </p>
              {live && (
                <div className="mt-4 flex gap-4 text-[13px] font-semibold">
                  <Link
                    className="text-accent3 no-underline hover:underline"
                    href={`/tools/${t.slug}`}
                  >
                    Buka tool →
                  </Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
