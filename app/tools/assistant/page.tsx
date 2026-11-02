import { Suspense } from "react";
import type { Metadata } from "next";
import AssistantChat from "@/components/AssistantChat";

export const metadata: Metadata = {
  title: "Vienna AI Assistant — Amamiya",
  description:
    "Chat with Vienna, Amamiya's AI assistant: ask about his skills, projects, and how to reach him.",
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
