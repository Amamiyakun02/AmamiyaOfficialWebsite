"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { apiUrl } from "@/lib/api";

/* Kerangka System Dashboard (tahap fondasi, 5 Nov 2026).
   - Gerbang: token di localStorage diverifikasi ke backend
     (GET /v1/dashboard/me, header X-Admin-Token); tanpa token valid
     pengunjung dilempar ke /dashboard/login.
   - Latar: AmbientBackground yang sama dengan section bawah beranda
     (ladang titik + huruf acak + highlight mouse di desktop) dipakai
     PENUH satu halaman — permintaan user 5 Nov, meniru gambar Projects.
     Komponen itu menggambar di seluruh bidang bila tidak menemukan
     .hero-wrap di scroller-nya, jadi di sini ia bekerja apa adanya.
   - Isi: 6 tab modul sesuai spec vault (Projects, Logs, Integrations,
     Contents, Users, AI Agent). Fondasi ini baru kerangka + panel
     penjelasan; tiap modul diisi bertahap pada tahap berikutnya. */

const AmbientBackground = dynamic(() => import("./AmbientBackground"), {
  ssr: false,
});

const ProjectsPanel = dynamic(() => import("./dashboard/ProjectsPanel"), {
  ssr: false,
});

type Tab = { id: string; label: string; desc: string };

const TABS: Tab[] = [
  {
    id: "projects",
    label: "Projects",
    desc: "Daftar proyek yang dikelola: tambah, ubah, arsipkan, dan atur mana yang tampil di portofolio.",
  },
  {
    id: "logs",
    label: "Logs",
    desc: "Log perkembangan dari vault dan log backend Vienna Agent, plus pantau kesehatan sistem dalam satu tempat.",
  },
  {
    id: "integrations",
    label: "Integrations",
    desc: "Integrasi API pihak ketiga. Kredensial disimpan terenkripsi atau sebagai referensi environment — tidak pernah teks polos.",
  },
  {
    id: "contents",
    label: "Contents",
    desc: "Konten portofolio (teks section, proyek, dan halaman) yang bisa diubah tanpa menyentuh kode.",
  },
  {
    id: "users",
    label: "Users",
    desc: "Manajemen pengguna aplikasi konsumen backend (pertama: Vienna Assistant Mobile) — buat akun, reset password, suspend. Password tidak pernah disimpan teks polos.",
  },
  {
    id: "agent",
    label: "AI Agent",
    desc: "Antarmuka agen AI (opencode/Hermes) untuk bekerja di dalam direktori proyek terdaftar. Aksi tulis wajib persetujuan dan tercatat di audit.",
  },
];

export default function DashboardShell() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [user, setUser] = useState<string>("");
  const [active, setActive] = useState<string>("projects");

  useEffect(() => {
    const token = localStorage.getItem("dashboard_token");
    if (!token) {
      router.replace("/dashboard/login");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/v1/dashboard/me"), {
          headers: { "X-Admin-Token": token },
        });
        if (!res.ok) throw new Error("invalid");
        const data = (await res.json()) as { user?: string };
        if (cancelled) return;
        setUser(data.user || "");
        setState("ok");
      } catch {
        if (cancelled) return;
        localStorage.removeItem("dashboard_token");
        router.replace("/dashboard/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function logout() {
    localStorage.removeItem("dashboard_token");
    router.replace("/dashboard/login");
  }

  if (state !== "ok") {
    return (
      <div className="dash-scroll">
        <p className="dash-checking">Memeriksa sesi…</p>
      </div>
    );
  }

  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <div className="dash-scroll">
      <AmbientBackground />
      <div className="dash-inner">
        <header className="dash-head">
          <div>
            <h1 className="dash-title">System Dashboard</h1>
            <p className="dash-sub">
              Panel pengelolaan Vienna Agent &amp; portofolio.
            </p>
          </div>
          <div className="dash-head-right">
            {user && <span className="dash-user">{user}</span>}
            <button type="button" className="dash-logout" onClick={logout}>
              Keluar
            </button>
          </div>
        </header>

        <nav className="dash-tabs" aria-label="Modul dashboard">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`dash-tab${t.id === active ? " dash-tab-on" : ""}`}
              onClick={() => setActive(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <section className="dash-panel">
          <h2 className="dash-panel-title">{tab.label}</h2>
          <p className="dash-panel-desc">{tab.desc}</p>
          {tab.id === "projects" ? (
            <ProjectsPanel />
          ) : (
            <p className="dash-panel-note">
              Modul ini sedang disiapkan — kerangka dan gerbang loginnya
              sudah live; isinya dibangun bertahap berikutnya.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
