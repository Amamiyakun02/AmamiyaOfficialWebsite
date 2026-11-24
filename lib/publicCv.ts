import { apiUrl } from "@/lib/api";

/* URL CV publik dari dashboard (Modul Media, backend 24 Nov 2026):
   GET /v1/site/cv -> {url: string | null}. Berkasnya tinggal di
   Supabase Storage; backend hanya menyimpan URL-nya.
   null berarti CV belum diatur ATAU backend tidak terjangkau —
   dalam kedua kasus itu tombol "Unduh CV" disembunyikan. */
export async function fetchPublicCvUrl(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl("/v1/site/cv"), { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { url?: string | null };
    return typeof data.url === "string" && data.url ? data.url : null;
  } catch {
    return null;
  }
}
