"use client";

import { useState } from "react";
import { AtSign, Mail, ArrowUpRight } from "lucide-react";
import { apiUrl } from "@/lib/api";
import SectionTitle from "@/components/SectionTitle";
import { InstagramIcon, FacebookIcon } from "@/components/BrandIcons";

// Kanal lain di samping formulir (permintaan user 16 Nov): tombol ke
// Instagram, Threads, Facebook, dan email di kolom kanan formulir.
// Username & URL asli dari user (16 Nov 2026).
const SOCIALS = [
  {
    name: "Instagram",
    handle: "@_agonystic_",
    href: "https://www.instagram.com/_agonystic_",
  },
  {
    name: "Threads",
    handle: "@_agonystic_",
    href: "https://www.threads.com/@_agonystic_",
  },
  {
    name: "Facebook",
    handle: "Amamiya",
    href: "https://www.facebook.com/amamiya.kun.5",
  },
  {
    name: "Email",
    handle: "amamiyakun02@gmail.com",
    href: "mailto:amamiyakun02@gmail.com",
  },
];
const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  Instagram: <InstagramIcon size={19} />,
  Threads: <AtSign size={19} />,
  Facebook: <FacebookIcon size={19} />,
  Email: <Mail size={19} />,
};

// Halaman Kontak — formulir yang sama seperti WebPortofolio lama:
// pesan dikirim ke gudang feedback backend Vienna Agent
// (POST /v1/admin/feedbacks) dan dibaca lewat tab Inbox dashboard.
// category kini "contact" (dulu "general") agar Inbox bisa
// membedakan pesan kontak dari feedback tool; field email/source
// dikirim dari sekarang — backend lama mengabaikannya dengan aman,
// backend baru (prompt serah-terima 20 Nov 2026) menyimpannya
// sebagai field terstruktur.
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
          category: "contact",
          content: `Contact from ${name} <${email}>:\n\n${message}`,
          status: "new",
          email,
          source: "contact",
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

      <div className="contact-layout">
        <div>
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

        <aside className="contact-social">
          <h3 className="social-title">Terhubung</h3>
          <div className="social-list">
            {SOCIALS.map(({ name, handle, href }) => (
              <a
                key={name}
                className="social-btn"
                href={href}
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                <span className="social-ic">{SOCIAL_ICONS[name]}</span>
                <span>
                  <span className="social-name">{name}</span>
                  <span className="social-handle">{handle}</span>
                </span>
                <ArrowUpRight size={16} className="social-arrow" />
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
