"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

/* Modul 1 System Dashboard — Projects (spec vault §3).
   Registry project di PostgreSQL lewat /v1/dashboard/projects
   (bergerbang X-Admin-Token): daftar + filter status + pencarian,
   tambah/ubah, hapus lunak (soft delete) dengan konfirmasi. */

type Project = {
  id: number;
  name: string;
  description: string | null;
  tech_stack: string | null;
  local_path: string | null;
  repo_url: string | null;
  status: string;
  links: Record<string, string>;
  demo_video_url: string | null;
  demo_video_thumbnail: string | null;
  updated_at: string | null;
};

type FormState = {
  name: string;
  description: string;
  tech_stack: string;
  local_path: string;
  repo_url: string;
  status: string;
  link_demo: string;
  link_docs: string;
  link_vault: string;
  demo_video_url: string;
  demo_video_thumbnail: string;
};

const STATUSES = ["idea", "active", "maintenance", "archived"] as const;

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  tech_stack: "",
  local_path: "",
  repo_url: "",
  status: "active",
  link_demo: "",
  link_docs: "",
  link_vault: "",
  demo_video_url: "",
  demo_video_thumbnail: "",
};

function toForm(p: Project): FormState {
  return {
    name: p.name,
    description: p.description ?? "",
    tech_stack: p.tech_stack ?? "",
    local_path: p.local_path ?? "",
    repo_url: p.repo_url ?? "",
    status: p.status,
    link_demo: p.links?.demo ?? "",
    link_docs: p.links?.docs ?? "",
    link_vault: p.links?.vault ?? "",
    demo_video_url: p.demo_video_url ?? "",
    demo_video_thumbnail: p.demo_video_thumbnail ?? "",
  };
}

