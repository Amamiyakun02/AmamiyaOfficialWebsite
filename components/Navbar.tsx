"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { scrollToSection } from "@/lib/scroll";

/* Navbar portofolio — sejak situs jadi SATU halaman, menu adalah
   jangkar ke section-section di halaman utama (Beranda, Proyek, Tools,
   Tentang, Kontak) dengan scrollspy: menu aktif mengikuti section yang
   sedang terlihat. CTA menuju section Tools. */
const LINKS = [
  { id: "home", label: "Home" },
  { id: "projects", label: "Projects" },
  { id: "tools", label: "Tools" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

export default function Navbar() {
  const [current, setCurrent] = useState("home");

  // Di halaman utama, klik menu menggulir mulus langsung ke lokasi
  // section (dengan koreksi posisi untuk section malas-render) alih-
  // alih lompatan jangkar bawaan. Dari halaman lain (tool), tautan
  // menavigasi ke /#id seperti biasa dan halaman utama menggulir
  // ke hash itu sesaat setelah ter-mount.
  const go = (e: MouseEvent, id: string) => {
    if (window.location.pathname === "/") {
      e.preventDefault();
      scrollToSection(id);
      window.history.pushState(null, "", `/#${id}`);
    }
  };

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
        <Link
          href="/#home"
          className="brand"
          onClick={(e) => go(e, "home")}
        >
          <img src="/favicon.png" alt="" className="brand-logo" /> Amamiya
        </Link>
        <nav>
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              className={current === l.id ? "nav-active" : undefined}
              onClick={(e) => go(e, l.id)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <Link
        className="nav-cta"
        href="/#tools"
        onClick={(e) => go(e, "tools")}
      >
        Coba Tools
      </Link>
    </header>
  );
}
