"use client";

import { useEffect, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";

/* Kerangka modal formulir bersama untuk semua modul dashboard
   (ukuran sedang 640px). Lahir dari modal AI Providers 18 Nov,
   lalu digeneralisasi atas persetujuan user agar semua formulir
   dashboard konsisten.
   - Tutup lewat tombol X, klik latar, atau Escape.
   - Gulir kolom utama dikunci selama modal terbuka.
   - `footer` dirender DI DALAM <form>, jadi tombol submit di
     dalamnya tetap sah; isi footer umumnya pesan error + aksi. */
export default function FormModal({
  title,
  onClose,
  onSubmit,
  footer,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const main = document.querySelector<HTMLElement>(".dash-main");
    const prevOverflow = main?.style.overflow ?? "";
    if (main) main.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (main) main.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(4,4,6,0.66)] px-4 py-6 backdrop-blur-[3px]" onClick={onClose}>
      <div
        className="flex max-h-[calc(100dvh-48px)] w-[min(640px,100%)] flex-col rounded-2xl border border-[#22336A] bg-panel shadow-[0_24px_64px_rgba(0,0,0,0.55)] animate-[dash-modal-in_0.16s_ease] motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <h3 className="text-base font-bold text-paper">{title}</h3>
          <button
            type="button"
            className="ml-auto inline-flex h-[31px] w-[31px] flex-none cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-[#9DB1D9] hover:border-line hover:bg-[rgba(255,255,255,0.05)] hover:text-white"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={17} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-y-auto px-5 pt-4 pb-5">{children}</div>
          {footer && <div className="border-t border-line2 px-5 pt-3.5 pb-4">{footer}</div>}
        </form>
      </div>
    </div>
  );
}
