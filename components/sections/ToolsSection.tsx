import Link from "next/link";
import { toolsData } from "@/lib/tools";
import QuickPrompt from "@/components/QuickPrompt";
import SectionTitle from "@/components/SectionTitle";

// Halaman indeks Tools — semua tool dari WebPortofolio lama terdaftar di
// lib/tools.ts. Yang sudah dipindah berstatus "live" dan bisa dibuka;
// sisanya menyusul bertahap.
export default function ToolsSection() {
  return (
    <div className="section-inner">
      <SectionTitle text="Tools" />
      <p className="page-desc">
        Tool-tool yang kubangun dan kupakai sendiri — asisten AI, pengunduh
        video, pengolah PDF dan gambar, sampai playground MCP server-ku.
        Semuanya sedang dipindah ke rumah baru ini secara bertahap.
      </p>
      <QuickPrompt />
      <div className="proj-grid">
        {toolsData.map((t) => {
          const Icon = t.icon;
          const live = t.status === "live";
          return (
            <article key={t.slug} className="proj-card">
              <div className="proj-card-top">
                <span className="proj-icon">
                  <Icon size={20} />
                </span>
                <span className={live ? "tool-badge tool-live" : "tool-badge"}>
                  {live ? "Aktif" : "Tahap migrasi"}
                </span>
              </div>
              <h3>
                {live ? (
                  <Link href={`/tools/${t.slug}`}>{t.name}</Link>
                ) : (
                  t.name
                )}
              </h3>
              <p className="proj-desc">{t.desc}</p>
              {live && (
                <div className="proj-links">
                  <Link href={`/tools/${t.slug}`}>Buka tool →</Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
