"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

/* Modul 5 System Dashboard — Users (spec vault §7; diskusi skema
   8 Nov 2026). Registry user per project lewat /v1/dashboard/users
   (bergerbang X-Admin-Token). Password hanya dikirim saat buat/reset
   dan langsung di-hash bcrypt di backend — panel tidak pernah
   menerima hash maupun menyimpannya. Konsumen pertama:
   ViennaAssistantMobile. */

type AppUser = {
  id: number;
  project: string;
  username: string;
  email: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormState = {
  project: string;
  username: string;
  email: string;
  password: string;
  role: string;
  status: string;
};

const ROLES = ["user", "admin"] as const;
const STATUSES = ["active", "suspended"] as const;
const PROJECT_SUGGESTIONS = ["vienna-assistant-mobile"];

const EMPTY_FORM: FormState = {
  project: "vienna-assistant-mobile",
  username: "",
  email: "",
  password: "",
  role: "user",
  status: "active",
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UsersPanel() {
  const [items, setItems] = useState<AppUser[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [project, setProject] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [resetPw, setResetPw] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
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
      if (project) params.set("project", project);
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const qs = params.toString();
      const res = await fetch(apiUrl(`/v1/dashboard/users${qs ? `?${qs}` : ""}`), {
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal memuat (${res.status}).`);
      }
      const data = (await res.json()) as {
        items: AppUser[];
        projects: string[];
      };
      setItems(data.items);
      setProjects(data.projects || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar user.");
    } finally {
      setLoading(false);
    }
  }, [q, project, status]);

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
    setResetId(null);
  }

  function openEdit(u: AppUser) {
    setForm({
      project: u.project,
      username: u.username,
      email: u.email,
      password: "",
      role: u.role,
      status: u.status,
    });
    setFormError(null);
    setEditing(u);
    setConfirmId(null);
    setResetId(null);
  }

  async function save() {
    if (!form.username.trim()) {
      setFormError("Username wajib diisi.");
      return;
    }
    if (!form.email.trim()) {
      setFormError("Email wajib diisi.");
      return;
    }
    const isNew = editing === "new";
    if (isNew && form.password.length < 8) {
      setFormError("Password awal wajib diisi, minimal 8 karakter.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const base = {
        project: form.project.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
      };
      const url = apiUrl(
        isNew
          ? "/v1/dashboard/users"
          : `/v1/dashboard/users/${(editing as AppUser).id}`,
      );
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify(
          isNew ? { ...base, password: form.password } : base,
        ),
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

  async function toggleStatus(u: AppUser) {
    setBusyId(u.id);
    try {
      const action = u.status === "active" ? "suspend" : "activate";
      const res = await fetch(apiUrl(`/v1/dashboard/users/${u.id}/${action}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: "{}",
      });
      if (!res.ok) throw new Error(`Gagal mengubah status (${res.status}).`);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status.");
    } finally {
      setBusyId(null);
    }
  }

  async function doReset(u: AppUser) {
    if (resetPw.length < 8) {
      setResetMsg("Password baru minimal 8 karakter.");
      return;
    }
    setBusyId(u.id);
    setResetMsg(null);
    try {
      const res = await fetch(
        apiUrl(`/v1/dashboard/users/${u.id}/reset-password`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": token(),
          },
          body: JSON.stringify({ password: resetPw }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal reset (${res.status}).`);
      }
      setResetPw("");
      setResetId(null);
      setResetMsg(`Password ${u.username} sudah direset.`);
    } catch (e) {
      setResetMsg(e instanceof Error ? e.message : "Gagal reset password.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u: AppUser) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/users/${u.id}`), {
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

  const projectOptions = Array.from(
    new Set([...PROJECT_SUGGESTIONS, ...projects]),
  );

  return (
    <div className="proj">
      <div className="proj-toolbar">
        <input
          className="proj-search"
          type="search"
          placeholder="Cari username / email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari user"
        />
        <select
          className="proj-filter"
          value={project}
          onChange={(e) => setProject(e.target.value)}
          aria-label="Filter project"
        >
          <option value="">Semua project</option>
          {projectOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
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
          + Tambah User
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
            {editing === "new" ? "Tambah User" : `Ubah: ${editing.username}`}
          </h3>
          <div className="proj-grid">
            <label className="proj-field">
              <span>Project *</span>
              <input
                value={form.project}
                onChange={(e) => set("project")(e.target.value)}
                list="usr-projects"
                maxLength={61}
              />
              <datalist id="usr-projects">
                {projectOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <label className="proj-field">
              <span>Username *</span>
              <input
                value={form.username}
                onChange={(e) => set("username")(e.target.value)}
                maxLength={50}
              />
            </label>
            <label className="proj-field proj-span2">
              <span>Email *</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                maxLength={200}
              />
            </label>
            {editing === "new" && (
              <label className="proj-field proj-span2">
                <span>Password awal * (min. 8 karakter)</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            )}
            <label className="proj-field">
              <span>Role</span>
              <select
                value={form.role}
                onChange={(e) => set("role")(e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
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
            {editing !== "new" && (
              <p className="intg-hint proj-span2">
                Password tidak diubah dari form ini — gunakan tombol Reset
                Password pada kartu user.
              </p>
            )}
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

      {resetMsg && <p className="usr-msg">{resetMsg}</p>}
      {error && <p className="proj-error">{error}</p>}
      {loading ? (
        <p className="proj-empty">Memuat daftar user…</p>
      ) : items.length === 0 ? (
        <p className="proj-empty">
          {q || project || status
            ? "Tidak ada user yang cocok dengan filter."
            : "Belum ada user terdaftar. Tambah user pertama untuk aplikasi konsumenmu (mis. ViennaAssistantMobile)."}
        </p>
      ) : (
        <ul className="proj-list">
          {items.map((u) => (
            <li key={u.id} className="proj-card">
              <div className="proj-main">
                <div className="proj-row1">
                  <span className="proj-name">{u.username}</span>
                  <span className="proj-badge">{u.role}</span>
                  <span
                    className={`proj-badge proj-badge-${
                      u.status === "active" ? "active" : "archived"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>
                <p className="proj-meta">
                  <span className="proj-path">{u.project}</span>
                  <span>{u.email}</span>
                </p>
                <div className="proj-meta">
                  <span>
                    Login terakhir:{" "}
                    {u.last_login_at
                      ? fmtDateTime(u.last_login_at)
                      : "belum pernah"}
                  </span>
                  {u.created_at && (
                    <span>Dibuat {fmtDateTime(u.created_at)}</span>
                  )}
                </div>
                {resetId === u.id && (
                  <div className="usr-reset">
                    <input
                      type="password"
                      placeholder="Password baru (min. 8 karakter)"
                      value={resetPw}
                      onChange={(e) => setResetPw(e.target.value)}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="proj-mini"
                      disabled={busyId === u.id}
                      onClick={() => void doReset(u)}
                    >
                      Simpan password baru
                    </button>
                    <button
                      type="button"
                      className="proj-mini"
                      onClick={() => {
                        setResetId(null);
                        setResetPw("");
                      }}
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>
              <div className="proj-actions">
                {confirmId === u.id ? (
                  <>
                    <span className="proj-confirm-text">Hapus user ini?</span>
                    <button
                      type="button"
                      className="proj-del-yes"
                      onClick={() => void remove(u)}
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
                      onClick={() => {
                        setResetId(resetId === u.id ? null : u.id);
                        setResetPw("");
                        setResetMsg(null);
                      }}
                    >
                      Reset Password
                    </button>
                    <button
                      type="button"
                      className="proj-mini"
                      disabled={busyId === u.id}
                      onClick={() => void toggleStatus(u)}
                    >
                      {u.status === "active" ? "Suspend" : "Aktifkan"}
                    </button>
                    <button
                      type="button"
                      className="proj-mini"
                      onClick={() => openEdit(u)}
                    >
                      Ubah
                    </button>
                    <button
                      type="button"
                      className="proj-mini proj-del"
                      onClick={() => setConfirmId(u.id)}
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
