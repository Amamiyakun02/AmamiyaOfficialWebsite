"use client";

// Inti i18n situs publik (27 Nov 2026): LanguageProvider + hook
// useLang + tombol LangSwitcher. Bahasa bawaan "en" (branding
// internasional); pilihan pengunjung disimpan di localStorage
// "site-lang" dan atribut lang <html> diselaraskan tiap pergantian.
//
// Render server selalu memakai "en" — cocok dengan bahasa bawaan.
// Pengunjung lama yang memilih "id" melihat pergantian EN->ID sesaat
// sesudah hidrasi; itu konsekuensi wajar i18n sisi klien tanpa rute
// per bahasa (URL situs tetap satu, tanpa awalan /en atau /id).

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Globe } from "lucide-react";
import { DICT, type DictKey, type Lang } from "./dict";

type LangCtx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
};

const Ctx = createContext<LangCtx>({
  lang: "en",
  setLang: () => {},
  t: (key) => DICT[key].en,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = window.localStorage.getItem("site-lang");
    if (saved === "id" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem("site-lang", l);
    } catch {
      /* localStorage tak tersedia — pilihan berlaku sesi ini saja */
    }
  };

  const t: LangCtx["t"] = (key, vars) => {
    let s: string = DICT[key][lang] ?? DICT[key].en;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(v));
      }
    }
    return s;
  };

  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  return useContext(Ctx);
}

// Pil dua posisi EN | ID dalam satu pil berbingkai — dipakai di
// navbar desktop dan di laci mobile. Tombol aktif terisi aksen.
export function LangSwitcher({ onPick }: { onPick?: () => void }) {
  const { lang, setLang, t } = useLang();
  const opt = (l: Lang, label: string) => (
    <button
      type="button"
      aria-pressed={lang === l}
      onClick={() => {
        setLang(l);
        onPick?.();
      }}
      className={`cursor-pointer rounded-full px-2.5 py-1 text-[12px] font-bold tracking-[0.04em] transition-colors duration-150 ${
        lang === l
          ? "bg-accent text-[#052A1E]"
          : "text-[#9DB1D9] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
  return (
    <span
      className="inline-flex flex-none items-center gap-0.5 rounded-full border border-line3 bg-white/[0.03] p-[3px]"
      role="group"
      aria-label={t("nav.language")}
      title={t("nav.language")}
    >
      <Globe size={13} className="ml-1 flex-none text-[#8298C0]" aria-hidden="true" />
      {opt("en", "EN")}
      {opt("id", "ID")}
    </span>
  );
}
