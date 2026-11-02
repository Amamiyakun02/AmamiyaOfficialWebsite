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
        Tools I built and use myself — an AI assistant, a video downloader,
        PDF and image processors, and my MCP server playground.
        All of them are being moved into this new home, step by step.
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
                  {live ? "Live" : "Migrating"}
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
                  <Link href={`/tools/${t.slug}`}>Open tool →</Link>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
