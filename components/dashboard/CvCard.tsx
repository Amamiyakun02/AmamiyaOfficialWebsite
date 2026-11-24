"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { apiUrl } from "@/lib/api";
import { ERR, FIELD_INPUT } from "./ui";
import { uploadMedia } from "./media";

/* Kartu pengatur CV di Overview (Modul Media, 24 Nov 2026).
   URL CV aktif tinggal di backend (GET/PUT /v1/dashboard/site/cv);
   berkasnya di Supabase Storage. Tombol "Unduh CV" di navbar situs
   membaca GET /v1/site/cv — URL kosong = tombol disembunyikan. */
export default function CvCard() {
  const [current, setCurrent] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const token = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("dashboard_token") || ""
      : "";

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/v1/dashboard/site/cv"), {
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as { url: string | null };
      setCurrent(data.url ?? null);
      setInput(data.url ?? "");
    } catch {
      setError("Gagal memuat URL CV saat ini.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function put(url: string | null) {
    const res = await fetch(apiUrl("/v1/dashboard/site/cv"), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": token(),
      },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      if (res.status === 422)
        throw new Error(
          "URL tidak valid — gunakan URL lengkap berawalan http:// atau https://.",
        );
      if (res.status === 401)
        throw new Error(
          "Token dashboard tidak valid atau sesi berakhir — masuk lagi ke dashboard.",
        );
      throw new Error(`Gagal menyimpan (${res.status}).`);
    }
    const data = (await res.json()) as { url: string | null };
    setCurrent(data.url ?? null);
    setInput(data.url ?? "");
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await put(input.trim() ? input.trim() : null);
      setNotice("URL CV tersimpan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await put(null);
      setNotice("CV dikosongkan — tombol Unduh CV di situs disembunyikan.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengosongkan.");
    } finally {
      setBusy(false);
    }
  }

  async function onPick(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await uploadMedia(file);
      await put(r.url);
      setNotice(`CV "${r.name}" terunggah dan langsung aktif.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unggahan gagal.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="mb-3 rounded-[14px] border border-[#26262c] bg-[linear-gradient(180deg,#131318,#0e0e11)] px-[18px] py-4">
      <h3 className="mb-2 flex items-center gap-2 text-[13px] font-bold tracking-[0.02em] text-[#f2f2f4]">
        <FileText size={15} className="text-[#8ab6ff]" />
        CV Situs
      </h3>
      {!loaded ? (
        <p className="text-[13px] leading-[1.55] text-[#8b8b93]">
          Memuat URL CV…
        </p>
      ) : current ? (
        <p className="m-0 text-[13px] leading-[1.55] text-[#8b8b93]">
          Aktif:{" "}
          <a
            href={current}
            target="_blank"
            rel="noreferrer"
            className="break-all text-[#58a6ff] no-underline hover:underline"
          >
            {current}
          </a>
        </p>
      ) : (
        <p className="m-0 text-[13px] leading-[1.55] text-[#8b8b93]">
          Belum diatur — tombol Unduh CV di situs sedang disembunyikan.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="min-w-[220px] flex-1">
          <input
            className={FIELD_INPUT}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1000}
            placeholder="Tempel URL CV (https://…) atau unggah PDF"
            aria-label="URL CV"
          />
        </span>
        <button
          type="button"
          className="cursor-pointer rounded-lg border-none bg-accent px-4 py-[9px] text-sm font-semibold text-white hover:bg-[#1a8dff] disabled:cursor-default disabled:opacity-60"
          disabled={busy || !loaded}
          onClick={() => void save()}
        >
          {busy ? "Menyimpan…" : "Simpan"}
        </button>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-line bg-[rgba(16,16,19,0.7)] px-3.5 py-2 text-[13px] text-[#c9c9cf] hover:border-steel hover:text-white disabled:cursor-default disabled:opacity-60"
          disabled={busy || !loaded || (!current && !input)}
          onClick={() => void clear()}
        >
          Kosongkan
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-line bg-[rgba(16,16,19,0.7)] px-3.5 py-2 text-[13px] text-[#c9c9cf] hover:border-steel hover:text-white disabled:cursor-default disabled:opacity-60"
          disabled={busy || !loaded}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Mengunggah…" : "Unggah PDF"}
        </button>
        <span className="text-xs text-fog">
          PDF maks 10 MB — berkas tersimpan di Supabase Storage, yang
          disimpan di sini hanya URL-nya.
        </span>
      </div>

      {error && <p className={`${ERR} m-0 mt-2.5`}>{error}</p>}
      {notice && (
        <p className="m-0 mt-2.5 text-[13px] text-[#7bc47f]">{notice}</p>
      )}
    </div>
  );
}
