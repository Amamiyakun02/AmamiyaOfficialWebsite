import { projectsData } from "@/lib/projects";
import SectionTitle from "@/components/SectionTitle";

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
  const p = projectsData.find((x) => x.id === projectId);
  if (!p) return null;
  const Icon = p.icon;
  return (
    <div className="section-inner section-narrow">
      <div className="detail-head">
        <span className="proj-icon proj-icon-lg">
          <Icon size={26} />
        </span>
        <div>
          <SectionTitle text={p.title} />
          <p className="page-desc">{p.tagline.en}</p>
        </div>
        <button
          type="button"
          className="chip detail-close"
          onClick={onClose}
          aria-label="Close case study"
        >
          ✕ Close
        </button>
      </div>
      <div className="tech-row">
        {p.tech.map((t) => (
          <span key={t} className="tech-chip">
            {t}
          </span>
        ))}
      </div>
      <div className="proj-links detail-links">
        {p.githubUrl && (
          <a href={p.githubUrl} target="_blank" rel="noreferrer">
            GitHub →
          </a>
        )}
        {p.liveUrl && (
          <a href={p.liveUrl} target="_blank" rel="noreferrer">
            Kunjungi Live →
          </a>
        )}
      </div>

      {p.metrics.length > 0 && (
        <div className="metric-row">
          {p.metrics.map((m) => (
            <div key={m.label.en} className="metric">
              <span className="metric-value">{m.value}</span>
              <span className="metric-label">{m.label.en}</span>
            </div>
          ))}
        </div>
      )}

      <section className="detail-sec">
        <h2>Problem</h2>
        <p>{p.problem.en}</p>
      </section>
      <section className="detail-sec">
        <h2>Architecture</h2>
        <p>{p.architecture.en}</p>
      </section>
      <section className="detail-sec">
        <h2>Tech Stack</h2>
        <div className="stack-cols">
          <div>
            <h3>Frontend</h3>
            <ul>
              {p.frontend.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Backend</h3>
            <ul>
              {p.backend.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Infra</h3>
            <ul>
              {p.infra.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      {p.apiEndpoints.length > 0 && (
        <section className="detail-sec">
          <h2>API Endpoints</h2>
          <ul className="endpoint-list">
            {p.apiEndpoints.map((e) => (
              <li key={e}>
                <code>{e}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="detail-sec">
        <h2>Code Snippet</h2>
        <pre className="code-block">
          <code>{p.codeSnippet.code}</code>
        </pre>
      </section>
      <section className="detail-sec">
        <h2>Demo Steps</h2>
        <p>{p.demoSteps.en}</p>
      </section>
      <section className="detail-sec">
        <h2>Results</h2>
        <p>{p.results.en}</p>
      </section>
      <section className="detail-sec">
        <h2>Trade-offs</h2>
        <p>{p.tradeoffs.en}</p>
      </section>
    </div>
  );
}
