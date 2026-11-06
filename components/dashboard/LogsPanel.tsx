"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

/* Modul 2 System Dashboard — Logs & pantau sistem (spec vault §4).
   - Vault  : entri ~/agent_knowledge/_log.md (read-only), filter
              kategori + pencarian.
   - Backend: tail log backend dengan filter level + pencarian +
              mode ikuti (polling) — teks sudah disamarkan backend.
   - Sistem : CPU/RAM/disk/uptime mesin lewat /v1/dashboard/system. */

type VaultEntry = {
  timestamp: string;
  category: string;
  title: string;
  summary: string;
  pages: string[];
};

type BackendLine = { level: string; message: string };

type SystemInfo = {
  hostname: string;
  os: string;
  cpu_percent: number;
  cpu_count: number | null;
  memory: { percent: number; used_mb: number; total_mb: number };
  disk: { percent: number; used_gb: number; total_gb: number; path: string };
  uptime_seconds: number;
  boot_time: string;
};

type View = "vault" | "backend" | "system";

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}

export default function LogsPanel() {
  const [view, setView] = useState<View>("vault");
  const token = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("dashboard_token") || ""
      : "";

  // ── Vault ──
  const [vItems, setVItems] = useState<VaultEntry[]>([]);
  const [vTotal, setVTotal] = useState(0);
  const [vQ, setVQ] = useState("");
  const [vCat, setVCat] = useState("");
  const [vCats, setVCats] = useState<string[]>([]);
  const [vLoading, setVLoading] = useState(true);
  const [vError, setVError] = useState<string | null>(null);
  const [vOpen, setVOpen] = useState<number | null>(null);

  // ── Backend ──
  const [bItems, setBItems] = useState<BackendLine[]>([]);
  const [bTotal, setBTotal] = useState(0);
  const [bQ, setBQ] = useState("");
  const [bLevel, setBLevel] = useState("");
  const [bLimit, setBLimit] = useState(100);
  const [bLoading, setBLoading] = useState(true);
  const [bError, setBError] = useState<string | null>(null);
  const [bFollow, setBFollow] = useState(false);

  // ── Sistem ──
  const [sys, setSys] = useState<SystemInfo | null>(null);
  const [sysError, setSysError] = useState<string | null>(null);
  const [sysLoading, setSysLoading] = useState(false);

  const fetchJson = useCallback(async (path: string) => {
    const res = await fetch(apiUrl(path), {
      headers: { "X-Admin-Token": token() },
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      throw new Error(data.detail || `Gagal memuat (${res.status}).`);
    }
    return res.json();
  }, []);

  const loadVault = useCallback(async () => {
    setVLoading(true);
    setVError(null);
    try {
      const params = new URLSearchParams({ source: "vault", limit: "200" });
      if (vCat) params.set("category", vCat);
      if (vQ.trim()) params.set("q", vQ.trim());
      const data = await fetchJson(`/v1/dashboard/logs?${params.toString()}`);
      setVItems(data.items as VaultEntry[]);
      setVTotal(data.total as number);
      if (!vCat && !vQ) {
        const cats = [
          ...new Set((data.items as VaultEntry[]).map((e) => e.category)),
        ].sort();
        setVCats(cats);
      }
    } catch (e) {
      setVError(e instanceof Error ? e.message : "Gagal memuat log vault.");
    } finally {
      setVLoading(false);
    }
  }, [fetchJson, vCat, vQ]);

  const loadBackend = useCallback(async () => {
    setBLoading(true);
    setBError(null);
    try {
      const params = new URLSearchParams({
        source: "backend",
        limit: String(bLimit),
      });
      if (bLevel) params.set("level", bLevel);
      if (bQ.trim()) params.set("q", bQ.trim());
      const data = await fetchJson(`/v1/dashboard/logs?${params.toString()}`);
      setBItems(data.items as BackendLine[]);
      setBTotal(data.total as number);
    } catch (e) {
      setBError(e instanceof Error ? e.message : "Gagal memuat log backend.");
    } finally {
      setBLoading(false);
    }
  }, [fetchJson, bLevel, bLimit, bQ]);

  const loadSystem = useCallback(async () => {
    setSysLoading(true);
    setSysError(null);
    try {
      const data = await fetchJson("/v1/dashboard/system");
      setSys(data as SystemInfo);
    } catch (e) {
      setSysError(e instanceof Error ? e.message : "Gagal memuat info sistem.");
    } finally {
      setSysLoading(false);
    }
  }, [fetchJson]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void loadVault(), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [loadVault]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void loadBackend(), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [loadBackend]);

  useEffect(() => {
    if (view === "system" && !sys) void loadSystem();
  }, [view, sys, loadSystem]);

  useEffect(() => {
    if (!bFollow) return;
    const id = setInterval(() => void loadBackend(), 5000);
    return () => clearInterval(id);
  }, [bFollow, loadBackend]);

  return (
    <div className="logs">
      <div className="logs-subtabs" role="tablist" aria-label="Sumber log">
        <button
          type="button"
          className={`logs-subtab${view === "vault" ? " logs-subtab-on" : ""}`}
          onClick={() => setView("vault")}
        >
          Vault
        </button>
        <button
          type="button"
          className={`logs-subtab${view === "backend" ? " logs-subtab-on" : ""}`}
          onClick={() => setView("backend")}
        >
          Backend
        </button>
        <button
          type="button"
          className={`logs-subtab${view === "system" ? " logs-subtab-on" : ""}`}
          onClick={() => setView("system")}
        >
          Sistem
        </button>
      </div>

      {view === "vault" && (
        <div>
          <div className="proj-toolbar">
            <input
              className="proj-search"
              type="search"
              placeholder="Cari di log vault…"
              value={vQ}
              onChange={(e) => setVQ(e.target.value)}
              aria-label="Cari log vault"
            />
            <select
              className="proj-filter"
              value={vCat}
              onChange={(e) => setVCat(e.target.value)}
              aria-label="Filter kategori"
            >
              <option value="">Semua kategori</option>
              {vCats.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className="logs-count">{vTotal} entri</span>
          </div>
          {vError && <p className="proj-error">{vError}</p>}
          {vLoading ? (
            <p className="proj-empty">Memuat log vault…</p>
          ) : vItems.length === 0 ? (
            <p className="proj-empty">Tidak ada entri yang cocok.</p>
          ) : (
            <ul className="proj-list">
              {vItems.map((e, i) => (
                <li key={`${e.timestamp}-${i}`} className="logs-entry">
                  <button
                    type="button"
                    className="logs-entry-head"
                    onClick={() => setVOpen(vOpen === i ? null : i)}
                  >
                    <span className="logs-time">{e.timestamp}</span>
                    <span className={`proj-badge logs-badge-${e.category}`}>
                      {e.category}
                    </span>
                    <span className="logs-title">{e.title}</span>
                  </button>
                  {vOpen === i && (
                    <div className="logs-entry-body">
                      <p>{e.summary}</p>
                      {e.pages.length > 0 && (
                        <p className="logs-pages">
                          Pages: {e.pages.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === "backend" && (
        <div>
          <div className="proj-toolbar">
            <input
              className="proj-search"
              type="search"
              placeholder="Cari di log backend…"
              value={bQ}
              onChange={(e) => setBQ(e.target.value)}
              aria-label="Cari log backend"
            />
            <select
              className="proj-filter"
              value={bLevel}
              onChange={(e) => setBLevel(e.target.value)}
              aria-label="Filter level"
            >
              <option value="">Semua level</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
            <select
              className="proj-filter"
              value={bLimit}
              onChange={(e) => setBLimit(Number(e.target.value))}
              aria-label="Jumlah baris"
            >
              <option value={100}>100 baris</option>
              <option value={300}>300 baris</option>
              <option value={500}>500 baris</option>
            </select>
            <button
              type="button"
              className="proj-mini"
              onClick={() => void loadBackend()}
            >
              Segarkan
            </button>
            <label className="logs-follow">
              <input
                type="checkbox"
                checked={bFollow}
                onChange={(e) => setBFollow(e.target.checked)}
              />
              Ikuti otomatis
            </label>
            <span className="logs-count">{bTotal} baris</span>
          </div>
          {bError && <p className="proj-error">{bError}</p>}
          {bLoading ? (
            <p className="proj-empty">Memuat log backend…</p>
          ) : bItems.length === 0 ? (
            <p className="proj-empty">Tidak ada baris yang cocok.</p>
          ) : (
            <div className="logs-term">
              {bItems.map((l, i) => (
                <div key={i} className="logs-line">
                  <span className={`logs-lvl logs-lvl-${l.level}`}>
                    {l.level}
                  </span>
                  <span className="logs-msg">{l.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "system" && (
        <div>
          {sysError && <p className="proj-error">{sysError}</p>}
          {sysLoading && !sys ? (
            <p className="proj-empty">Memuat info sistem…</p>
          ) : sys ? (
            <div>
              <div className="sys-grid">
                <div className="sys-card">
                  <span className="sys-label">CPU</span>
                  <span className="sys-value">{sys.cpu_percent}%</span>
                  <span className="sys-note">{sys.cpu_count ?? "-"} core</span>
                  <div className="sys-bar">
                    <div
                      className="sys-bar-fill"
                      style={{ width: `${Math.min(100, sys.cpu_percent)}%` }}
                    />
                  </div>
                </div>
                <div className="sys-card">
                  <span className="sys-label">RAM</span>
                  <span className="sys-value">{sys.memory.percent}%</span>
                  <span className="sys-note">
                    {(sys.memory.used_mb / 1024).toFixed(1)} /{" "}
                    {(sys.memory.total_mb / 1024).toFixed(1)} GB
                  </span>
                  <div className="sys-bar">
                    <div
                      className="sys-bar-fill"
                      style={{ width: `${Math.min(100, sys.memory.percent)}%` }}
                    />
                  </div>
                </div>
                <div className="sys-card">
                  <span className="sys-label">Disk {sys.disk.path}</span>
                  <span className="sys-value">{sys.disk.percent}%</span>
                  <span className="sys-note">
                    {sys.disk.used_gb} / {sys.disk.total_gb} GB
                  </span>
                  <div className="sys-bar">
                    <div
                      className="sys-bar-fill"
                      style={{ width: `${Math.min(100, sys.disk.percent)}%` }}
                    />
                  </div>
                </div>
                <div className="sys-card">
                  <span className="sys-label">Uptime</span>
                  <span className="sys-value sys-value-sm">
                    {fmtUptime(sys.uptime_seconds)}
                  </span>
                  <span className="sys-note">
                    sejak {sys.boot_time.replace("T", " ")}
                  </span>
                </div>
              </div>
              <p className="logs-host">
                {sys.hostname} — {sys.os}
              </p>
              <button
                type="button"
                className="proj-mini"
                onClick={() => void loadSystem()}
                disabled={sysLoading}
              >
                {sysLoading ? "Memuat…" : "Segarkan"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
