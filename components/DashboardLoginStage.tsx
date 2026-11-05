"use client";

import WonderScene from "./WonderScene";
import DashboardLoginForm from "./DashboardLoginForm";

/* Halaman login dashboard (permintaan user 5 Nov): panggung entrance
   halaman utama DIPAKAI APA ADANYA (grid AMAMIYA + judul + cip +
   panel kontrol), satu-satunya perbedaan adalah form login di tengah
   menggantikan baris tombol CTA. Bungkus .hero-wrap.login-wrap membuat
   panggung setinggi layar penuh di semua ukuran (di beranda tablet/
   ponsel panggung memang dipendekkan; halaman login tidak punya isi
   di bawahnya, jadi penuh lebih tepat). */
export default function DashboardLoginStage() {
  return (
    <div className="login-scroll">
      <div className="hero-wrap login-wrap">
        <WonderScene loginMode belowChips={<DashboardLoginForm />} />
      </div>
    </div>
  );
}
