"use client";

// Badan halaman 404 (27 Nov 2026): dipisah dari app/not-found.tsx
// (server, pemilik metadata) agar teksnya mengikuti bahasa aktif
// lewat useLang seperti halaman publik lain.
import Link from "next/link";
import { useLang } from "@/lib/i18n";

export default function NotFoundBody() {
  const { t } = useLang();
  return (
    <main className="errpage">
      <p className="errpage-code">404</p>
      <h1 className="errpage-title">{t("nf.title")}</h1>
      <p className="errpage-desc">{t("nf.body")}</p>
      <div className="errpage-actions">
        <Link className="errpage-btn is-primary" href="/">
          {t("nf.home")}
        </Link>
        <Link className="errpage-btn" href="/#tools">
          {t("nf.tools")}
        </Link>
      </div>
    </main>
  );
}
