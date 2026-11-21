import { NextResponse } from "next/server";

// Pintu undangan bot Discord Vienne (21 Nov 2026): Custom URL
// di Discord Developer Portal (Installation → Install Link)
// menunjuk ke alamat ini, lalu pengunjung diteruskan ke URL
// undangan OAuth2 Discord. Redirect sementara (307) agar
// perubahan izin bot kelak tidak terhalang cache permanen.
//
// Route handler dipakai — BUKAN redirects() di next.config.ts —
// karena Next menormalisasi destination konfigurasi dan %20
// pada query berubah menjadi spasi mentah di header Location
// (terukur pada build produksi 21 Nov 2026). Kontrak URL ini
// harus sama persis karakter demi karakter, jadi Location
// ditulis langsung lewat handler ini.
export const INVITE_URL =
  "https://discord.com/oauth2/authorize?client_id=1522199457800781974&scope=bot%20applications.commands&permissions=1101930785878";

export function GET() {
  return NextResponse.redirect(INVITE_URL, 307);
}
