"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Maximize2, X } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";

/* =====================================================================
   IKON MENGAMBANG + QUICK CHAT VIENNA AI ASSISTANT.
   Awalnya (21 Nov 2026 pagi) tombol bulat berlogo vienna.svg ini
   tautan langsung ke /tools/assistant; sore harinya user meminta:
   tombol digeser sedikit ke kiri + diperbesar, dan kliknya membuka
   QUICK CHAT mengambang tepat di atas tombol (dengan chatbox),
   bukan pindah halaman.
   - Panel memakai ulang komponen AssistantChat apa adanya (sesi +
     riwayat localStorage yang SAMA dengan halaman penuh, jadi
     percakapan nyambung di kedua tempat). Komponen baru dimuat
     malas: hanya terpasang sesudah klik pertama, lalu tetap
     terpasang (disembunyikan CSS) supaya isi chat tidak hilang
     saat panel ditutup-buka. Pindah halaman menutup panel.
   - Header panel: avatar + nama, tombol halaman penuh, tombol
     tutup. Saat panel terbuka ikon tombol berubah jadi X.
   - Tampil di semua halaman publik; disembunyikan di dashboard
     (punya AI Agent sendiri) dan di halaman Assistant itu sendiri.
   ===================================================================== */
export default function AgentFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Komponen ini hidup di layout (tidak ikut terpasang ulang saat
  // pindah halaman) — tutup panel tiap kali rute berubah.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (
    !pathname ||
    pathname.startsWith("/dashboard") ||
    pathname === "/tools/assistant"
  )
    return null;

  const toggle = () => {
    setMounted(true);
    setOpen((v) => !v);
  };

  return (
    <>
      {mounted && (
        <section
          className={`agent-panel${open ? " is-open" : ""}`}
          aria-hidden={!open}
          aria-label="Quick chat Vienna AI Assistant"
        >
          <div className="agent-panel-head">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/vienna.svg"
              alt=""
              width={30}
              height={30}
              className="agent-panel-avatar"
            />
            <div className="agent-panel-title">
              <strong>Vienna AI Assistant</strong>
              <span>Asisten AI Amamiya</span>
            </div>
            <Link
              href="/tools/assistant"
              className="agent-panel-btn"
              aria-label="Buka halaman penuh Assistant"
              title="Halaman penuh"
            >
              <Maximize2 size={16} />
            </Link>
            <button
              type="button"
              className="agent-panel-btn"
              onClick={() => setOpen(false)}
              aria-label="Tutup quick chat"
              title="Tutup"
            >
              <X size={17} />
            </button>
          </div>
          <div className="agent-panel-body">
            <Suspense fallback={null}>
              <AssistantChat />
            </Suspense>
          </div>
        </section>
      )}
      <button
        type="button"
        className="agent-fab"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          open
            ? "Tutup quick chat Vienna"
            : "Buka quick chat Vienna AI Assistant"
        }
        title="Vienna AI Assistant"
      >
        {open ? (
          <X size={30} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src="/vienna.svg" alt="" width={38} height={38} />
        )}
      </button>
    </>
  );
}
