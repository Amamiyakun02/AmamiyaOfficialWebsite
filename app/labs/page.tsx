import type { Metadata } from "next";
import LabsBody from "@/components/LabsBody";

export const metadata: Metadata = {
  title: "Labs | Amamiya",
  description:
    "Amamiya Labs — a playground for experiments: design studies, prototypes, and small tools in progress.",
};

// Halaman indeks eksperimen. Nantinya menjadi beranda subdomain
// labs.amamiya.web.id; untuk sekarang dilayani dari endpoint /labs
// (keputusan user 27 Nov 2026). Eksperimen pertama: Logo Lab di
// /lab/logo.
export default function LabsPage() {
  return <LabsBody />;
}
