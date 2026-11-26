"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Star } from "lucide-react";
import { apiUrl } from "@/lib/api";

/* Halaman tool Feedback — formulir ulasan & masukan pengunjung.
   Mengirim ke gudang yang sama dengan formulir Contact
   (POST /v1/admin/feedbacks, koleksi feedbacks backend) dan
   dibaca lewat tab Inbox dashboard. category mengikuti pilihan
   pengirim; source "feedback" membedakannya dari pesan kontak. */

const CATEGORIES = [
  { value: "general", label: "Umum" },
  { value: "review", label: "Ulasan situs / tool" },
  { value: "bug_report", label: "Laporan bug" },
  { value: "feature_request", label: "Permintaan fitur" },
] as const;

export default function FeedbackForm() {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<string>("general");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || rating === 0 || !content) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/v1/admin/feedbacks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          rating: String(rating),
          category,
          content,
          status: "new",
          source: "feedback",
        }),
      });
      if (!res.ok) throw new Error("failed");
      setSent(true);
    } catch {
      setError(
        "Gagal mengirim feedback. Silakan coba lagi sebentar, atau hubungi lewat halaman Contact.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1080px] px-4 pt-[18px] pb-14">
        <Link href="/#tools" className="mr-auto inline-flex items-center gap-1.5 text-[13px] text-fog no-underline hover:text-white">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="mt-4 flex items-start gap-3.5">
          <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-[14px] border border-[rgba(0,255,170,0.25)] bg-[rgba(0,255,170,0.1)] text-accent2">
            <MessageSquare size={22} />
          </span>
          <div>
            <h1 className="text-[30px] leading-[1.15] font-extrabold text-[#EEF4FF]">Feedback</h1>
            <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
              Kirim ulasan dan masukan tentang situs dan tool-tool di
              sini — pesanmu masuk ke inbox-ku dan kubaca langsung.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="max-w-[720px] rounded-2xl border border-[rgba(52,211,153,0.35)] bg-[rgba(13,13,16,0.78)] p-[22px]">
            <h2 className="m-0 mb-2 text-lg">Feedback Terkirim</h2>
            <p className="m-0 mb-4 text-sm text-[#9DB1D9]">Terima kasih atas masukannya — sangat membantu.</p>
            <button
              type="button"
              className="cursor-pointer rounded-full border border-line3 bg-[rgba(16,16,20,0.7)] px-[15px] py-[7px] text-[13px] font-semibold text-[#C3D2F0] hover:border-[#41538A]"
              onClick={() => {
                setSent(false);
                setName("");
                setRating(0);
                setCategory("general");
                setContent("");
              }}
            >
              Kirim feedback lainnya
            </button>
          </div>
        ) : (
          <form className="flex max-w-[720px] flex-col gap-4" onSubmit={submit}>
            <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#C3D2F0]">
              Nama Anda
              <input
                className="rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-[13px] py-[11px] font-normal text-paper [font-family:inherit] [font-size:inherit] focus:border-line focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#C3D2F0]">
              Penilaianmu
              <span className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    className={`inline-flex cursor-pointer border-0 bg-transparent p-[3px] ${n <= rating ? "text-[#e5b95f]" : "text-steel"}`}
                    onClick={() => setRating(n)}
                    title={`${n} dari 5`}
                  >
                    <Star size={22} className={n <= rating ? "[fill:currentColor]" : undefined} />
                  </button>
                ))}
                <span className="ml-2 text-[12.5px] text-fog">
                  {rating > 0 ? `${rating}/5` : "Pilih rating dulu"}
                </span>
              </span>
            </label>
            <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#C3D2F0]">
              Kategori
              <select
                className="rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-[13px] py-[11px] font-normal text-paper [font-family:inherit] [font-size:inherit] focus:border-line focus:outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#C3D2F0]">
              Pesan / masukan
              <textarea
                className="rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-[13px] py-[11px] font-normal text-paper [font-family:inherit] [font-size:inherit] focus:border-line focus:outline-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={4600}
                rows={6}
              />
            </label>
            {error && <p className="m-0 text-[13px] text-[#f87171]">{error}</p>}
            <button
              type="submit"
              className="inline-block cursor-pointer self-start rounded-full border border-accent bg-accent px-[18px] py-[9px] text-[13.5px] font-semibold text-[#052A1E] no-underline transition-[border-color,background] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-[#41538A] hover:bg-[#00BBA2]"
              disabled={submitting || rating === 0}
            >
              {submitting ? "Mengirim..." : "Kirim Feedback"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
