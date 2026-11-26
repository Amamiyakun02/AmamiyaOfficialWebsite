"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import FormModal from "./FormModal";
import MediaField from "./MediaField";
import {
  BADGE,
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

/* Modul System Dashboard — Skills (diminta user 23 Nov 2026).
   Registry keahlian untuk section About portofolio lewat
   /v1/dashboard/skills (bergerbang X-Admin-Token): daftar + filter
   kategori + pencarian, tambah/ubah, hapus lunak dengan konfirmasi,
   dan pin Skill Unggulan (maks 10, bisa diurutkan) — pola yang sama
   persis dengan Top Project di ProjectsPanel. */

type SkillItem = {
  id: number;
  name: string;
  level: number;
  description_id: string | null;
  description_en: string | null;
  category: string;
  sort_order: number;
  icon_url: string | null;
  is_featured: boolean;
  featured_order: number | null;
  updated_at: string | null;
};

type FormState = {
  name: string;
  level: string;
  description_id: string;
  description_en: string;
  category: string;
  sort_order: string;
  icon_url: string;
};

const CATEGORIES = [
  "Frontend",
  "Backend",
  "Android",
  "Database",
  "Deployment",
  "System Integration",
  "AI/ML",
  "AI Tools",
  "Other",
] as const;

const FEATURED_LIMIT = 10;

const EMPTY_FORM: FormState = {
  name: "",
  level: "70",
  description_id: "",
  description_en: "",
  category: "Frontend",
  sort_order: "0",
  icon_url: "",
};

function toForm(s: SkillItem): FormState {
  return {
    name: s.name,
    level: String(s.level),
    description_id: s.description_id ?? "",
    description_en: s.description_en ?? "",
    category: s.category,
    sort_order: String(s.sort_order ?? 0),
    icon_url: s.icon_url ?? "",
  };
}

function toPayload(f: FormState) {
  const blank = (v: string) => (v.trim() ? v.trim() : null);
  const level = Math.max(0, Math.min(100, Number.parseInt(f.level, 10) || 0));
  const sortOrder = Number.parseInt(f.sort_order, 10) || 0;
  return {
    name: f.name.trim(),
    level,
    description_id: blank(f.description_id),
    description_en: blank(f.description_en),
    category: f.category,
    sort_order: sortOrder,
    icon_url: blank(f.icon_url),
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

export default function SkillsPanel() {
  const [items, setItems] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<SkillItem | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tick, setTick] = useState(0);
  // Skill Unggulan (pin -> tampil pertama di section About): daftar
  // featured SELALU dimuat tanpa filter agar urutan & batas 10 akurat.
  const [featuredItems, setFeaturedItems] = useState<SkillItem[]>([]);

  const token = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("dashboard_token") || ""
      : "";

  const loadFeatured = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/v1/dashboard/skills"), {
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: SkillItem[] };
      const feat = data.items
        .filter((s) => s.is_featured)
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

  async function toggleFeatured(s: SkillItem) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/skills/${s.id}/featured`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify({ featured: !s.is_featured }),
      });
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

  async function moveFeatured(s: SkillItem, dir: -1 | 1) {
    const ids = featuredItems.map((x) => x.id);
    const i = ids.indexOf(s.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      const res = await fetch(apiUrl("/v1/dashboard/skills/reorder-featured"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error(`Gagal mengurutkan (${res.status}).`);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengurutkan.");
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (q.trim()) params.set("q", q.trim());
      const qs = params.toString();
      const res = await fetch(
        apiUrl(`/v1/dashboard/skills${qs ? `?${qs}` : ""}`),
        { headers: { "X-Admin-Token": token() } },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal memuat (${res.status}).`);
      }
      const data = (await res.json()) as { items: SkillItem[] };
      setItems(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat daftar skill.");
    } finally {
      setLoading(false);
    }
  }, [q, category]);

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

  function openEdit(s: SkillItem) {
    setForm(toForm(s));
    setFormError(null);
    setEditing(s);
    setConfirmId(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setFormError("Nama skill wajib diisi.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const url = apiUrl(
        isNew
          ? "/v1/dashboard/skills"
          : `/v1/dashboard/skills/${(editing as SkillItem).id}`,
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

  async function remove(s: SkillItem) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/skills/${s.id}`), {
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
      <div className="mb-4 rounded-[14px] border border-[rgba(0,255,170,0.35)] bg-[rgba(0,255,170,0.06)] px-4 py-3">
        <div className="flex items-center justify-between gap-2.5">
          <span className="min-w-0 text-[13.5px] font-bold text-gold">
            ★ Skill Unggulan — tampil pertama di section About portofolio
          </span>
          <span className="rounded-full border border-steel px-2.5 py-0.5 text-[12.5px] font-bold text-[#AFC2E6]">
            {featuredItems.length}/{FEATURED_LIMIT}
          </span>
        </div>
        {featuredItems.length === 0 ? (
          <p className="mt-2 text-[13px] leading-[1.5] text-fog">
            Belum ada yang di-pin. Klik tombol Pin pada skill di bawah —
            maksimal {FEATURED_LIMIT}, urutannya bisa diatur di sini.
          </p>
        ) : (
          <ol className="mt-2.5 flex list-none flex-col gap-2 p-0">
            {featuredItems.map((s, i) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-[rgba(0,255,170,0.18)] text-xs font-extrabold text-gold">
                  {i + 1}
                </span>
                <span className="text-sm font-semibold text-paper">{s.name}</span>
                <span className="text-xs text-fog">{s.category}</span>
                <span className="ml-auto inline-flex gap-1.5">
                  <button
                    type="button"
                    className={`${DICON_LAYOUT} h-7 w-7 rounded-[7px] ${DICON_NEUTRAL}`}
                    disabled={i === 0}
                    onClick={() => void moveFeatured(s, -1)}
                    aria-label={`Naikkan ${s.name}`}
                    title="Naikkan"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${DICON_LAYOUT} h-7 w-7 rounded-[7px] ${DICON_NEUTRAL}`}
                    disabled={i === featuredItems.length - 1}
                    onClick={() => void moveFeatured(s, 1)}
                    aria-label={`Turunkan ${s.name}`}
                    title="Turunkan"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${DICON_LAYOUT} h-7 w-7 rounded-[7px] ${DICON_GOLD}`}
                    onClick={() => void toggleFeatured(s)}
                    aria-label={`Lepas pin ${s.name}`}
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
          className="flex-[1_1_220px] rounded-[10px] border border-line bg-[#050E2E] px-3 py-[9px] text-sm text-paper outline-none"
          type="search"
          placeholder="Cari skill…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari skill"
        />
        <select
          className={FIELD_SELECT}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter kategori"
        >
          <option value="">Semua kategori</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="cursor-pointer rounded-lg border-none bg-accent px-4 py-[9px] text-sm font-semibold text-[#052A1E] hover:bg-[#00BBA2]"
          onClick={openNew}
        >
          + Tambah Skill
        </button>
      </div>

      {editing && (
        <FormModal
          title={editing === "new" ? "Tambah Skill" : `Ubah: ${editing.name}`}
          onClose={() => setEditing(null)}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          footer={
            <>
              {formError && <p className={`${ERR} m-0 mb-2.5`}>{formError}</p>}
              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border-none bg-accent px-[18px] py-[9px] text-sm font-semibold text-[#052A1E] disabled:cursor-default disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Menyimpan…" : "Simpan"}
                </button>
                <button
                  type="button"
                  className="cursor-pointer rounded-lg border border-line bg-[rgba(10,24,71,0.7)] px-3.5 py-2 text-[13px] text-[#AFC2E6] hover:border-steel hover:text-white"
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
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Nama *</span>
              <input
                className={FIELD_INPUT}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Kategori</span>
              <select
                className={FIELD_SELECT}
                value={form.category}
                onChange={(e) => set("category")(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">
                Level (0–100)
              </span>
              <span className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1">
                  <input
                    className="block w-full accent-[#00FFAA]"
                    type="range"
                    min={0}
                    max={100}
                    value={Number.parseInt(form.level, 10) || 0}
                    onChange={(e) => set("level")(e.target.value)}
                    aria-label="Level (slider)"
                  />
                </span>
                <input
                  className="w-[76px] flex-none rounded-[10px] border border-line bg-[#050E2E] px-3 py-[9px] text-sm text-paper outline-none"
                  type="number"
                  min={0}
                  max={100}
                  value={form.level}
                  onChange={(e) => set("level")(e.target.value)}
                  aria-label="Level (angka)"
                />
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Urutan tampil</span>
              <input
                className={FIELD_INPUT}
                type="number"
                value={form.sort_order}
                onChange={(e) => set("sort_order")(e.target.value)}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Deskripsi (Indonesia)</span>
              <textarea
                className={`${FIELD_INPUT} resize-y`}
                rows={2}
                value={form.description_id}
                onChange={(e) => set("description_id")(e.target.value)}
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1">
              <span className="text-xs font-semibold tracking-[0.03em] text-fog">Deskripsi (English)</span>
              <textarea
                className={`${FIELD_INPUT} resize-y`}
                rows={2}
                value={form.description_en}
                onChange={(e) => set("description_en")(e.target.value)}
              />
            </label>
            <MediaField
              label="Ikon skill (URL)"
              value={form.icon_url}
              onChange={set("icon_url")}
            />
          </div>
        </FormModal>
      )}

      {error && <p className={`${ERR} mt-3`}>{error}</p>}
      {loading ? (
        <p className="mt-[18px] text-sm text-fog">Memuat daftar skill…</p>
      ) : items.length === 0 ? (
        <p className="mt-[18px] text-sm text-fog">
          {q || category
            ? "Tidak ada skill yang cocok dengan filter."
            : "Belum ada skill terdaftar."}
        </p>
      ) : (
        <ul className="mt-4 flex list-none flex-col gap-3 p-0">
          {items.map((s) => (
            <li
              key={s.id}
              className={`${CARD} ${s.is_featured ? "before:bg-[linear-gradient(90deg,#00FFAA,rgba(0,255,170,0))]" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                {s.icon_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="h-6 w-6 flex-none object-contain"
                    src={s.icon_url}
                    alt=""
                    loading="lazy"
                  />
                )}
                <span className="mr-0.5 text-[15.5px] font-[650] text-[#EEF4FF]">{s.name}</span>
                <span className={`${BADGE} border-line text-[#AFC2E6]`}>{s.category}</span>
                {s.is_featured && (
                  <span className={`${BADGE} border-[rgba(0,255,170,0.55)] text-gold`}>
                    ★ UNGGULAN{s.featured_order ? ` #${s.featured_order}` : ""}
                  </span>
                )}
                <span className="ml-auto text-[13px] font-bold text-accent3">{s.level}%</span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#00FFAA,#009BA0)]"
                  style={{ width: `${Math.max(0, Math.min(100, s.level))}%` }}
                />
              </div>
              {s.description_id && (
                <p className="mt-2.5 mb-0 text-[13px] leading-[1.55] text-[#AFC2E6]">{s.description_id}</p>
              )}
              <p className="mt-[7px] mb-0 flex flex-wrap gap-3.5 text-xs text-[#93A9D1]">
                <span>Urutan {s.sort_order}</span>
                {s.updated_at && <span>Diubah {fmtDate(s.updated_at)}</span>}
              </p>
              <div className="mt-3.5 flex items-center gap-3 border-t border-[#16296B] pt-2.5 pb-3">
                {confirmId === s.id ? (
                  <span className="ml-auto inline-flex flex-none items-center gap-1.5">
                    <span className="mr-0.5 text-[12.5px] text-[#f0b4b4]">Hapus skill ini?</span>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      title="Ya, hapus"
                      aria-label="Ya, hapus"
                      onClick={() => void remove(s)}
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
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${s.is_featured ? DICON_GOLD_STAR : DICON_STAR}`}
                      disabled={!s.is_featured && featuredItems.length >= FEATURED_LIMIT}
                      title={
                        !s.is_featured && featuredItems.length >= FEATURED_LIMIT
                          ? `Skill Unggulan sudah penuh (${FEATURED_LIMIT}) — lepas pin salah satu dulu`
                          : s.is_featured
                            ? "Lepas pin dari Skill Unggulan"
                            : "Pin ke Skill Unggulan"
                      }
                      aria-label={s.is_featured ? "Lepas pin dari Skill Unggulan" : "Pin ke Skill Unggulan"}
                      onClick={() => void toggleFeatured(s)}
                    >
                      {s.is_featured ? <PinOff size={15} /> : <Pin size={15} />}
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      title="Ubah"
                      aria-label="Ubah"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      title="Hapus"
                      aria-label="Hapus"
                      onClick={() => setConfirmId(s.id)}
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
