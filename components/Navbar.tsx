"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* Navbar portofolio bersama — dulu menempel di dalam WonderScene (khusus
   halaman Home), sekarang tinggal di layout root agar semua halaman
   memakai navigasi yang sama. Menu: Beranda, Proyek, Tools, Tentang,
   Kontak; CTA menuju asisten AI. */
const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/projects", label: "Proyek" },
  { href: "/tools", label: "Tools" },
  { href: "/about", label: "Tentang" },
  { href: "/contact", label: "Kontak" },
];

export default function Navbar() {
  const pathname = usePathname();
  const active = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  return (
    <header className="navbar">
      <div className="nav-left">
        <Link href="/" className="brand">
          <span className="brand-mark">∞</span> Amamiya
        </Link>
        <nav>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={active(l.href) ? "nav-active" : undefined}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <Link className="nav-cta" href="/tools">
        Coba Tools
      </Link>
    </header>
  );
}
