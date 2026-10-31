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
// Berhenti hanya setelah posisi tepat DAN stabil ±1 detik (chunk
// section yang telat termuat bisa menggeser posisi sesudah koreksi
// pertama — terukur meleset ±35px saat jendela penjagaan terlalu
// pendek), dibatalkan oleh guliran manual user (roda/sentuh/tombol),
// atau lewat 8 detik.
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
  let lastHeight = scroller.scrollHeight;
  let stable = 0;
  const started = performance.now();
  const timer = window.setInterval(() => {
    const moving = Math.abs(scroller.scrollTop - lastTop) > 1;
    lastTop = scroller.scrollTop;
    // Halaman masih berubah (section ter-mount) = belum stabil,
    // walau posisi sesaat sudah tepat: pertumbuhan sesudahnya akan
    // menggeser titik akhir (kasus tiba lewat hash dari halaman tool).
    const grew = scroller.scrollHeight !== lastHeight;
    lastHeight = scroller.scrollHeight;
    if (!moving && !grew) {
      const d = desired();
      const maxScroll = scroller.scrollHeight - scroller.clientHeight;
      if (Math.abs(d - scroller.scrollTop) <= 3) {
        stable += 1;
        if (stable >= 6) cancel();
      } else if (
        d > maxScroll + 3 &&
        Math.abs(scroller.scrollTop - maxScroll) <= 1
      ) {
        // Tujuan di luar jangkauan fisik (section terakhir): halaman
        // memang habis, section sudah semaksimal mungkin di atas —
        // anggap menetap, jangan koreksi sia-sia.
        stable += 1;
        if (stable >= 3) cancel();
      } else {
        stable = 0;
        scroller.scrollTo({ top: d, behavior: "auto" });
      }
    } else {
      stable = 0;
    }
    if (performance.now() - started > 8000) cancel();
  }, 160);
  function cancel() {
    window.clearInterval(timer);
    scroller?.removeEventListener("wheel", cancel);
    scroller?.removeEventListener("touchmove", cancel);
    window.removeEventListener("keydown", onKey);
  }
  function onKey(e: KeyboardEvent) {
    if (
      ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(
        e.key,
      )
    ) {
      cancel();
    }
  }
  scroller.addEventListener("wheel", cancel, { passive: true });
  scroller.addEventListener("touchmove", cancel, { passive: true });
  window.addEventListener("keydown", onKey);
}
