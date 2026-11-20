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
    <div className="vd-page">
      <div className="vd-inner">
        <Link href="/#tools" className="chat-back">
          <ArrowLeft size={14} /> Kembali ke Tools
        </Link>

        <div className="vd-head">
          <span className="vd-head-icon">
            <MessageSquare size={22} />
          </span>
          <div>
            <h1 className="vd-title">Feedback</h1>
            <p className="page-desc">
              Kirim ulasan dan masukan tentang situs dan tool-tool di
              sini — pesanmu masuk ke inbox-ku dan kubaca langsung.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="form-done">
            <h2>Feedback Terkirim</h2>
            <p>Terima kasih atas masukannya — sangat membantu.</p>
            <button
              type="button"
              className="chip"
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
          <form className="contact-form" onSubmit={submit}>
            <label>
              Nama Anda
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                autoComplete="name"
              />
            </label>
            <label>
              Penilaianmu
              <span className="fb-stars" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    className={`fb-star${n <= rating ? " is-on" : ""}`}
                    onClick={() => setRating(n)}
                    title={`${n} dari 5`}
                  >
                    <Star size={22} />
                  </button>
                ))}
                <span className="fb-stars-note">
                  {rating > 0 ? `${rating}/5` : "Pilih rating dulu"}
                </span>
              </span>
            </label>
            <label>
              Kategori
              <select
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
            <label>
              Pesan / masukan
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                maxLength={4600}
                rows={6}
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button
              type="submit"
              className="hero-btn hero-btn-primary"
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
