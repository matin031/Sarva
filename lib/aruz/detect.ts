// وزن‌یابی نهایی — پورتِ TypeScript از arooz.py (detect / scan_report)
import { scanLine } from "./engine";
import {
  METERS,
  meterCostDetail,
  bestScan,
  altArkan,
  MU,
  RARE_TAIL_PENALTY,
  RARE_TAIL_FREQ,
  FAM_PAT,
  type CostDetail,
} from "./meters";
import { LEXICON, LEX_MIN, LEX_TOPK, lexScore } from "./lexicon";
import rankerData from "./ranker.json";

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

// ═══════════ رتبه‌بندِ آموخته ═══════════
// امتیازِ دستی (c1+c2+prior+rare) جمعِ ضرایبی بود که روی چند ده بیت کوک شده
// بودند. وزن‌های زیر از پیکرهٔ برچسب‌خورده آموخته شده‌اند: روی مجموعهٔ آزمونِ
// کنارگذاشته ۷۵.۵٪ در برابر ۶۸.۵٪ فرمولِ دستی.
const RANKER = rankerData as { bias: number; w: Record<string, number> };
const COST_CAP = 20.0;

/** ویژگی‌های یک نامزد — باید *دقیقاً* مثلِ _feats در arooz.py باشد،
 *  وگرنه وزن‌های آموخته بی‌معنا می‌شوند. */
function feats(
  name: string,
  ark: string,
  pat: string,
  freq: number,
  d1: CostDetail,
  d2: CostDetail,
): Record<string, number> {
  const q1 = Math.min(d1.cost, COST_CAP);
  const q2 = Math.min(d2.cost, COST_CAP);
  return {
    c1: q1,
    c2: q2,
    cmin: Math.min(q1, q2),
    cmax: Math.max(q1, q2),
    cdiff: Math.abs(q1 - q2),
    lfreq: Math.log10(freq + 0.05),
    rare: freq < RARE_TAIL_FREQ ? 1.0 : 0.0,
    generic: name === ark ? 1.0 : 0.0,
    nfeet: ark.split(/\s+/).length,
    plen: pat.length,
    fam: name in FAM_PAT ? 1.0 : 0.0,
    hard1: Math.min(d1.hard, COST_CAP),
    hard2: Math.min(d2.hard, COST_CAP),
    soft1: Math.min(d1.soft, COST_CAP),
    soft2: Math.min(d2.soft, COST_CAP),
    spen1: Math.min(d1.spen, COST_CAP),
    spen2: Math.min(d2.spen, COST_CAP),
    vpen: Math.max(d1.vpen, d2.vpen),
    // بیتِ واقعی باید در هر دو مصراع همان گونهٔ وزنی را بگیرد
    samevar: d1.vid !== "" && d1.vid === d2.vid ? 1.0 : 0.0,
    nofit: 1.0 - d1.fit + (1.0 - d2.fit),
    vlen: d1.vlen || d2.vlen,
  };
}

function baseScore(
  name: string,
  ark: string,
  pat: string,
  freq: number,
  d1: CostDetail,
  d2: CostDetail,
): number {
  if (RANKER && RANKER.w) {
    const ft = feats(name, ark, pat, freq, d1, d2);
    let s = RANKER.bias ?? 0;
    for (const k in RANKER.w) if (k in ft) s += RANKER.w[k] * ft[k];
    return s;
  }
  const prior = -MU * Math.log10(freq + 0.05);
  const rare = freq < RARE_TAIL_FREQ ? RARE_TAIL_PENALTY : 0;
  return d1.cost + d2.cost + prior + rare;
}

export function detect(mesra1: string, mesra2?: string): DetectResult {
  const s1 = scanLine(mesra1);
  const s2 = mesra2 !== undefined ? scanLine(mesra2) : null;

  let rows: MeterRow[] = METERS.map((m) => {
    const d1 = meterCostDetail(s1, m.pat, m.name);
    const d2 = s2 !== null ? meterCostDetail(s2, m.pat, m.name) : d1;
    const c1 = d1.cost;
    const c2 = d2.cost;
    return {
      name: m.name,
      ark: m.ark,
      pat: m.pat,
      freq: m.freq,
      c1,
      c2,
      summ: c1 + c2,
      score: baseScore(m.name, m.ark, m.pat, m.freq, d1, d2),
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
