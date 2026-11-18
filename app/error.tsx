"use client";

import { useEffect } from "react";
import Link from "next/link";

/* Batas error tingkat rute (ditambahkan 18 Nov 2026, hasil audit
   error handling pra-push): menangkap error render/runtime yang
   tak tertangani di halaman mana pun — termasuk segmen dashboard —
   dan menggantikan layar error bawaan Next.js dengan halaman
   bergaya situs + tombol pemulihan (reset). Error dicatat ke
   console untuk diagnosis; digest Next ditampilkan sebagai kode
   rujukan bila ada. */

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="errpage">
      <p className="errpage-code">Error</p>
      <h1 className="errpage-title">Terjadi kesalahan</h1>
      <p className="errpage-desc">
        Maaf, halaman ini gagal dimuat karena kesalahan tak terduga.
        Coba muat ulang — bila masih gagal, kembali ke beranda.
      </p>
      {error.digest && (
        <p className="errpage-digest">Kode rujukan: {error.digest}</p>
      )}
      <div className="errpage-actions">
        <button
          type="button"
          className="errpage-btn is-primary"
          onClick={() => reset()}
        >
          Coba lagi
        </button>
        <Link className="errpage-btn" href="/">
          Ke Beranda
        </Link>
      </div>
    </main>
  );
}
