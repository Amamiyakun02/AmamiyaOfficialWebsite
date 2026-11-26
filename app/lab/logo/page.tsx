import type { Metadata } from "next";
import LogoLab from "@/components/LogoLab";

export const metadata: Metadata = {
  title: "Logo Lab | Amamiya",
  description: "Halaman coba-coba SVG logo Amamiya: pratinjau ukuran, padding, dan latar.",
};

// Halaman eksperimen logo (diminta user 26 Nov 2026) — tidak ditautkan
// dari navbar, hanya dijangkau lewat URL /lab/logo.
export default function LogoLabPage() {
  return <LogoLab />;
}
