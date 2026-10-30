import type { Metadata } from "next";
import SpiralScene from "@/components/SpiralScene";

export const metadata: Metadata = {
  title: "Uji Spiral — Amamiya",
  description:
    "Halaman pengujian efek spiral per sel: glitch → spiral tumbuh → berputar → menguncup → glitch → huruf kembali, dengan switch sungguhan (bukan overlay).",
};

export default function SpiralPage() {
  return <SpiralScene />;
}
