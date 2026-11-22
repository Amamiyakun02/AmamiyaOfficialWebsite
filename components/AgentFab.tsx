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
   - QUICK PROMPT HOVER (21 Nov, permintaan user): HANYA saat
     kursor mouse melayang di atas tombol, 3 chip prompt cepat
     muncul di atasnya; klik chip membuka panel dan langsung
     mengirim prompt itu lewat prop quickPrompt AssistantChat.
     (Pemicu fokus keyboard dibuang atas koreksi user: chip jadi
     tertahan tampil sesudah tombol diklik.)
   ===================================================================== */

// Tiga prompt cepat hover — warisan bar QuickPrompt lama di
// section Tools (dihapus 21 Nov 2026 atas keputusan user karena
// fungsinya tergantikan quick chat ini): promptnya yang
// berorientasi pengunjung portofolio dipindah ke sini.
const QUICK_PROMPTS: string[] = [
  "Ceritakan keahlian Amamiya",
  "Tampilkan proyek terbarunya",
  "Bagaimana cara menghubunginya?",
];

export default function AgentFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [qp, setQp] = useState<{ text: string; n: number } | null>(null);
  // Chip quick prompt terlihat saat kursor melayang di pembungkus
  // (state, bukan CSS :hover murni — supaya pasti dan teruji).
  const [peek, setPeek] = useState(false);

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
    // Menutup panel juga menyembunyikan chip sampai kursor keluar-
    // masuk lagi (di layar sentuh tidak ada mouseleave alami).
    if (open) setPeek(false);
    setOpen((v) => !v);
  };

  const pickPrompt = (text: string) => {
    setMounted(true);
    setOpen(true);
    setQp({ text, n: Date.now() });
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
              <AssistantChat quickPrompt={qp} embedded />
            </Suspense>
          </div>
        </section>
      )}
      <div
        className={`agent-fab-wrap${peek ? " is-peek" : ""}`}
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
      >
        {!open && (
          <div className="agent-qps" aria-label="Prompt cepat Vienna">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="agent-qp"
                onClick={() => pickPrompt(p)}
              >
                {p}
              </button>
            ))}
          </div>
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
      </div>
    </>
  );
}
