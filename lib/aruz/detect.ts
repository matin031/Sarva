// وزن‌یابی نهایی — پورتِ TypeScript از arooz.py (detect / scan_report)
import { scanLine } from "./engine";
import { METERS, meterCost, bestScan, altArkan, MU } from "./meters";
import { LEXICON, LEX_MIN, LEX_TOPK, lexScore } from "./lexicon";

export interface MeterRow {
  name: string;
  ark: string;
  pat: string;
  freq: number;
  c1: number;
  c2: number;
  summ: number;
  score: number;
  lex?: number;
}

export type Confidence = "بسیار بالا" | "بالا" | "متوسط" | "پایین" | "نامطمئن";

export interface DetectResult {
  rows: MeterRow[];
  conf: Confidence;
  s1: Map<string, number>;
  s2: Map<string, number> | null;
}

export function detect(mesra1: string, mesra2?: string): DetectResult {
  const s1 = scanLine(mesra1);
  const s2 = mesra2 !== undefined ? scanLine(mesra2) : null;

  let rows: MeterRow[] = METERS.map((m) => {
    const c1 = meterCost(s1, m.pat, m.name);
    const c2 = s2 !== null ? meterCost(s2, m.pat, m.name) : c1;
    const prior = -MU * Math.log10(m.freq + 0.05);
    return {
      name: m.name,
      ark: m.ark,
      pat: m.pat,
      freq: m.freq,
      c1,
      c2,
      summ: c1 + c2,
      score: c1 + c2 + prior,
    };
  });

  const sortRows = (arr: MeterRow[]) =>
    arr.sort((a, b) => {
      const sa = Math.round(a.score * 1000) / 1000;
      const sb = Math.round(b.score * 1000) / 1000;
      if (sa !== sb) return sa - sb;
      return b.freq - a.freq;
    });

  rows = sortRows(rows);

  if (Object.keys(LEXICON).length >= LEX_MIN) {
    const top = rows.slice(0, LEX_TOPK);
    const rest = rows.slice(LEX_TOPK);
    for (const r of top) {
      let ls = lexScore(mesra1, r.pat, r.name);
      if (mesra2 !== undefined) {
        ls = (ls + lexScore(mesra2, r.pat, r.name)) / 2;
      }
      r.lex = ls;
      r.score += ls;
    }
    rows = [...sortRows(top), ...rest];
  }

  const b = rows[0];
  let conf: Confidence;
  if (b.summ < 0.7) conf = "بسیار بالا";
  else if (b.summ < 1.5) conf = "بالا";
  else if (b.summ < 2.5) conf = "متوسط";
  else if (b.summ < 4.5) conf = "پایین";
  else conf = "نامطمئن";

  return { rows, conf, s1, s2 };
}

export function marks(w: string): string {
  const out: string[] = [];
  let i = 0;
  while (i < w.length) {
    if (w.slice(i, i + 2) === "-U") {
      out.push("–ᵕ");
      i += 2;
    } else if (w[i] === "-") {
      out.push("–");
      i += 1;
    } else {
      out.push("ᵕ");
      i += 1;
    }
  }
  return out.join(" ");
}

export { altArkan, bestScan };
