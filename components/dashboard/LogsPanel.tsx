"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import {
  BADGE,
  BADGE_PLAIN,
  BADGE_TONE,
  EMPTY,
  ERR,
  FIELD_SELECT,
  LIST,
  MINI,
  SEARCH,
  TOOLBAR,
} from "./ui";

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


const LOG_BADGE: Record<string, string> = {
  ingest: "border-[rgba(88,166,255,0.45)] text-[#00BBA2]",
  maintenance: "border-[rgba(0,255,170,0.45)] text-gold",
  query: "border-[rgba(53,208,127,0.45)] text-[#00FFAA]",
  create: "border-[rgba(188,140,255,0.45)] text-[#bc8cff]",
};
const LVL_TONE: Record<string, string> = {
  INFO: "text-[#00BBA2]",
  WARNING: "text-gold",
  ERROR: "text-rose",
};
const SUBTAB =
  "cursor-pointer rounded-lg border px-[15px] py-[7px] text-[13.5px]";
const SUBTAB_OFF =
  "border-line bg-[rgba(10,24,71,0.7)] text-[#AFC2E6] hover:border-steel hover:text-white";
const SUBTAB_ON =
  "border-[rgba(0,255,170,0.45)] bg-[rgba(0,255,170,0.14)] text-[#5EEAD0] hover:border-steel hover:text-white";

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

  const vDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (vDebounce.current) clearTimeout(vDebounce.current);
    vDebounce.current = setTimeout(() => void loadVault(), 250);
    return () => {
      if (vDebounce.current) clearTimeout(vDebounce.current);
    };
  }, [loadVault]);

  const bDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (bDebounce.current) clearTimeout(bDebounce.current);
    bDebounce.current = setTimeout(() => void loadBackend(), 250);
    return () => {
      if (bDebounce.current) clearTimeout(bDebounce.current);
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
    <div className="mt-[18px]">
      <div className="mb-4 flex gap-2" role="tablist" aria-label="Sumber log">
        <button
          type="button"
          className={`${SUBTAB} ${view === "vault" ? SUBTAB_ON : SUBTAB_OFF}`}
          onClick={() => setView("vault")}
        >
          Vault
        </button>
        <button
          type="button"
          className={`${SUBTAB} ${view === "backend" ? SUBTAB_ON : SUBTAB_OFF}`}
          onClick={() => setView("backend")}
        >
          Backend
        </button>
        <button
          type="button"
          className={`${SUBTAB} ${view === "system" ? SUBTAB_ON : SUBTAB_OFF}`}
          onClick={() => setView("system")}
        >
          Sistem
        </button>
      </div>

      {view === "vault" && (
        <div>
          <div className={TOOLBAR}>
            <input
              className={SEARCH}
              type="search"
              placeholder="Cari di log vault…"
              value={vQ}
              onChange={(e) => setVQ(e.target.value)}
              aria-label="Cari log vault"
            />
            <select
              className={FIELD_SELECT}
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
            <span className="self-center text-[13px] text-fog">{vTotal} entri</span>
          </div>
          {vError && <p className={`${ERR} mt-3`}>{vError}</p>}
          {vLoading ? (
            <p className={EMPTY}>Memuat log vault…</p>
          ) : vItems.length === 0 ? (
            <p className={EMPTY}>Tidak ada entri yang cocok.</p>
          ) : (
            <ul className={LIST}>
              {vItems.map((e, i) => (
                <li key={`${e.timestamp}-${i}`} className="overflow-hidden rounded-[14px] border border-line bg-[rgba(12,12,14,0.72)]">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer flex-wrap items-center gap-2.5 border-none px-4 py-3 text-left text-inherit [background:none] hover:bg-[rgba(255,255,255,0.03)]"
                    onClick={() => setVOpen(vOpen === i ? null : i)}
                  >
                    <span className="flex-shrink-0 text-[12.5px] text-fog [font-family:ui-monospace,monospace]">{e.timestamp}</span>
                    <span className={`${BADGE} ${LOG_BADGE[e.category] ?? BADGE_PLAIN}`}>
                      {e.category}
                    </span>
                    <span className="text-[14.5px] font-semibold text-paper">{e.title}</span>
                  </button>
                  {vOpen === i && (
                    <div className="px-4 pb-3.5 text-sm leading-[1.6] whitespace-pre-wrap text-[#AFC2E6]">
                      <p>{e.summary}</p>
                      {e.pages.length > 0 && (
                        <p className="mt-2 text-[12.5px] text-fog">
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
          <div className={TOOLBAR}>
            <input
              className={SEARCH}
              type="search"
              placeholder="Cari di log backend…"
              value={bQ}
              onChange={(e) => setBQ(e.target.value)}
              aria-label="Cari log backend"
            />
            <select
              className={FIELD_SELECT}
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
              className={FIELD_SELECT}
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
              className={MINI}
              onClick={() => void loadBackend()}
            >
              Segarkan
            </button>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-[#AFC2E6]">
              <input
                type="checkbox"
                checked={bFollow}
                onChange={(e) => setBFollow(e.target.checked)}
              />
              Ikuti otomatis
            </label>
            <span className="self-center text-[13px] text-fog">{bTotal} baris</span>
          </div>
          {bError && <p className={`${ERR} mt-3`}>{bError}</p>}
          {bLoading ? (
            <p className={EMPTY}>Memuat log backend…</p>
          ) : bItems.length === 0 ? (
            <p className={EMPTY}>Tidak ada baris yang cocok.</p>
          ) : (
            <div className="mt-3.5 max-h-[520px] overflow-y-auto rounded-[14px] border border-line bg-[#050E2E] px-3.5 py-3">
              {bItems.map((l, i) => (
                <div key={i} className="flex gap-2.5 border-b border-[rgba(255,255,255,0.03)] py-[3px] text-[12.5px] leading-[1.55] [font-family:ui-monospace,monospace]">
                  <span className={`w-[62px] flex-shrink-0 pt-0.5 text-[11px] font-bold tracking-[0.04em] ${LVL_TONE[l.level] ?? ""}`}>
                    {l.level}
                  </span>
                  <span className="whitespace-pre-wrap text-[#AFC2E6] [word-break:break-word]">{l.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "system" && (
        <div>
          {sysError && <p className={`${ERR} mt-3`}>{sysError}</p>}
          {sysLoading && !sys ? (
            <p className={EMPTY}>Memuat info sistem…</p>
          ) : sys ? (
            <div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3">
                <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-[rgba(12,12,14,0.72)] px-4 py-3.5">
                  <span className="text-xs font-bold tracking-[0.05em] uppercase text-fog">CPU</span>
                  <span className="text-[26px] font-extrabold text-paper">{sys.cpu_percent}%</span>
                  <span className="text-[12.5px] text-fog">{sys.cpu_count ?? "-"} core</span>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, sys.cpu_percent)}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-[rgba(12,12,14,0.72)] px-4 py-3.5">
                  <span className="text-xs font-bold tracking-[0.05em] uppercase text-fog">RAM</span>
                  <span className="text-[26px] font-extrabold text-paper">{sys.memory.percent}%</span>
                  <span className="text-[12.5px] text-fog">
                    {(sys.memory.used_mb / 1024).toFixed(1)} /{" "}
                    {(sys.memory.total_mb / 1024).toFixed(1)} GB
                  </span>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, sys.memory.percent)}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-[rgba(12,12,14,0.72)] px-4 py-3.5">
                  <span className="text-xs font-bold tracking-[0.05em] uppercase text-fog">Disk {sys.disk.path}</span>
                  <span className="text-[26px] font-extrabold text-paper">{sys.disk.percent}%</span>
                  <span className="text-[12.5px] text-fog">
                    {sys.disk.used_gb} / {sys.disk.total_gb} GB
                  </span>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${Math.min(100, sys.disk.percent)}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1 rounded-[14px] border border-line bg-[rgba(12,12,14,0.72)] px-4 py-3.5">
                  <span className="text-xs font-bold tracking-[0.05em] uppercase text-fog">Uptime</span>
                  <span className="pt-1 text-[19px] font-extrabold text-paper">
                    {fmtUptime(sys.uptime_seconds)}
                  </span>
                  <span className="text-[12.5px] text-fog">
                    sejak {sys.boot_time.replace("T", " ")}
                  </span>
                </div>
              </div>
              <p className="mt-3.5 mb-2.5 text-[13px] text-fog">
                {sys.hostname} — {sys.os}
              </p>
              <button
                type="button"
                className={MINI}
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
