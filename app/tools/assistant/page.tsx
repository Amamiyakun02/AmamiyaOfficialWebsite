import { Suspense } from "react";
import type { Metadata } from "next";
import AssistantChat from "@/components/AssistantChat";

export const metadata: Metadata = {
  title: "Vienna AI Assistant — Amamiya",
  description:
    "Obrol dengan Vienna, asisten AI Amamiya: tanya soal keahlian, proyek, dan cara menghubunginya.",
};

// Halaman tool pertama yang dipindah dari WebPortofolio lama (Tahap 2):
// chat AI satu halaman penuh. Quick prompt di halaman utama mengarah ke
// sini dengan ?q= yang terkirim otomatis (lihat AssistantChat).
export default function AssistantPage() {
  return (
    <Suspense fallback={null}>
      <AssistantChat />
    </Suspense>
  );
}
