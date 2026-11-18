import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // WAJIB false (18 Nov 2026): kompresi bawaan server Next menahan
  // (buffer) respons streaming SSE dari proksi /v1/* selama klien
  // menegosiasikan gzip — semua browser melakukannya — sehingga
  // aliran chat Assistant (terutama jeda tunggu HITL yang hanya
  // berisi heartbeat) tidak pernah tiba sampai respons berakhir.
  // Terbukti: curl Accept-Encoding gzip lewat :3200 diam total,
  // identity mengalir normal. Di Vercel kompresi HTML ditangani
  // edge platform, jadi mematikan ini tidak merugikan produksi.
  compress: false,
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
      { source: "/tools", destination: "/#tools", permanent: false },
      { source: "/about", destination: "/#tentang", permanent: false },
      { source: "/contact", destination: "/#kontak", permanent: false },
    ];
  },
};

export default nextConfig;
