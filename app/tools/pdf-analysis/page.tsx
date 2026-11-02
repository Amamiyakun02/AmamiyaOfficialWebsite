import type { Metadata } from "next";
import PdfAnalysis from "@/components/PdfAnalysis";

export const metadata: Metadata = {
  title: "PDF Analysis | Amamiya",
  description:
    "Bedah dokumen PDF: deteksi halaman berwarna vs grayscale per halaman, metadata dokumen, dan ekstrak halaman menjadi PDF baru.",
};

// Halaman tool keempat yang dipindah dari WebPortofolio lama (Tahap 2).
// Kontrak backend Vienna_Agent (routers/pdf_api.py):
//   POST /v1/pdf/check-color?threshold=N (multipart file) -> analisis warna
//   POST /v1/pdf/cut (multipart file + form pages)        -> PDF hasil ekstrak
export default function PdfAnalysisPage() {
  return <PdfAnalysis />;
}
