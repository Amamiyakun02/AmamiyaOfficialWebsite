"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import {
  Blocks,
  CircleDollarSign,
  Coins,
  FileText,
  FolderGit2,
  MessagesSquare,
  PlugZap,
  RotateCcw,
  Send,
  Users,
} from "lucide-react";

/* Modul Overview — halaman utama dashboard (permintaan user
   18 Nov): ringkasan statistik sesuai fitur yang sudah dibangun.
   Semua angka diagregasi di sisi klien dari endpoint yang SUDAH
   ada — tidak ada endpoint backend baru:
   - Sesi/request/token/biaya: GET /v1/dashboard/ai-sessions
     (tabel audit ai_sessions: prompt_count per sesi = jumlah
     request, total_tokens & total_cost kumulatif per sesi).
   - Status instance + model berjalan: GET /v1/opencode/status.
   - Model default per role: GET /v1/dashboard/ai-providers.
   - Ringkasan modul: list projects/integrations/users/contents.
   Setiap sumber dimuat terpisah (allSettled): satu sumber gagal
   tidak menjatuhkan seluruh halaman, kartunya saja yang kosong. */

type AiSession = {
  id: number;
  session_id: string;
  role: string;
  agent: string | null;
  model: string | null;
  admin_user: string | null;
  first_prompt: string | null;
  last_prompt: string | null;
  prompt_count: number;
  total_tokens: number;
  total_cost: number;
  tools_used: string[];
  created_at: string | null;
  updated_at: string | null;
};

type Provider = {
  id: number;
  name: string;
  default_model: string | null;
  is_default: boolean;
  is_default_admin: boolean;
  status: string;
};

type InstStatus = { status?: string; default_model?: string };

type Counts = {
  projects: { total: number; featured: number } | null;
  integrations: { total: number; active: number } | null;
  users: { total: number; active: number } | null;
  contents: { total: number; published: number } | null;
  providers: { total: number } | null;
};

