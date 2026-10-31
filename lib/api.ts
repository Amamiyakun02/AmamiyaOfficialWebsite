// Helper URL backend Vienna Agent — dipindah dari WebPortofolio lama
// (src/utils/api.ts), disesuaikan ke env Next.js.
const LOCAL_API_URL = "http://127.0.0.1:8000";
const PROD_API_URL = "https://myagentic-apps.fastapicloud.dev";

export const isLocalHost = (): boolean => {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
};

export const getApiBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) return envUrl.replace(/\/$/, "");
  return isLocalHost() ? LOCAL_API_URL : PROD_API_URL;
};

export const apiUrl = (path: string): string => {
  const base = getApiBaseUrl();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
};

export const REMOVE_BG_ENDPOINT =
  process.env.NEXT_PUBLIC_REMOVE_BG_URL ||
  "https://amamiya-kun-removebg.hf.space/upload";
