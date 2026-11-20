"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Mail,
  MailOpen,
  RefreshCw,
  Reply,
  Trash2,
  X,
} from "lucide-react";
import { apiUrl } from "@/lib/api";

/* Modul Inbox — pesan masuk & feedback pengunjung (permintaan user
   20 Nov 2026). Sumbernya SATU gudang lama backend Vienna Agent:
   koleksi Mongo `feedbacks` lewat /v1/admin/feedbacks. Ke sanalah
   formulir Contact di situs mengirim (category "contact", isi
   berawalan "Contact from Nama <email>:") dan halaman tool
   Feedback mengirim (category sesuai pilihan pengirim). GET
   mengembalikan ARRAY polos tersortir terbaru dulu (bukan
   {items}); PUT {status} menandai dibaca/belum; DELETE menghapus.
   Semua panggilan panel ini bergerbang X-Admin-Token (token
   dashboard yang sama). Catatan keamanan yang sudah diserahkan ke
   sesi Backend: pisahkan auth per metode — POST publik (formulir
   situs), GET/PUT/DELETE wajib token. */

type FeedbackItem = {
  _id: string;
  customer_name: string;
  rating?: string;
  category?: string;
  content: string;
  status?: string;
  created_at?: string | null;
  email?: string | null;
  source?: string | null;
};

type Filter = "all" | "new" | "contact" | "feedback";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "new", label: "Belum dibaca" },
  { id: "contact", label: "Kontak" },
  { id: "feedback", label: "Feedback" },
];

const CATEGORY_LABELS: Record<string, string> = {
  general: "Umum",
  bug_report: "Laporan Bug",
  feature_request: "Permintaan Fitur",
  review: "Ulasan",
  contact: "Kontak",
};

// Pesan kontak lama & baru menyimpan pengirim di awalan isi:
// "Contact from Nama <email>:\n\n<isi pesan>". Kenali pola itu
// untuk menampilkan email + isi bersih; field email terstruktur
// (bila backend sudah menerimanya) didahulukan.
function parseContact(item: FeedbackItem): {
  email: string | null;
  body: string;
  isContact: boolean;
} {
  const m = /^Contact from .+? <([^>]+)>:\s*\n\n?/.exec(item.content || "");
  const fromPrefix = m ? m[1] : null;
  const body = m ? (item.content || "").slice(m[0].length) : item.content || "";
  const isContact =
    item.category === "contact" || item.source === "contact" || !!m;
  return { email: item.email || fromPrefix, body, isContact };
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return (
    d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
  );
}

