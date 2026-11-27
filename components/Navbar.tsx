"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Download } from "lucide-react";
import { GithubIcon } from "./BrandIcons";
import { scrollToSection } from "@/lib/scroll";
import { useLang, LangSwitcher } from "@/lib/i18n";
import { fetchPublicCvUrl } from "@/lib/publicCv";

// Tombol kanan navbar = ikon GitHub ke profil user (permintaan user
// 16 Nov, menggantikan tombol "Coba Tools") + pil "Unduh CV" di
// kirinya (pindahan dari dock hero, permintaan user 21 Nov).
const GITHUB_URL = "https://github.com/Amamiyakun02";

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
  const { t } = useLang();
  // URL CV dari dashboard (GET /v1/site/cv, Modul Media): selama
  // belum diatur (null) tombol Unduh CV disembunyikan — pengganti
  // tautan statis /profesional-cv.pdf yang lama.
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchPublicCvUrl().then((url) => {
      if (alive) setCvUrl(url);
    });
    return () => {
      alive = false;
    };
  }, []);

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

  // Seluruh area dashboard tampil TANPA navbar situs: login sejak
  // 5 Nov (permintaan user, entrance memenuhi layar), dan sejak
  // rombak bersidebar 18 Nov halaman dashboardnya juga — ia aplikasi
  // platform mandiri dengan sidebar + tautan "Situs utama" sendiri.
  if (
    pathname === "/dashboard" ||
    pathname?.startsWith("/dashboard/") ||
    pathname === "/labs" ||
    pathname?.startsWith("/labs/")
  )
    return null;

  return (
    <>
      <header className="relative z-[5] flex flex-none items-center justify-between border-b border-[#1e1e22] bg-[rgba(13,13,15,0.94)] px-7 py-3 max-[760px]:px-[18px] max-[760px]:py-2.5">
        <div className="flex items-center gap-[30px] max-[760px]:gap-[14px]">
          <Link
            href="/#home"
            className="inline-flex items-center gap-[9px] text-[19px] font-bold tracking-[0.01em] text-white no-underline hover:underline max-[760px]:text-[17px]"
            onClick={(e) => go(e, "home")}
          >
            <img
              src="/favicon.png"
              alt=""
              className="block h-[30px] w-auto max-[760px]:h-[26px]"
            />{" "}
            Amamiya
          </Link>
          <nav className="flex gap-6 max-[760px]:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.id}
                href={`/#${l.id}`}
                className={`text-[15px] text-[#DCE7FA] no-underline hover:underline${
                  current === l.id
                    ? " text-white underline decoration-accent underline-offset-[5px]"
                    : ""
                }`}
                onClick={(e) => go(e, l.id)}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {/* Pilihan bahasa EN/ID (27 Nov 2026) — di layar sangat
              sempit disembunyikan dari header; salinannya ada di
              dalam laci mobile. */}
          <span className="max-[560px]:hidden">
            <LangSwitcher />
          </span>
          {cvUrl && (
            <a
              className="inline-flex h-[38px] items-center gap-[7px] whitespace-nowrap rounded-full border border-line3 bg-white/[0.03] px-4 text-[13.5px] font-semibold text-[#DCE7FA] no-underline hover:border-[#41538A] hover:bg-white/[0.07] hover:text-white max-[640px]:hidden"
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={15} />
              {t("nav.downloadCv")}
            </a>
          )}
          <a
            className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-line3 bg-white/[0.03] text-[#DCE7FA] hover:border-[#41538A] hover:bg-white/[0.07] hover:text-white"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub Amamiyakun02"
          >
            <GithubIcon size={20} />
          </a>
          <button
            type="button"
            className="hidden cursor-pointer items-center justify-center rounded-[9px] border border-[#22336A] bg-transparent p-2 text-[#DCE7FA] max-[760px]:inline-flex"
            aria-label={t("nav.openMenu")}
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
        className={`fixed inset-0 z-[55] bg-[rgba(4,4,6,0.55)] transition-opacity duration-[280ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] min-[761px]:hidden motion-reduce:transition-none ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`fixed top-0 bottom-0 left-0 z-[60] flex w-[min(300px,84vw)] flex-col border-r border-[#1e1e22] bg-[#101013] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0.24,1)] min-[761px]:hidden motion-reduce:transition-none ${
          open
            ? "pointer-events-auto translate-x-0 shadow-[24px_0_48px_rgba(0,0,0,0.45)]"
            : "pointer-events-none -translate-x-[105%]"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-[#1e1e22] px-[18px] py-[13px]">
          <Link
            href="/#home"
            className="inline-flex items-center gap-[9px] text-[17px] font-bold tracking-[0.01em] text-white no-underline"
            onClick={(e) => {
              go(e, "home");
              setOpen(false);
            }}
          >
            <img src="/favicon.png" alt="" className="block h-[26px] w-auto" />{" "}
            Amamiya
          </Link>
          <button
            type="button"
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent p-[7px] text-fog hover:bg-white/[0.05] hover:text-white"
            aria-label={t("nav.closeMenu")}
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col overflow-y-auto py-2.5">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              className={`block px-5 py-[11px] text-[15.5px] no-underline hover:bg-white/[0.04] hover:text-white ${
                current === l.id
                  ? "bg-[rgba(0,255,170,0.1)] text-white shadow-[inset_2.5px_0_0_#00FFAA]"
                  : "text-[#AFC2E6]"
              }`}
              onClick={(e) => {
                go(e, l.id);
                setOpen(false);
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[#1e1e22] px-[18px] pt-4 pb-5">
          <div className="mb-3.5">
            <LangSwitcher />
          </div>
          <div className="flex gap-[10px]">
          {cvUrl && (
            <a
              className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line3 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white no-underline hover:border-[#41538A] hover:bg-white/[0.08]"
              href={cvUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              <Download size={17} /> {t("nav.downloadCv")}
            </a>
          )}
          <a
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line3 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white no-underline hover:border-[#41538A] hover:bg-white/[0.08]"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
          >
            <GithubIcon size={18} /> GitHub
          </a>
          </div>
        </div>
      </aside>
    </>
  );
}
