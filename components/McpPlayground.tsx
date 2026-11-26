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
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[880px] px-4 pt-[18px] pb-14">
        <Link href="/#tools" className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-fog no-underline hover:text-white">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="mt-4 flex items-center gap-2 text-xs font-semibold tracking-[0.08em] text-accent uppercase">
          <Bot size={15} />
          <span>Demo integrasi AI</span>
        </div>
        <h1 className="mt-1.5 text-[32px] font-extrabold text-[#EEF4FF]">MCP Playground</h1>
        <p className="mt-2 max-w-[640px] text-sm leading-[1.6] text-fog">
          Coba 10 tool Agent MCP langsung di sini. Ini simulasi browser dari
          kontrak tool terketik yang sama dengan yang diekspos server Python
          via stdio — server penuh ada di GitHub.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            className="inline-flex cursor-pointer items-center gap-[7px] rounded-xl border border-line bg-panel2 px-3.5 py-[9px] text-[13px] font-semibold text-[#DCE7FA] no-underline hover:border-steel"
            href="https://github.com/Amamiyakun02/AgentMCP"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GithubIcon size={14} /> GitHub
          </a>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-[7px] rounded-xl border border-accent bg-accent px-3.5 py-[9px] text-[13px] font-semibold text-[#052A1E] no-underline hover:border-[#00BBA2] hover:bg-[#00BBA2]"
            onClick={copySnippet}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            Salin config Claude
          </button>
        </div>

        <div className="mt-[18px] overflow-hidden rounded-[14px] border border-line bg-[#0a0a0b]">
          <div className="border-b border-[#1e1e22] bg-panel2 px-3.5 py-[7px] text-[10px] font-bold tracking-[0.1em] text-accent2 uppercase">claude_desktop_config.json</div>
          <pre className="m-0 overflow-x-auto p-3.5 font-mono text-xs leading-[1.55] text-[#C3D2F0]">{MCP_CONNECT_SNIPPET}</pre>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40 ${filter === f ? "border-accent bg-accent text-[#052A1E]" : "border-line bg-panel2 text-[#AFC2E6]"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-3.5 grid grid-cols-1 gap-3.5 min-[760px]:grid-cols-2">
          {tools.map((tool) => (
            <div key={tool.name} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13.5px] font-bold text-accent2">{tool.name}</span>
                <span className="rounded-full border border-[rgba(0,255,170,0.25)] bg-[rgba(0,255,170,0.1)] px-2 py-[3px] text-[9px] font-bold tracking-[0.08em] text-accent2 uppercase">{tool.category}</span>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-[1.55] text-fog">{tool.description.id}</p>
              <div className="mt-2 font-mono text-[10.5px] leading-[1.5] break-all text-[#5D7099]">{tool.schema}</div>
              <div className="mt-3 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-[10px] border border-line bg-[#0a0a0b] px-[11px] py-2 font-mono text-xs text-[#DCE7FA] outline-none focus:border-line"
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
                  className="inline-flex flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-accent px-3.5 py-2 text-[12.5px] font-bold text-[#052A1E] hover:bg-[#00BBA2]"
                  onClick={() => runTool(tool.name)}
                >
                  <Play size={12} /> Run
                </button>
              </div>
              {outputs[tool.name] !== undefined && (
                <pre className="mt-3 rounded-[10px] border border-line bg-[#08080a] p-[11px_12px] font-mono text-[11.5px] whitespace-pre-wrap break-words text-[#5EEAD0]">{outputs[tool.name]}</pre>
              )}
            </div>
          ))}
        </div>

        <p className="mt-[22px] flex gap-2 text-[11.5px] leading-[1.6] text-[#5D7099]">
          <FlaskConical size={13} className="mt-0.5 flex-shrink-0" />
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
