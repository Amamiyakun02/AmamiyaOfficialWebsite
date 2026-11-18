"use client";

import WonderScene from "./WonderScene";
import DashboardLoginForm from "./DashboardLoginForm";

/* Halaman login dashboard: grid entrance halaman utama sebagai
   latar, tetapi blok tengahnya HANYA form login tepat di tengah
   panggung (loginMode) — tanpa kata besar AMAMIYA dan tanpa cip
   efek kosmis (permintaan user 18 Nov; mode-nya sendiri sudah
   disiapkan di WonderScene sejak 5 Nov). Bungkus
   .hero-wrap.login-wrap membuat panggung setinggi layar penuh di
   semua ukuran. */
export default function DashboardLoginStage() {
  return (
    <div className="login-scroll">
      <div className="hero-wrap login-wrap">
        <WonderScene belowChips={<DashboardLoginForm />} loginMode />
      </div>
    </div>
  );
}
