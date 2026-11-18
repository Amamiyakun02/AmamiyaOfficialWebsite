"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiUrl } from "@/lib/api";

/* Modul AI Agent — AI Providers (backend commit f3c00f4 CRUD +
   1dcf88b publish; skema registri provider di vault System
   Dashboard). Registry provider AI untuk agent opencode:
   admin mengisi provider di sini → tersimpan di database → satu
   provider ditetapkan default → Publish menulis ulang config
   opencode dari database dan model agent publik berganti.
   Kredensial TIDAK PERNAH berupa nilai API key di UI ini — hanya
   NAMA variabel .env + penanda keberadaannya (auth_env_present);
   nilai key tetap di .env server dan tidak masuk database. */

type AiModel = { id: string; name: string };

type Provider = {
  id: number;
  name: string;
  provider_key: string;
  adapter: "builtin" | "openai-compatible";
  package: string | null;
  base_url: string | null;
  auth_env_var: string | null;
  auth_env_present: boolean;
  models: AiModel[];
  default_model: string | null;
  is_default: boolean;
  status: string;
  notes: string | null;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  updated_at: string | null;
};

type FormState = {
  name: string;
  provider_key: string;
  adapter: string;
  package: string;
  base_url: string;
  auth_env_var: string;
  models: AiModel[];
  default_model: string;
  is_default: boolean;
  status: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  provider_key: "",
  adapter: "openai-compatible",
  package: "",
  base_url: "",
  auth_env_var: "",
  models: [{ id: "", name: "" }],
  default_model: "",
  is_default: false,
  status: "active",
  notes: "",
};

