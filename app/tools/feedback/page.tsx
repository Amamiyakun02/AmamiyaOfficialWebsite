import type { Metadata } from "next";
import FeedbackForm from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback | Amamiya",
  description:
    "Kirim ulasan dan masukan tentang situs dan tool-tool Amamiya — masuk ke inbox dan dibaca langsung.",
};

// Halaman tool Feedback (dipindah dari antrean migrasi 20 Nov 2026):
// formulir ulasan pengunjung ke gudang feedback backend yang sama
// dengan formulir Contact (POST /v1/admin/feedbacks), dibaca lewat
// tab Inbox dashboard.
export default function FeedbackPage() {
  return <FeedbackForm />;
}
