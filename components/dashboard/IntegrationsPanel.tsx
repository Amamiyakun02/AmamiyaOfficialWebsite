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
  DCARD_DESC,
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
  FIELD_AREA,
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
  Check,
  Loader2,
  Pencil,
  Trash2,
  X,
  Zap,
} from "lucide-react";

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
    <div className="mt-[18px]">
      <div className={TOOLBAR}>
        <input
          className={SEARCH}
          type="search"
          placeholder="Cari integrasi…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Cari integrasi"
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
        <button type="button" className={ADD} onClick={openNew}>
          + Tambah Integrasi
        </button>
      </div>

      {editing && (
        <FormModal
          title={editing === "new" ? "Tambah Integrasi" : `Ubah: ${editing.name}`}
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
            <label className={FIELD_SPAN2}>
              <span className={FIELD_LABEL}>Nama *</span>
              <input className={FIELD_INPUT}
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                maxLength={200}
              />
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
            <label className={FIELD_SPAN2}>
              <span className={FIELD_LABEL}>Base URL *</span>
              <input className={FIELD_INPUT}
                value={form.base_url}
                onChange={(e) => set("base_url")(e.target.value)}
                maxLength={500}
                placeholder="https://api.contoh.com/"
              />
            </label>
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Jenis</span>
              <select className={FIELD_SELECT}
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
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Tipe auth</span>
              <select className={FIELD_SELECT}
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
            <label className={FIELD}>
              <span className={FIELD_LABEL}>Nama env var untuk secret</span>
              <input className={FIELD_INPUT}
                value={form.auth_env_var}
                onChange={(e) => set("auth_env_var")(e.target.value)}
                maxLength={200}
                placeholder="MIS. MIDTRANS_SERVER_KEY"
              />
            </label>
            <p className="col-span-2 text-[12.5px] leading-[1.55] text-fog max-[640px]:col-span-1">
              Hanya NAMANYA yang disimpan di sini — nilai secret-nya tetap
              di .env backend dan tidak pernah ditampilkan. Untuk header
              sensitif (Authorization, X-API-Key) yang sudah tersimpan,
              nilai tampil sebagai *** dan tidak berubah bila dikirim apa
              adanya.
            </p>
            <label className={FIELD_SPAN2}>
              <span className={FIELD_LABEL}>Header tambahan (JSON)</span>
              <textarea className={FIELD_AREA}
                rows={3}
                value={form.headers_text}
                onChange={(e) => set("headers_text")(e.target.value)}
                placeholder='{"X-Custom": "nilai"}'
                spellCheck={false}
              />
            </label>
            <label className={FIELD_SPAN2}>
              <span className={FIELD_LABEL}>Catatan</span>
              <textarea className={FIELD_AREA}
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </label>
          </div>
        </FormModal>
      )}

      {error && <p className={`${ERR} mt-3`}>{error}</p>}
      {loading ? (
        <p className={EMPTY}>Memuat daftar integrasi…</p>
      ) : items.length === 0 ? (
        <p className={EMPTY}>
          {q || status
            ? "Tidak ada integrasi yang cocok dengan filter."
            : "Belum ada integrasi terdaftar."}
        </p>
      ) : (
        <ul className={LIST}>
          {items.map((i) => {
            const tr = testResults[i.id];
            return (
                            <li key={i.id} className={CARD}>
                <div className={DCARD_HEAD}>
                  <span className={DCARD_NAME}>{i.name}</span>
                  <span className={`${BADGE} ${BADGE_PLAIN}`}>{i.kind}</span>
                  <span
                    className={`${BADGE} ${BADGE_TONE[i.status === "active" ? "active" : "archived"]}`}
                  >
                    {i.status}
                  </span>
                </div>
                <p className={DCARD_SUB}>
                  <span className={PATH}>{i.base_url}</span>
                </p>
                <p className={DCARD_SUB}>
                  {i.auth_type === "none" ? (
                    <span>Auth: tanpa auth</span>
                  ) : (
                    <span>
                      Auth: {i.auth_type}
                      {i.auth_env_var ? ` · env ${i.auth_env_var} · ` : " · "}
                      {i.auth_env_var &&
                        (i.auth_env_present ? (
                          <span className="text-[#35d07f]">
                            ✓ tersedia di backend
                          </span>
                        ) : (
                          <span className="text-rose">
                            ✗ belum ada di env backend
                          </span>
                        ))}
                    </span>
                  )}
                  {i.updated_at && (
                    <span>Diubah {fmtDateTime(i.updated_at)}</span>
                  )}
                </p>
                {i.notes && <p className={DCARD_DESC}>{i.notes}</p>}
                <div className={DCARD_FOOT}>
                  <span className={DCARD_NOTE}>
                    {i.last_tested_at || tr ? (
                      tr ? (
                        tr.ok ? (
                          <span className="text-[#35d07f]">
                            ✓ Test barusan: HTTP {tr.status_code}
                            {tr.latency_ms != null
                              ? ` · ${tr.latency_ms} ms`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-rose">
                            ✗ Test barusan gagal
                            {tr.error ? `: ${tr.error}` : ""}
                          </span>
                        )
                      ) : i.last_test_ok ? (
                        <span className="text-[#35d07f]">
                          ✓ Test terakhir berhasil ·{" "}
                          {fmtDateTime(i.last_tested_at)}
                        </span>
                      ) : (
                        <span className="text-rose">
                          ✗ Test terakhir gagal ·{" "}
                          {fmtDateTime(i.last_tested_at)}
                        </span>
                      )
                    ) : (
                      <span className="text-[#6d6d78]">Belum pernah dites</span>
                    )}
                  </span>
                  {confirmId === i.id ? (
                    <span className={DCARD_ACTIONS}>
                      <span className={DCARD_CONFIRM_TEXT}>
                        Hapus integrasi ini?
                      </span>
                      <button
                        type="button"
                        className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                        title="Ya, hapus"
                        aria-label="Ya, hapus"
                        onClick={() => void remove(i)}
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
                        title="Test koneksi"
                        aria-label="Test koneksi"
                        disabled={testingId === i.id}
                        onClick={() => void runTest(i)}
                      >
                        {testingId === i.id ? (
                          <Loader2 size={15} className="aip-spin" />
                        ) : (
                          <Zap size={15} />
                        )}
                      </button>
                      <button
                        type="button"
                        className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                        title="Ubah"
                        aria-label="Ubah"
                        onClick={() => openEdit(i)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                        title="Hapus"
                        aria-label="Hapus"
                        onClick={() => setConfirmId(i.id)}
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
