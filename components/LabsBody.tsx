"use client";

import Image from "next/image";

// Badan halaman /labs: landing kosong calon subdomain lab —
// logo berdampingan kata AMAMIYA LABS. Tanpa navbar: Navbar dan
// AgentFab ikut disembunyikan untuk awalan /labs.
//
// Ukuran dikunci ke emblem visual favicon.png (terukur dari file:
// pada kotak 200px emblemnya 184x160px, margin 8/20px):
// - font AMAMIYA = SETENGAH tinggi emblem (aturan user 27 Nov:
//   tinggi logo = 2x font) -> 80px pada emblem 160px.
// - Kolom teks setinggi emblem persis: AMAMIYA menempel elemen
//   segitiga atas, LABS menempel elemen bawah (justify-between).
// Semua ukuran dalam em terhadap font AMAMIYA (1em = 80px di
// desktop) supaya rasio terkunci di semua lebar layar:
// emblem 2.3em x 2em, gambar 2.5em digeser -0.1em/-0.25em.
export default function LabsBody() {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center px-5">
      <div
        className="flex items-center"
        style={{ fontSize: "clamp(30px, 8.9vw, 80px)" }}
      >
        <div className="relative h-[2em] w-[2.3em] flex-none">
          <Image
            src="/favicon.png"
            alt="Amamiya"
            width={200}
            height={200}
            priority
            className="absolute -top-[0.25em] -left-[0.1em] h-[2.5em] w-[2.5em] max-w-none"
          />
        </div>
        <div className="ml-[0.2em] flex h-[2em] flex-col justify-between">
          <p className="m-0 text-[1em] leading-none font-extrabold tracking-[0.08em] text-paper">
            AMAMIYA
          </p>
          <p className="m-0 text-[0.35em] leading-none font-bold tracking-[0.42em] text-accent2">
            LABS
          </p>
        </div>
      </div>
    </main>
  );
}
