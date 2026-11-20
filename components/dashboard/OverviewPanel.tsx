"use client";

import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import {
  ArrowUpRight,
  Blocks,
  CircleDollarSign,
  Coins,
  FileText,
  FolderGit2,
  Mail,
  MessagesSquare,
  PlugZap,
  RotateCcw,
  Send,
  Timer,
  TriangleAlert,
  Users,
} from "lucide-react";

/* Modul Overview — halaman utama dashboard (permintaan user
   18 Nov): ringkasan statistik sesuai fitur yang sudah dibangun.
   Sumber UTAMA: GET /v1/dashboard/overview (backend commit
   00acc3f, kontrak di vault "Dashboard Overview - Kebutuhan Data
   Backend"): total sepanjang masa dari ai_sessions; harian 14
   hari (WIB), rincian token input/output/cache, giliran gagal &
   latensi dari pencatatan per giliran ai_turns. Kedua sumber itu
   SENGAJA tidak dijumlahkan silang.
   FALLBACK masa transisi (spec §5): bila endpoint gagal, panel
   kembali ke agregasi klien dari endpoint lama (ai-sessions dkk)
   dan widget yang datanya tidak ada di jalur lama disembunyikan. */

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

type OverviewData = {
  generated_at?: string;
  ai: {
    sessions_total: number;
    sessions_public: number;
    sessions_admin: number;
    requests_total: number;
    tokens_total: number;
    tokens_input: number;
    tokens_output: number;
    tokens_cache_read: number;
    cost_total_usd: number;
    requests_today: number;
    tokens_today: number;
    sessions_active_today: number;
    turns_failed_total: number;
    avg_turn_duration_ms: number;
    by_model: {
      model: string;
      sessions: number;
      requests: number;
      tokens: number;
      cost_usd: number;
    }[];
    by_tool: { tool: string; count: number }[];
    daily: {
      date: string;
      requests: number;
      tokens: number;
      cost_usd: number;
      sessions_active: number;
    }[];
    recent_sessions: AiSession[];
  };
  instances: { public?: InstStatus; admin?: InstStatus };
  modules: {
    projects: { total: number; featured: number };
    integrations: { total: number; active: number };
    users: { total: number; active: number };
    contents: { total: number; published: number };
    providers: { total: number };
  };
};

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

