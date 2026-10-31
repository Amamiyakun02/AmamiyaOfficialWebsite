export type McpToolCategory = "math" | "system" | "text" | "time"

export type McpTool = {
  name: string
  category: McpToolCategory
  description: { en: string; id: string }
  schema: string
  exampleInput: string
  run: (input: string) => string
}

const safeEvalMath = (expr: string): string => {
  const clean = expr.trim().replace(/[^0-9+\-*/().\s%^]/g, "")
  if (!clean) throw new Error("empty expression")
  // Replace ^ with ** for power, % stays modulo
  const jsExpr = clean.replace(/\^/g, "**")
  const fn = new Function(`"use strict"; return (${jsExpr})`)
  const out = fn()
  if (typeof out !== "number" || !Number.isFinite(out)) throw new Error("invalid result")
  return String(Math.round(out * 1e6) / 1e6)
}

export const mcpTools: McpTool[] = [
  {
    name: "math_add",
    category: "math",
    description: { en: "Add two numbers safely.", id: "Jumlahkan dua angka dengan aman." },
    schema: `tools/call { "name": "math_add", "arguments": { "a": 2, "b": 3 } }`,
    exampleInput: "2, 3",
    run: (input) => {
      const parts = input.split(/[,;\s]+/).filter(Boolean).map(Number)
      if (parts.length < 2 || parts.some(Number.isNaN)) throw new Error("use: a, b  (e.g. 2, 3)")
      return String(parts[0] + parts[1])
    },
  },
  {
    name: "math_eval",
    category: "math",
    description: { en: "Evaluate an arithmetic expression.", id: "Evaluasi ekspresi aritmetika." },
    schema: `tools/call { "name": "math_eval", "arguments": { "expr": "(2+3)*4" } }`,
    exampleInput: "(2+3)*4",
    run: (input) => safeEvalMath(input),
  },
  {
    name: "sys_info",
    category: "system",
    description: { en: "Browser-safe system info (UA, platform, cores, memory).", id: "Info sistem aman-browser (UA, platform, core, memori)." },
    schema: `tools/call { "name": "sys_info", "arguments": {} }`,
    exampleInput: "",
    run: () => {
      const nav = navigator as Navigator & { deviceMemory?: number }
      return JSON.stringify(
        {
          userAgent: navigator.userAgent.slice(0, 80),
          platform: navigator.platform,
          language: navigator.language,
          cores: navigator.hardwareConcurrency ?? "n/a",
          deviceMemoryGB: nav.deviceMemory ?? "n/a",
        },
        null,
        2
      )
    },
  },
  {
    name: "sys_ping",
    category: "system",
    description: { en: "Ping the portfolio backend and report latency.", id: "Ping backend portofolio dan laporkan latency." },
    schema: `tools/call { "name": "sys_ping", "arguments": { "target": "backend" } }`,
    exampleInput: "backend",
    run: () => "Use the System Status page (/status) for a live ping — this simulation returns ok.",
  },
  {
    name: "text_upper",
    category: "text",
    description: { en: "Uppercase transform.", id: "Ubah ke huruf besar." },
    schema: `tools/call { "name": "text_upper", "arguments": { "text": "hello" } }`,
    exampleInput: "hello vienna",
    run: (input) => input.toUpperCase(),
  },
  {
    name: "text_wordcount",
    category: "text",
    description: { en: "Count words, chars, lines.", id: "Hitung kata, karakter, baris." },
    schema: `tools/call { "name": "text_wordcount", "arguments": { "text": "..." } }`,
    exampleInput: "Build once, useful forever",
    run: (input) => {
      const words = input.trim() ? input.trim().split(/\s+/).length : 0
      const lines = input.split("\n").length
      return JSON.stringify({ words, chars: input.length, lines })
    },
  },
  {
    name: "text_slug",
    category: "text",
    description: { en: "Slugify a title.", id: "Ubah judul jadi slug." },
    schema: `tools/call { "name": "text_slug", "arguments": { "text": "Hello World!" } }`,
    exampleInput: "Vienna Assistant Mobile!",
    run: (input) =>
      input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  },
  {
    name: "clock_now",
    category: "time",
    description: { en: "Current time (ISO + locale).", id: "Waktu saat ini (ISO + lokal)." },
    schema: `tools/call { "name": "clock_now", "arguments": { "tz": "local" } }`,
    exampleInput: "",
    run: () => {
      const d = new Date()
      return JSON.stringify({ iso: d.toISOString(), local: d.toLocaleString() }, null, 2)
    },
  },
  {
    name: "clock_epoch",
    category: "time",
    description: { en: "Unix epoch millis.", id: "Unix epoch milidetik." },
    schema: `tools/call { "name": "clock_epoch", "arguments": {} }`,
    exampleInput: "",
    run: () => String(Date.now()),
  },
  {
    name: "agent_help",
    category: "system",
    description: { en: "List available tools (like tools/list).", id: "Daftar tool tersedia (seperti tools/list)." },
    schema: `tools/list -> 10 tools`,
    exampleInput: "",
    run: () => mcpTools.map((t) => t.name).join("\n"),
  },
]

export const MCP_CONNECT_SNIPPET = `{
  "mcpServers": {
    "agent-mcp": {
      "command": "uv",
      "args": ["run", "agent-mcp"],
      "cwd": "/path/to/AgentMCP"
    }
  }
}`
