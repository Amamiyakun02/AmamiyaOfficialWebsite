import type { Metadata } from "next";
import McpPlayground from "@/components/McpPlayground";

export const metadata: Metadata = {
  title: "MCP Playground — Amamiya",
  description:
    "Coba langsung 10 tool Agent MCP (server MCP Python Amamiya) sebagai simulasi browser: math, system, text, dan time.",
};

// Halaman tool kedua yang dipindah dari WebPortofolio lama (Tahap 2):
// simulasi browser murni, berfungsi penuh tanpa backend (lihat
// components/McpPlayground.tsx dan lib/mcpTools.ts).
export default function McpPlaygroundPage() {
  return <McpPlayground />;
}