function toPayload(f: FormState) {
  const links: Record<string, string> = {};
  if (f.link_demo.trim()) links.demo = f.link_demo.trim();
  if (f.link_docs.trim()) links.docs = f.link_docs.trim();
  if (f.link_vault.trim()) links.vault = f.link_vault.trim();
  const blank = (v: string) => (v.trim() ? v.trim() : null);
  return {
    name: f.name.trim(),
    description: blank(f.description),
    tech_stack: blank(f.tech_stack),
    local_path: blank(f.local_path),
    repo_url: blank(f.repo_url),
    status: f.status,
    links,
    demo_video_url: blank(f.demo_video_url),
    demo_video_thumbnail: blank(f.demo_video_thumbnail),
  };
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProjectsPanel() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tick, setTick] = useState(0);

  const token = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("dashboard_token") || ""
      : "";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const qs = params.toString();
      const res = await fetch(
        apiUrl(`/v1/dashboard/projects${qs ? `?${qs}` : ""}`),
        { headers: { "X-Admin-Token": token() } },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal memuat (${res.status}).`);
      }
      const data = (await res.json()) as { items: Project[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar project.");
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load, tick]);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
    setConfirmId(null);
  }

  function openEdit(p: Project) {
    setForm(toForm(p));
    setFormError(null);
    setEditing(p);
    setConfirmId(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setFormError("Nama project wajib diisi.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const url = apiUrl(
        isNew
          ? "/v1/dashboard/projects"
          : `/v1/dashboard/projects/${(editing as Project).id}`,
      );
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify(toPayload(form)),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal menyimpan (${res.status}).`);
      }
      setEditing(null);
      setTick((t) => t + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Project) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/projects/${p.id}`), {
        method: "DELETE",
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) throw new Error(`Gagal menghapus (${res.status}).`);
      setConfirmId(null);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="proj">
      <div className="proj-toolbar">
        <input
          className="proj-search"
          type="search"
          placeholder="Cari project…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari project"
        />
        <select
          className="proj-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="proj-add" onClick={openNew}>
          + Tambah Project
        </button>
      </div>

      {editing && (
        <form
          className="proj-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <h3 className="proj-form-title">
            {editing === "new" ? "Tambah Project" : `Ubah: ${editing.name}`}
          </h3>
          <div className="proj-grid">
            <label className="proj-field proj-span2">
              <span>Nama *</span>
              <input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                maxLength={200}
              />
            </label>
            <label className="proj-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) => set("status")(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="proj-field proj-span2">
              <span>Deskripsi</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
              />
            </label>
            <label className="proj-field">
              <span>Tech stack</span>
              <input
                value={form.tech_stack}
                onChange={(e) => set("tech_stack")(e.target.value)}
                maxLength={300}
              />
            </label>
            <label className="proj-field">
              <span>Path lokal</span>
              <input
                value={form.local_path}
                onChange={(e) => set("local_path")(e.target.value)}
                maxLength={500}
                placeholder="~/Desktop/…"
              />
            </label>
            <label className="proj-field">
              <span>Repo URL</span>
              <input
                value={form.repo_url}
                onChange={(e) => set("repo_url")(e.target.value)}
                maxLength={500}
                placeholder="https://github.com/…"
              />
            </label>
            <label className="proj-field">
              <span>Link demo</span>
              <input
                value={form.link_demo}
                onChange={(e) => set("link_demo")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="proj-field">
              <span>Link docs</span>
              <input
                value={form.link_docs}
                onChange={(e) => set("link_docs")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="proj-field">
              <span>Vault note</span>
              <input
                value={form.link_vault}
                onChange={(e) => set("link_vault")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="proj-field">
              <span>Video demo (URL/path mp4/webm)</span>
              <input
                value={form.demo_video_url}
                onChange={(e) => set("demo_video_url")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="proj-field">
              <span>Thumbnail video (URL)</span>
              <input
                value={form.demo_video_thumbnail}
                onChange={(e) => set("demo_video_thumbnail")(e.target.value)}
                maxLength={500}
              />
            </label>
          </div>
          {formError && <p className="proj-error">{formError}</p>}
          <div className="proj-form-actions">
            <button type="submit" className="proj-save" disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              className="proj-cancel"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {error && <p className="proj-error">{error}</p>}
      {loading ? (
        <p className="proj-empty">Memuat daftar project…</p>
      ) : items.length === 0 ? (
        <p className="proj-empty">
          {q || status
            ? "Tidak ada project yang cocok dengan filter."
            : "Belum ada project terdaftar."}
        </p>
      ) : (
        <ul className="proj-list">
          {items.map((p) => (
            <li key={p.id} className="proj-card">
              {p.demo_video_thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="proj-thumb"
                  src={p.demo_video_thumbnail}
                  alt=""
                  loading="lazy"
                />
              )}
              <div className="proj-main">
                <div className="proj-row1">
                  <span className="proj-name">{p.name}</span>
                  <span className={`proj-badge proj-badge-${p.status}`}>
                    {p.status}
                  </span>
                </div>
                {p.description && (
                  <p className="proj-desc">{p.description}</p>
                )}
                <div className="proj-meta">
                  {p.tech_stack && <span>{p.tech_stack}</span>}
                  {p.local_path && (
                    <span className="proj-path">{p.local_path}</span>
                  )}
                  {p.updated_at && (
                    <span>Diubah {fmtDate(p.updated_at)}</span>
                  )}
                </div>
                <div className="proj-links">
                  {p.repo_url && (
                    <a href={p.repo_url} target="_blank" rel="noreferrer">
                      Repo
                    </a>
                  )}
                  {p.links?.demo && (
                    <a href={p.links.demo} target="_blank" rel="noreferrer">
                      Demo
                    </a>
                  )}
                  {p.links?.docs && (
                    <a href={p.links.docs} target="_blank" rel="noreferrer">
                      Docs
                    </a>
                  )}
                  {p.links?.vault && <span>Vault: {p.links.vault}</span>}
                  {p.demo_video_url && (
                    <a href={p.demo_video_url} target="_blank" rel="noreferrer">
                      Video demo
                    </a>
                  )}
                </div>
              </div>
              <div className="proj-actions">
                {confirmId === p.id ? (
                  <>
                    <span className="proj-confirm-text">Hapus project ini?</span>
                    <button
                      type="button"
                      className="proj-del-yes"
                      onClick={() => void remove(p)}
                    >
                      Ya, hapus
                    </button>
                    <button
                      type="button"
                      className="proj-mini"
                      onClick={() => setConfirmId(null)}
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="proj-mini"
                      onClick={() => openEdit(p)}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      className="proj-mini proj-del"
                      onClick={() => setConfirmId(p.id)}
                    >
                      Hapus
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
