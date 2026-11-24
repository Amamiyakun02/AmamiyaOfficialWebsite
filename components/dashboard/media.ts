import { apiUrl } from "@/lib/api";

/* Modul Media (backend 24 Nov 2026): unggah berkas ke Supabase
   Storage lewat POST /v1/dashboard/media/upload (X-Admin-Token).
   File tinggal di bucket publik; yang disimpan dashboard hanya
   URL-nya. Respons 200: {url, name, size, mime}.
   Batas backend: gambar maks 5 MB, PDF maks 10 MB. */

export type MediaUploadResult = {
  url: string;
  name: string;
  size: number;
  mime: string;
};

export const IMAGE_ACCEPT =
  "image/png,image/jpeg,image/webp,image/svg+xml,image/gif";

const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_PDF = 10 * 1024 * 1024;

function token(): string {
  return typeof window !== "undefined"
    ? localStorage.getItem("dashboard_token") || ""
    : "";
}

/** Pesan Bahasa Indonesia per status kegagalan unggahan. */
export function mediaErrorMessage(status: number, detail?: string): string {
  switch (status) {
    case 401:
      return "Token dashboard tidak valid atau sesi berakhir — masuk lagi ke dashboard, lalu coba lagi.";
    case 413:
      return "Berkas terlalu besar — gambar maksimal 5 MB, PDF maksimal 10 MB.";
    case 422:
      return (
        detail ||
        "Tipe berkas tidak didukung — gunakan gambar PNG, JPG, WebP, SVG, GIF, atau PDF."
      );
    case 502:
      return "Penyimpanan media sedang bermasalah — coba lagi beberapa saat lagi.";
    default:
      return detail || `Unggahan gagal (${status}).`;
  }
}

/** Unggah satu berkas; melempar Error berpesan Bahasa Indonesia. */
export async function uploadMedia(file: File): Promise<MediaUploadResult> {
  const isPdf = file.type === "application/pdf";
  if (!isPdf && !IMAGE_TYPES.includes(file.type)) {
    throw new Error(mediaErrorMessage(422));
  }
  if (file.size > (isPdf ? MAX_PDF : MAX_IMAGE)) {
    throw new Error(mediaErrorMessage(413));
  }
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch(apiUrl("/v1/dashboard/media/upload"), {
      method: "POST",
      headers: { "X-Admin-Token": token() },
      body,
    });
  } catch {
    throw new Error(
      "Tidak bisa menghubungi server — periksa koneksi lalu coba lagi.",
    );
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { detail?: unknown };
    throw new Error(
      mediaErrorMessage(
        res.status,
        typeof data.detail === "string" ? data.detail : undefined,
      ),
    );
  }
  return (await res.json()) as MediaUploadResult;
}
