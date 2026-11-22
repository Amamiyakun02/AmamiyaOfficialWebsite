/* String utilitas Tailwind bersama panel-panel dashboard (sistem
   proj / dcard / dicon-btn / modal) — nilai disalin persis dari
   aturan globals.css pada migrasi Tailwind fase 3. Kelas vanilla
   aslinya tetap di globals.css sebagai jaring pengaman. */

export const CARD =
  "relative mb-3 list-none overflow-hidden rounded-[14px] border border-[#26262c] bg-[linear-gradient(180deg,#131318,#0e0e11)] px-[18px] pt-4 pb-0 last:mb-0 before:absolute before:top-0 before:right-0 before:left-0 before:h-[2px] before:content-['']";

export const CARD_UNREAD =
  "relative mb-3 list-none overflow-hidden rounded-[14px] border border-[rgba(0,129,251,0.45)] bg-[linear-gradient(180deg,#131318,#0e0e11)] px-[18px] pt-4 pb-0 last:mb-0 before:absolute before:top-0 before:right-0 before:left-0 before:h-[2px] before:content-['']";

export const DICON_LAYOUT =
  "inline-flex cursor-pointer items-center justify-center border transition-all duration-[120ms] disabled:cursor-default disabled:opacity-45";
export const DICON_NEUTRAL =
  "border-[#2a2a30] bg-transparent text-[#b9b9c4] enabled:hover:border-[#3d3d46] enabled:hover:bg-[rgba(255,255,255,0.05)] enabled:hover:text-white";
export const DICON_DANGER =
  "border-[#2a2a30] bg-transparent text-[#b9b9c4] enabled:hover:border-[rgba(248,113,113,0.55)] enabled:hover:bg-[rgba(248,113,113,0.07)] enabled:hover:text-[#f87171]";
export const DICON_STAR =
  "border-[#2a2a30] bg-transparent text-[#b9b9c4] enabled:hover:border-[rgba(232,185,62,0.6)] enabled:hover:bg-[rgba(255,255,255,0.05)] enabled:hover:text-[#e8b93e]";
export const DICON_GOLD =
  "border-[rgba(232,185,62,0.45)] bg-[rgba(232,185,62,0.08)] text-[#e8b93e] enabled:hover:border-[#3d3d46] enabled:hover:bg-[rgba(255,255,255,0.05)] enabled:hover:text-white";
export const DICON_GOLD_STAR =
  "border-[rgba(232,185,62,0.45)] bg-[rgba(232,185,62,0.08)] text-[#e8b93e] enabled:hover:border-[rgba(232,185,62,0.6)] enabled:hover:bg-[rgba(255,255,255,0.05)] enabled:hover:text-[#e8b93e]";

export const DICON_CROWN =
  "border-[#2a2a30] bg-transparent text-[#b9b9c4] enabled:hover:border-[rgba(167,139,250,0.6)] enabled:hover:bg-[rgba(255,255,255,0.05)] enabled:hover:text-[#a78bfa]";

export const BADGE =
  "rounded-full border px-[9px] py-[3px] text-[11px] font-bold tracking-[0.05em] uppercase";
export const BADGE_TONE: Record<string, string> = {
  active: "border-[rgba(53,208,127,0.45)] text-[#35d07f]",
  idea: "border-[rgba(227,179,65,0.45)] text-gold",
  maintenance: "border-[rgba(88,166,255,0.45)] text-[#58a6ff]",
  archived: "border-line text-[#8a8a92]",
};
export const BADGE_PLAIN = "border-line text-[#c9c9cf]";

export const FIELD = "flex flex-col gap-1.5";
export const FIELD_SPAN2 =
  "col-span-2 flex flex-col gap-1.5 max-[640px]:col-span-1";
export const FIELD_LABEL =
  "text-xs font-semibold tracking-[0.03em] text-fog";
export const FIELD_INPUT =
  "w-full rounded-[10px] border border-line bg-[#0c0c0e] px-3 py-[9px] text-sm text-paper outline-none";
export const FIELD_AREA =
  "w-full resize-y rounded-[10px] border border-line bg-[#0c0c0e] px-3 py-[9px] text-sm text-paper outline-none";
export const FIELD_SELECT =
  "rounded-[10px] border border-line bg-[#0c0c0e] px-2.5 py-[9px] text-sm text-paper outline-none";

export const ERR =
  "rounded-[10px] border border-[rgba(255,90,90,0.25)] bg-[rgba(255,90,90,0.08)] px-3 py-[9px] text-[13px] leading-[1.5] text-rose";
export const SAVE =
  "cursor-pointer rounded-lg border-none bg-accent px-[18px] py-[9px] text-sm font-semibold text-white disabled:cursor-default disabled:opacity-60";
export const MINI =
  "cursor-pointer rounded-lg border border-line bg-[rgba(16,16,19,0.7)] px-3.5 py-2 text-[13px] text-[#c9c9cf] hover:border-steel hover:text-white";
export const ADD =
  "cursor-pointer rounded-lg border-none bg-accent px-4 py-[9px] text-sm font-semibold text-white hover:bg-[#1a8dff]";
export const SEARCH =
  "flex-[1_1_220px] rounded-[10px] border border-line bg-[#0c0c0e] px-3 py-[9px] text-sm text-paper outline-none";
export const GRID = "grid grid-cols-2 gap-3 max-[640px]:grid-cols-1";
export const TOOLBAR = "flex flex-wrap items-center gap-2.5";
export const LIST = "mt-4 flex list-none flex-col gap-3 p-0";
export const EMPTY = "mt-[18px] text-sm text-fog";
export const PATH = "[font-family:ui-monospace,monospace]";

export const DCARD_HEAD = "flex flex-wrap items-center gap-2";
export const DCARD_NAME = "mr-0.5 text-[15.5px] font-[650] text-[#f4f4f6]";
export const DCARD_DESC =
  "mt-2.5 mb-0 text-[13px] leading-[1.55] text-[#c6c6cf]";
export const DCARD_SUB =
  "mt-[7px] mb-0 flex flex-wrap gap-3.5 text-xs text-[#9a9aa6]";
export const DCARD_FOOT =
  "mt-3.5 flex items-center gap-3 border-t border-[#202026] pt-2.5 pb-3";
export const DCARD_NOTE = "min-w-0 text-[12.5px]";
export const DCARD_ACTIONS =
  "ml-auto inline-flex flex-none items-center gap-1.5";
export const DCARD_CONFIRM_TEXT = "mr-0.5 text-[12.5px] text-[#f0b4b4]";
