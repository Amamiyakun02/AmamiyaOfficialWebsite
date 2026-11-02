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
  title: "Amamiya — Portfolio",
  description:
    "Amamiya's portfolio: AI, web & mobile apps, and automation tools. Built on an interactive typographic grid stage in the style of Muse Wonder.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
