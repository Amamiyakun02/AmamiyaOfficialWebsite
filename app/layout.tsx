import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
  title: "Amamiya — Portofolio",
  description:
    "Portofolio Amamiya: aplikasi AI, web & mobile, dan alat otomatisasi. Dibangun di atas panggung grid tipografi interaktif ala Muse Wonder.",
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
    <html lang="id">
      <body>
        <div className="app">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
