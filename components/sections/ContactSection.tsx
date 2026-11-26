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
    <div className="mx-auto w-[min(1200px,100%)] px-7 py-16 max-[760px]:px-[18px] max-[760px]:py-11">
      <SectionTitle text="Contact" />
      <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
        Kirim pesan lewat formulir ini — untuk peluang freelance, kolaborasi,
        atau sekadar menyapa.
      </p>

      <div className="mt-7 grid grid-cols-[minmax(0,720px)_minmax(0,1fr)] items-start gap-[44px] max-[900px]:grid-cols-1 max-[900px]:gap-[34px]">
        <div>
      {sent ? (
        <div className="max-w-[720px] rounded-2xl border border-[rgba(52,211,153,0.35)] bg-[rgba(13,13,16,0.78)] p-[22px]">
          <h2 className="m-0 mb-2 text-lg">Pesan Terkirim</h2>
          <p className="m-0 mb-4 text-sm text-[#9DB1D9]">
            Terima kasih sudah menghubungi. Saya akan membalas secepatnya.
          </p>
          <button
            type="button"
            className="cursor-pointer rounded-full border border-line3 bg-[rgba(16,16,20,0.7)] px-[15px] py-[7px] text-[13px] font-semibold text-[#C3D2F0] hover:border-[#41538A]"
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
            Email Anda
            <input
              className="rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-[13px] py-[11px] font-normal text-paper [font-family:inherit] [font-size:inherit] focus:border-line focus:outline-none"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-[7px] text-[13px] font-semibold text-[#C3D2F0]">
            Pesan Anda
            <textarea
              className="rounded-[10px] border border-line3 bg-[rgba(13,13,16,0.85)] px-[13px] py-[11px] font-normal text-paper [font-family:inherit] [font-size:inherit] focus:border-line focus:outline-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={4600}
              rows={6}
            />
          </label>
          {error && (
            <p className="m-0 text-[13px] text-[#f87171]">{error}</p>
          )}
          <button
            type="submit"
            className="inline-block cursor-pointer self-start rounded-full border border-accent bg-accent px-[18px] py-[9px] text-[13.5px] font-semibold text-[#052A1E] no-underline transition-[border-color,background] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)] hover:border-[#41538A] hover:bg-[#00BBA2]"
            disabled={submitting}
          >
            {submitting ? "Mengirim..." : "Kirim Pesan"}
          </button>
        </form>
      )}
        </div>

        <aside>
          <h3 className="mt-1 mb-3.5 text-[15px] font-bold text-paper">
            Terhubung
          </h3>
          <div className="flex flex-col gap-2.5">
            {SOCIALS.map(({ name, handle, href }) => (
              <a
                key={name}
                className="flex items-center gap-3 rounded-xl border border-line2 bg-[rgba(13,13,16,0.78)] px-3.5 py-[11px] text-paper no-underline hover:border-[#354C8C] hover:bg-[rgba(22,22,27,0.9)]"
                href={href}
                {...(href.startsWith("http")
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-[9px] bg-[rgba(0,255,170,0.12)] text-accent3">
                  {SOCIAL_ICONS[name]}
                </span>
                <span>
                  <span className="block text-[14.5px] leading-[1.3] font-semibold">
                    {name}
                  </span>
                  <span className="block text-[12.5px] text-[#8298C0]">
                    {handle}
                  </span>
                </span>
                <ArrowUpRight
                  size={16}
                  className="ml-auto flex-none text-[#8298C0]"
                />
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
