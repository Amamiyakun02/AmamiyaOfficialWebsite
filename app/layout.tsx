import type { Metadata } from "next";
import "./globals.css";

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
