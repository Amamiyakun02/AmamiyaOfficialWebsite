// Helper URL backend Vienna Agent.
//
// Strategi (2 Nov 2026): secara default panggilan API bersifat SEASAL
// (relatif, diawali "/v1/...") — server Next meneruskannya ke backend
// lokal lewat rewrites di next.config.ts. Dengan begitu situs bekerja
// dari alamat mana pun: localhost, URL tunnel trycloudflare, atau
// domain publik, selama backend berjalan di mesin yang sama dengan
// server Next. Untuk menunjuk backend lain (mis. hosting terpisah),
// set NEXT_PUBLIC_API_URL saat build.
export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl.replace(/\/$/, "");
  return "";
};

export const apiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

export const REMOVE_BG_ENDPOINT =
  process.env.NEXT_PUBLIC_REMOVE_BG_URL ||
  "https://amamiya-kun-removebg.hf.space/upload";
