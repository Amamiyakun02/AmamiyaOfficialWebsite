"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* =====================================================================
   IKON MENGAMBANG VIENNA AI ASSISTANT (permintaan user 21 Nov 2026,
   menggantikan segmen "Coba Assistant" di dock hero): tombol bulat
   berlogo vienna.svg — logo yang sama dengan avatar agent di kedua
   chat — terpaku di kanan bawah LAYAR (fixed), di luar komposisi
   judul AMAMIYA di tengah hero, jadi tidak menindih judul/tombol.
   Tampil di semua halaman publik; disembunyikan di dashboard
   (punya AI Agent sendiri) dan di halaman Assistant itu sendiri.
   ===================================================================== */
export default function AgentFab() {
  const pathname = usePathname();
  if (
    !pathname ||
    pathname.startsWith("/dashboard") ||
    pathname === "/tools/assistant"
  )
    return null;
  return (
    <Link
      href="/tools/assistant"
      className="agent-fab"
      aria-label="Buka Vienna AI Assistant"
      title="Vienna AI Assistant"
    >
      <img src="/vienna.svg" alt="" width={32} height={32} />
    </Link>
  );
}
