"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import FormModal from "./FormModal";
import {
  Check,
  Crown,
  Loader2,
  Pencil,
  Star,
  Trash2,
  X,
  Zap,
} from "lucide-react";

/* Modul AI Provider — registri provider AI (backend commit
   f3c00f4 CRUD + 1dcf88b publish; skema registri provider di
   vault System Dashboard). Admin mengisi provider di sini →
   tersimpan di database → provider ditetapkan sebagai default
   PUBLIK dan/atau default ADMINISTRATOR → Publish per role
   menulis ulang config opencode role itu dari database dan
   model agent role itu berganti. Kontrak dua publish:
   POST /publish dengan body {role: "public"|"admin"} dan field
   is_default_admin di objek Provider (backend menyusul sesuai
   prompt serah-terima 18 Nov; UI diverifikasi dengan mock).
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
  is_default_admin: boolean;
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
  is_default_admin: boolean;
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
  is_default_admin: false,
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
    is_default_admin: p.is_default_admin ?? false,
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
  role?: string;
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
  const [publishArmRole, setPublishArmRole] = useState<
    "public" | "admin" | null
  >(null);
  const [publishingRole, setPublishingRole] = useState<
    "public" | "admin" | null
  >(null);
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
  const adminDefaultProvider =
    items.find((p) => p.is_default_admin) ?? null;
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
      is_default_admin: f.is_default_admin,
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

  async function makeDefault(p: Provider, role: "public" | "admin") {
    setDefaultingId(p.id);
    setError(null);
    try {
      const payload = providerPayload(toForm(p));
      if (role === "admin") payload.is_default_admin = true;
      else payload.is_default = true;
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

  async function publish(role: "public" | "admin") {
    setPublishingRole(role);
    setPublishError(null);
    try {
      const res = await fetch(apiUrl("/v1/dashboard/ai-providers/publish"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(detailText(data, `Publish gagal (${res.status}).`));
      }
      setPublishResult({ ...(data as PublishResult), role });
      setPublishArmRole(null);
      setTick((t) => t + 1);
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : "Publish gagal.");
    } finally {
      setPublishingRole(null);
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


  // Satu strip status+publish untuk satu role agent. Dua config
  // publish (permintaan user 18 Nov): publik (anonim) & administrator.
  const renderStrip = (
    role: "public" | "admin",
    label: string,
    provider: Provider | null,
  ) => (
    <div
      className={role === "admin" ? "aip-strip aip-strip-admin" : "aip-strip"}
    >
      <div className="aip-strip-head">
        <div>
          <div className="aip-strip-label">{label}</div>
          <div className="aip-current">
            {provider
              ? `${provider.provider_key}/${provider.default_model ?? "—"}`
              : "Belum ada provider default"}
          </div>
        </div>
        {publishArmRole !== role && (
          <button
            type="button"
            className="proj-add"
            onClick={() => {
              setPublishArmRole(role);
              setPublishError(null);
            }}
          >
            Publish ke OpenCode
          </button>
        )}
      </div>
      {publishArmRole === role && (
        <div className="aip-confirm">
          <p>
            Publish menulis ulang config opencode{" "}
            {role === "admin" ? "administrator" : "publik (anonim)"} dari
            database dan mengganti model agent{" "}
            {role === "admin" ? "administrator" : "publik"} ke provider
            default role ini
            {provider
              ? ` (${provider.provider_key}/${provider.default_model ?? "—"})`
              : ""}
            . Lanjutkan?
          </p>
          <div className="aip-confirm-actions">
            <button
              type="button"
              className="proj-save"
              disabled={publishingRole !== null}
              onClick={() => void publish(role)}
            >
              {publishingRole === role ? "Menerbitkan…" : "Ya, Publish"}
            </button>
            <button
              type="button"
              className="proj-cancel"
              disabled={publishingRole !== null}
              onClick={() => setPublishArmRole(null)}
            >
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="proj">
      {/* Dua strip status + Publish: agent publik & administrator */}
      <div className="aip-strips">
        {renderStrip(
          "public",
          "Model agent publik (anonim) saat ini",
          defaultProvider,
        )}
        {renderStrip(
          "admin",
          "Model agent administrator saat ini",
          adminDefaultProvider,
        )}
      </div>

      {missingKey.length > 0 && (
        <p className="aip-missing">
          ⚠ Key belum terisi di .env untuk:{" "}
          {missingKey.map((p) => `${p.name} (${p.auth_env_var})`).join(", ")}.
        </p>
      )}

      {publishError && <p className="proj-error">{publishError}</p>}

      {publishResult && (
        <div className="aip-result">
          <div className="aip-result-head">
            <b>
              Publish {publishResult.role === "admin" ? "administrator" : "publik"}{" "}
              berhasil.
            </b>
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
              <span className="aip-mono">{publishResult.files.join(", ")}</span>
            </p>
          )}
          {publishResult.dilewati.length > 0 && (
            <p className="aip-result-row">
              Dilewati: {publishResult.dilewati.join(", ")}
            </p>
          )}
          {publishResult.catatan && (
            <p className="aip-result-row">Catatan: {publishResult.catatan}</p>
          )}
        </div>
      )}

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

      {/* Formulir tambah/edit — modal ukuran sedang bersama
          (FormModal), sama seperti modul dashboard lainnya. */}
      {editing && (
        <FormModal
          title={editing === "new" ? "Tambah Provider" : "Ubah Provider"}
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
                >
                  Batal
                </button>
              </div>
            </>
          }
        >
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
            <label className="aip-check proj-span2">
              <input
                type="checkbox"
                checked={form.is_default_admin}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    is_default_admin: e.target.checked,
                  }))
                }
              />
              <span>
                Jadikan default administrator — model agent administrator
                memakai provider ini sesudah Publish administrator.
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
        </FormModal>
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
              <li
                key={p.id}
                className={
                  "dcard" +
                  (p.is_default ? " is-defpub" : "") +
                  (p.is_default_admin ? " is-defadm" : "")
                }
              >
                <div className="dcard-head">
                  <span className="dcard-name">{p.name}</span>
                  <span className="proj-badge">{p.adapter}</span>
                  <span
                    className={`proj-badge proj-badge-${p.status === "active" ? "active" : "archived"}`}
                  >
                    {p.status}
                  </span>
                  {p.is_default && (
                    <span className="proj-badge proj-badge-top">
                      ★ Default publik
                    </span>
                  )}
                  {p.is_default_admin && (
                    <span className="proj-badge aip-badge-admin">
                      ★ Default admin
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
                <p className="dcard-sub">
                  <span className="aip-mono">{p.provider_key}</span>
                  {p.base_url && (
                    <span className="aip-mono">{p.base_url}</span>
                  )}
                  {p.package && (
                    <span className="aip-mono aip-dim">{p.package}</span>
                  )}
                </p>
                <div className="aip-card-model">
                  <span className="aip-card-model-label">Model default</span>
                  <span className="aip-mono aip-card-model-id">
                    {p.default_model ?? "—"}
                  </span>
                  <span className="aip-card-model-count">
                    {p.models?.length ?? 0} model
                    {p.updated_at
                      ? ` · diubah ${fmtDateTime(p.updated_at)}`
                      : ""}
                  </span>
                </div>
                {p.notes && <p className="dcard-desc">{p.notes}</p>}
                <div className="dcard-foot">
                  <span className="dcard-foot-note">
                    {p.last_tested_at || tr ? (
                      tr ? (
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
                      )
                    ) : (
                      <span className="aip-dim">Belum pernah dites</span>
                    )}
                  </span>
                  {confirmId === p.id ? (
                    <span className="dcard-confirm">
                      <span className="dcard-confirm-text">
                        Hapus {p.name}?
                      </span>
                      <button
                        type="button"
                        className="dicon-btn is-danger"
                        title="Ya, hapus (soft delete)"
                        aria-label="Ya, hapus"
                        onClick={() => void remove(p)}
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
                        title="Tes koneksi"
                        aria-label="Tes koneksi"
                        disabled={testingId === p.id}
                        onClick={() => void runTest(p)}
                      >
                        {testingId === p.id ? (
                          <Loader2 size={15} className="aip-spin" />
                        ) : (
                          <Zap size={15} />
                        )}
                      </button>
                      {!p.is_default && (
                        <button
                          type="button"
                          className="dicon-btn is-star"
                          title="Jadikan default publik"
                          aria-label="Jadikan default publik"
                          disabled={defaultingId === p.id}
                          onClick={() => void makeDefault(p, "public")}
                        >
                          <Star size={15} />
                        </button>
                      )}
                      {!p.is_default_admin && (
                        <button
                          type="button"
                          className="dicon-btn is-crown"
                          title="Jadikan default admin"
                          aria-label="Jadikan default admin"
                          disabled={defaultingId === p.id}
                          onClick={() => void makeDefault(p, "admin")}
                        >
                          <Crown size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className="dicon-btn"
                        title="Ubah"
                        aria-label="Ubah"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="dicon-btn is-danger"
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
            );
          })}
        </ul>
      )}
    </div>
  );
}
