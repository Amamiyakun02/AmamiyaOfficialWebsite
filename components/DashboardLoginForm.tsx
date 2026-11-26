"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUrl } from "@/lib/api";

/* Form login System Dashboard — dirender DI TENGAH panggung entrance
   (di bawah cip FxCards, menggantikan baris tombol CTA) atas permintaan
   user 5 Nov: halaman login = copas halaman utama + form di tengah.
   Validasi WAJIB ke backend Vienna Agent (POST /v1/dashboard/login);
   token admin disimpan di localStorage "dashboard_token" dan dipakai
   gerbang /dashboard + header X-Admin-Token untuk endpoint modul. */
export default function DashboardLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/v1/dashboard/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        detail?: string;
      };
      if (!res.ok || !data.token) {
        setError(
          data.detail ||
            (res.status === 401
              ? "Username atau password salah."
              : "Login gagal. Coba lagi sebentar."),
        );
        return;
      }
      localStorage.setItem("dashboard_token", data.token);
      router.replace("/dashboard");
    } catch {
      setError(
        "Backend tidak terjangkau. Pastikan Vienna Agent sedang berjalan, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      {/* Kepala merek di dalam form (permintaan user 26 Nov 2026):
          logo + nama Amamiya + label Dashboard System, menggantikan
          judul teks lama "System Dashboard". */}
      <div className="login-brand">
        <img src="/favicon.png" alt="" className="login-brand-logo" />
        <p className="login-brand-sub">Dashboard System</p>
      </div>
      <label className="login-field">
        <span>Username</span>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </label>
      <label className="login-field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && (
        <p className="login-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="login-submit" disabled={busy}>
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
