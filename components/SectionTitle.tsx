"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Judul section dengan animasi tampil seperti header section di
// halaman Wonder (permintaan user 31 Okt, dari video referensi Meta):
// saat judul masuk layar, tiap huruf TERMATERIALISASI — matriks titik
// -> balok dua nada -> karakter — berjenjang dari kiri, memakai lapisan
// dan keyframes yang sama persis dengan intro judul hero AMAMIYA
// (.t-dots/.t-block/.t-char + tDots/tBlock/tCharIn). Bedanya dari hero:
// lebar huruf ALAMI (font section bukan Archivo Black rata-slot) dan
// animasi dipicu IntersectionObserver, sekali saja per judul.
// Judul berganti (studi kasus) memutar ulang animasinya bila judul
// sudah pernah tampil. prefers-reduced-motion: langsung utuh.
type Phase = "pre" | "play" | "done" | "instant";

export default function SectionTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement | null>(null);
  const [phase, setPhase] = useState<Phase>("pre");
  const phaseRef = useRef<Phase>("pre");
  phaseRef.current = phase;
  const firstTextRef = useRef(text);

  // Jenjang per huruf: judul panjang dipercepat agar total durasi
  // tetap wajar (hero 85ms untuk 7 huruf).
  const stagger = text.length > 12 ? 45 : 85;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhase("instant");
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          setPhase((p) => (p === "pre" ? "play" : p));
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    // Pengaman (pola yang sama dengan intro hero): bila judul sudah
    // berada di layar tetapi IO entah bagaimana tidak menembak,
    // jangan biarkan judul kosong selamanya.
    const t = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        setPhase((p) => (p === "pre" ? "play" : p));
      }
    }, 3500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  // Setelah animasi tuntas, pindah ke fase done (animasi dilepas).
  useEffect(() => {
    if (phase !== "play") return;
    const total = 620 + text.length * stagger + 150;
    const t = window.setTimeout(() => setPhase("done"), total);
    return () => window.clearTimeout(t);
  }, [phase, text, stagger]);

  // Judul berganti (judul studi kasus mengikuti proyek terpilih):
  // putar ulang bila judul lama sudah pernah tampil.
  useEffect(() => {
    if (firstTextRef.current === text) return;
    firstTextRef.current = text;
    setPhase(phaseRef.current === "instant" ? "instant" : "play");
  }, [text]);

  let idx = 0;
  const words = text.split(" ");
  return (
    <h2
      ref={ref}
      className={`page-title st-title st-${phase}`}
      style={{ "--sd": `${stagger}ms` } as CSSProperties}
      aria-label={text}
    >
      <span aria-hidden="true">
        {words.map((word, wi) => (
          <span key={wi} className="st-word">
            {word.split("").map((ch, ci) => {
              const i = idx++;
              return (
                <span
                  key={ci}
                  className="st-letter"
                  style={{ "--i": i } as CSSProperties}
                >
                  <span className="t-dots" aria-hidden="true" />
                  <span className="t-block" aria-hidden="true" />
                  <span className="t-char">{ch}</span>
                </span>
              );
            })}
            {wi < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </h2>
  );
}
