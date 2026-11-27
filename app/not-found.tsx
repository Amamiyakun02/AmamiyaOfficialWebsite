import type { Metadata } from "next";
import NotFoundBody from "@/components/NotFoundBody";

/* Halaman 404 kustom (ditambahkan 18 Nov 2026, hasil audit error
   handling pra-push): menggantikan 404 bawaan Next.js yang generik
   & berbahasa Inggris. Bahasa halaman mengikuti aturan situs:
   isi Bahasa Indonesia. Juga melayani 404 dari isolasi host
   (mis. /dashboard di domain utama). */

export const metadata: Metadata = {
  title: "404 — Page not found | Amamiya",
};

export default function NotFound() {
  return <NotFoundBody />;
}
