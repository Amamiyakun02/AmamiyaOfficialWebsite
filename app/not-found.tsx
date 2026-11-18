import type { Metadata } from "next";
import Link from "next/link";

/* Halaman 404 kustom (ditambahkan 18 Nov 2026, hasil audit error
   handling pra-push): menggantikan 404 bawaan Next.js yang generik
   & berbahasa Inggris. Bahasa halaman mengikuti aturan situs:
   isi Bahasa Indonesia. Juga melayani 404 dari isolasi host
   (mis. /dashboard di domain utama). */

export const metadata: Metadata = {
  title: "404 — Halaman tidak ditemukan | Amamiya",
};

export default function NotFound() {
  return (
    <main className="errpage">
      <p className="errpage-code">404</p>
      <h1 className="errpage-title">Halaman tidak ditemukan</h1>
      <p className="errpage-desc">
        Alamat yang kamu tuju tidak ada atau sudah dipindahkan.
        Periksa kembali URL-nya, atau kembali ke beranda.
      </p>
      <div className="errpage-actions">
        <Link className="errpage-btn is-primary" href="/">
          Ke Beranda
        </Link>
        <Link className="errpage-btn" href="/#tools">
          Lihat Tools
        </Link>
      </div>
    </main>
  );
}
