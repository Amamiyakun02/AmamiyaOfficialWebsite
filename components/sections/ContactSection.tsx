"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";
import SectionTitle from "@/components/SectionTitle";

// Halaman Kontak — formulir yang sama seperti WebPortofolio lama:
// pesan dikirim sebagai feedback ke backend Vienna Agent
// (POST /v1/admin/feedbacks) dengan payload yang identik.
export default function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/v1/admin/feedbacks"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          rating: "5",
          category: "general",
          content: `Contact from ${name} <${email}>:\n\n${message}`,
          status: "new",
        }),
      });
      if (!res.ok) throw new Error("failed");
      setSent(true);
    } catch {
      setError(
        "Gagal mengirim pesan. Silakan coba lagi sebentar, atau hubungi lewat kanal lain.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-inner">
      <SectionTitle text="Contact" />
      <p className="page-desc">
        Kirim pesan lewat formulir ini — untuk peluang freelance, kolaborasi,
        atau sekadar menyapa.
      </p>

      {sent ? (
        <div className="form-done">
          <h2>Pesan Terkirim</h2>
          <p>
            Terima kasih sudah menghubungi. Saya akan membalas secepatnya.
          </p>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setSent(false);
              setName("");
              setEmail("");
              setMessage("");
            }}
          >
            Kirim pesan lainnya
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
            Email Anda
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Pesan Anda
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={4600}
              rows={6}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="hero-btn hero-btn-primary" disabled={submitting}>
            {submitting ? "Mengirim..." : "Kirim Pesan"}
          </button>
        </form>
      )}
    </div>
  );
}
