import type { Metadata } from "next";
import FeedbackForm from "@/components/FeedbackForm";

export const metadata: Metadata = {
  title: "Feedback | Amamiya",
  description:
    "Send reviews and feedback about Amamiya's site and tools — it lands in the inbox and is read directly.",
};

// Halaman tool Feedback (dipindah dari antrean migrasi 20 Nov 2026):
// formulir ulasan pengunjung ke gudang feedback backend yang sama
// dengan formulir Contact (POST /v1/admin/feedbacks), dibaca lewat
// tab Inbox dashboard.
export default function FeedbackPage() {
  return <FeedbackForm />;
}
