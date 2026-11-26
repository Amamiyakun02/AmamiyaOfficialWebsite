"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/* Section malas-render (permintaan user 31 Okt: "rendering per section,
   jangan render semua dalam 1 page penuh untuk menghindari lag"):
   section hanya berupa placeholder setinggi perkiraan sampai posisinya
   mendekati viewport (rootMargin 500px), lalu isinya di-mount — dan
   tetap ter-mount sesudahnya agar state di dalamnya (filter, formulir)
   tidak hilang saat user scroll naik-turun. */
export default function LazySection({
  id,
  minHeight,
  children,
}: {
  id: string;
  minHeight: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={`relative scroll-mt-[70px]${
        id === "projects" ? "" : " border-t border-[#0D1E52]"
      }`}
      style={on ? undefined : { minHeight }}
    >
      {on ? (
        children
      ) : (
        <div
          className="absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          <span className="lz-pulse" />
        </div>
      )}
    </section>
  );
}
