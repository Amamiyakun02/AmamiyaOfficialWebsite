// Gulir mulus ke section di halaman utama (permintaan user 31 Okt,
// meniru navigasi Contents di halaman Wonder: klik menu langsung
// mengantar ke lokasi section).
//
// Tantangannya: penggulir halaman ini adalah div .home-scroll (bukan
// window) dan section-section di bawah hero malas-render — tinggi
// halaman BERUBAH saat section ter-mount di tengah jalan, jadi tujuan
// yang dihitung sekali di awal bisa meleset. Karena itu setelah gulir
// mulus dimulai, posisi tujuan dihitung ulang berkala: begitu gulir
// berhenti tetapi posisi masih meleset, dilakukan koreksi instan.
// Berhenti saat posisi sudah tepat dua kali berturut-turut, dibatalkan
// oleh guliran manual user (roda/sentuh), atau lewat 3,5 detik.
export function scrollToSection(id: string) {
  const scroller = document.querySelector<HTMLElement>(".home-scroll");
  const el = document.getElementById(id);
  if (!scroller || !el) return;
  const OFFSET = id === "beranda" ? 0 : 70; // tinggi navbar + napas
  const desired = () =>
    id === "beranda"
      ? 0
      : scroller.scrollTop +
        el.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top -
        OFFSET;

  scroller.scrollTo({ top: desired(), behavior: "smooth" });

  let lastTop = scroller.scrollTop;
  let stable = 0;
  const started = performance.now();
  const timer = window.setInterval(() => {
    const moving = Math.abs(scroller.scrollTop - lastTop) > 1;
    lastTop = scroller.scrollTop;
    if (!moving) {
      const d = desired();
      if (Math.abs(d - scroller.scrollTop) <= 3) {
        stable += 1;
        if (stable >= 2) cancel();
      } else {
        stable = 0;
        scroller.scrollTo({ top: d, behavior: "auto" });
      }
    } else {
      stable = 0;
    }
    if (performance.now() - started > 3500) cancel();
  }, 160);
  function cancel() {
    window.clearInterval(timer);
    scroller?.removeEventListener("wheel", cancel);
    scroller?.removeEventListener("touchmove", cancel);
  }
  scroller.addEventListener("wheel", cancel, { passive: true });
  scroller.addEventListener("touchmove", cancel, { passive: true });
}