function toForm(p: Provider): FormState {
  return {
    name: p.name,
    provider_key: p.provider_key,
    adapter: p.adapter,
    package: p.package ?? "",
    base_url: p.base_url ?? "",
    auth_env_var: p.auth_env_var ?? "",
    models:
      p.models && p.models.length > 0
        ? p.models.map((m) => ({ id: m.id, name: m.name }))
        : [{ id: "", name: "" }],
    default_model: p.default_model ?? "",
    is_default: p.is_default,
    status: p.status,
    notes: p.notes ?? "",
  };
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* Pesan error backend ditampilkan apa adanya: `detail` bisa string
   (409/404) atau array validasi FastAPI (422). */
function detailText(data: unknown, fallback: string): string {
  const d = (data as { detail?: unknown })?.detail;
  if (typeof d === "string" && d) return d;
  if (Array.isArray(d) && d.length > 0) {
    return d
      .map((it) => {
        const o = it as { loc?: unknown; msg?: unknown };
        const loc = Array.isArray(o.loc)
          ? o.loc.filter((x) => x !== "body").join(".")
          : "";
        const msg = typeof o.msg === "string" ? o.msg : JSON.stringify(it);
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join("; ");
  }
  if (d != null) return JSON.stringify(d);
  return fallback;
}

type TestResult = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

type PublishResult = {
  ok: boolean;
  model: string | null;
  provider_default: string | null;
  providers_diterbitkan: string[];
  files: string[];
  dilewati: string[];
  catatan: string | null;
};

export default function AiProvidersPanel() {
  const [items, setItems] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Provider | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>(
    {},
  );
  const [defaultingId, setDefaultingId] = useState<number | null>(null);
  const [publishArm, setPublishArm] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(
    null,
  );
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
        apiUrl(`/v1/dashboard/ai-providers${qs ? `?${qs}` : ""}`),
        { headers: { "X-Admin-Token": token() } },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(detailText(data, `Gagal memuat (${res.status}).`));
      }
      const data = (await res.json()) as { items: Provider[] };
      setItems(data.items);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal memuat daftar provider.",
      );
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

  const defaultProvider = items.find((p) => p.is_default) ?? null;
  const missingKey = items.filter((p) => p.auth_env_var && !p.auth_env_present);

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
    setConfirmId(null);
  }

  function openEdit(p: Provider) {
    setForm(toForm(p));
    setFormError(null);
    setEditing(p);
    setConfirmId(null);
  }

  function providerPayload(f: FormState): Record<string, unknown> {
    const blank = (v: string) => (v.trim() ? v.trim() : null);
    return {
      name: f.name.trim(),
      provider_key: f.provider_key.trim(),
      adapter: f.adapter,
      package: blank(f.package),
      base_url: blank(f.base_url),
      auth_env_var: blank(f.auth_env_var),
      models: f.models
        .map((m) => ({ id: m.id.trim(), name: m.name.trim() }))
        .filter((m) => m.id),
      default_model: f.default_model.trim() || null,
      is_default: f.is_default,
      status: f.status,
      notes: blank(f.notes),
    };
  }

  async function save() {
    if (!form.name.trim()) {
      setFormError("Nama provider wajib diisi.");
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(form.provider_key.trim())) {
      setFormError(
        "Provider Key wajib diisi dengan pola slug: huruf kecil, angka, dan strip (mis. inception).",
      );
      return;
    }
    if (form.adapter === "openai-compatible") {
      if (!form.base_url.trim()) {
        setFormError("Base URL wajib diisi untuk adapter openai-compatible.");
        return;
      }
      if (!form.package.trim()) {
        setFormError("Package wajib diisi untuk adapter openai-compatible.");
        return;
      }
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const url = apiUrl(
        isNew
          ? "/v1/dashboard/ai-providers"
          : `/v1/dashboard/ai-providers/${(editing as Provider).id}`,
      );
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify(providerPayload(form)),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(detailText(data, `Gagal menyimpan (${res.status}).`));
      }
      setEditing(null);
      setTick((t) => t + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function runTest(p: Provider) {
    setTestingId(p.id);
    try {
      const res = await fetch(
        apiUrl(`/v1/dashboard/ai-providers/${p.id}/test`),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Token": token(),
          },
          body: "{}",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(detailText(data, `Test gagal (${res.status}).`));
      }
      const result = (await res.json()) as TestResult;
      setTestResults((m) => ({ ...m, [p.id]: result }));
      setTick((t) => t + 1);
    } catch (e) {
      setTestResults((m) => ({
        ...m,
        [p.id]: {
          ok: false,
          status_code: null,
          latency_ms: null,
          error: e instanceof Error ? e.message : "Test gagal.",
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  async function makeDefault(p: Provider) {
    setDefaultingId(p.id);
    setError(null);
    try {
      const payload = providerPayload(toForm(p));
      payload.is_default = true;
      const res = await fetch(apiUrl(`/v1/dashboard/ai-providers/${p.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          detailText(data, `Gagal menetapkan default (${res.status}).`),
        );
      }
      setTick((t) => t + 1);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal menetapkan default.",
      );
    } finally {
      setDefaultingId(null);
    }
  }

  async function remove(p: Provider) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/ai-providers/${p.id}`), {
        method: "DELETE",
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(detailText(data, `Gagal menghapus (${res.status}).`));
      }
      setConfirmId(null);
      setTick((t) => t + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menghapus.");
    }
  }

  async function publish() {
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(apiUrl("/v1/dashboard/ai-providers/publish"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: "{}",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(detailText(data, `Publish gagal (${res.status}).`));
      }
      setPublishResult(data as PublishResult);
      setPublishArm(false);
      setTick((t) => t + 1);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Publish gagal.");
    } finally {
      setPublishing(false);
    }
  }

  const set = (k: keyof FormState) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  function setModel(idx: number, k: keyof AiModel, v: string) {
    setForm((f) => {
      const models = f.models.map((m, i) => (i === idx ? { ...m, [k]: v } : m));
      const ids = models.map((m) => m.id.trim()).filter(Boolean);
      return {
        ...f,
        models,
        default_model: ids.includes(f.default_model)
          ? f.default_model
          : (ids[0] ?? ""),
      };
    });
  }

  function addModel() {
    setForm((f) => ({ ...f, models: [...f.models, { id: "", name: "" }] }));
  }

  function removeModel(idx: number) {
    setForm((f) => {
      const models = f.models.filter((_, i) => i !== idx);
      const ids = models.map((m) => m.id.trim()).filter(Boolean);
      return {
        ...f,
        models: models.length > 0 ? models : [{ id: "", name: "" }],
        default_model: ids.includes(f.default_model)
          ? f.default_model
          : (ids[0] ?? ""),
      };
    });
  }

  const editingProvider =
    editing && editing !== "new" ? (editing as Provider) : null;

  /* Modal formulir: Escape menutup + kunci gulir kolom utama
     selama modal terbuka. */
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditing(null);
    };
    document.addEventListener("keydown", onKey);
    const main = document.querySelector<HTMLElement>(".dash-main");
    const prevOverflow = main?.style.overflow ?? "";
    if (main) main.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (main) main.style.overflow = prevOverflow;
    };
  }, [editing]);

  return (
    <div className="proj">
      {/* Strip status + Publish */}
      <div className="aip-strip">
        <div className="aip-strip-head">
          <div>
            <div className="aip-strip-label">Model agent publik saat ini</div>
            <div className="aip-current">
              {defaultProvider
                ? `${defaultProvider.provider_key}/${defaultProvider.default_model ?? "—"}`
                : "Belum ada provider default"}
            </div>
          </div>
          {!publishArm && (
            <button
              type="button"
              className="proj-add"
              onClick={() => {
                setPublishArm(true);
                setPublishError(null);
              }}
            >
              Publish ke OpenCode
            </button>
          )}
        </div>

        {missingKey.length > 0 && (
          <p className="aip-missing">
            ⚠ Key belum terisi di .env untuk:{" "}
            {missingKey
              .map((p) => `${p.name} (${p.auth_env_var})`)
              .join(", ")}
            .
          </p>
        )}

        {publishArm && (
          <div className="aip-confirm">
            <p>
              Publish menulis ulang config opencode dari database dan
              mengganti model agent publik ke provider default saat ini
              {defaultProvider
                ? ` (${defaultProvider.provider_key}/${defaultProvider.default_model ?? "—"})`
                : ""}
              . Lanjutkan?
            </p>
            <div className="aip-confirm-actions">
              <button
                type="button"
                className="proj-save"
                disabled={publishing}
                onClick={() => void publish()}
              >
                {publishing ? "Menerbitkan…" : "Ya, Publish"}
              </button>
              <button
                type="button"
                className="proj-cancel"
                disabled={publishing}
                onClick={() => setPublishArm(false)}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {publishError && <p className="proj-error">{publishError}</p>}

        {publishResult && (
          <div className="aip-result">
            <div className="aip-result-head">
              <b>Publish berhasil.</b>
              <button
                type="button"
                className="proj-mini"
                onClick={() => setPublishResult(null)}
              >
                Tutup
              </button>
            </div>
            <p className="aip-result-row">
              Model terpasang:{" "}
              <span className="aip-mono">{publishResult.model ?? "—"}</span>
            </p>
            {publishResult.providers_diterbitkan.length > 0 && (
              <p className="aip-result-row">
                Provider diterbitkan:{" "}
                {publishResult.providers_diterbitkan.join(", ")}
              </p>
            )}
            {publishResult.files.length > 0 && (
              <p className="aip-result-row">
                File ditulis:{" "}
                <span className="aip-mono">
                  {publishResult.files.join(", ")}
                </span>
              </p>
            )}
            {publishResult.dilewati.length > 0 && (
              <p className="aip-result-row">
                Dilewati: {publishResult.dilewati.join(", ")}
              </p>
            )}
            {publishResult.catatan && (
              <p className="aip-result-row">
                Catatan: {publishResult.catatan}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="proj-toolbar">
        <input
          className="proj-search"
          type="search"
          placeholder="Cari provider…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="proj-filter"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter status"
        >
          <option value="">Semua status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button type="button" className="proj-add" onClick={openNew}>
          + Tambah Provider
        </button>
      </div>

      {/* Formulir tambah/edit — modal ukuran sedang (permintaan
          user 18 Nov), menggantikan formulir sebaris. */}
      {editing && (
        <div
          className="aip-modal-overlay"
          onClick={() => setEditing(null)}
        >
          <div
            className="aip-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              editing === "new" ? "Tambah Provider" : "Ubah Provider"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aip-modal-head">
              <h3>
                {editing === "new" ? "Tambah Provider" : "Ubah Provider"}
              </h3>
              <button
                type="button"
                className="dash-icon-btn"
                onClick={() => setEditing(null)}
                aria-label="Tutup"
              >
                <X size={17} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <div className="aip-modal-body">
                <div className="proj-grid">
            <label className="proj-field">
              <span>Nama *</span>
              <input
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="mis. Inception (Mercury)"
              />
            </label>
            <label className="proj-field">
              <span>Provider Key (slug) *</span>
              <input
                value={form.provider_key}
                onChange={(e) => set("provider_key")(e.target.value)}
                placeholder="mis. inception"
              />
              <small className="intg-hint">
                Huruf kecil, angka, dan strip saja — menjadi awalan model di
                opencode, mis. inception/mercury-3.
              </small>
            </label>
            <label className="proj-field">
              <span>Adapter</span>
              <select
                value={form.adapter}
                onChange={(e) => set("adapter")(e.target.value)}
              >
                <option value="builtin">builtin</option>
                <option value="openai-compatible">openai-compatible</option>
              </select>
            </label>
            <label className="proj-field">
              <span>
                Package{form.adapter === "openai-compatible" ? " *" : ""}
              </span>
              <input
                value={form.package}
                onChange={(e) => set("package")(e.target.value)}
                placeholder="mis. @opencode/ai/providers/openai"
              />
            </label>
            <label className="proj-field proj-span2">
              <span>
                Base URL{form.adapter === "openai-compatible" ? " *" : ""}
              </span>
              <input
                value={form.base_url}
                onChange={(e) => set("base_url")(e.target.value)}
                placeholder="mis. https://api.lyber.ai/v1"
              />
              {form.adapter === "openai-compatible" && (
                <small className="intg-hint">
                  Base URL dan Package wajib untuk adapter
                  openai-compatible.
                </small>
              )}
            </label>
            <label className="proj-field proj-span2">
              <span>Nama variabel .env untuk API key</span>
              <input
                value={form.auth_env_var}
                onChange={(e) => set("auth_env_var")(e.target.value)}
                placeholder="mis. INCEPTION_API_KEY"
              />
              <small className="intg-hint">
                Isi NAMA variabel di file .env server, BUKAN nilai API
                key-nya. Nilai key tetap di .env, tidak pernah masuk
                database maupun formulir ini.
                {editingProvider &&
                  form.auth_env_var.trim() &&
                  (editingProvider.auth_env_present ? (
                    <>
                      {" "}
                      <span className="intg-ok">
                        ✓ Variabel tersimpan terisi di backend.
                      </span>
                    </>
                  ) : (
                    <>
                      {" "}
                      <span className="intg-bad">
                        ✗ Variabel tersimpan belum ada di env backend.
                      </span>
                    </>
                  ))}
              </small>
            </label>
            <div className="proj-field proj-span2">
              <span>Models</span>
              <div className="aip-models">
                {form.models.map((m, idx) => (
                  <div className="aip-model-row" key={idx}>
                    <input
                      className="aip-model-input"
                      value={m.id}
                      onChange={(e) => setModel(idx, "id", e.target.value)}
                      placeholder="id model — mis. mercury-3"
                    />
                    <input
                      className="aip-model-input"
                      value={m.name}
                      onChange={(e) => setModel(idx, "name", e.target.value)}
                      placeholder="Nama tampil — mis. Mercury 3"
                    />
                    <button
                      type="button"
                      className="proj-mini"
                      onClick={() => removeModel(idx)}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    className="proj-mini"
                    onClick={addModel}
                  >
                    + Tambah model
                  </button>
                </div>
              </div>
            </div>
            <label className="proj-field">
              <span>Model default</span>
              <select
                value={form.default_model}
                onChange={(e) => set("default_model")(e.target.value)}
              >
                <option value="">— pilih dari daftar models —</option>
                {form.models
                  .filter((m) => m.id.trim())
                  .map((m) => (
                    <option key={m.id} value={m.id.trim()}>
                      {m.id.trim()}
                      {m.name.trim() ? ` — ${m.name.trim()}` : ""}
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
            <label className="aip-check proj-span2">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) =>
                  setForm((f) => ({ ...f, is_default: e.target.checked }))
                }
              />
              <span>
                Jadikan provider default — model agent publik memakai
                provider ini sesudah Publish.
              </span>
            </label>
            <label className="proj-field proj-span2">
              <span>Catatan</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </label>
                </div>
              </div>
              <div className="aip-modal-foot">
                {formError && <p className="proj-error">{formError}</p>}
                <div className="proj-form-actions aip-modal-actions">
                  <button
                    type="submit"
                    className="proj-save"
                    disabled={saving}
                  >
                    {saving ? "Menyimpan…" : "Simpan"}
                  </button>
                  <button
                    type="button"
                    className="proj-cancel"
                    onClick={() => setEditing(null)}
                  >
                    Batal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <p className="proj-error">{error}</p>}
      {loading ? (
        <p className="proj-empty">Memuat daftar provider…</p>
      ) : items.length === 0 ? (
        <p className="proj-empty">
          {q || status
            ? "Tidak ada provider yang cocok dengan filter."
            : "Belum ada provider terdaftar."}
        </p>
      ) : (
        <ul className="proj-list">
          {items.map((p) => {
            const tr = testResults[p.id];
            return (
              <li key={p.id} className="proj-card">
                <div className="proj-main">
                  <div className="proj-row1">
                    <span className="proj-name">{p.name}</span>
                    <span className="proj-badge">{p.adapter}</span>
                    <span
                      className={`proj-badge proj-badge-${p.status === "active" ? "active" : "archived"}`}
                    >
                      {p.status}
                    </span>
                    {p.is_default && (
                      <span className="proj-badge proj-badge-top">
                        ★ Default
                      </span>
                    )}
                    {p.auth_env_var ? (
                      <span
                        className={`proj-badge ${p.auth_env_present ? "aip-badge-key-ok" : "aip-badge-key-no"}`}
                      >
                        {p.auth_env_present
                          ? "Key terisi"
                          : "Key belum ada di .env"}
                      </span>
                    ) : (
                      <span className="proj-badge">Tanpa env key</span>
                    )}
                  </div>
                  <p className="proj-meta">
                    <span className="proj-path">{p.provider_key}</span>
                    {p.base_url && (
                      <span className="proj-path">{p.base_url}</span>
                    )}
                  </p>
                  <div className="proj-meta">
                    <span>
                      {p.models?.length ?? 0} model
                      {p.default_model
                        ? ` · default: ${p.default_model}`
                        : ""}
                    </span>
                    {p.package && (
                      <span className="proj-path">{p.package}</span>
                    )}
                    {p.updated_at && (
                      <span>Diubah {fmtDateTime(p.updated_at)}</span>
                    )}
                  </div>
                  {p.notes && <p className="proj-desc">{p.notes}</p>}
                  {(p.last_tested_at || tr) && (
                    <p className="proj-meta">
                      {tr ? (
                        tr.ok ? (
                          <span className="intg-ok">
                            ✓ Test barusan: HTTP {tr.status_code}
                            {tr.latency_ms != null
                              ? ` · ${tr.latency_ms} ms`
                              : ""}
                          </span>
                        ) : (
                          <span className="intg-bad">
                            ✗ Test barusan gagal
                            {tr.error ? `: ${tr.error}` : ""}
                            {tr.status_code != null
                              ? ` (HTTP ${tr.status_code})`
                              : ""}
                          </span>
                        )
                      ) : p.last_test_ok ? (
                        <span className="intg-ok">
                          ✓ Test terakhir berhasil ·{" "}
                          {fmtDateTime(p.last_tested_at)}
                        </span>
                      ) : (
                        <span className="intg-bad">
                          ✗ Test terakhir gagal ·{" "}
                          {fmtDateTime(p.last_tested_at)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="proj-actions">
                  {confirmId === p.id ? (
                    <>
                      <span className="proj-confirm-text">
                        Hapus {p.name}? Ini soft delete — datanya tidak
                        langsung hilang permanen.
                      </span>
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
                        disabled={testingId === p.id}
                        onClick={() => void runTest(p)}
                      >
                        {testingId === p.id ? "Mengetes…" : "Tes koneksi"}
                      </button>
                      {!p.is_default && (
                        <button
                          type="button"
                          className="proj-mini"
                          disabled={defaultingId === p.id}
                          onClick={() => void makeDefault(p)}
                        >
                          {defaultingId === p.id
                            ? "Menetapkan…"
                            : "Jadikan default"}
                        </button>
                      )}
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
