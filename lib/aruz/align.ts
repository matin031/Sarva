// هم‌ترازیِ وزن‌مقید — پورتِ TypeScript از arooz.py (align / _align_seq / _onsets / _split_by_word)
import { Tok, normalize, tokenizeLine, expandAmbiguous, textVariants, weight } from "./engine";

type SylEntry = [number, number, string]; // [start, end, syllable-weight]

function* onsets(seq: Tok[], i: number): Generator<[number, string, number]> {
  const n = seq.length;
  const s = seq[i][0];
  if (s === "V" || s === "v") {
    if (i === 0 || seq[i - 1][0] === "B") {
      yield [i, s, i + 1];
    }
    return;
  }
  const k = i + 1;
  if (k < n && (seq[k][0] === "V" || seq[k][0] === "v")) {
    yield [k, seq[k][0], k + 1];
  } else if (k < n && seq[k][0] === "B") {
    let m2 = k;
    while (m2 < n && seq[m2][0] === "B") m2 += 1;
    if (m2 < n && (seq[m2][0] === "V" || seq[m2][0] === "v")) {
      yield [m2, seq[m2][0], m2 + 1];
    }
  } else if (k < n) {
    yield [k, "v", k];
  }
}

function alignSeq(seq: Tok[], pat: string): SylEntry[] | null {
  const n = seq.length;
  const m = pat.length;
  const memo = new Map<string, SylEntry[] | null>();

  function go(i: number, j: number): SylEntry[] | null {
    while (i < n && seq[i][0] === "B") i += 1;
    if (i === n) return j >= m - 1 ? [] : null;
    if (j >= m) return null;
    const key = i + "," + j;
    if (memo.has(key)) return memo.get(key)!;
    memo.set(key, null);
    for (const [, nuc, codaStart] of onsets(seq, i)) {
      for (const c of [0, 1, 2]) {
        const end = codaStart + c;
        if (end > n) break;
        const coda: string[] = [];
        let ok = true;
        for (let t = codaStart; t < end; t++) {
          if (seq[t][0] !== "C") {
            ok = false;
            break;
          }
          coda.push(seq[t][1]);
        }
        if (!ok) break;
        for (const w of weight(nuc, coda)) {
          const opts = [w];
          if (w === "-U" && (end === n || seq[end][0] === "B")) {
            opts.push("-"); // تخفیفِ کشیده
          }
          for (const wt of opts) {
            const L = wt.length;
            if (j + L > m) continue;
            const last = j + L >= m; // هجای پایانی آزاد
            if (!last && pat.slice(j, j + L) !== wt) continue;
            const rest = go(end, j + L);
            if (rest !== null) {
              const result: SylEntry[] = [[i, end, wt], ...rest];
              memo.set(key, result);
              return result;
            }
          }
        }
      }
    }
    return memo.get(key) ?? null;
  }

  return go(0, 0);
}

function splitByWord(
  seq: Tok[],
  path: SylEntry[],
  dropLiaison = true,
): Map<number, string> {
  const bounds: number[] = [];
  seq.forEach((t, i) => {
    if (t[0] === "B") bounds.push(i);
  });
  const widx = (pos: number) => bounds.filter((b) => b < pos).length;
  const out = new Map<number, string>();
  const dirty = new Set<number>();
  for (const [st, en, wt] of path) {
    const wi = widx(st);
    out.set(wi, (out.get(wi) ?? "") + wt);
    if (widx(en - 1) !== wi || bounds.some((b) => st < b && b < en)) {
      dirty.add(wi);
      dirty.add(widx(en - 1));
    }
  }
  if (dropLiaison) {
    for (const k of dirty) out.delete(k);
  }
  return out;
}

export function align(
  line: string,
  pattern: string,
  maxTry = 3000,
): [string, string][] | null {
  line = normalize(line);
  if (!line) return null;
  let best: [number, Tok[], SylEntry[], string[]] | null = null;

  for (const [ws, tp] of textVariants(line)) {
    const toks = tokenizeLine(ws.join(" "));
    let tried = 0;
    for (const [seq, pen0] of expandAmbiguous(toks, true)) {
      const pen = pen0 + tp;
      if (best !== null && pen >= best[0]) break; // خروجِ زودهنگام
      tried += 1;
      if (tried > maxTry) break;
      const r = alignSeq(seq, pattern);
      if (r !== null) {
        best = [pen, seq, r, ws];
        break;
      }
    }
  }
  if (best === null) return null;
  const [, seq, path, ws] = best;
  const d = splitByWord(seq, path);
  const keys = [...d.keys()].sort((a, b) => a - b);
  const res: [string, string][] = [];
  for (const k of keys) {
    if (k < ws.length) res.push([ws[k], d.get(k)!]);
  }
  return res;
}