function fmtDuration(ms: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} dtk`;
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
  const [ov, setOv] = useState<OverviewData | null>(null);
  const [mode, setMode] = useState<"endpoint" | "fallback" | null>(null);
  // Keadaan jalur fallback (agregasi klien).
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
  // Kartu notif pesan masuk (tab Inbox): dihitung dari gudang
  // feedback backend /v1/admin/feedbacks — jalur terpisah dari
  // endpoint overview maupun fallback, kegagalannya hanya
  // menyembunyikan kartu ini.
  const [inbox, setInbox] = useState<{
    total: number;
    unread: number;
    latestName: string | null;
  } | null>(null);

  const loadFallback = useCallback(async (token: string) => {
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
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("dashboard_token") || "";
    try {
      const res = await fetch(apiUrl("/v1/dashboard/overview"), {
        headers: { "X-Admin-Token": token },
      });
      if (!res.ok) throw new Error("overview");
      setOv((await res.json()) as OverviewData);
      setMode("endpoint");
    } catch {
      await loadFallback(token);
      setMode("fallback");
    }
    try {
      const res = await fetch(apiUrl("/v1/admin/feedbacks?limit=100"), {
        headers: { "X-Admin-Token": token },
      });
      if (res.ok) {
        const arr = (await res.json()) as {
          customer_name?: string;
          status?: string;
        }[];
        if (Array.isArray(arr)) {
          setInbox({
            total: arr.length,
            unread: arr.filter((f) => (f.status || "new") === "new").length,
            latestName: arr[0]?.customer_name || null,
          });
        }
      }
    } catch {
      // Kartu notif inbox disembunyikan bila sumbernya gagal.
    }
    setUpdatedAt(new Date());
    setLoading(false);
  }, [loadFallback]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Nilai tampilan: endpoint lebih dulu, fallback agregasi ──
  const ai = ov?.ai;
  const ses = sessions || [];
  const fbRequests = ses.reduce((a, s) => a + (s.prompt_count || 0), 0);
  const fbTokens = ses.reduce((a, s) => a + (s.total_tokens || 0), 0);
  const fbCost = ses.reduce((a, s) => a + (s.total_cost || 0), 0);

  const kpiSessions = ai ? ai.sessions_total : sessions ? ses.length : null;
  const kpiPub = ai ? ai.sessions_public : sessions ? ses.filter((s) => s.role !== "admin").length : null;
  const kpiAdm = ai ? ai.sessions_admin : sessions ? ses.filter((s) => s.role === "admin").length : null;
  const kpiRequests = ai ? ai.requests_total : sessions ? fbRequests : null;
  const kpiTokens = ai ? ai.tokens_total : sessions ? fbTokens : null;
  const kpiCost = ai ? ai.cost_total_usd : sessions ? fbCost : null;

  const byModel = ai
    ? ai.by_model
    : (() => {
        const map = new Map<
          string,
          { model: string; sessions: number; requests: number; tokens: number; cost_usd: number }
        >();
        for (const s of ses) {
          const key = s.model || "(tidak tercatat)";
          const cur = map.get(key) || { model: key, sessions: 0, requests: 0, tokens: 0, cost_usd: 0 };
          cur.sessions += 1;
          cur.requests += s.prompt_count || 0;
          cur.tokens += s.total_tokens || 0;
          cur.cost_usd += s.total_cost || 0;
          map.set(key, cur);
        }
        return [...map.values()].sort((a, b) => b.tokens - a.tokens);
      })();

  const byTool: { tool: string; count: number }[] = ai
    ? ai.by_tool
    : (() => {
        const map = new Map<string, number>();
        for (const s of ses)
          for (const t of s.tools_used || []) map.set(t, (map.get(t) || 0) + 1);
        return [...map.entries()]
          .map(([tool, count]) => ({ tool, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      })();

  // Grafik harian: endpoint = request per hari SUNGGUHAN (ai_turns,
  // 7 hari terakhir dari daily[14]); fallback = sesi aktif per hari.
  const dailyReq = ai ? ai.daily.slice(-7) : [];
  const maxReq = Math.max(1, ...dailyReq.map((d) => d.requests));
  const fbDays = (() => {
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
  const maxDay = Math.max(1, ...fbDays.map((d) => d.count));

  const recent: AiSession[] | null = ai
    ? ai.recent_sessions
    : sessions;

  const defPub = providers?.find((p) => p.is_default) || null;
  const defAdm = providers?.find((p) => p.is_default_admin) || null;
  const instOf = (role: "public" | "admin"): InstStatus | undefined =>
    ai ? ov?.instances?.[role] : inst?.[role];

  const tokenSplit = ai
    ? [
        { label: "Input", value: ai.tokens_input },
        { label: "Output", value: ai.tokens_output },
        { label: "Cache read", value: ai.tokens_cache_read },
      ]
    : [];
  const tokenSplitTotal = tokenSplit.reduce((a, t) => a + t.value, 0);

  const instRow = (label: string, role: "public" | "admin", prov: Provider | null) => {
    const st = instOf(role);
    const statusText =
      st?.status === "ok"
        ? "Terhubung"
        : st?.status === "error"
          ? "Error"
          : "Tidak terjangkau";
    return (
      <div className="ov-inst-row">
        <span
          className={`ov-dot${st?.status === "ok" ? " is-ok" : st?.status === "error" ? " is-error" : " is-down"}`}
          aria-hidden="true"
        />
        <div className="ov-inst-meta">
          <b>{label}</b>
          <span>
            {statusText}
            {" · "}
            {st?.default_model || prov?.default_model || "model belum diketahui"}
            {!ai && prov ? ` · ${prov.name}` : ""}
          </span>
        </div>
      </div>
    );
  };

  const modCounts = ai
    ? {
        projects: ov!.modules.projects,
        integrations: ov!.modules.integrations,
        users: ov!.modules.users,
        contents: ov!.modules.contents,
        providers: ov!.modules.providers,
      }
    : counts;

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
      value: modCounts.projects ? fmtNum(modCounts.projects.total) : "—",
      sub: modCounts.projects
        ? `${modCounts.projects.featured}/4 di Top Project`
        : "belum termuat",
    },
    {
      id: "integrations",
      label: "Integrations",
      icon: Blocks,
      value: modCounts.integrations ? fmtNum(modCounts.integrations.total) : "—",
      sub: modCounts.integrations
        ? `${modCounts.integrations.active} aktif`
        : "belum termuat",
    },
    {
      id: "contents",
      label: "Contents",
      icon: FileText,
      value: modCounts.contents ? fmtNum(modCounts.contents.total) : "—",
      sub: modCounts.contents
        ? `${modCounts.contents.published} published`
        : "belum termuat",
    },
    {
      id: "users",
      label: "Users",
      icon: Users,
      value: modCounts.users ? fmtNum(modCounts.users.total) : "—",
      sub: modCounts.users ? `${modCounts.users.active} aktif` : "belum termuat",
    },
    {
      id: "providers",
      label: "AI Provider",
      icon: PlugZap,
      value: modCounts.providers ? fmtNum(modCounts.providers.total) : "—",
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
          {mode === "fallback" && !loading
            ? " · mode transisi (agregasi klien — endpoint overview belum tersedia)"
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
          <b className="ov-kpi-value">{kpiSessions !== null ? fmtNum(kpiSessions) : "—"}</b>
          <span className="ov-kpi-label">Sesi AI tercatat</span>
          <span className="ov-kpi-sub">
            {kpiPub !== null ? `${kpiPub} publik · ${kpiAdm} admin` : "belum termuat"}
          </span>
        </div>
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><Send size={17} /></span>
          <b className="ov-kpi-value">{kpiRequests !== null ? fmtNum(kpiRequests) : "—"}</b>
          <span className="ov-kpi-label">Total request</span>
          <span className="ov-kpi-sub">
            {ai
              ? `${fmtNum(ai.requests_today)} request hari ini`
              : kpiSessions !== null
                ? "dari semua sesi tercatat"
                : "belum termuat"}
          </span>
        </div>
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><Coins size={17} /></span>
          <b className="ov-kpi-value">{kpiTokens !== null ? fmtTokens(kpiTokens) : "—"}</b>
          <span className="ov-kpi-label">Token terpakai</span>
          <span className="ov-kpi-sub">
            {ai
              ? `hari ini ${fmtTokens(ai.tokens_today)}`
              : kpiRequests
                ? `rata-rata ${fmtTokens(Math.round((kpiTokens || 0) / kpiRequests))}/request`
                : "belum ada request"}
          </span>
        </div>
        <div className="ov-card ov-kpi">
          <span className="ov-kpi-icon"><CircleDollarSign size={17} /></span>
          <b className="ov-kpi-value">{kpiCost !== null ? fmtCost(kpiCost) : "—"}</b>
          <span className="ov-kpi-label">Estimasi biaya</span>
          <span className="ov-kpi-sub">kumulatif semua sesi</span>
        </div>
      </div>

      {ai && (
        <div className="ov-ministats">
          <div className="ov-card ov-mini">
            <span className="ov-mini-label"><Send size={13} /> Request hari ini</span>
            <b className="ov-mini-value">{fmtNum(ai.requests_today)}</b>
          </div>
          <div className="ov-card ov-mini">
            <span className="ov-mini-label"><Coins size={13} /> Token hari ini</span>
            <b className="ov-mini-value">{fmtTokens(ai.tokens_today)}</b>
          </div>
          <div className="ov-card ov-mini">
            <span className="ov-mini-label"><MessagesSquare size={13} /> Sesi aktif hari ini</span>
            <b className="ov-mini-value">{fmtNum(ai.sessions_active_today)}</b>
          </div>
          <div className="ov-card ov-mini">
            <span className="ov-mini-label"><TriangleAlert size={13} /> Giliran gagal</span>
            <b className="ov-mini-value">{fmtNum(ai.turns_failed_total)}</b>
          </div>
          <div className="ov-card ov-mini">
            <span className="ov-mini-label"><Timer size={13} /> Rata-rata durasi</span>
            <b className="ov-mini-value">{fmtDuration(ai.avg_turn_duration_ms)}</b>
          </div>
        </div>
      )}

      {inbox && (
        <button
          type="button"
          className={`ov-inbox-card${inbox.unread > 0 ? " has-unread" : ""}`}
          onClick={() => onNavigate("inbox")}
        >
          <span className="ov-inbox-icon">
            <Mail size={19} />
          </span>
          <span className="ov-inbox-text">
            <b>
              {inbox.unread > 0
                ? `${inbox.unread} pesan belum dibaca`
                : "Tidak ada pesan baru"}
            </b>
            <i>
              {inbox.total} pesan masuk dari Contact &amp; Feedback
              {inbox.latestName ? ` · terbaru dari ${inbox.latestName}` : ""}
            </i>
          </span>
          <ArrowUpRight size={16} className="ov-inbox-arrow" />
        </button>
      )}

      <div className="ov-grid2">
        <div className="ov-card">
          <h3 className="ov-card-title">Agent &amp; Model Aktif</h3>
          {instRow("Agent Publik (Assistant)", "public", defPub)}
          {instRow("Agent Administrator", "admin", defAdm)}
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
                    {m.cost_usd ? ` · ${fmtCost(m.cost_usd)}` : ""}
                  </span>
                </div>
                <div className="ov-bar-track">
                  <div
                    className="ov-bar-fill"
                    style={{
                      width: `${kpiTokens ? Math.max(2, (m.tokens / kpiTokens) * 100) : 0}%`,
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
          <h3 className="ov-card-title">
            {ai ? "Request per hari (7 hari terakhir)" : "Sesi aktif 7 hari terakhir"}
          </h3>
          {ai ? (
            <div className="ov-bars" role="img" aria-label="Grafik request per hari">
              {dailyReq.map((d) => (
                <div
                  key={d.date}
                  className="ov-bar-col"
                  title={`${d.date}: ${d.requests} request · ${fmtTokens(d.tokens)} token · ${fmtCost(d.cost_usd)}`}
                >
                  <span className="ov-bar-value">{d.requests}</span>
                  <div
                    className="ov-bar"
                    style={{ height: `${Math.max(4, (d.requests / maxReq) * 64)}px` }}
                  />
                  <span className="ov-bar-label">
                    {new Date(`${d.date}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short" })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ov-bars" role="img" aria-label="Grafik sesi aktif per hari">
              {fbDays.map((d, i) => (
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
          )}
        </div>

        <div className="ov-card">
          <h3 className="ov-card-title">Tool paling sering dipakai</h3>
          {byTool.length === 0 ? (
            <p className="ov-empty">Belum ada pemakaian tool tercatat.</p>
          ) : (
            <div className="ov-chips">
              {byTool.map((t) => (
                <span key={t.tool} className="ov-chip">
                  {t.tool} <b>{t.count}×</b>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {ai && (
        <div className="ov-grid2">
          <div className="ov-card">
            <h3 className="ov-card-title">Rincian token per jenis</h3>
            {tokenSplitTotal === 0 ? (
              <p className="ov-empty">
                Belum ada pencatatan per giliran — rincian ini terisi
                sejak pencatatan ai_turns aktif (18 Nov 2026 malam).
              </p>
            ) : (
              tokenSplit.map((t) => (
                <div key={t.label} className="ov-model-row">
                  <div className="ov-model-head">
                    <span className="ov-model-name">{t.label}</span>
                    <span className="ov-model-stat">
                      {fmtTokens(t.value)} token ·{" "}
                      {((t.value / tokenSplitTotal) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                    </span>
                  </div>
                  <div className="ov-bar-track">
                    <div
                      className="ov-bar-fill"
                      style={{ width: `${Math.max(2, (t.value / tokenSplitTotal) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="ov-card">
            <h3 className="ov-card-title">Tentang data ini</h3>
            <p className="ov-note">
              Total sesi, request, token &amp; biaya adalah akumulasi
              sepanjang masa dari catatan audit sesi. Angka harian,
              rincian token per jenis, giliran gagal, dan durasi
              berasal dari pencatatan per giliran yang aktif sejak
              18 Nov 2026 malam — hari-hari sebelumnya bernilai 0 pada
              grafik harian, dan kedua sumber ini memang tidak
              dijumlahkan silang.
            </p>
          </div>
        </div>
      )}

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
        {recent === null ? (
          <p className="ov-empty">Memuat…</p>
        ) : recent.length === 0 ? (
          <p className="ov-empty">
            Belum ada sesi tercatat. Sesi Assistant publik dan AI Agent
            admin akan muncul di sini setelah giliran chat pertama selesai.
          </p>
        ) : (
          recent.slice(0, 6).map((s) => (
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
