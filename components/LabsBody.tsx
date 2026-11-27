"use client";

import Image from "next/image";

// Badan halaman /labs: SENGAJA kosong — hanya logo di tengah layar
// tanpa navbar (Navbar dan AgentFab ikut disembunyikan untuk awalan
// /labs). Ini landing page calon subdomain lab.amamiya.web.id;
// isi sebenarnya menyusul (revisi user 27 Nov 2026, menggantikan
// indeks eksperimen dwibahasa yang sempat dibuat pagi harinya —
// kunci kamus labs.* di lib/dict.ts dipertahankan untuk isi nanti).
export default function LabsBody() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center">
      <Image
        src="/favicon.png"
        alt="Amamiya"
        width={200}
        height={200}
        priority
        className="h-auto w-[min(200px,50vw)]"
      />
    </main>
  );
}
