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
    <div className="dash-modal-overlay" onClick={onClose}>
      <div
        className="dash-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-modal-head">
          <h3>{title}</h3>
          <button
            type="button"
            className="dash-icon-btn"
            onClick={onClose}
            aria-label="Tutup"
          >
            <X size={17} />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="dash-modal-body">{children}</div>
          {footer && <div className="dash-modal-foot">{footer}</div>}
        </form>
      </div>
    </div>
  );
}