function fmtNum(n: number): string {
  return n.toLocaleString("id-ID");
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  if (n >= 10_000)
    return `${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return fmtNum(n);
}

function fmtCost(v: number): string {
  return `$${v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const mnt = Math.floor(diff / 60000);
  if (mnt < 1) return "baru saja";
  if (mnt < 60) return `${mnt} mnt lalu`;
  const jam = Math.floor(mnt / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sameDay(iso: string | null, d: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso);
  return (
    t.getFullYear() === d.getFullYear() &&
    t.getMonth() === d.getMonth() &&
    t.getDate() === d.getDate()
  );
}

export default function OverviewPanel({
  onNavigate,
}: {
  onNavigate: (tab: string) => void;
}) {
  const [sessions, setSessions] = useState<AiSession[] | null>(null);
  const [providers, setProviders] = useState<Provider[] | null>(null);
  const [inst, setInst] = useState<{ public?: InstStatus; admin?: InstStatus } | null>(null);
  const [counts, setCounts] = useState<Counts>({
    projects: null,
    integrations: null,
    users: null,
    contents: null,
    providers: null,
  });
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("dashboard_token") || "";
    const auth = { headers: { "X-Admin-Token": token } };
    const get = async (path: string, withAuth = true) => {
      const res = await fetch(apiUrl(path), withAuth ? auth : undefined);
      if (!res.ok) throw new Error(path);
      return res.json();
    };
    const [sSes, sProv, sStat, sProj, sInt, sUsr, sCnt] =
      await Promise.allSettled([
        get("/v1/dashboard/ai-sessions"),
        get("/v1/dashboard/ai-providers"),
        get("/v1/opencode/status", false),
        get("/v1/dashboard/projects"),
        get("/v1/dashboard/integrations"),
        get("/v1/dashboard/users"),
        get("/v1/dashboard/contents"),
      ]);
    if (sSes.status === "fulfilled")
      setSessions((sSes.value as { items: AiSession[] }).items || []);
    if (sProv.status === "fulfilled") {
      const items = (sProv.value as { items: Provider[] }).items || [];
      setProviders(items);
      setCounts((c) => ({ ...c, providers: { total: items.length } }));
    }
    if (sStat.status === "fulfilled")
      setInst(
        (sStat.value as { instances?: { public?: InstStatus; admin?: InstStatus } })
          .instances || {},
      );
    if (sProj.status === "fulfilled") {
      const items = (sProj.value as { items: { is_featured?: boolean }[] }).items || [];
      setCounts((c) => ({
        ...c,
        projects: {
          total: items.length,
          featured: items.filter((p) => p.is_featured).length,
        },
      }));
    }
    if (sInt.status === "fulfilled") {
      const items = (sInt.value as { items: { status?: string }[] }).items || [];
      setCounts((c) => ({
        ...c,
        integrations: {
          total: items.length,
          active: items.filter((i) => i.status === "active").length,
        },
      }));
    }
    if (sUsr.status === "fulfilled") {
      const items = (sUsr.value as { items: { status?: string }[] }).items || [];
      setCounts((c) => ({
        ...c,
        users: {
          total: items.length,
          active: items.filter((u) => u.status === "active").length,
        },
      }));
    }
    if (sCnt.status === "fulfilled") {
      const items = (sCnt.value as { items: { status?: string }[] }).items || [];
      setCounts((c) => ({
        ...c,
        contents: {
          total: items.length,
          published: items.filter((x) => x.status === "published").length,
        },
      }));
    }
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Agregasi sesi AI ──
  const ses = sessions || [];
  const totalRequests = ses.reduce((a, s) => a + (s.prompt_count || 0), 0);
  const totalTokens = ses.reduce((a, s) => a + (s.total_tokens || 0), 0);
  const totalCost = ses.reduce((a, s) => a + (s.total_cost || 0), 0);
  const pubCount = ses.filter((s) => s.role !== "admin").length;
  const admCount = ses.length - pubCount;
  const today = new Date();
  const activeToday = ses.filter((s) => sameDay(s.updated_at, today)).length;

  const byModel = (() => {
    const map = new Map<
      string,
      { model: string; sessions: number; requests: number; tokens: number }
    >();
    for (const s of ses) {
      const key = s.model || "(tidak tercatat)";
      const cur = map.get(key) || { model: key, sessions: 0, requests: 0, tokens: 0 };
      cur.sessions += 1;
      cur.requests += s.prompt_count || 0;
      cur.tokens += s.total_tokens || 0;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.tokens - a.tokens);
  })();

  const byTool = (() => {
    const map = new Map<string, number>();
    for (const s of ses)
      for (const t of s.tools_used || []) map.set(t, (map.get(t) || 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  })();

  const last7 = (() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString("id-ID", { weekday: "short" }),
        count: ses.filter((s) => sameDay(s.updated_at, d)).length,
      });
    }
    return days;
  })();
  const maxDay = Math.max(1, ...last7.map((d) => d.count));

  const defPub = providers?.find((p) => p.is_default) || null;
  const defAdm = providers?.find((p) => p.is_default_admin) || null;

  const instRow = (
    label: string,
    st: InstStatus | undefined,
    prov: Provider | null,
  ) => (
    <div className="ov-inst-row">
      <span
        className={`ov-dot${st?.status === "ok" ? " is-ok" : " is-down"}`}
        aria-hidden="true"
      />
      <div className="ov-inst-meta">
        <b>{label}</b>
        <span>
          {st?.status === "ok" ? "Terhubung" : "Tidak terjangkau"}
          {" · "}
          {st?.default_model || prov?.default_model || "model belum diketahui"}
          {prov ? ` · ${prov.name}` : ""}
        </span>
      </div>
    </div>
  );

  const modules: {
    id: string;
    label: string;
    icon: typeof FolderGit2;
    value: string;
    sub: string;
  }[] = [
    {
      id: "projects",
      label: "Projects",
      icon: FolderGit2,
      value: counts.projects ? fmtNum(counts.projects.total) : "—",
      sub: counts.projects
        ? `${counts.projects.featured}/4 di Top Project`
        : "belum termuat",
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Blocks,
      value: counts.integrations ? fmtNum(counts.integrations.total) : "—",
      sub: counts.integrations
        ? `${counts.integrations.active} aktif`
        : "belum termuat",
    },
    {
      id: "contents",
      label: "Contents",
      icon: FileText,
      value: counts.contents ? fmtNum(counts.contents.total) : "—",
      sub: counts.contents
        ? `${counts.contents.published} published`
        : "belum termuat",
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      value: counts.users ? fmtNum(counts.users.total) : "—",
      sub: counts.users ? `${counts.users.active} aktif` : "belum termuat",
    },
    {
      id: "providers",
      label: "AI Provider",
      icon: PlugZap,
      value: counts.providers ? fmtNum(counts.providers.total) : "—",
      sub: "provider terdaftar",
    },
  ];

  return (
    <div className="ov">
      <div className="ov-toolbar">
        <span className="ov-updated">
          {loading
            ? "Memuat statistik…"
            : updatedAt
              ? `Diperbarui ${updatedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
        </span>
        <button
          type="button"
          className="ov-refresh"
          onClick={() => void load()}
          disabled={loading}
          title="Muat ulang statistik"
        >
          <RotateCcw size={14} className={loading ? "ov-spin" : undefined} />
          <span>Muat ulang</span>
        </button>
      </div>

      <div className="ov-kpis">
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><MessagesSquare size={17} /></span>
          <b className="ov-kpi-value">{sessions ? fmtNum(ses.length) : "—"}</b>
          <span className="ov-kpi-label">Sesi AI tercatat</span>
          <span className="ov-kpi-sub">
            {sessions ? `${pubCount} publik · ${admCount} admin` : "belum termuat"}
          </span>
        </div>
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><Send size={17} /></span>
          <b className="ov-kpi-value">{sessions ? fmtNum(totalRequests) : "—"}</b>
          <span className="ov-kpi-label">Total request</span>
          <span className="ov-kpi-sub">
            {sessions ? `${activeToday} sesi aktif hari ini` : "belum termuat"}
          </span>
        </div>
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><Coins size={17} /></span>
          <b className="ov-kpi-value">{sessions ? fmtTokens(totalTokens) : "—"}</b>
          <span className="ov-kpi-label">Token terpakai</span>
          <span className="ov-kpi-sub">
            {sessions
              ? totalRequests > 0
                ? `rata-rata ${fmtTokens(Math.round(totalTokens / totalRequests))}/request`
                : "belum ada request"
              : "belum termuat"}
          </span>
        </div>
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><CircleDollarSign size={17} /></span>
          <b className="ov-kpi-value">{sessions ? fmtCost(totalCost) : "—"}</b>
          <span className="ov-kpi-label">Estimasi biaya</span>
          <span className="ov-kpi-sub">kumulatif semua sesi</span>
        </div>
      </div>

      <div className="ov-grid2">
        <div className="ov-card">
          <h3 className="ov-card-title">Agent &amp; model aktif</h3>
          {instRow("Agent publik (Assistant)", inst?.public, defPub)}
          {instRow("Agent administrator", inst?.admin, defAdm)}
          <p className="ov-note">
            Model default diatur di tab AI Provider lalu di-Publish ke
            config opencode.
          </p>
        </div>

        <div className="ov-card">
          <h3 className="ov-card-title">Penggunaan per model</h3>
          {byModel.length === 0 ? (
            <p className="ov-empty">Belum ada sesi tercatat.</p>
          ) : (
            byModel.map((m) => (
              <div key={m.model} className="ov-model-row">
                <div className="ov-model-head">
                  <span className="ov-model-name">{m.model}</span>
                  <span className="ov-model-stat">
                    {fmtTokens(m.tokens)} token · {m.requests} req · {m.sessions} sesi
                  </span>
                </div>
                <div className="ov-bar-track">
                  <div
                    className="ov-bar-fill"
                    style={{
                      width: `${totalTokens > 0 ? Math.max(2, (m.tokens / totalTokens) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="ov-grid2">
        <div className="ov-card">
          <h3 className="ov-card-title">Sesi aktif 7 hari terakhir</h3>
          <div className="ov-bars" role="img" aria-label="Grafik sesi aktif per hari">
            {last7.map((d, i) => (
              <div key={i} className="ov-bar-col">
                <span className="ov-bar-value">{d.count}</span>
                <div
                  className="ov-bar"
                  style={{ height: `${Math.max(4, (d.count / maxDay) * 64)}px` }}
                />
                <span className="ov-bar-label">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ov-card">
          <h3 className="ov-card-title">Tool paling sering dipakai</h3>
          {byTool.length === 0 ? (
            <p className="ov-empty">Belum ada pemakaian tool tercatat.</p>
          ) : (
            <div className="ov-chips">
              {byTool.map(([name, count]) => (
                <span key={name} className="ov-chip">
                  {name} <b>{count}×</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <h3 className="ov-section-title">Modul</h3>
      <div className="ov-modules">
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              className="ov-card ov-module"
              onClick={() => onNavigate(m.id)}
            >
              <span className="ov-module-head">
                <Icon size={16} />
                <span>{m.label}</span>
              </span>
              <b className="ov-module-value">{m.value}</b>
              <span className="ov-module-sub">{m.sub}</span>
            </button>
          );
        })}
      </div>

      <h3 className="ov-section-title">Sesi terbaru</h3>
      <div className="ov-card ov-sessions">
        {sessions === null ? (
          <p className="ov-empty">Memuat…</p>
        ) : ses.length === 0 ? (
          <p className="ov-empty">
            Belum ada sesi tercatat. Sesi Assistant publik dan AI Agent
            admin akan muncul di sini setelah giliran chat pertama selesai.
          </p>
        ) : (
          ses.slice(0, 6).map((s) => (
            <div key={s.id} className="ov-session-row">
              <span
                className={`ov-role${s.role === "admin" ? " is-admin" : ""}`}
              >
                {s.role === "admin" ? "Admin" : "Publik"}
              </span>
              <div className="ov-session-main">
                <span className="ov-session-prompt">
                  {s.last_prompt || s.first_prompt || "(tanpa prompt tercatat)"}
                </span>
                <span className="ov-session-meta">
                  {s.model || "model ?"} · {s.prompt_count} request ·{" "}
                  {fmtTokens(s.total_tokens)} token
                  {s.admin_user ? ` · oleh ${s.admin_user}` : ""}
                </span>
              </div>
              <span className="ov-session-time">{relTime(s.updated_at)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
