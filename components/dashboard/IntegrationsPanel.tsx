"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

/* Modul 3 System Dashboard — Integrations (spec vault §5; diskusi
   skema 8 Nov 2026). Registry integrasi API lewat
   /v1/dashboard/integrations (bergerbang X-Admin-Token).
   v1: kredensial HANYA referensi env var — panel ini hanya menyimpan
   NAMA variabel; nilai secret hidup di .env backend, tidak pernah
   lewat form/panel ini dan tidak pernah dikembalikan API. */

type Integration = {
  id: number;
  name: string;
  kind: string;
  base_url: string;
  auth_type: string;
  auth_env_var: string | null;
  auth_env_present: boolean;
  headers: Record<string, string>;
  notes: string | null;
  status: string;
  last_tested_at: string | null;
  last_test_ok: boolean | null;
  updated_at: string | null;
};

type FormState = {
  name: string;
  kind: string;
  base_url: string;
  auth_type: string;
  auth_env_var: string;
  headers_text: string;
  notes: string;
  status: string;
};

const KINDS = ["rest", "webhook", "mcp", "other"] as const;
const AUTH_TYPES = ["none", "api_key", "bearer", "basic", "oauth"] as const;
const STATUSES = ["active", "inactive"] as const;

const EMPTY_FORM: FormState = {
  name: "",
  kind: "rest",
  base_url: "",
  auth_type: "none",
  auth_env_var: "",
  headers_text: "",
  notes: "",
  status: "active",
};

