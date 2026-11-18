"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Blocks,
  Bot,
  FileText,
  FolderGit2,
  House,
  LayoutDashboard,
  LogOut,
  PlugZap,
  ScrollText,
  Users,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

/* Kerangka System Dashboard.
   - Gerbang: token di localStorage diverifikasi ke backend
     (GET /v1/dashboard/me, header X-Admin-Token); tanpa token valid
     pengunjung dilempar ke /dashboard/login.
   - Tata letak (rombak 18 Nov 2026, permintaan user): aplikasi
     platform bersidebar — sidebar navigasi modul tetap di kiri
     (ikon + label, status aktif redup-putih dengan ikon aksen),
     konten mengalir di kolom utama berlatar AmbientBackground yang
     sama dengan tema situs. Di layar sempit sidebar menyusut jadi
     bilah atas dengan navigasi horizontal.
   - Isi: Overview (halaman utama statistik, tab bawaan saat masuk)
     + 7 modul sesuai spec vault (Projects, Logs, Integrations,
     Contents, Users, AI Provider, AI Agent). Tab AI Provider berisi
     panel registri provider + Publish config opencode (dua target:
     agent publik & agent administrator); tab AI Agent berisi
     antarmuka chat agent ADMINISTRATOR (role admin opencode,
     tergerbang token dashboard, HITL penuh). */

const AmbientBackground = dynamic(() => import("./AmbientBackground"), {
  ssr: false,
});

const OverviewPanel = dynamic(() => import("./dashboard/OverviewPanel"), {
  ssr: false,
});

const ProjectsPanel = dynamic(() => import("./dashboard/ProjectsPanel"), {
  ssr: false,
});

const LogsPanel = dynamic(() => import("./dashboard/LogsPanel"), {
  ssr: false,
});

const IntegrationsPanel = dynamic(
  () => import("./dashboard/IntegrationsPanel"),
  { ssr: false },
);

const UsersPanel = dynamic(() => import("./dashboard/UsersPanel"), {
  ssr: false,
});

const ContentsPanel = dynamic(() => import("./dashboard/ContentsPanel"), {
  ssr: false,
});

const AiProvidersPanel = dynamic(
  () => import("./dashboard/AiProvidersPanel"),
  { ssr: false },
);

const AdminAgentPanel = dynamic(
  () => import("./dashboard/AdminAgentPanel"),
  { ssr: false },
);

type Tab = {
  id: string;
  label: string;
  desc: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const TABS: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    desc: "Halaman utama dashboard: statistik sesi AI, request, token & biaya, status agent dan model aktif, plus ringkasan semua modul dalam satu pandangan.",
    icon: LayoutDashboard,
  },
  {
    id: "projects",
    label: "Projects",
    desc: "Daftar proyek yang dikelola: tambah, ubah, arsipkan, dan atur mana yang tampil di portofolio.",
    icon: FolderGit2,
  },
  {
    id: "logs",
    label: "Logs",
    desc: "Log perkembangan dari vault dan log backend Vienna Agent, plus pantau kesehatan sistem dalam satu tempat.",
    icon: ScrollText,
  },
  {
    id: "integrations",
    label: "Integrations",
    desc: "Integrasi API pihak ketiga. Kredensial dirujuk lewat nama environment variable — nilai secret tidak pernah disimpan di database maupun ditampilkan.",
    icon: Blocks,
  },
  {
    id: "contents",
    label: "Contents",
    desc: "Artikel dan tulisan portofolio (project, blog, paper, research) dalam markdown. Yang berstatus published bisa dibaca publik lewat API; draft hanya terlihat di sini.",
    icon: FileText,
  },
  {
    id: "users",
    label: "Users",
    desc: "Manajemen pengguna aplikasi konsumen backend (pertama: Vienna Assistant Mobile) — buat akun, reset password, suspend. Password tidak pernah disimpan teks polos.",
    icon: Users,
  },
  {
    id: "providers",
    label: "AI Provider",
    desc: "Konfigurasi provider AI untuk agent publik & administrator (opencode): kelola provider & model, tetapkan default untuk masing-masing agent, lalu Publish agar config opencode ditulis ulang dari database. Kredensial hanya dirujuk lewat nama variabel .env — nilai API key tidak pernah masuk sini.",
    icon: PlugZap,
  },
  {
    id: "agent",
    label: "AI Agent",
    desc: "Antarmuka agent ADMINISTRATOR: chat dengan agent opencode role admin (akses setara server) yang tergerbang login dashboard. Setiap aksi berisiko meminta persetujuanmu lewat kartu HITL sebelum dijalankan — agent tidak bergerak tanpa izin.",
    icon: Bot,
  },
];

export default function DashboardShell() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [user, setUser] = useState<string>("");
  const [active, setActive] = useState<string>("overview");

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
      <div className="dash-app dash-app-loading">
        <p className="dash-checking">Memeriksa sesi…</p>
      </div>
    );
  }

  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const TabIcon = tab.icon;

  return (
    <div className="dash-app">
      <aside className="dash-side">
        <div className="dash-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="dash-brand-mark"
            src="/vienna.svg"
            alt=""
            width={30}
            height={30}
          />
          <div className="dash-brand-text">
            <span className="dash-brand-name">Amamiya</span>
            <span className="dash-brand-sub">System Dashboard</span>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Modul dashboard">
          <div className="dash-nav-label">Modul</div>
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                className={`dash-nav-item${on ? " dash-nav-on" : ""}`}
                aria-current={on ? "page" : undefined}
                onClick={() => setActive(t.id)}
              >
                <Icon size={17} className="dash-nav-icon" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="dash-side-foot">
          <a className="dash-site-link" href="/">
            <House size={15} />
            <span>Situs utama</span>
            <ArrowUpRight size={13} className="dash-site-link-arrow" />
          </a>
          <div className="dash-user-row">
            <span className="dash-avatar" aria-hidden="true">
              {(user || "A").charAt(0).toUpperCase()}
            </span>
            <span className="dash-user-meta">
              <b>{user || "Admin"}</b>
              <i>Administrator</i>
            </span>
            <button
              type="button"
              className="dash-icon-btn"
              onClick={logout}
              title="Keluar"
              aria-label="Keluar"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="dash-main">
        <AmbientBackground />
        <div
          className={
            tab.id === "agent" ? "dash-content is-agent" : "dash-content"
          }
        >
          {/* Tab AI Agent memakai kepala chat-nya sendiri (judul
              sesi + tombol sesi baru), jadi kepala halaman shell
              (judul + deskripsi) disembunyikan khusus tab ini —
              permintaan user 18 Nov. */}
          {tab.id !== "agent" && (
            <header className="dash-page-head">
              <h1 className="dash-page-title">
                <TabIcon size={20} className="dash-page-title-icon" />
                {tab.label}
              </h1>
              <p className="dash-page-desc">{tab.desc}</p>
            </header>
          )}

          <section
            className={tab.id === "agent" ? "dash-panel is-agent" : "dash-panel"}
          >
            {tab.id === "overview" ? (
              <OverviewPanel onNavigate={setActive} />
            ) : tab.id === "projects" ? (
              <ProjectsPanel />
            ) : tab.id === "logs" ? (
              <LogsPanel />
            ) : tab.id === "integrations" ? (
              <IntegrationsPanel />
            ) : tab.id === "users" ? (
              <UsersPanel />
            ) : tab.id === "contents" ? (
              <ContentsPanel />
            ) : tab.id === "providers" ? (
              <AiProvidersPanel />
            ) : (
              <AdminAgentPanel />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
