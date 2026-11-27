"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/lib/i18n";

// Header khusus area Lab (/lab dan /lab/*) — pengganti navbar
// portofolio yang disembunyikan di area ini (permintaan user
// 27 Nov 2026): cukup wordmark AMAMIYA LABS (gambar No. 2
// pilihan user) sebagai tautan ke beranda Lab, plus jalan
// keluar ke landing dan ke situs utama. Di luar /lab* komponen
// ini tidak tampil sama sekali.
// Judul eksperimen per route — ditampilkan di header di
// samping wordmark. Eksperimen baru cukup tambah satu baris.
const EXP_TITLES: Record<string, string> = {
  "/lab/logo": "Logo Lab",
};

export default function LabHeader() {
  const pathname = usePathname();
  const { t } = useLang();
  if (!(pathname === "/lab" || pathname?.startsWith("/lab/"))) return null;
  const expTitle = pathname ? EXP_TITLES[pathname] : undefined;
  return (
    <header className="relative z-[5] flex flex-none items-center justify-between border-b border-[#1e1e22] bg-[rgba(13,13,15,0.94)] px-7 py-3 max-[760px]:px-[18px] max-[760px]:py-2.5">
      <div className="flex items-center gap-4">
        <Link href="/lab" className="inline-flex items-center no-underline" aria-label="Amamiya Labs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/labs-wordmark.png"
            alt="Amamiya Labs"
            className="h-[30px] w-auto max-[760px]:h-[24px]"
          />
        </Link>
        {expTitle && (
          <>
            <span className="h-6 w-px bg-line" />
            <span className="text-[20px] font-bold text-paper max-[760px]:text-[17px]">{expTitle}</span>
          </>
        )}
      </div>
      <nav className="flex items-center gap-5 text-[13px] max-[760px]:gap-4">
        <Link
          href="/labs"
          className="inline-flex items-center gap-1.5 font-semibold text-fog no-underline transition-colors hover:text-white"
        >
          <ArrowLeft size={14} /> {t("labs.backLanding")}
        </Link>
        <Link
          href="/"
          className="font-semibold text-fog no-underline transition-colors hover:text-white"
        >
          {t("labs.toMain")}
        </Link>
      </nav>
    </header>
  );
}