function toForm(i: Integration): FormState {
  return {
    name: i.name,
    kind: i.kind,
    base_url: i.base_url,
    auth_type: i.auth_type,
    auth_env_var: i.auth_env_var ?? "",
    headers_text:
      i.headers && Object.keys(i.headers).length > 0
        ? JSON.stringify(i.headers, null, 2)
        : "",
    notes: i.notes ?? "",
    status: i.status,
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

type TestResult = {
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
};

export default function IntegrationsPanel() {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<Integration | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, TestResult>>(
    {},
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
        apiUrl(`/v1/dashboard/integrations${qs ? `?${qs}` : ""}`),
        { headers: { "X-Admin-Token": token() } },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Gagal memuat (${res.status}).`);
      }
      const data = (await res.json()) as { items: Integration[] };
      setItems(data.items);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Gagal memuat daftar integrasi.",
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

  function openNew() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setEditing("new");
    setConfirmId(null);
  }

  function openEdit(i: Integration) {
    setForm(toForm(i));
    setFormError(null);
    setEditing(i);
    setConfirmId(null);
  }

  function buildPayload(): { payload?: Record<string, unknown>; error?: string } {
    let headers: Record<string, string> = {};
    const ht = form.headers_text.trim();
    if (ht) {
      try {
        const parsed: unknown = JSON.parse(ht);
        if (
          typeof parsed !== "object" ||
          parsed === null ||
          Array.isArray(parsed)
        ) {
          return { error: "Headers harus objek JSON, mis. {\"X-Custom\": \"nilai\"}." };
        }
        headers = Object.fromEntries(
          Object.entries(parsed as Record<string, unknown>).map(([k, v]) => [
            k,
            String(v),
          ]),
        );
      } catch {
        return { error: "Headers bukan JSON yang valid." };
      }
    }
    const blank = (v: string) => (v.trim() ? v.trim() : null);
    return {
      payload: {
        name: form.name.trim(),
        kind: form.kind,
        base_url: form.base_url.trim(),
        auth_type: form.auth_type,
        auth_env_var: blank(form.auth_env_var),
        headers,
        notes: blank(form.notes),
        status: form.status,
      },
    };
  }

  async function save() {
    if (!form.name.trim()) {
      setFormError("Nama integrasi wajib diisi.");
      return;
    }
    if (!form.base_url.trim()) {
      setFormError("Base URL wajib diisi.");
      return;
    }
    const { payload, error: payloadError } = buildPayload();
    if (payloadError || !payload) {
      setFormError(payloadError || "Data tidak valid.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const isNew = editing === "new";
      const url = apiUrl(
        isNew
          ? "/v1/dashboard/integrations"
          : `/v1/dashboard/integrations/${(editing as Integration).id}`,
      );
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify(payload),
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

  async function runTest(i: Integration) {
    setTestingId(i.id);
    try {
      const res = await fetch(
        apiUrl(`/v1/dashboard/integrations/${i.id}/test`),
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
        const data = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        throw new Error(data.detail || `Test gagal (${res.status}).`);
      }
      const result = (await res.json()) as TestResult;
      setTestResults((m) => ({ ...m, [i.id]: result }));
      setTick((t) => t + 1);
    } catch (e) {
      setTestResults((m) => ({
        ...m,
        [i.id]: {
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

  async function remove(i: Integration) {
    try {
      const res = await fetch(apiUrl(`/v1/dashboard/integrations/${i.id}`), {
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
          placeholder="Cari integrasi…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari integrasi"
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
          + Tambah Integrasi
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
            {editing === "new"
              ? "Tambah Integrasi"
              : `Ubah: ${editing.name}`}
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
              <span>Base URL *</span>
              <input
                value={form.base_url}
                onChange={(e) => set("base_url")(e.target.value)}
                maxLength={500}
                placeholder="https://api.contoh.com/"
              />
            </label>
            <label className="proj-field">
              <span>Jenis</span>
              <select
                value={form.kind}
                onChange={(e) => set("kind")(e.target.value)}
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <label className="proj-field">
              <span>Tipe auth</span>
              <select
                value={form.auth_type}
                onChange={(e) => set("auth_type")(e.target.value)}
              >
                {AUTH_TYPES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="proj-field">
              <span>Nama env var untuk secret</span>
              <input
                value={form.auth_env_var}
                onChange={(e) => set("auth_env_var")(e.target.value)}
                maxLength={200}
                placeholder="MIS. MIDTRANS_SERVER_KEY"
              />
            </label>
            <p className="intg-hint proj-span2">
              Hanya NAMANYA yang disimpan di sini — nilai secret-nya tetap
              di .env backend dan tidak pernah ditampilkan. Untuk header
              sensitif (Authorization, X-API-Key) yang sudah tersimpan,
              nilai tampil sebagai *** dan tidak berubah bila dikirim apa
              adanya.
            </p>
            <label className="proj-field proj-span2">
              <span>Header tambahan (JSON)</span>
              <textarea
                rows={3}
                value={form.headers_text}
                onChange={(e) => set("headers_text")(e.target.value)}
                placeholder='{"X-Custom": "nilai"}'
                spellCheck={false}
              />
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
        <p className="proj-empty">Memuat daftar integrasi…</p>
      ) : items.length === 0 ? (
        <p className="proj-empty">
          {q || status
            ? "Tidak ada integrasi yang cocok dengan filter."
            : "Belum ada integrasi terdaftar."}
        </p>
      ) : (
        <ul className="proj-list">
          {items.map((i) => {
            const tr = testResults[i.id];
            return (
              <li key={i.id} className="proj-card">
                <div className="proj-main">
                  <div className="proj-row1">
                    <span className="proj-name">{i.name}</span>
                    <span className="proj-badge">{i.kind}</span>
                    <span className={`proj-badge proj-badge-${i.status === "active" ? "active" : "archived"}`}>
                      {i.status}
                    </span>
                  </div>
                  <p className="proj-meta">
                    <span className="proj-path">{i.base_url}</span>
                  </p>
                  <div className="proj-meta">
                    {i.auth_type === "none" ? (
                      <span>Auth: tanpa auth</span>
                    ) : (
                      <span>
                        Auth: {i.auth_type}
                        {i.auth_env_var ? ` · env ${i.auth_env_var} · ` : " · "}
                        {i.auth_env_var &&
                          (i.auth_env_present ? (
                            <span className="intg-ok">✓ tersedia di backend</span>
                          ) : (
                            <span className="intg-bad">
                              ✗ belum ada di env backend
                            </span>
                          ))}
                      </span>
                    )}
                    {i.updated_at && (
                      <span>Diubah {fmtDateTime(i.updated_at)}</span>
                    )}
                  </div>
                  {i.notes && <p className="proj-desc">{i.notes}</p>}
                  {(i.last_tested_at || tr) && (
                    <p className="proj-meta">
                      {tr ? (
                        tr.ok ? (
                          <span className="intg-ok">
                            ✓ Test barusan: HTTP {tr.status_code}
                            {tr.latency_ms != null ? ` · ${tr.latency_ms} ms` : ""}
                          </span>
                        ) : (
                          <span className="intg-bad">
                            ✗ Test barusan gagal
                            {tr.error ? `: ${tr.error}` : ""}
                          </span>
                        )
                      ) : i.last_test_ok ? (
                        <span className="intg-ok">
                          ✓ Test terakhir berhasil ·{" "}
                          {fmtDateTime(i.last_tested_at)}
                        </span>
                      ) : (
                        <span className="intg-bad">
                          ✗ Test terakhir gagal ·{" "}
                          {fmtDateTime(i.last_tested_at)}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <div className="proj-actions">
                  {confirmId === i.id ? (
                    <>
                      <span className="proj-confirm-text">
                        Hapus integrasi ini?
                      </span>
                      <button
                        type="button"
                        className="proj-del-yes"
                        onClick={() => void remove(i)}
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
                        disabled={testingId === i.id}
                        onClick={() => void runTest(i)}
                      >
                        {testingId === i.id ? "Mengetes…" : "Test"}
                      </button>
                      <button
                        type="button"
                        className="proj-mini"
                        onClick={() => openEdit(i)}
                      >
                        Ubah
                      </button>
                      <button
                        type="button"
                        className="proj-mini proj-del"
                        onClick={() => setConfirmId(i.id)}
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
