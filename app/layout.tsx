import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AgentFab from "@/components/AgentFab";
import { LanguageProvider } from "@/lib/i18n";

// WAJIB untuk tampilan mobile yang benar: tanpa viewport ini browser HP
// merender halaman pada lebar virtual ±980px lalu memperkecilnya paksa —
// grid, navbar, dan card jadi tampak seperti desktop yang dikerdilkan
// (terbukti dari screenshot HP user 31 Okt). Dengan ini lebar layout =
// lebar asli perangkat dan media query + kolom adaptif bekerja.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  // Metadata statis berbahasa Inggris sejak 27 Nov 2026 (branding
  // internasional; bahasa bawaan situs kini Inggris, lihat lib/dict.ts).
  title: "Amamiya | Portfolio",
  description:
    "Amamiya's portfolio: AI, web & mobile apps, and automation tools. Built on an interactive typographic grid stage in the style of Muse Wonder.",
  // Ikon aplikasi: logo monogram "AM" dari user (public/favicon.png,
  // ditambahkan user 2 Nov 2026 menggantikan tawaran ikon ∞ yang lama).
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <div className="flex h-dvh flex-col">
            <Navbar />
            {children}
            <AgentFab />
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
