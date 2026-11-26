"use client";

import { useRef, useState } from "react";
import { ERR, FIELD_INPUT } from "./ui";
import { IMAGE_ACCEPT, uploadMedia } from "./media";

/* Field URL media untuk form dashboard: URL bisa ditempel manual
   (termasuk URL luar) ATAU diisi lewat unggahan berkas ke Modul
   Media — hasil unggahan mengisi field yang sama. Pratinjau kecil
   tampil saat URL terisi; tombol Hapus mengosongkannya. */
export default function MediaField({
  label,
  value,
  onChange,
  accept = IMAGE_ACCEPT,
  pdf = false,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  pdf?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const r = await uploadMedia(file);
      onChange(r.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unggahan gagal.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1">
      <span className="text-xs font-semibold tracking-[0.03em] text-fog">
        {label}
      </span>
      <span className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <input
            className={FIELD_INPUT}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            maxLength={1000}
            placeholder="https://…"
          />
        </span>
        {value && (
          <button
            type="button"
            className="flex-none cursor-pointer rounded-lg border border-line bg-[rgba(10,24,71,0.7)] px-3 py-2 text-[13px] text-[#AFC2E6] hover:border-steel hover:text-white"
            onClick={() => onChange("")}
          >
            Hapus
          </button>
        )}
      </span>
      <span className="flex flex-wrap items-center gap-2.5">
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-line bg-[rgba(10,24,71,0.7)] px-3.5 py-2 text-[13px] text-[#AFC2E6] hover:border-steel hover:text-white disabled:cursor-default disabled:opacity-60"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Mengunggah…" : pdf ? "Unggah PDF" : "Unggah gambar"}
        </button>
        <span className="text-xs text-fog">
          {pdf ? "PDF maks 10 MB" : "PNG/JPG/WebP/SVG/GIF maks 5 MB"}
        </span>
      </span>
      {error && <p className={`${ERR} m-0`}>{error}</p>}
      {value &&
        (pdf ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] text-[#00BBA2] no-underline hover:underline"
          >
            Lihat berkas terunggah
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="mt-1 h-16 w-auto max-w-full rounded-[8px] border border-line object-contain"
            src={value}
            alt=""
            loading="lazy"
          />
        ))}
    </div>
  );
}
