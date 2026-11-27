import type { Metadata } from "next";
import LabHome from "@/components/LabHome";

export const metadata: Metadata = {
  title: "Labs | Amamiya",
  description:
    "Amamiya Labs — a playground for experiments: design studies, prototypes, and small tools in progress.",
};

// Beranda Lab (diminta user 27 Nov 2026): halaman penuh tempat
// eksperimen-eksperimen Labs berkumpul; dituju tombol
// "Enter the Lab" dari landing /labs.
export default function LabPage() {
  return <LabHome />;
}
