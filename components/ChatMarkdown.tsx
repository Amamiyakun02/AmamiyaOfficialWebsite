import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import hljs from "highlight.js/lib/common";

/* =====================================================================
   Renderer markdown bersama untuk kedua chat (Assistant publik +
   AI Agent dashboard), disesuaikan dengan bentuk output model yang
   TERUKUR dari backend produksi (uji sesi Backend, 19 Nov 2026):

   - Delta SSE produksi kasar (1–6 potongan besar per jawaban), jadi
     komponen ini me-render ulang markdown dari string gabungan pada
     SETIAP delta — bukan efek mengetik per huruf.
   - Blok kode selalu ber-tag bahasa nama pendek (python, ts, js,
     html, text). Alias dipetakan di sini; text/txt/tanpa bahasa =
     tanpa highlight. Bahasa tak dikenal = polos (tidak menebak).
   - Selama streaming, mayoritas batas delta jatuh DI DALAM blok
     kode, jadi blok yang pagar penutupnya belum tiba dirender pre
     POLOS; highlight penuh (highlight.js) baru jalan begitu pagar
     penutup tiba — satu transisi bersih, tanpa kedip warna dan
     tanpa highlight ulang per delta.
   - Markdown memakai remark-gfm: tabel pipe, daftar bersarang,
     heading, inline code. HTML mentah dari model TIDAK dirender
     (react-markdown tanpa rehype-raw membuangnya) — aman.
   ===================================================================== */

const LANG_ALIASES: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  text: "text",
  txt: "text",
  plain: "text",
};

type Seg =
  | { kind: "md"; text: string }
  | { kind: "code"; lang: string; code: string; closed: boolean };

const FENCE_OPEN = /^\s{0,3}```+\s*([A-Za-z0-9_+-]*)\s*$/;
const FENCE_CLOSE = /^\s{0,3}```+\s*$/;

/* Pisah teks jadi segmen prosa & blok kode berpagar (pemindai per
   baris; pagar boleh menjorok ≤3 spasi agar blok di dalam daftar
   tetap tertangkap). Blok terakhir yang pagarnya belum tiba
   ditandai closed=false. */
function segment(text: string): Seg[] {
  const lines = text.split("\n");
  const segs: Seg[] = [];
  let md: string[] = [];
  const flushMd = () => {
    if (md.length > 0) {
      segs.push({ kind: "md", text: md.join("\n") });
      md = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const open = lines[i].match(FENCE_OPEN);
    if (open) {
      flushMd();
      const body: string[] = [];
      i += 1;
      let closed = false;
      while (i < lines.length) {
        if (FENCE_CLOSE.test(lines[i])) {
          closed = true;
          i += 1;
          break;
        }
        body.push(lines[i]);
        i += 1;
      }
      segs.push({ kind: "code", lang: open[1] || "", code: body.join("\n"), closed });
    } else {
      md.push(lines[i]);
      i += 1;
    }
  }
  flushMd();
  return segs;
}

/* Blok kode dengan highlight penuh (dipakai ChatMarkdown untuk
   blok yang pagarnya sudah menutup, dan dipakai ulang kartu file
   untuk pratinjau isi file). Bahasa tak dikenal/text = polos. */
export function HighlightedCode({ lang, code }: { lang: string; code: string }) {
  const resolved = LANG_ALIASES[lang.toLowerCase()] ?? lang.toLowerCase();
  if (resolved !== "text" && hljs.getLanguage(resolved)) {
    // Keluaran hljs aman: teks kode di-escape oleh highlight.js
    // sendiri sebelum dibungkus span token.
    const html = hljs.highlight(code, { language: resolved }).value;
    return (
      <pre className="msg-code">
        <code
          className="hljs"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    );
  }
  return (
    <pre className="msg-code">
      <code>{code}</code>
    </pre>
  );
}

function CodeBlock({
  lang,
  code,
  highlight,
}: {
  lang: string;
  code: string;
  highlight: boolean;
}) {
  if (!highlight) {
    return (
      <pre className="msg-code">
        <code>{code}</code>
      </pre>
    );
  }
  return <HighlightedCode lang={lang} code={code} />;
}

export default function ChatMarkdown({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  const segs = segment(text);
  return (
    <div className="msg-md">
      {segs.map((s, i) =>
        s.kind === "md" ? (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]}>
            {s.text}
          </ReactMarkdown>
        ) : (
          <CodeBlock
            key={i}
            lang={s.lang}
            code={s.code}
            highlight={!streaming || s.closed}
          />
        ),
      )}
    </div>
  );
}