function Stars({ rating }: { rating?: string }) {
  const n = Math.max(0, Math.min(5, parseInt(rating || "0", 10) || 0));
  if (n === 0) return null;
  return (
    <span className="inbox-stars" title={`Rating ${n}/5`}>
      {"★".repeat(n)}
      <span className="inbox-stars-off">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default function InboxPanel() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const token = () =>
    typeof window !== "undefined"
      ? localStorage.getItem("dashboard_token") || ""
      : "";

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(apiUrl("/v1/admin/feedbacks?limit=100"), {
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) throw new Error("load");
      const data = (await res.json()) as FeedbackItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Gagal memuat pesan masuk. Coba muat ulang.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(item: FeedbackItem, status: "read" | "new") {
    setBusyId(item._id);
    try {
      const res = await fetch(apiUrl(`/v1/admin/feedbacks/${item._id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": token(),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("put");
      setItems((prev) =>
        (prev || []).map((x) =>
          x._id === item._id ? { ...x, status } : x,
        ),
      );
    } catch {
      setError("Gagal mengubah status pesan.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(item: FeedbackItem) {
    setBusyId(item._id);
    try {
      const res = await fetch(apiUrl(`/v1/admin/feedbacks/${item._id}`), {
        method: "DELETE",
        headers: { "X-Admin-Token": token() },
      });
      if (!res.ok) throw new Error("del");
      setItems((prev) => (prev || []).filter((x) => x._id !== item._id));
      setConfirmId(null);
    } catch {
      setError("Gagal menghapus pesan.");
    } finally {
      setBusyId(null);
    }
  }

  const all = items || [];
  const unread = all.filter((x) => (x.status || "new") === "new").length;
  const shown = all.filter((x) => {
    if (filter === "all") return true;
    if (filter === "new") return (x.status || "new") === "new";
    const { isContact } = parseContact(x);
    return filter === "contact" ? isContact : !isContact;
  });

  return (
    <div className="proj">
      <div className="inbox-toolbar">
        <div className="inbox-filters" role="tablist" aria-label="Filter pesan">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`inbox-filter${filter === f.id ? " is-on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === "new" && unread > 0 ? ` (${unread})` : ""}
            </button>
          ))}
        </div>
        <span className="inbox-count">
          {items === null
            ? "Memuat…"
            : `${shown.length} dari ${all.length} pesan · ${unread} belum dibaca`}
        </span>
        <button
          type="button"
          className="dicon-btn"
          onClick={() => void load()}
          title="Muat ulang"
          aria-label="Muat ulang"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <p className="proj-error">{error}</p>}

      {items !== null && shown.length === 0 && (
        <p className="proj-empty">
          {all.length === 0
            ? "Belum ada pesan masuk. Pesan dari formulir Contact dan tool Feedback akan tampil di sini."
            : "Tidak ada pesan pada filter ini."}
        </p>
      )}

      <div className="inbox-list">
        {shown.map((item) => {
          const { email, body, isContact } = parseContact(item);
          const isNew = (item.status || "new") === "new";
          const catLabel = isContact
            ? "Kontak"
            : CATEGORY_LABELS[item.category || "general"] ||
              item.category ||
              "Umum";
          return (
            <article
              key={item._id}
              className={`dcard inbox-card${isNew ? " is-unread" : ""}`}
            >
              <div className="dcard-head">
                <span className="dcard-name">{item.customer_name}</span>
                <span className="proj-badge">{catLabel}</span>
                {isNew ? (
                  <span className="proj-badge inbox-badge-new">Baru</span>
                ) : (
                  <span className="proj-badge proj-badge-idea">Dibaca</span>
                )}
                {!isContact && <Stars rating={item.rating} />}
              </div>
              <p className="dcard-sub">
                {item.created_at && (
                  <span>{fmtDateTime(item.created_at)}</span>
                )}
                {email && (
                  <a className="inbox-mail" href={`mailto:${email}`}>
                    {email}
                  </a>
                )}
              </p>
              <p className="inbox-content">{body}</p>
              <div className="dcard-foot">
                <span className="dcard-foot-note" />
                {confirmId === item._id ? (
                  <span className="dcard-confirm">
                    <span className="dcard-confirm-text">Hapus pesan ini?</span>
                    <button
                      type="button"
                      className="dicon-btn is-danger"
                      disabled={busyId === item._id}
                      onClick={() => void remove(item)}
                      title="Ya, hapus"
                      aria-label="Ya, hapus"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className="dicon-btn"
                      onClick={() => setConfirmId(null)}
                      title="Batal"
                      aria-label="Batal"
                    >
                      <X size={15} />
                    </button>
                  </span>
                ) : (
                  <span className="dcard-actions">
                    {email && (
                      <a
                        className="dicon-btn"
                        href={`mailto:${email}?subject=${encodeURIComponent(
                          `Re: Pesanmu di amamiya.web.id`,
                        )}`}
                        title={`Balas ke ${email}`}
                        aria-label={`Balas ke ${email}`}
                      >
                        <Reply size={15} />
                      </a>
                    )}
                    <button
                      type="button"
                      className="dicon-btn"
                      disabled={busyId === item._id}
                      onClick={() =>
                        void setStatus(item, isNew ? "read" : "new")
                      }
                      title={isNew ? "Tandai sudah dibaca" : "Tandai belum dibaca"}
                      aria-label={
                        isNew ? "Tandai sudah dibaca" : "Tandai belum dibaca"
                      }
                    >
                      {isNew ? <MailOpen size={15} /> : <Mail size={15} />}
                    </button>
                    <button
                      type="button"
                      className="dicon-btn is-danger"
                      onClick={() => setConfirmId(item._id)}
                      title="Hapus pesan"
                      aria-label="Hapus pesan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
