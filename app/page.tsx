import WonderScene from "@/components/WonderScene";

/* Format halaman mengikuti gaya blog Muse Wonder: nav gelap di atas
   hero grid karakter, lalu badan artikel terang satu kolom dengan
   section-section berjudul, dan footer gelap. Isi adalah definisi
   sistem versi rombak ulang (30 Okt) — kata-kata sendiri. */
export default function Home() {
  return (
    <>
      <WonderScene />

      <main className="article">
        <section id="tentang" className="section">
          <p className="lede">
            Amamiya adalah latar tipografi hidup: sebuah bidang karakter
            yang tidak pernah benar-benar diam. Huruf-hurufnya sesekali
            berubah menjadi pusaran galaksi, tersapu kata-kata asing,
            terbakar mengikuti kursor, lalu kembali seperti tidak terjadi
            apa-apa. Halaman ini mendefinisikan ulang seluruh sistemnya —
            grid, cell, dan katalog glitch-nya — mengikuti gaya Muse
            Wonder, dengan satu pengecualian yang disengaja: di sini
            bintangnya adalah spiral.
          </p>
        </section>

        <section id="spiral" className="section">
          <h2>Efek spiral — aspek utama</h2>
          <p>
            Satu karakter di tengah grid berhenti menjadi huruf. Ia
            berkedip glitch sekejap, lalu mekar menjadi galaksi vertikal:
            delapan lengan logaritmik tipis yang memutar keluar dari inti
            terang, bertahan sekitar satu detik, menguncup dengan putaran
            berlawanan, dan mengembalikan hurufnya seperti semula.
          </p>
          <p>
            Galaksinya sengaja tegak — memanjang ke atas dan ke bawah
            mengikuti bentuk slot huruf — dan massa lengannya diredupkan
            saat mengarah ke kiri-kanan layar, jadi pusarannya terbaca
            sebagai kolom cahaya, bukan cakram. Spiral muncul sendiri
            tiap ±0,7 detik di titik acak, paling banyak tujuh bersamaan,
            dan tidak pernah bersebelahan: ia langka, jadi tiap kemunculan
            terasa seperti kejadian, bukan pola.
          </p>
          <ul className="spec-list">
            <li>
              <strong>Bentuk:</strong> 8 lengan logaritmik, elips vertikal
              0,8 × 1,55, radius luar ±9 px dari pusat karakter.
            </li>
            <li>
              <strong>Fase:</strong> glitch 150 ms → tumbuh 500 ms →
              bertahan 0,8–1,5 detik → menguncup 550 ms → glitch →
              kembali.
            </li>
            <li>
              <strong>Prioritas:</strong> cell yang sedang ber-spiral
              tidak disentuh efek lain, dan spiral tidak merebut cell
              yang sedang menyala.
            </li>
          </ul>
        </section>

        <section id="grid" className="section">
          <h2>Grid &amp; cell</h2>
          <p>
            <strong>Grid</strong> adalah bidang karakternya: teks pola{" "}
            <code>AMAMIYA&nbsp;</code> — kata plus satu spasi — diulang
            tanpa putus di setiap baris memenuhi hero, di atas latar
            nyaris hitam <code>#0a0a0b</code>. Di tengahnya ada lubang
            bersudut membulat tempat judul berdiri; karakter di dalam
            lubang tidak pernah digambar.
          </p>
          <p>
            <strong>Cell</strong> adalah satu karakter — bukan satu kata.
            Setiap cell punya posisi, karakter polanya, opasitas dasar
            yang sedikit acak (0,30–0,45), dan keadaan efeknya sendiri.
            Karena satuan terkecilnya karakter, sebuah tambalan glitch
            bisa memotong kata di tengah dan menyeberang ke kata
            berikutnya, persis seperti grid karakter di halaman aslinya.
          </p>
        </section>

        <section id="glitch" className="section">
          <h2>Katalog glitch</h2>
          <p>
            Lima item, masing-masing dengan pemicu dan masa hidupnya
            sendiri. Semua masa hidup dihitung sebagai tenggat waktu,
            bukan hitungan tick — jadi efek selalu berakhir tepat waktu
            bagaimanapun browser memperlambat timer.
          </p>
          <div className="cards">
            <article className="card">
              <h3>1 · Spiral</h3>
              <p>
                Aspek utama (lihat di atas). Otomatis tiap ±0,7 detik,
                maks 7 bersamaan, total ±2,2–2,9 detik per kejadian.
              </p>
            </article>
            <article className="card">
              <h3>2 · Heat kursor</h3>
              <p>
                Karakter di sekitar kursor berubah jadi blok dither{" "}
                <code>░ ▒ ▓ █</code>: tambalan ±6 huruf ke samping × ±3
                baris, makin dekat makin padat dan terang. Sekali saja
                per lintasan — karakter yang sudah menyala tidak menyala
                lagi sampai kursor pergi — lalu jejaknya memudar dan
                kembali jadi huruf.
              </p>
            </article>
            <article className="card">
              <h3>3 · Kata sisipan</h3>
              <p>
                Kata <code>DEV</code>, <code>BUILD</code>, dan{" "}
                <code>CODE</code> menimpa run karakter pola, muncul
                berjenjang mengikuti arah diagonal dari sudut acak,
                tampil lebih terang ±1,7–3,6 detik, lalu reda.
              </p>
            </article>
            <article className="card">
              <h3>4 · Substitusi</h3>
              <p>
                Karakter acak sesekali berganti glyph lain — huruf lain,
                kadang angka atau simbol — selama ±0,3–0,5 detik, seperti
                salah ketik sesaat di grid aslinya.
              </p>
            </article>
            <article className="card">
              <h3>5 · Scramble</h3>
              <p>
                Beberapa karakter berputar huruf acak dengan cepat selama
                ±0,3–0,5 detik sebelum menetap kembali ke karakter
                polanya.
              </p>
            </article>
          </div>
        </section>

        <section id="performa" className="section">
          <h2>Performa</h2>
          <p>
            Background interaktif biasanya berat karena menggambar ulang
            seluruh layar 60 kali per detik pada resolusi retina penuh.
            Sistem ini menghindari keempatnya: grid digambar sekali saat
            load dan resize; sesudahnya hanya cell yang berubah yang
            digambar ulang. DPR canvas dikunci 1, loop animasi hanya
            hidup selama ada efek yang berjalan, ticker efek berjalan
            lambat (120 ms), dan semuanya berhenti saat tab tidak
            terlihat. <code>prefers-reduced-motion</code> dihormati:
            grid tampil statis tanpa efek.
          </p>
          <p>
            Buktinya bisa dilihat sendiri — nyalakan tombol{" "}
            <strong>Debug</strong> di kiri bawah hero dan bandingkan
            angka “karakter digambar/detik” dengan total cell di layar.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="brand">
              <span className="brand-mark">∞</span> Amamiya
            </span>
            <p>Latar tipografi interaktif — Next.js + Canvas 2D.</p>
          </div>
          <nav className="footer-col">
            <h4>Navigasi</h4>
            <a href="#spiral">Efek Spiral</a>
            <a href="#grid">Grid &amp; Cell</a>
            <a href="#glitch">Katalog Glitch</a>
            <a href="#performa">Performa</a>
          </nav>
          <nav className="footer-col">
            <h4>Item glitch</h4>
            <a href="#glitch">Spiral</a>
            <a href="#glitch">Heat Kursor</a>
            <a href="#glitch">Kata Sisipan</a>
            <a href="#glitch">Substitusi &amp; Scramble</a>
          </nav>
        </div>
        <p className="footer-copy">© 2026 Amamiya — dibangun sebagai studi atas Muse Wonder.</p>
      </footer>
    </>
  );
}
