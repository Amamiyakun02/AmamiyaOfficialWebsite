"use client";

import { projectsData } from "@/lib/projects";
import SectionTitle from "@/components/SectionTitle";
import { useLang } from "@/lib/i18n";

/* Section studi kasus — merender SATU proyek yang dipilih dari daftar
   (bukan kesembilan proyek sekaligus). Isinya identik dengan halaman
   detail lama: masalah, arsitektur, tumpukan, endpoint, metrik, kode,
   langkah demo, hasil, trade-off. */
export default function ProjectDetailSection({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const { lang, t: tr } = useLang();
  const p = projectsData.find((x) => x.id === projectId);
  if (!p) return null;
  const Icon = p.icon;
  return (
    <div className="mx-auto w-[min(1200px,100%)] px-7 py-16 max-[760px]:px-[18px] max-[760px]:py-11">
      <div className="flex items-start gap-4">
        <span className="inline-grid h-[52px] w-[52px] flex-none place-items-center rounded-[14px] border border-[rgba(0,255,170,0.25)] bg-[rgba(0,255,170,0.12)] text-accent3">
          <Icon size={26} />
        </span>
        <div>
          <SectionTitle text={p.title} />
          <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
            {p.tagline[lang]}
          </p>
        </div>
        <button
          type="button"
          className="ml-auto flex-none cursor-pointer self-start rounded-full border border-line3 bg-[rgba(16,16,20,0.7)] px-[15px] py-[7px] text-[13px] font-semibold text-[#C3D2F0] hover:border-[#41538A]"
          onClick={onClose}
          aria-label={tr("detail.closeLabel")}
        >
          {tr("detail.close")}
        </button>
      </div>
      <div className="mt-[14px] flex flex-wrap gap-1.5">
        {p.tech.map((t) => (
          <span key={t} className="rounded-full border border-[#1E3066] bg-white/[0.05] px-[9px] py-[3px] text-[11px] font-semibold text-[#AFC2E6]">
            {t}
          </span>
        ))}
      </div>
      <div className="mt-[14px] flex gap-4 text-[13px] font-semibold">
        {p.githubUrl && (
          <a
            className="text-accent3 no-underline hover:underline"
            href={p.githubUrl}
            target="_blank"
            rel="noreferrer"
          >
            GitHub →
          </a>
        )}
        {p.liveUrl && (
          <a
            className="text-accent3 no-underline hover:underline"
            href={p.liveUrl}
            target="_blank"
            rel="noreferrer"
          >
            {tr("detail.visitLive")}
          </a>
        )}
      </div>

      {p.metrics.length > 0 && (
        <div className="mt-7 flex flex-wrap gap-3.5">
          {p.metrics.map((m) => (
            <div
              key={m.label.en}
              className="flex min-w-[130px] flex-1 flex-col gap-1 rounded-[14px] border border-line2 bg-[rgba(13,13,16,0.78)] px-4 py-3.5"
            >
              <span className="text-xl font-extrabold text-white">
                {m.value}
              </span>
              <span className="text-xs text-[#8298C0]">{m.label[lang]}</span>
            </div>
          ))}
        </div>
      )}

      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.problem")}</h2>
        <p className="m-0 max-w-[760px] text-[14.5px] leading-[1.7] text-[#AFC2E6]">{p.problem[lang]}</p>
      </section>
      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.architecture")}</h2>
        <p className="m-0 max-w-[760px] text-[14.5px] leading-[1.7] text-[#AFC2E6]">{p.architecture[lang]}</p>
      </section>
      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.stack")}</h2>
        <div className="grid grid-cols-3 gap-4 max-[760px]:grid-cols-1">
          <div>
            <h3 className="m-0 mb-2 text-[13px] tracking-[0.08em] text-[#8298C0] uppercase">
              Frontend
            </h3>
            <ul className="m-0 pl-[18px] text-sm leading-[1.8] text-[#AFC2E6]">
              {p.frontend.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="m-0 mb-2 text-[13px] tracking-[0.08em] text-[#8298C0] uppercase">
              Backend
            </h3>
            <ul className="m-0 pl-[18px] text-sm leading-[1.8] text-[#AFC2E6]">
              {p.backend.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="m-0 mb-2 text-[13px] tracking-[0.08em] text-[#8298C0] uppercase">
              Infra
            </h3>
            <ul className="m-0 pl-[18px] text-sm leading-[1.8] text-[#AFC2E6]">
              {p.infra.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      {p.apiEndpoints.length > 0 && (
        <section className="mt-[34px]">
          <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.endpoints")}</h2>
          <ul className="m-0 list-none pl-0 text-sm leading-[1.8] text-[#AFC2E6]">
            {p.apiEndpoints.map((e) => (
              <li key={e}>
                <code className="text-[13px]">{e}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.code")}</h2>
        <pre className="m-0 overflow-x-auto rounded-xl border border-line2 bg-[#0a0a0b] p-4 text-[12.5px] leading-[1.6] text-[#C3D2F0]">
          <code>{p.codeSnippet.code}</code>
        </pre>
      </section>
      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.demo")}</h2>
        <p className="m-0 max-w-[760px] text-[14.5px] leading-[1.7] text-[#AFC2E6]">{p.demoSteps[lang]}</p>
      </section>
      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.results")}</h2>
        <p className="m-0 max-w-[760px] text-[14.5px] leading-[1.7] text-[#AFC2E6]">{p.results[lang]}</p>
      </section>
      <section className="mt-[34px]">
        <h2 className="m-0 mb-2.5 text-lg font-bold">{tr("detail.tradeoffs")}</h2>
        <p className="m-0 max-w-[760px] text-[14.5px] leading-[1.7] text-[#AFC2E6]">{p.tradeoffs[lang]}</p>
      </section>
    </div>
  );
}
