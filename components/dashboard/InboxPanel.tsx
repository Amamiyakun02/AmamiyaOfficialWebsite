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
import {
  BADGE,
  BADGE_PLAIN,
  BADGE_TONE,
  CARD,
  CARD_UNREAD,
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
} from "./ui";

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
    <span className="ml-auto text-[13px] tracking-[1px] text-[#e5b95f]" title={`Rating ${n}/5`}>
      {"★".repeat(n)}
      <span className="text-steel">{"★".repeat(5 - n)}</span>
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
    <div className="mt-[18px]">
      <div className="mb-3.5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter pesan">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`cursor-pointer rounded-full border px-[13px] py-1.5 text-[12.5px] ${filter === f.id ? "border-[rgba(0,255,170,0.5)] bg-[rgba(0,255,170,0.16)] text-white" : "border-line3 bg-[#11245F] text-[#AFC2E6] hover:border-steel hover:text-white"}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === "new" && unread > 0 ? ` (${unread})` : ""}
            </button>
          ))}
        </div>
        <span className="flex-1 text-right text-[12.5px] text-fog">
          {items === null
            ? "Memuat…"
            : `${shown.length} dari ${all.length} pesan · ${unread} belum dibaca`}
        </span>
        <button
          type="button"
          className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
          onClick={() => void load()}
          title="Muat ulang"
          aria-label="Muat ulang"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {error && <p className={`${ERR} mt-3`}>{error}</p>}

      {items !== null && shown.length === 0 && (
        <p className={EMPTY}>
          {all.length === 0
            ? "Belum ada pesan masuk. Pesan dari formulir Contact dan tool Feedback akan tampil di sini."
            : "Tidak ada pesan pada filter ini."}
        </p>
      )}

      <div className="flex flex-col gap-2.5">
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
              className={isNew ? CARD_UNREAD : CARD}
            >
              <div className={DCARD_HEAD}>
                <span className={DCARD_NAME}>{item.customer_name}</span>
                <span className={`${BADGE} ${BADGE_PLAIN}`}>{catLabel}</span>
                {isNew ? (
                  <span className={`${BADGE} border-[rgba(0,255,170,0.45)] bg-[rgba(0,255,170,0.18)] text-[#5EEAD0]`}>Baru</span>
                ) : (
                  <span className={`${BADGE} ${BADGE_TONE.idea}`}>Dibaca</span>
                )}
                {!isContact && <Stars rating={item.rating} />}
              </div>
              <p className={DCARD_SUB}>
                {item.created_at && (
                  <span>{fmtDateTime(item.created_at)}</span>
                )}
                {email && (
                  <a className="text-[#5EEAD0] no-underline hover:underline" href={`mailto:${email}`}>
                    {email}
                  </a>
                )}
              </p>
              <p className="mt-0.5 mb-0 text-[13.5px] leading-[1.55] whitespace-pre-wrap break-anywhere text-[#C3D2F0]">{body}</p>
              <div className={DCARD_FOOT}>
                <span className={DCARD_NOTE} />
                {confirmId === item._id ? (
                  <span className={DCARD_ACTIONS}>
                    <span className={DCARD_CONFIRM_TEXT}>Hapus pesan ini?</span>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
                      disabled={busyId === item._id}
                      onClick={() => void remove(item)}
                      title="Ya, hapus"
                      aria-label="Ya, hapus"
                    >
                      <Check size={15} />
                    </button>
                    <button
                      type="button"
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
                      onClick={() => setConfirmId(null)}
                      title="Batal"
                      aria-label="Batal"
                    >
                      <X size={15} />
                    </button>
                  </span>
                ) : (
                  <span className={DCARD_ACTIONS}>
                    {email && (
                      <a
                        className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
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
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_NEUTRAL}`}
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
                      className={`${DICON_LAYOUT} h-8 w-8 rounded-lg ${DICON_DANGER}`}
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
