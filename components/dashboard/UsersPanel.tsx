"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import FormModal from "./FormModal";
import {
  ADD,
  BADGE,
  BADGE_PLAIN,
  BADGE_TONE,
  CARD,
  DCARD_ACTIONS,
  DCARD_CONFIRM_TEXT,
  DCARD_FOOT,
  DCARD_HEAD,
  DCARD_NAME,
  DCARD_NOTE,
  DCARD_SUB,
  DICON_DANGER,
  DICON_LAYOUT,
  DICON_NEUTRAL,
  EMPTY,
  ERR,
  FIELD,
  FIELD_INPUT,
  FIELD_LABEL,
  FIELD_SELECT,
  FIELD_SPAN2,
  GRID,
  LIST,
  MINI,
  PATH,
  SAVE,
  SEARCH,
  TOOLBAR,
} from "./ui";
import {
  Ban,
  Check,
  KeyRound,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";

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
    <div className="mt-[18px]">
      <div className={TOOLBAR}>
        <input
          className={SEARCH}
          type="search"
          placeholder="Cari username / email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari user"
        />
        <select
          className={FIELD_SELECT}
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
          className={FIELD_SELECT}
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
        <button type="button" className={ADD} onClick={openNew}>
          + Tambah User
        </button>
      </div>

      {editing && (
        <FormModal
          title={editing === "new" ? "Tambah User" : `Ubah: ${editing.username}`}
          onClose={() => setEditing(null)}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          footer={
            <>
              {formError && <p className={`${ERR} m-0 mb-2.5`}>{formError}</p>}
              <div className="flex gap-2.5">
                <button type="submit" className={SAVE} disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
                <button
                  type="button"
                  className={MINI}
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Batal
                </button>
              </div>
            </>
          }
        >
          <div className={GRID}>
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Project *</span>
              <input className={FIELD_INPUT}
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
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Username *</span>
              <input className={FIELD_INPUT}
                value={form.username}
                onChange={(e) => set("username")(e.target.value)}
                maxLength={50}
              />
            </label>
            <label className={FIELD_SPAN2}>
              <span className={FIELD_LABEL}>Email *</span>
              <input className={FIELD_INPUT}
                type="email"
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                maxLength={200}
              />
            </label>
            {editing === "new" && (
              <label className={FIELD_SPAN2}>
                <span className={FIELD_LABEL}>Password awal * (min. 8 karakter)</span>
                <input className={FIELD_INPUT}
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password")(e.target.value)}
                  autoComplete="new-password"
                />
              </label>
            )}
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Role</span>
              <select className={FIELD_SELECT}
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
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Status</span>
              <select className={FIELD_SELECT}
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
              <p className="col-span-2 text-[12.5px] leading-[1.55] text-fog max-[640px]:col-span-1">
                Password tidak diubah dari form ini — gunakan tombol Reset
                Password pada kartu user.
              </p>
            )}
          </div>
        </FormModal>
      )}

      {resetMsg && <p className="m-0 mb-3 text-[13.5px] text-[#35d07f]">{resetMsg}</p>}
      {error && <p className={`${ERR} mt-3`}>{error}</p>}
      {loading ? (
        <p className={EMPTY}>Memuat daftar user…</p>
      ) : items.length === 0 ? (
        <p className={EMPTY}>
          {q || project || status
            ? "Tidak ada user yang cocok dengan filter."
            : "Belum ada user terdaftar. Tambah user pertama untuk aplikasi konsumenmu (mis. ViennaAssistantMobile)."}
        </p>
      ) : (
        <ul className={LIST}>
          {items.map((u) => (
                        <li key={u.id} className={CARD}>
              <div className={DCARD_HEAD}>
                <span className={DCARD_NAME}>{u.username}</span>
                <span className={`${BADGE} ${BADGE_PLAIN}`}>{u.role}</span>
                <span
                  className={`${BADGE} ${BADGE_TONE[u.status === "active" ? "active" : "archived"]}`}
                >
                  {u.status}
                </span>
              </div>
              <p className={DCARD_SUB}>
                <span className={PATH}>{u.project}</span>
                <span>{u.email}</span>
              </p>
              <p className={DCARD_SUB}>
                <span>
                  Login terakhir:{" "}
                  {u.last_login_at
                    ? fmtDateTime(u.last_login_at)
                    : "belum pernah"}
                </span>
                {u.created_at && (
                  <span>Dibuat {fmtDateTime(u.created_at)}</span>
                )}
              </p>
              {resetId === u.id && (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <input
                    className="flex-[1_1_220px] rounded-lg border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.05)] px-2.5 py-[7px] text-[13.5px] text-[#f2f2f2]"
                    type="password"
                    placeholder="Password baru (min. 8 karakter)"
                    value={resetPw}
                    onChange={(e) => setResetPw(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={MINI}
                    disabled={busyId === u.id}
                    onClick={() => void doReset(u)}
                  >
                    Simpan password baru
                  </button>
                  <button
                    type="button"
                    className={MINI}
                    onClick={() => {
                      setResetId(null);
                      setResetPw("");
                    }}
                  >
                    Batal
                  </button>
                </div>
              )}
              <div className={DCARD_FOOT}>
                <span className={DCARD_NOTE} />
                {confirmId === u.id ? (
                  <span className={DCARD_ACTIONS}>
                    <span className={DCARD_CONFIRM_TEXT}>Hapus user ini?</span>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      title="Ya, hapus"
                      aria-label="Ya, hapus"
                      onClick={() => void remove(u)}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      title="Batal"
                      aria-label="Batal"
                      onClick={() => setConfirmId(null)}
                    >
                      <X size={15} />
                    </button>
                  </span>
                ) : (
                  <span className={DCARD_ACTIONS}>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      title="Reset password"
                      aria-label="Reset password"
                      onClick={() => {
                        setResetId(resetId === u.id ? null : u.id);
                        setResetPw("");
                        setResetMsg(null);
                      }}
                    >
                      <KeyRound size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      title={
                        u.status === "active" ? "Suspend user" : "Aktifkan user"
                      }
                      aria-label={
                        u.status === "active" ? "Suspend user" : "Aktifkan user"
                      }
                      disabled={busyId === u.id}
                      onClick={() => void toggleStatus(u)}
                    >
                      {u.status === "active" ? (
                        <Ban size={15} />
                      ) : (
                        <RotateCcw size={15} />
                      )}
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      title="Ubah"
                      aria-label="Ubah"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      title="Hapus"
                      aria-label="Hapus"
                      onClick={() => setConfirmId(u.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
