import type { Metadata } from "next";
import DashboardLoginStage from "@/components/DashboardLoginStage";

export const metadata: Metadata = {
  title: "Login Dashboard | Amamiya",
  description: "Masuk ke System Dashboard Amamiya.",
};

// Login dashboard (permintaan user 5 Nov): panggung entrance halaman
// utama apa adanya + form login di tengahnya.
export default function DashboardLoginPage() {
  return <DashboardLoginStage />;
}
