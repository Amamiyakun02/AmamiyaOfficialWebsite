"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Sidebar mobile gaya situs docs (permintaan user 16 Nov): drawer
  // geser dari kiri berisi daftar menu vertikal yang bersih — bukan
  // sidebar dashboard. Selama terbuka: halaman di belakang terkunci
  // gulirnya, tombol Escape menutup.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  // Pindah rute (mis. dari halaman tool) selalu menutup drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  // Halaman login dashboard tampil TANPA navbar (permintaan user
  // 5 Nov): entrance-nya memenuhi layar penuh seperti gambar acuan.
  if (pathname === "/dashboard/login") return null;

  return (
    <>
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
        <div className="nav-right">
          <Link
            className="nav-cta"
            href="/#tools"
            onClick={(e) => go(e, "tools")}
          >
            Coba Tools
          </Link>
          <button
            type="button"
            className="nav-burger"
            aria-label="Buka menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={21} />
          </button>
        </div>
      </header>

      {/* Sidebar mobile gaya docs: panel polos bergeser dari kiri,
          daftar tautan vertikal, item aktif beraksen garis kiri. */}
      <div
        className={`nav-backdrop${open ? " is-open" : ""}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside className={`nav-drawer${open ? " is-open" : ""}`} aria-hidden={!open}>
        <div className="nav-drawer-head">
          <Link
            href="/#home"
            className="brand"
            onClick={(e) => {
              go(e, "home");
              setOpen(false);
            }}
          >
            <img src="/favicon.png" alt="" className="brand-logo" /> Amamiya
          </Link>
          <button
            type="button"
            className="nav-drawer-close"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="nav-drawer-list">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              className={`nav-drawer-link${current === l.id ? " is-active" : ""}`}
              onClick={(e) => {
                go(e, l.id);
                setOpen(false);
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="nav-drawer-foot">
          <Link
            className="nav-cta nav-drawer-cta"
            href="/#tools"
            onClick={(e) => {
              go(e, "tools");
              setOpen(false);
            }}
          >
            Coba Tools
          </Link>
        </div>
      </aside>
    </>
  );
}
