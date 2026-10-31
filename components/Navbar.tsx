"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/* Navbar portofolio — sejak situs jadi SATU halaman, menu adalah
   jangkar ke section-section di halaman utama (Beranda, Proyek, Tools,
   Tentang, Kontak) dengan scrollspy: menu aktif mengikuti section yang
   sedang terlihat. CTA menuju section Tools. */
const LINKS = [
  { id: "beranda", label: "Beranda" },
  { id: "proyek", label: "Proyek" },
  { id: "tools", label: "Tools" },
  { id: "tentang", label: "Tentang" },
  { id: "kontak", label: "Kontak" },
];

export default function Navbar() {
  const [current, setCurrent] = useState("beranda");

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setCurrent(e.target.id);
        }
      },
      { rootMargin: "-38% 0px -55% 0px" },
    );
    for (const l of LINKS) {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link href="/#beranda" className="brand">
          <span className="brand-mark">∞</span> Amamiya
        </Link>
        <nav>
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              className={current === l.id ? "nav-active" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <Link className="nav-cta" href="/#tools">
        Coba Tools
      </Link>
    </header>
  );
}
