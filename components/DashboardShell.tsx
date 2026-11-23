"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Blocks,
  Bot,
  FileText,
  FolderGit2,
  House,
  Inbox,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  ScrollText,
  Sparkles,
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
     bilah atas dengan navigasi horizontal. Di desktop sidebar
     bisa DILIPAT menjadi rel ikon 68px (tombol di baris merek;
     keadaan tersimpan di localStorage) — tambahan 21 Nov 2026.
   - Isi: Overview (halaman utama statistik, tab bawaan saat masuk)
     + modul-modul sesuai spec vault (Projects, Skills, Logs,
     Integrations, Contents, Inbox, Users, AI Provider, AI Agent).
     Tab Skills (23 Nov 2026) mengatur registry keahlian section
     About portofolio + pin 10 Skill Unggulan dari dashboard. Tab Inbox
     menampung pesan formulir Contact + feedback pengunjung dari
     gudang backend /v1/admin/feedbacks. Tab AI Provider berisi
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

const SkillsPanel = dynamic(() => import("./dashboard/SkillsPanel"), {
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

const InboxPanel = dynamic(() => import("./dashboard/InboxPanel"), {
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
  icon: ComponentType<{ size?: number; className?: string }>;
};

const TABS: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "projects",
    label: "Projects",
    icon: FolderGit2,
  },
  {
    id: "skills",
    label: "Skills",
    icon: Sparkles,
  },
  {
    id: "logs",
    label: "Logs",
    icon: ScrollText,
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Blocks,
  },
  {
    id: "contents",
    label: "Contents",
    icon: FileText,
  },
  {
    id: "inbox",
    label: "Inbox",
    icon: Inbox,
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
  },
  {
    id: "providers",
    label: "AI Provider",
    icon: PlugZap,
  },
  {
    id: "agent",
    label: "AI Agent",
    icon: Bot,
  },
];

export default function DashboardShell() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");
  const [user, setUser] = useState<string>("");
  // Tab aktif disinkronkan ke ?tab= di URL (koreksi user 18 Nov:
  // modul harus punya alamat agar refresh tidak melempar kembali
  // ke Overview). Nilai awal dibaca dari URL; id tak dikenal jatuh
  // ke overview. Aman dari hydration mismatch karena sebelum
  // gerbang sesi lolos, yang dirender hanya layar "Memeriksa sesi…".
  const [active, setActive] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const t = new URLSearchParams(window.location.search).get("tab");
      if (t && TABS.some((x) => x.id === t)) return t;
    }
    return "overview";
  });

  const selectTab = useCallback((id: string) => {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }, []);

  // Panel AI Agent dipertahankan terpasang (keep-alive) setelah
  // pertama kali dibuka: berpindah tab TIDAK membunuhnya, jadi
  // stream jawaban yang sedang berjalan tetap berlanjut di latar
  // dan sudah utuh saat admin kembali ke tab ini (permintaan
  // user 21 Nov — sebelumnya panel ter-unmount dan jawabannya
  // berhenti di tengah).
  const [agentVisited, setAgentVisited] = useState<boolean>(
    () => active === "agent",
  );
  useEffect(() => {
    if (active === "agent") setAgentVisited(true);
  }, [active]);

  // Sidebar bisa dilipat menjadi rel ikon (desktop) agar area
  // konten lebih lega — permintaan user 21 Nov 2026. Keadaan
  // tersimpan di localStorage; dibaca sesudah mount agar
  // render awal konsisten.
  const [sideCollapsed, setSideCollapsed] = useState(false);
  useEffect(() => {
    try {
      setSideCollapsed(
        localStorage.getItem("dashboard_sidebar_collapsed") === "1",
      );
    } catch {
      /* abaikan */
    }
  }, []);
  const toggleSide = () => {
    setSideCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dashboard_sidebar_collapsed", next ? "1" : "0");
      } catch {
        /* abaikan */
      }
      return next;
    });
  };

  // Bilah tab ponsel bergulir horizontal: pastikan tab aktif
  // (mis. dari ?tab= saat halaman dimuat/refresh) selalu masuk
  // pandangan, bukan tersembunyi di luar tepi kanan. Di desktop
  // (sidebar vertikal) efek ini tidak mengubah apa-apa.
  const navRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (state !== "ok") return;
    navRef.current
      ?.querySelector(".dash-nav-on")
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active, state]);

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
      <div className="dash-app flex min-h-0 flex-1 items-center justify-center bg-[#08080a]">
        <p className="text-sm text-fog">Memeriksa sesi…</p>
      </div>
    );
  }

  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const TabIcon = tab.icon;

  return (
    <div className={sideCollapsed ? "dash-app is-side-collapsed" : "dash-app"}>
      <aside className={`relative z-[2] flex min-h-0 flex-col gap-[22px] overflow-y-auto border-r border-[#1d1d21] bg-[#050506] px-3.5 pt-5 pb-4 max-[920px]:min-w-0 max-[920px]:flex-row max-[920px]:flex-wrap max-[920px]:items-center max-[920px]:gap-x-3.5 max-[920px]:gap-y-2.5 max-[920px]:overflow-visible max-[920px]:border-r-0 max-[920px]:border-b max-[920px]:py-3 ${sideCollapsed ? "min-[921px]:px-2.5" : ""}`}>
        <div className={`flex items-center gap-[11px] px-2 py-0.5 max-[920px]:p-0 ${sideCollapsed ? "min-[921px]:flex-col min-[921px]:gap-3 min-[921px]:px-0" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="flex-none rounded-lg border border-line"
            src="/favicon.png"
            alt=""
            width={30}
            height={30}
          />
          <div className={`flex flex-col leading-[1.25] ${sideCollapsed ? "min-[921px]:hidden" : ""}`}>
            <span className="text-[14.5px] font-bold tracking-[-0.01em] text-[#f2f2f4]">Amamiya</span>
            <span className="text-[11.5px] text-[#8a8a92]">System Dashboard</span>
          </div>
          <button
            type="button"
            className={`ml-auto inline-flex h-[31px] w-[31px] flex-none cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-[#a7a7ae] hover:border-line hover:bg-[rgba(255,255,255,0.05)] hover:text-white ${sideCollapsed ? "min-[921px]:ml-0" : ""}`}
            onClick={toggleSide}
            title={sideCollapsed ? "Buka sidebar" : "Lipat sidebar"}
            aria-label={sideCollapsed ? "Buka sidebar" : "Lipat sidebar"}
          >
            {sideCollapsed ? (
              <PanelLeftOpen size={16} />
            ) : (
              <PanelLeftClose size={16} />
            )}
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 max-[920px]:order-3 max-[920px]:w-full max-[920px]:min-w-0 max-[920px]:flex-row max-[920px]:gap-1 max-[920px]:overflow-x-auto max-[920px]:p-[4px_3px] max-[920px]:[scrollbar-width:none] max-[920px]:[&::-webkit-scrollbar]:hidden" aria-label="Modul dashboard" ref={navRef}>
          <div className={`px-2.5 pb-2 text-[10.5px] font-bold tracking-[0.13em] text-[#62626b] uppercase max-[920px]:hidden ${sideCollapsed ? "min-[921px]:hidden" : ""}`}>Modul</div>
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === active;
            return (
              <button
                key={t.id}
                type="button"
                className={`group flex cursor-pointer items-center gap-2.5 rounded-lg border-0 bg-transparent px-2.5 py-2 text-left text-[13.5px] font-medium text-[#a7a7ae] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#e8e8ec] max-[920px]:flex-none max-[920px]:px-[11px] max-[920px]:py-[7px] ${sideCollapsed ? "min-[921px]:justify-center min-[921px]:px-0 min-[921px]:py-[9px]" : ""}${on ? " dash-nav-on" : ""}`}
                aria-current={on ? "page" : undefined}
                title={t.label}
                onClick={() => selectTab(t.id)}
              >
                <Icon size={17} className="dash-nav-icon flex-none text-[#7c7c85] group-hover:text-[#a7a7ae]" />
                <span className={sideCollapsed ? "min-[921px]:hidden" : undefined}>{t.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3 max-[920px]:mt-0 max-[920px]:ml-auto max-[920px]:flex-row max-[920px]:items-center max-[920px]:gap-2">
          <a className={`flex items-center gap-[9px] rounded-lg px-2.5 py-2 text-[13.5px] font-medium text-[#a7a7ae] no-underline hover:bg-[rgba(255,255,255,0.04)] hover:text-[#e8e8ec] max-[920px]:hidden ${sideCollapsed ? "min-[921px]:justify-center min-[921px]:px-0" : ""}`} href="/" title="Situs utama">
            <House size={15} />
            <span className={sideCollapsed ? "min-[921px]:hidden" : undefined}>Situs utama</span>
            <ArrowUpRight size={13} className={`ml-auto text-[#62626b] ${sideCollapsed ? "min-[921px]:hidden" : ""}`} />
          </a>
          <div className={`flex items-center gap-2.5 border-t border-[#1d1d21] px-1.5 pt-[13px] pb-0.5 max-[920px]:border-t-0 max-[920px]:p-0 ${sideCollapsed ? "min-[921px]:flex-col min-[921px]:gap-[9px] min-[921px]:px-0" : ""}`}>
            <span className="inline-flex h-[29px] w-[29px] flex-none items-center justify-center rounded-full border border-[#2a2a30] bg-[#17171b] text-[12.5px] font-bold text-[#e8e8ec]" aria-hidden="true">
              {(user || "A").charAt(0).toUpperCase()}
            </span>
            <span className={`flex min-w-0 flex-col leading-[1.3] max-[920px]:hidden ${sideCollapsed ? "min-[921px]:hidden" : ""}`}>
              <b className="truncate text-[13px] font-semibold text-[#f2f2f4]">{user || "Admin"}</b>
              <i className="text-[11px] text-[#8a8a92] [font-style:normal]">Administrator</i>
            </span>
            <button
              type="button"
              className={`ml-auto inline-flex h-[31px] w-[31px] flex-none cursor-pointer items-center justify-center rounded-lg border border-transparent bg-transparent text-[#a7a7ae] hover:border-line hover:bg-[rgba(255,255,255,0.05)] hover:text-white ${sideCollapsed ? "min-[921px]:ml-0" : ""}`}
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
            tab.id === "agent"
              ? "mx-auto flex h-full w-full max-w-[1120px] flex-col px-[34px] pt-[18px] pb-4 max-[920px]:px-4 max-[920px]:pt-3.5 max-[920px]:pb-3"
              : "mx-auto w-full max-w-[1120px] px-[34px] pt-[30px] pb-16 max-[920px]:px-4 max-[920px]:pt-[22px] max-[920px]:pb-[52px]"
          }
        >
          {/* Tab AI Agent memakai kepala chat-nya sendiri (judul
              sesi + tombol sesi baru), jadi kepala halaman shell
              (judul + deskripsi) disembunyikan khusus tab ini —
              permintaan user 18 Nov. */}
          {tab.id !== "agent" && (
            <header className="mb-6">
              <h1 className="flex items-center gap-3 text-[26px] font-bold tracking-[-0.01em] text-[#f2f2f4]">
                <TabIcon size={25} className="flex-none text-accent3" />
                {tab.label}
              </h1>
            </header>
          )}

          <section
            className={tab.id === "agent" ? "flex min-h-0 min-w-0 flex-1 flex-col" : "min-w-0"}
          >
            {tab.id === "overview" ? (
              <OverviewPanel onNavigate={selectTab} />
            ) : tab.id === "projects" ? (
              <ProjectsPanel />
            ) : tab.id === "skills" ? (
              <SkillsPanel />
            ) : tab.id === "logs" ? (
              <LogsPanel />
            ) : tab.id === "integrations" ? (
              <IntegrationsPanel />
            ) : tab.id === "users" ? (
              <UsersPanel />
            ) : tab.id === "inbox" ? (
              <InboxPanel />
            ) : tab.id === "contents" ? (
              <ContentsPanel />
            ) : tab.id === "providers" ? (
              <AiProvidersPanel />
            ) : null}
            {agentVisited && (
              <div
                style={
                  tab.id === "agent"
                    ? { display: "contents" }
                    : { display: "none" }
                }
              >
                <AdminAgentPanel />
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
