"use client";

import Link from "next/link";
import { ArrowRight, Triangle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import type { DictKey } from "@/lib/dict";

// Badan halaman /labs (klien, dwibahasa) — metadata tetap di
// app/labs/page.tsx (server). Halaman ini adalah calon beranda
// subdomain labs.amamiya.web.id; untuk sekarang dilayani dari
// endpoint /labs situs utama (keputusan user 27 Nov 2026).
// Daftar eksperimen masih statis dan pendek — tambah entri di sini
// setiap ada halaman lab baru.
const EXPERIMENTS: {
  href: string;
  name: string;
  descKey: DictKey;
  Icon: typeof Triangle;
}[] = [
  { href: "/lab/logo", name: "Logo Lab", descKey: "labs.logoLabDesc", Icon: Triangle },
];

export default function LabsBody() {
  const { t } = useLang();
  return (
    <main className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1100px] px-5 py-8">
        <p className="text-[11px] font-bold tracking-[0.22em] text-accent2">
          {t("labs.kicker")}
        </p>
        <h1 className="mt-1 text-[28px] font-bold text-paper">{t("labs.title")}</h1>
        <p className="mt-1 max-w-[640px] text-sm leading-relaxed text-fog">
          {t("labs.intro")}
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIMENTS.map(({ href, name, descKey, Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col rounded-2xl border border-line bg-panel p-5 no-underline transition-colors duration-150 hover:border-line3"
            >
              <span className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line3 bg-white/[0.03] text-accent">
                  <Icon size={19} />
                </span>
                <span className="rounded-full border border-[rgba(0,255,170,0.35)] px-2 py-0.5 text-[10.5px] font-bold text-accent">
                  {t("labs.statusLive")}
                </span>
              </span>
              <span className="mt-3.5 text-[15.5px] font-bold text-paper">{name}</span>
              <span className="mt-1 text-[13px] leading-[1.55] text-fog">
                {t(descKey)}
              </span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent2 transition-colors group-hover:text-accent">
                {t("labs.open")} <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-[13px] text-[#5D7099]">{t("labs.moreSoon")}</p>
      </div>
    </main>
  );
}
