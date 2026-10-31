import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Situs kini SATU halaman per section — alamat lama dari struktur
  // multi-halaman (tahap 1) diarahkan ke jangkar section yang setara.
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
