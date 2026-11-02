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
        "Failed to send your message. Please try again in a moment, or reach me through another channel.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section-inner section-narrow">
      <SectionTitle text="Contact" />
      <p className="page-desc">
        Send me a message through this form — for freelance opportunities,
        collaboration, or just to say hello.
      </p>

      {sent ? (
        <div className="form-done">
          <h2>Message Sent</h2>
          <p>
            Thank you for reaching out. I will get back to you as soon as I can.
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
            Send another message
          </button>
        </div>
      ) : (
        <form className="contact-form" onSubmit={submit}>
          <label>
            Your Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoComplete="name"
            />
          </label>
          <label>
            Your Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Your Message
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
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
}
