"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { apiUrl } from "@/lib/api";
import FormModal from "./FormModal";
import {
  Check,
  EyeOff,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";

/* Modul 4 System Dashboard — Contents (spec vault §6; diskusi skema
   8 Nov 2026). Artikel markdown (project/blog/paper/research) lewat
   /v1/dashboard/contents (bergerbang X-Admin-Token). Yang berstatus
   published tersaji publik lewat GET /v1/contents (+ /{slug}) tanpa
   token; draft tidak pernah bocor ke sisi publik. */

type Content = {
  id: number;
  type: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  tags: string[];
  thumbnail: string | null;
  status: string;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type FormState = {
  type: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  tags_text: string;
  thumbnail: string;
  status: string;
};

const TYPES = ["blog", "project", "paper", "research"] as const;
const STATUSES = ["draft", "published"] as const;

const EMPTY_FORM: FormState = {
  type: "blog",
  title: "",
  slug: "",
  summary: "",
  body: "",
  tags_text: "",
  thumbnail: "",
  status: "draft",
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

function toForm(c: Content): FormState {
  return {
    type: c.type,
    title: c.title,
    slug: c.slug,
    summary: c.summary ?? "",
    body: c.body ?? "",
    tags_text: (c.tags || []).join(", "),
    thumbnail: c.thumbnail ?? "",
    status: c.status,
  };
}

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

export default function ContentsPanel() {
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Content | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
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
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const qs = params.toString();
      const res = await fetch(
        apiUrl(`/v1/dashboard/contents${qs ? `?${qs}` : ""}`),
        { headers: { "X-Admin-Token": token() } },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal memuat (${res.status}).`);
      }
      const data = (await res.json()) as { items: Content[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar konten.");
    } finally {
      setLoading(false);
    }
  }, [q, type, status]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void load(), 250);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [load, tick]);

  function openNew() {
    setForm(EMPTY_FORM);
    setSlugTouched(false);
    setPreview(false);
    setFormError(null);
    setEditing("new");
    setConfirmId(null);
  }

  function openEdit(c: Content) {
    setForm(toForm(c));
    setSlugTouched(true);
    setPreview(false);
    setFormError(null);
    setEditing(c);
    setConfirmId(null);
  }

  function payloadFromForm() {
    const blank = (v: string) => (v.trim() ? v.trim() : null);
    return {
      type: form.type,
      title: form.title.trim(),
      slug: blank(form.slug),
      summary: blank(form.summary),
      body: form.body,
      tags: form.tags_text
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      thumbnail: blank(form.thumbnail),
      status: form.status,
    };
  }

  async function save() {
    if (!form.title.trim()) {
      setFormError("Judul wajib diisi.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const url = apiUrl(
        isNew
          ? "/v1/dashboard/contents"
          : `/v1/dashboard/contents/${(editing as Content).id}`,
      );
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify(payloadFromForm()),
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

  async function togglePublish(c: Content) {
    setBusyId(c.id);
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/contents/${c.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify({
          type: c.type,
          title: c.title,
          slug: c.slug,
          summary: c.summary,
          body: c.body,
          tags: c.tags,
          thumbnail: c.thumbnail,
          status: c.status === "published" ? "draft" : "published",
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal mengubah status (${res.status}).`);
      }
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah status.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c: Content) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/contents/${c.id}`), {
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

  return (
    <div className="proj">
      <div className="proj-toolbar">
        <input
          className="proj-search"
          type="search"
          placeholder="Cari judul / slug…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari konten"
        />
        <select
          className="proj-filter"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter tipe"
        >
          <option value="">Semua tipe</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
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
          + Tambah Konten
        </button>
      </div>

      {editing && (
        <FormModal
          title={editing === "new" ? "Tambah Konten" : `Ubah: ${editing.title}`}
          onClose={() => setEditing(null)}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          footer={
            <>
              {formError && <p className="proj-error">{formError}</p>}
              <div className="proj-form-actions dash-modal-actions">
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
            </>
          }
        >
          <div className="proj-grid">
            <label className="proj-field proj-span2">
              <span>Judul *</span>
              <input
                value={form.title}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({
                    ...f,
                    title: v,
                    slug:
                      editing === "new" && !slugTouched
                        ? slugify(v)
                        : f.slug,
                  }));
                }}
                maxLength={200}
              />
            </label>
            <label className="proj-field">
              <span>Tipe</span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="proj-field">
              <span>Slug (otomatis bila dikosongkan)</span>
              <input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setForm((f) => ({ ...f, slug: e.target.value }));
                }}
                maxLength={220}
                placeholder="judul-artikel-dengan-strip"
              />
            </label>
            <label className="proj-field">
              <span>Status</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({ ...f, status: e.target.value }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="proj-field proj-span2">
              <span>Ringkasan</span>
              <textarea
                rows={2}
                value={form.summary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, summary: e.target.value }))
                }
              />
            </label>
            <div className="proj-field proj-span2">
              <span className="cnt-body-label">
                Isi (markdown)
                <button
                  type="button"
                  className="proj-mini"
                  onClick={() => setPreview((p) => !p)}
                >
                  {preview ? "Tulis" : "Pratinjau"}
                </button>
              </span>
              {preview ? (
                <div className="cnt-preview">
                  <ReactMarkdown>{form.body || "*Belum ada isi.*"}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  rows={10}
                  value={form.body}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, body: e.target.value }))
                  }
                  spellCheck={false}
                  placeholder={"# Judul\n\nTulis isi artikel dalam markdown…"}
                />
              )}
            </div>
            <label className="proj-field">
              <span>Tag (pisahkan koma)</span>
              <input
                value={form.tags_text}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags_text: e.target.value }))
                }
                placeholder="mis. fastapi, riset"
              />
            </label>
            <label className="proj-field">
              <span>Thumbnail (URL / path)</span>
              <input
                value={form.thumbnail}
                onChange={(e) =>
                  setForm((f) => ({ ...f, thumbnail: e.target.value }))
                }
                maxLength={500}
                placeholder="https://… atau /images/…"
              />
            </label>
          </div>
        </FormModal>
      )}

      {error && <p className="proj-error">{error}</p>}
      {loading ? (
        <p className="proj-empty">Memuat daftar konten…</p>
      ) : items.length === 0 ? (
        <p className="proj-empty">
          {q || type || status
            ? "Tidak ada konten yang cocok dengan filter."
            : "Belum ada konten. Tulis artikel pertamamu — yang berstatus published bisa dibaca publik lewat API konten."}
        </p>
      ) : (
        <ul className="proj-list">
          {items.map((c) => (
                        <li key={c.id} className="dcard">
              <div className="dcard-head">
                <span className="dcard-name">{c.title}</span>
                <span className="proj-badge">{c.type}</span>
                <span
                  className={`proj-badge proj-badge-${
                    c.status === "published" ? "active" : "idea"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <p className="dcard-sub">
                <span className="proj-path">/contents/{c.slug}</span>
                {c.published_at && (
                  <span>Terbit {fmtDateTime(c.published_at)}</span>
                )}
                {c.updated_at && (
                  <span>Diubah {fmtDateTime(c.updated_at)}</span>
                )}
              </p>
              {c.summary && <p className="dcard-desc">{c.summary}</p>}
              {c.tags.length > 0 && (
                <div className="cnt-tags">
                  {c.tags.map((t) => (
                    <span key={t} className="cnt-tag">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="dcard-foot">
                <span className="dcard-foot-note" />
                {confirmId === c.id ? (
                  <span className="dcard-confirm">
                    <span className="dcard-confirm-text">
                      Hapus konten ini?
                    </span>
                    <button
                      type="button"
                      className="dicon-btn is-danger"
                      title="Ya, hapus"
                      aria-label="Ya, hapus"
                      onClick={() => void remove(c)}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className="dicon-btn"
                      title="Batal"
                      aria-label="Batal"
                      onClick={() => setConfirmId(null)}
                    >
                      <X size={15} />
                    </button>
                  </span>
                ) : (
                  <span className="dcard-actions">
                    <button
                      type="button"
                      className="dicon-btn"
                      title={
                        c.status === "published"
                          ? "Tarik (jadikan draft)"
                          : "Terbitkan"
                      }
                      aria-label={
                        c.status === "published"
                          ? "Tarik (jadikan draft)"
                          : "Terbitkan"
                      }
                      disabled={busyId === c.id}
                      onClick={() => void togglePublish(c)}
                    >
                      {c.status === "published" ? (
                        <EyeOff size={15} />
                      ) : (
                        <Send size={15} />
                      )}
                    </button>
                    <button
                      type="button"
                      className="dicon-btn"
                      title="Ubah"
                      aria-label="Ubah"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="dicon-btn is-danger"
                      title="Hapus"
                      aria-label="Hapus"
                      onClick={() => setConfirmId(c.id)}
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
