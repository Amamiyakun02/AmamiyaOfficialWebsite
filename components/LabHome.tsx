"use client";

import Link from "next/link";
import { ArrowUpRight, FlaskConical } from "lucide-react";
import { useLang } from "@/lib/i18n";
import SectionTitle from "@/components/SectionTitle";

// Beranda Lab (/lab) — halaman PENUH dengan gulir normal,
// BUKAN pola satu-layar section seperti beranda portofolio:
// daftar eksperimen Amamiya Labs. Tujuan tombol "Enter the
// Lab" di landing /labs. Latar memakai bekas nebula statis
// (gradasi radial CSS, tanpa canvas) agar nyambung dengan
// entrance landing-nya tapi tetap ringan.
export default function LabHome() {
  const { t } = useLang();
  return (
    <div className="min-h-0 w-full flex-1 overflow-y-auto">
      <div
        className="min-h-full"
        style={{
          background:
            "radial-gradient(560px 380px at 16% 0%, rgba(0,155,160,0.10), transparent 70%), radial-gradient(640px 420px at 88% 100%, rgba(0,55,150,0.12), transparent 70%), radial-gradient(420px 300px at 74% 8%, rgba(10,24,71,0.14), transparent 70%)",
        }}
      >
        <div className="mx-auto max-w-[1080px] px-4 pt-[18px] pb-14">
          <p className="m-0 mt-2 text-[12px] font-bold tracking-[0.28em] text-accent2">
            {t("labs.kicker")}
          </p>
          <SectionTitle text={t("labs.title")} />
          <p className="m-0 mt-3 max-w-[640px] text-[15px] leading-[1.65] text-[#9DB1D9]">
            {t("labs.intro")}
          </p>

          <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 max-[760px]:grid-cols-1">
            {/* Eksperimen live: Logo Lab */}
            <Link
              href="/lab/logo"
              className="group block rounded-2xl border border-line bg-panel p-5 no-underline transition-colors hover:border-accent2"
            >
              <div className="flex h-[150px] items-center justify-center rounded-xl bg-ink">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/favicon.png"
                  alt="Logo Amamiya"
                  className="h-[104px] w-[104px] object-contain transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <h3 className="m-0 text-[17px] font-bold text-paper">
                  Logo Lab
                </h3>
                <span className="inline-flex flex-none items-center gap-1.5 rounded-full border border-accent2/40 px-2.5 py-1 text-[11px] font-semibold text-accent2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {t("labs.statusLive")}
                </span>
              </div>
              <p className="m-0 mt-2 text-[13.5px] leading-[1.6] text-fog">
                {t("labs.logoLabDesc")}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent2 transition-colors group-hover:text-accent">
                {t("labs.open")} <ArrowUpRight size={14} />
              </span>
            </Link>

            {/* Penampung eksperimen berikutnya */}
            <div className="flex flex-col justify-center rounded-2xl border border-dashed border-line2 bg-panel/50 p-5">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line2 text-dim">
                <FlaskConical size={18} />
              </span>
              <h3 className="m-0 mt-4 text-[17px] font-bold text-fog">
                {t("labs.moreTitle")}
              </h3>
              <p className="m-0 mt-2 text-[13.5px] leading-[1.6] text-dim">
                {t("labs.moreSoon")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
