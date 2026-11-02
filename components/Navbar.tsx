"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  // Di halaman utama, klik menu menggulir mulus langsung ke lokasi
  // section (dengan koreksi posisi untuk section malas-render) alih-
  // alih lompatan jangkar bawaan. Dari halaman lain (tool), tautan
  // menavigasi ke /#id seperti biasa dan halaman utama menggulir
  // ke hash itu sesaat setelah ter-mount.
  const go = (e: MouseEvent, id: string) => {
    if (window.location.pathname === "/") {
      e.preventDefault();
      // Garis bawah langsung pindah mengikuti klik (scrollspy
      // mengonfirmasi ulang begitu section-nya tiba di pita pantau).
      setCurrent(id);
      scrollToSection(id);
      window.history.pushState(null, "", `/#${id}`);
    }
  };

  // Scrollspy. WAJIB jalan ulang tiap pindah rute: Navbar tinggal di
  // layout root dan TIDAK ikut ter-mount ulang saat navigasi klien,
  // jadi bila app pertama kali dibuka dari halaman tool, kelima
  // section beranda belum ada di DOM dan pengamat lama tidak pernah
  // memasang target — garis bawah membeku di "home" selamanya
  // (bug yang dilaporkan user 2 Nov). Karena itu: amati yang sudah
  // ada sekarang, lalu jajak singkat sampai semua section muncul.
  useEffect(() => {
    if (pathname !== "/") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setCurrent(e.target.id);
        }
      },
      { rootMargin: "-38% 0px -55% 0px" },
    );
    const observed = new Set<string>();
    const tryObserve = () => {
      for (const l of LINKS) {
        if (observed.has(l.id)) continue;
        const el = document.getElementById(l.id);
        if (el) {
          io.observe(el);
          observed.add(l.id);
        }
      }
      return observed.size === LINKS.length;
    };
    let timer = 0;
    let stop = 0;
    if (!tryObserve()) {
      timer = window.setInterval(() => {
        if (tryObserve()) window.clearInterval(timer);
      }, 300);
      stop = window.setTimeout(() => window.clearInterval(timer), 6000);
    }
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
      io.disconnect();
    };
  }, [pathname]);

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
