"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import FormModal from "./FormModal";
import MediaField from "./MediaField";
import {
  BADGE,
  BADGE_TONE,
  CARD,
  DICON_DANGER,
  DICON_GOLD,
  DICON_GOLD_STAR,
  DICON_LAYOUT,
  DICON_NEUTRAL,
  DICON_STAR,
  ERR,
  FIELD_INPUT,
  FIELD_SELECT,
} from "./ui";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  X,
} from "lucide-react";

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
  image_url: string | null;
  demo_video_url: string | null;
  demo_video_thumbnail: string | null;
  is_featured: boolean;
  featured_order: number | null;
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
  image_url: string;
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
  image_url: "",
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
    image_url: p.image_url ?? "",
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
    image_url: blank(f.image_url),
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
  // Top Project (pin unggulan -> section Projects portofolio): daftar
  // featured SELALU dimuat tanpa filter agar urutan & batas 4 akurat.
  const [featuredItems, setFeaturedItems] = useState<Project[]>([]);

  const loadFeatured = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/v1/dashboard/projects"), {
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: Project[] };
      const feat = data.items
        .filter((p) => p.is_featured)
        .sort(
          (a, b) =>
            (a.featured_order ?? 99) - (b.featured_order ?? 99) ||
            a.name.localeCompare(b.name),
        );
      setFeaturedItems(feat);
    } catch {
      /* strip featured gagal dimuat — daftar utama tetap jalan */
    }
  }, []);

  useEffect(() => {
    void loadFeatured();
  }, [loadFeatured, tick]);

  async function toggleFeatured(p: Project) {
    try {
      const res = await fetch(
        apiUrl(`/v1/dashboard/projects/${p.id}/featured`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": token(),
          },
          body: JSON.stringify({ featured: !p.is_featured }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal mengubah pin (${res.status}).`);
      }
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengubah pin.");
    }
  }

  async function moveFeatured(p: Project, dir: -1 | 1) {
    const ids = featuredItems.map((x) => x.id);
    const i = ids.indexOf(p.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      const res = await fetch(
        apiUrl("/v1/dashboard/projects/reorder-featured"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": token(),
          },
          body: JSON.stringify({ ids }),
        },
      );
      if (!res.ok) throw new Error(`Gagal mengurutkan (${res.status}).`);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengurutkan.");
    }
  }

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
    <div className="mt-[18px]">
      <div className="mb-4 rounded-[14px] border border-[rgba(227,179,65,0.35)] bg-[rgba(227,179,65,0.06)] px-4 py-3">
        <div className="flex items-center justify-between gap-2.5">
          <span className="min-w-0 text-[13.5px] font-bold text-gold">
            ★ Top Project — tampil di section Projects portofolio
          </span>
          <span className="rounded-full border border-steel px-2.5 py-0.5 text-[12.5px] font-bold text-[#c9c9cf]">{featuredItems.length}/4</span>
        </div>
        {featuredItems.length === 0 ? (
          <p className="mt-2 text-[13px] leading-[1.5] text-fog">
            Belum ada yang di-pin. Klik tombol Pin pada project di bawah —
            maksimal 4, urutannya bisa diatur di sini.
          </p>
        ) : (
          <ol className="mt-2.5 flex list-none flex-col gap-2 p-0">
            {featuredItems.map((p, i) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[rgba(227,179,65,0.18)] text-xs font-extrabold text-gold">{i + 1}</span>
                <span className="text-sm font-semibold text-paper">{p.name}</span>
                {(p.status === "idea" || p.status === "archived") && (
                  <span className="text-xs text-rose">
                    status {p.status} — tidak tampil ke publik
                  </span>
                )}
                <span className="ml-auto inline-flex gap-1.5">
                  <button
                    type="button"
                    className={`${DICON_LAYOUT} h-7 w-7 rounded-[7px] ${DICON_NEUTRAL}`}
                    disabled={i === 0}
                    onClick={() => void moveFeatured(p, -1)}
                    aria-label={`Naikkan ${p.name}`}
                    title="Naikkan"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${DICON_LAYOUT} h-7 w-7 rounded-[7px] ${DICON_NEUTRAL}`}
                    disabled={i === featuredItems.length - 1}
                    onClick={() => void moveFeatured(p, 1)}
                    aria-label={`Turunkan ${p.name}`}
                    title="Turunkan"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${DICON_LAYOUT} h-7 w-7 rounded-[7px] ${DICON_GOLD}`}
                    onClick={() => void toggleFeatured(p)}
                    aria-label={`Lepas pin ${p.name}`}
                    title="Lepas pin"
                  >
                    <PinOff size={14} />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <input
          className="flex-[1_1_220px] rounded-[10px] border border-line bg-[#0c0c0e] px-3 py-[9px] text-sm text-paper outline-none"
          type="search"
          placeholder="Cari project…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari project"
        />
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
        <button type="button" className="cursor-pointer rounded-lg border-none bg-accent px-4 py-[9px] text-sm font-semibold text-white hover:bg-[#1a8dff]" onClick={openNew}>
          + Tambah Project
        </button>
      </div>

      {editing && (
        <FormModal
          title={editing === "new" ? "Tambah Project" : `Ubah: ${editing.name}`}
          onClose={() => setEditing(null)}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          footer={
            <>
              {formError && <p className={`${ERR} m-0 mb-2.5`}>{formError}</p>}
              <div className="flex gap-2.5">
                <button type="submit" className="cursor-pointer rounded-lg border-none bg-accent px-[18px] py-[9px] text-sm font-semibold text-white disabled:cursor-default disabled:opacity-60" disabled={saving}>
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-line bg-[rgba(16,16,19,0.7)] px-3.5 py-2 text-[13px] text-[#c9c9cf] hover:border-steel hover:text-white"
                  onClick={() => setEditing(null)}
                  disabled={saving}
                >
                  Batal
                </button>
              </div>
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3 max-[640px]:grid-cols-1">
            <label className="col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Nama *</span>
              <input className={FIELD_INPUT}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                maxLength={200}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Status</span>
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
            <label className="col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Deskripsi</span>
              <textarea className={`${FIELD_INPUT} resize-y`}
                rows={3}
                value={form.description}
                onChange={(e) => set("description")(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Tech stack</span>
              <input className={FIELD_INPUT}
                value={form.tech_stack}
                onChange={(e) => set("tech_stack")(e.target.value)}
                maxLength={300}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Path lokal</span>
              <input className={FIELD_INPUT}
                value={form.local_path}
                onChange={(e) => set("local_path")(e.target.value)}
                maxLength={500}
                placeholder="~/Desktop/…"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Repo URL</span>
              <input className={FIELD_INPUT}
                value={form.repo_url}
                onChange={(e) => set("repo_url")(e.target.value)}
                maxLength={500}
                placeholder="https://github.com/…"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Link demo</span>
              <input className={FIELD_INPUT}
                value={form.link_demo}
                onChange={(e) => set("link_demo")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Link docs</span>
              <input className={FIELD_INPUT}
                value={form.link_docs}
                onChange={(e) => set("link_docs")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Vault note</span>
              <input className={FIELD_INPUT}
                value={form.link_vault}
                onChange={(e) => set("link_vault")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Video demo (URL/path mp4/webm)</span>
              <input className={FIELD_INPUT}
                value={form.demo_video_url}
                onChange={(e) => set("demo_video_url")(e.target.value)}
                maxLength={500}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Thumbnail video (URL)</span>
              <input className={FIELD_INPUT}
                value={form.demo_video_thumbnail}
                onChange={(e) => set("demo_video_thumbnail")(e.target.value)}
                maxLength={500}
              />
            </label>
            <MediaField
              label="Gambar project (URL)"
              value={form.image_url}
              onChange={set("image_url")}
            />
          </div>
        </FormModal>
      )}

      {error && <p className={`${ERR} mt-3`}>{error}</p>}
      {loading ? (
        <p className="mt-[18px] text-sm text-fog">Memuat daftar project…</p>
      ) : items.length === 0 ? (
        <p className="mt-[18px] text-sm text-fog">
          {q || status
            ? "Tidak ada project yang cocok dengan filter."
            : "Belum ada project terdaftar."}
        </p>
      ) : (
        <ul className="mt-4 flex list-none flex-col gap-3 p-0">
          {items.map((p) => (
                        <li
              key={p.id}
              className={`${CARD} ${p.is_featured ? "before:bg-[linear-gradient(90deg,#e8b93e,rgba(232,185,62,0))]" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {(p.image_url ?? p.demo_video_thumbnail) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-11 w-11 flex-none rounded-[9px] border border-[#26262c] object-cover"
                    src={p.image_url ?? p.demo_video_thumbnail ?? ""}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className="mr-0.5 text-[15.5px] font-[650] text-[#f4f4f6]">{p.name}</span>
                <span className={`${BADGE} ${BADGE_TONE[p.status] ?? "border-line text-[#c9c9cf]"}`}>
                  {p.status}
                </span>
                {p.is_featured && (
                  <span className={`${BADGE} border-[rgba(227,179,65,0.55)] text-gold`}>
                    ★ TOP{p.featured_order ? ` #${p.featured_order}` : ""}
                  </span>
                )}
              </div>
              {p.description && <p className="mt-2.5 mb-0 text-[13px] leading-[1.55] text-[#c6c6cf]">{p.description}</p>}
              <p className="mt-[7px] mb-0 flex flex-wrap gap-3.5 text-xs text-[#9a9aa6]">
                {p.tech_stack && <span>{p.tech_stack}</span>}
                {p.local_path && (
                  <span className="[font-family:ui-monospace,monospace]">{p.local_path}</span>
                )}
                {p.updated_at && <span>Diubah {fmtDate(p.updated_at)}</span>}
              </p>
              <div className="mt-3.5 flex items-center gap-3 border-t border-[#202026] pt-2.5 pb-3">
                <div className="min-w-0 text-[12.5px]">
                  {(p.repo_url ||
                    p.links?.demo ||
                    p.links?.docs ||
                    p.links?.vault ||
                    p.demo_video_url) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]">
                      {p.repo_url && (
                        <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-[#58a6ff] no-underline hover:underline">
                          Repo
                        </a>
                      )}
                      {p.links?.demo && (
                        <a href={p.links.demo} target="_blank" rel="noreferrer" className="text-[#58a6ff] no-underline hover:underline">
                          Demo
                        </a>
                      )}
                      {p.links?.docs && (
                        <a href={p.links.docs} target="_blank" rel="noreferrer" className="text-[#58a6ff] no-underline hover:underline">
                          Docs
                        </a>
                      )}
                      {p.links?.vault && <span className="text-fog">Vault: {p.links.vault}</span>}
                      {p.demo_video_url && (
                        <a
                          href={p.demo_video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#58a6ff] no-underline hover:underline"
                        >
                          Video demo
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {confirmId === p.id ? (
                  <span className="ml-auto inline-flex flex-none items-center gap-1.5">
                    <span className="mr-0.5 text-[12.5px] text-[#f0b4b4]">
                      Hapus project ini?
                    </span>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      title="Ya, hapus"
                      aria-label="Ya, hapus"
                      onClick={() => void remove(p)}
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
                  <span className="ml-auto inline-flex flex-none items-center gap-1.5">
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${p.is_featured ? DICON_GOLD_STAR : DICON_STAR}`}
                      disabled={!p.is_featured && featuredItems.length >= 4}
                      title={
                        !p.is_featured && featuredItems.length >= 4
                          ? "Top Project sudah penuh (4) — lepas pin salah satu dulu"
                          : p.is_featured
                            ? "Lepas pin dari Top Project"
                            : "Pin ke Top Project"
                      }
                      aria-label={
                        p.is_featured
                          ? "Lepas pin dari Top Project"
                          : "Pin ke Top Project"
                      }
                      onClick={() => void toggleFeatured(p)}
                    >
                      {p.is_featured ? (
                        <PinOff size={15} />
                      ) : (
                        <Pin size={15} />
                      )}
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      title="Ubah"
                      aria-label="Ubah"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      title="Hapus"
                      aria-label="Hapus"
                      onClick={() => setConfirmId(p.id)}
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
