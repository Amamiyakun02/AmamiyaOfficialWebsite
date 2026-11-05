import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";

export const metadata: Metadata = {
  title: "System Dashboard | Amamiya",
  description: "Panel pengelolaan sistem Vienna Agent dan portofolio Amamiya.",
};

// System Dashboard (spec vault 5 Okt 2026, dibangun bertahap mulai
// 5 Nov 2026 dengan base tema Wonder): gerbang login di
// /dashboard/login, halaman-halamannya berlatar ambien highlight
// mouse seperti section bawah beranda.
export default function DashboardPage() {
  return <DashboardShell />;
}
