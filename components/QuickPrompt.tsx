"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal, Sparkles } from "lucide-react";

// Pintasan chat AI di halaman utama (permintaan user 31 Okt): pengunjung
// mengetik atau menekan contoh prompt di sini, lalu diarahkan ke halaman
// chat /tools/assistant dengan teksnya terbawa (?q=) dan terkirim
// otomatis di sana. Komponen ini sendiri TIDAK memanggil backend —
// halaman utama tetap ringan.
const SUGGESTIONS = [
  "Tell me about Amamiya's skills",
  "Show me his latest projects",
  "How can I get in touch with him?",
];

export default function QuickPrompt() {
  const router = useRouter();
  const [text, setText] = useState("");

  const go = (raw: string) => {
    const q = raw.trim();
    router.push(q ? `/tools/assistant?q=${encodeURIComponent(q)}` : "/tools/assistant");
  };

  return (
    <div className="quick-prompt">
      <form
        className="qp-bar"
        onSubmit={(e) => {
          e.preventDefault();
          go(text);
        }}
      >
        <Sparkles size={18} className="qp-icon" aria-hidden="true" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Vienna, my AI assistant, anything…"
          aria-label="Tulis pertanyaan untuk asisten AI"
          maxLength={500}
        />
        <button type="submit" className="qp-send" aria-label="Buka chat AI">
          <SendHorizontal size={17} />
        </button>
      </form>
      <div className="qp-chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="qp-chip" onClick={() => go(s)}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
