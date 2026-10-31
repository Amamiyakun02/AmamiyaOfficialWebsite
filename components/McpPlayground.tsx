"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Play,
  Copy,
  Check,
  FlaskConical,
} from "lucide-react";

// Ikon GitHub digambar inline: lucide versi project ini sudah tidak
// menyediakan ikon merek (Github dihapus dari lucide).
function GithubIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.78 0c2.2-1.49 3.16-1.18 3.16-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.68 5.38-5.24 1.27 1.06.53.78.53 1.57 0 1.14-.01 2.05-.01 2.33 0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
import {
  mcpTools,
  MCP_CONNECT_SNIPPET,
  type McpToolCategory,
} from "@/lib/mcpTools";

type Filter = "All" | McpToolCategory;
const FILTERS: Filter[] = ["All", "math", "system", "text", "time"];

// Porting McpPlayground lama (Tahap 2): SIMULASI BROWSER murni — 10 tool
// Agent MCP berjalan lokal dari lib/mcpTools.ts (kontrak nama + skema
// identik dengan server Python via stdio), jadi halaman ini berfungsi
// penuh tanpa backend. Deskripsi memakai varian Bahasa Indonesia (toggle
// EN/ID menyusul di tahap berikutnya; datanya sudah dwibahasa).
export default function McpPlayground() {
  const [filter, setFilter] = useState<Filter>("All");
  const [inputs, setInputs] = useState<Record<string, string>>(() =>
    Object.fromEntries(mcpTools.map((t) => [t.name, t.exampleInput]))
  );
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const tools = useMemo(
    () =>
      filter === "All"
        ? mcpTools
        : mcpTools.filter((t) => t.category === filter),
    [filter]
  );

  const runTool = (name: string) => {
    const tool = mcpTools.find((t) => t.name === name);
    if (!tool) return;
    try {
      const out = tool.run(inputs[name] ?? "");
      setOutputs((prev) => ({ ...prev, [name]: out }));
    } catch (e) {
      setOutputs((prev) => ({
        ...prev,
        [name]: `Error: ${e instanceof Error ? e.message : String(e)}`,
      }));
    }
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(MCP_CONNECT_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia di konteks ini */
    }
  };

  return (
    <div className="mcp-page">
      <div className="mcp-inner">
        <Link href="/#tools" className="chat-back">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="mcp-kicker">
          <Bot size={15} />
          <span>Demo integrasi AI</span>
        </div>
        <h1 className="mcp-title">MCP Playground</h1>
        <p className="mcp-sub">
          Coba 10 tool Agent MCP langsung di sini. Ini simulasi browser dari
          kontrak tool terketik yang sama dengan yang diekspos server Python
          via stdio — server penuh ada di GitHub.
        </p>

        <div className="mcp-actions">
          <a
            className="mcp-btn"
            href="https://github.com/Amamiyakun02/AgentMCP"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon size={14} /> GitHub
          </a>
          <button
            type="button"
            className="mcp-btn mcp-btn-primary"
            onClick={copySnippet}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            Salin config Claude
          </button>
        </div>

        <div className="mcp-snippet">
          <div className="mcp-snippet-head">claude_desktop_config.json</div>
          <pre>{MCP_CONNECT_SNIPPET}</pre>
        </div>

        <div className="mcp-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`engine-pill${filter === f ? " is-active" : ""}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mcp-grid">
          {tools.map((tool) => (
            <div key={tool.name} className="mcp-card">
              <div className="mcp-card-head">
                <span className="mcp-tool-name">{tool.name}</span>
                <span className="mcp-badge">{tool.category}</span>
              </div>
              <p className="mcp-desc">{tool.description.id}</p>
              <div className="mcp-schema">{tool.schema}</div>
              <div className="mcp-run-row">
                <input
                  value={inputs[tool.name] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [tool.name]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") runTool(tool.name);
                  }}
                  placeholder="argumen..."
                  aria-label={`Argumen ${tool.name}`}
                />
                <button
                  type="button"
                  className="mcp-run"
                  onClick={() => runTool(tool.name)}
                >
                  <Play size={12} /> Run
                </button>
              </div>
              {outputs[tool.name] !== undefined && (
                <pre className="mcp-output">{outputs[tool.name]}</pre>
              )}
            </div>
          ))}
        </div>

        <p className="mcp-note">
          <FlaskConical size={13} />
          <span>
            Simulasi berjalan lokal di browser (math/text/clock sepenuhnya
            nyata; sys_ping mengarah ke /status untuk cek asli). Server MCP
            Python memakai nama + skema JSON yang identik via stdio.
          </span>
        </p>
      </div>
    </div>
  );
}
