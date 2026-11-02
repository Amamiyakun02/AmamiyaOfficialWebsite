import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Situs kini SATU halaman per section — alamat lama dari struktur
  // multi-halaman (tahap 1) diarahkan ke jangkar section yang setara.
  // API backend Vienna Agent diteruskan ke backend lokal (default
  // 127.0.0.1:8000; ganti lewat env BACKEND_ORIGIN saat start) agar
  // situs yang dibuka dari alamat mana pun (localhost / tunnel /
  // domain) selalu seasal dan menjangkau backend di mesin yang sama.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN || "http://127.0.0.1:8000";
    return [{ source: "/v1/:path*", destination: `${backend}/v1/:path*` }];
  },
  async redirects() {
    return [
      { source: "/projects", destination: "/#proyek", permanent: false },
      { source: "/projects/:id", destination: "/#proyek", permanent: false },
      { source: "/tools", destination: "/#tools", permanent: false },
      { source: "/about", destination: "/#tentang", permanent: false },
      { source: "/contact", destination: "/#kontak", permanent: false },
    ];
  },
};

export default nextConfig;
