import type { Metadata } from "next";
import McpPlayground from "@/components/McpPlayground";

export const metadata: Metadata = {
  title: "MCP Playground | Amamiya",
  description:
    "Try 10 Agent MCP tools (Amamiya's Python MCP server) live as a browser simulation: math, system, text, and time.",
};

// Halaman tool kedua yang dipindah dari WebPortofolio lama (Tahap 2):
// simulasi browser murni, berfungsi penuh tanpa backend (lihat
// components/McpPlayground.tsx dan lib/mcpTools.ts).
export default function McpPlaygroundPage() {
  return <McpPlayground />;
}
