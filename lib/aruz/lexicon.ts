// واژه‌نامهٔ کلاسیک + بازرتبه‌بندیِ واژه‌نامه‌ای — پورتِ TypeScript از arooz.py
import { align } from "./align";
import { meterVariants } from "./meters";
import lexiconData from "./lexicon.json";

type LexEntry = Record<string, number>; // {رشتهٔ‌وزن: شمار}
export const LEXICON: Record<string, LexEntry> = lexiconData as Record<
  string,
  LexEntry
>;

export const LEX_W = 0.8;
export const LEX_MIN = 5000;
export const LEX_TOPK = 12;

export function lexScore(line: string, pat: string, name?: string): number {
  if (Object.keys(LEXICON).length === 0) return 0.0;
  let a: [string, string][] | null = null;
  const variants = Object.keys(meterVariants(pat, name)).sort(
    (x, y) => Math.abs(x.length - pat.length) - Math.abs(y.length - pat.length),
  );
  for (const v of variants) {
    try {
      a = align(line, v);
    } catch {
      a = null;
    }
    if (a) break;
  }
  if (a === null) return 1.1; // نتوانست در این وزن خوانده شود
  let totS = 0.0;
  let n = 0;
  for (const [w, wt] of a) {
    const c = LEXICON[w];
    if (!c) continue;
    n += 1;
    const N = Object.values(c).reduce((s, v) => s + v, 0);
    const k = c[wt] ?? 0;
    totS += -Math.log10((k + 0.2) / (N + 1.0));
  }
  return n ? (LEX_W * totS) / n : 0.0;
}
