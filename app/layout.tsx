import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  title: "Amamiya — Background Grid Tipografi",
  description:
    "Website Next.js dengan background grid tipografi ala Muse Wonder: digambar sekali, glitch tipis, highlight mouse — tanpa loop 60fps.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
