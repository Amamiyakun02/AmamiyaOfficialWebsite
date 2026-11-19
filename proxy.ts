import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pemisahan host produksi:
// - dashboard.amamiya.web.id hanya melayani dashboard.
// - www/amamiya.web.id tidak melayani /dashboard sama sekali (404).
// Host lain (localhost, preview *.vercel.app) tidak disentuh agar alur dev tetap normal.
const DASHBOARD_HOST = "dashboard.amamiya.web.id";
const PUBLIC_HOSTS = new Set(["amamiya.web.id", "www.amamiya.web.id"]);

// Selain /dashboard, host dashboard tetap butuh: aset Next (/_next),
// API backend lewat rewrites (/v1/*), favicon, avatar agent, dan CV
// yang ditaut komponen bersama. /vienna.svg ditambahkan 19 Nov 2026:
// tanpa baris ini avatar chat AI Agent di host dashboard kena rewrite
// ke /404 (HTML dibaca sebagai gambar → ikon gambar rusak), karena
// proxy ini ditulis sebelum berkas avatar itu ada.
function allowedOnDashboardHost(pathname: string): boolean {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/v1/") ||
    pathname === "/favicon.png" ||
    pathname === "/favicon.ico" ||
    pathname === "/vienna.svg" ||
    pathname === "/profesional-cv.pdf"
  );
}

function notFound(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/404";
  return NextResponse.rewrite(url);
}

export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const { pathname } = request.nextUrl;

  if (host === DASHBOARD_HOST) {
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    if (!allowedOnDashboardHost(pathname)) return notFound(request);
    return NextResponse.next();
  }

  if (PUBLIC_HOSTS.has(host)) {
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      return notFound(request);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
