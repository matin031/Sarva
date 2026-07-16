// موتور تقطیع و تشخیص وزن عروضی شعر فارسی — پورتِ TypeScript از arooz.py (نسخهٔ ۱۳.۴)
// روش: تقطیعِ مقیدشده به وزن با تجزیه‌گرِ مرزآگاه.
// نماد: - = هجای بلند | U = هجای کوتاه (هجای کشیده = -U)

export type Tok = [string, string]; // [نماد، حرف]

// ============================================================ ۱) نرمال‌سازی
const ARABIC_MAP: Record<string, string> = {
  ي: "ی",
  ك: "ک",
  ﻻ: "لا",
  ة: "ه",
  ۀ: "ه",
  أ: "ا",
  إ: "ا",
  ٱ: "ا",
  ى: "ی",
  ؤ: "و",
  ئ: "ی",
  ء: "",
  "‌": " ",
  ـ: "",
};

export const FATHA = "َ";
export const KASRA = "ِ";
export const DAMMA = "ُ";
export const SUKUN = "ْ";
export const SHADDA = "ّ";
export const TANWIN_FATH = "ً";
export const MADDA = "ٓ";
const SHORT_VOWELS = new Set([FATHA, KASRA, DAMMA]);
const COMBINING = new Set([FATHA, KASRA, DAMMA, SUKUN, SHADDA, TANWIN_FATH, MADDA]);

const OK_CHARS = new Set([
  ..."ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیآ ",
  ...SHORT_VOWELS,
  SUKUN,
  SHADDA,
  TANWIN_FATH,
  MADDA,
]);

export function normalize(t: string): string {
  t = t.normalize("NFC");
  t = Array.from(t)
    .map((c) => (c in ARABIC_MAP ? ARABIC_MAP[c] : c))
    .join("");
  t = Array.from(t)
    .map((c) => (OK_CHARS.has(c) ? c : " "))
    .join("");
  return t.split(/\s+/).filter(Boolean).join(" ");
}

const CONS = new Set("بپتثجچحخدذرزژسشصضطظعغفقکگلمن");

// ================================================ ۲) نویسه → توکن (نماد،حرف)
// نمادها: C صامت | V مصوت بلند | v مصوت کوتاه | E هِ پایانی(کوتاه/بلند) |
//         W واو مبهم | Y یِ مبهم | A الفِ آغازین مبهم | B مرز واژه
function units(w: string): [string, Set<string>][] {
  const chars = Array.from(w);
  const out: [string, Set<string>][] = [];
  let i = 0;
  const n = chars.length;
  while (i < n) {
    const b = chars[i];
    i += 1;
    const m = new Set<string>();
    while (i < n && COMBINING.has(chars[i])) {
      m.add(chars[i]);
      i += 1;
    }
    out.push([b, m]);
  }
  return out;
}

export function tokenizeWord(word: string): Tok[] {
  if (word === "و") return [["Q", "و"]]; // واو عطف: کوتاه (وُ) یا بلند (او)
  const toks: Tok[] = [];
  const U = units(word);
  const n = U.length;
  let i = 0;
  while (i < n) {
    const [base, marks] = U[i];
    const start = i === 0;
    const last = i === n - 1;
    const shadda = marks.has(SHADDA);
    const sukun = marks.has(SUKUN);
    const short = [...marks].some((c) => SHORT_VOWELS.has(c));
    const madda = marks.has(MADDA);
    const prevb = i > 0 ? U[i - 1][0] : "";
    const nextb = i + 1 < n ? U[i + 1][0] : "";
    const nxtIsVowel = ["ا", "آ", "و", "ی", "ه"].includes(nextb);

    const cons = (letter: string = base) => {
      toks.push(["C", letter]);
      if (shadda) toks.push(["C", letter]);
      if (short) toks.push(["v", ""]);
    };

    // اِی/اُو آغازین
    if (
      start &&
      base === "ا" &&
      (nextb === "ی" || nextb === "و") &&
      i + 1 < n &&
      ![...U[i + 1][1]].some((c) => SHORT_VOWELS.has(c))
    ) {
      toks.push(["H", "ء"]);
      toks.push(["V", nextb]);
      i += 2;
      continue;
    }

    if (base === "آ" || (base === "ا" && madda)) {
      toks.push(["V", "ا"]);
    } else if (base === "ا") {
      if (start) {
        toks.push(short ? ["v", ""] : ["A", "ا"]);
      } else {
        toks.push(["V", "ا"]);
      }
      // ───── واو ─────
    } else if (base === "و") {
      if (short) cons();
      else if (sukun) toks.push(["V", "و"]);
      else if (start) cons(); // واوِ آغازین = صامت (وَرنه)
      else if (prevb === "خ") toks.push(["X", "و"]); // واوِ معدوله
      else toks.push(["W", "و"]); // مبهم
      // ───── یا ─────
    } else if (base === "ی") {
      if (short) cons();
      else if (sukun) toks.push(["V", "ی"]);
      else if (start) cons(); // یِ آغازین = صامت
      else if (CONS.has(prevb) && !nxtIsVowel) toks.push(["V", "ی"]); // پس از صامت، پیش از صامت/پایان
      else toks.push(["Y", "ی"]); // مبهم
    } else if (base === "ه") {
      if (short) cons();
      else if (last && n > 1 && prevb !== "آ") toks.push(["E", "ه"]); // هِ پایانیِ e
      else cons();
    } else if (base === "ع") {
      toks.push(["N", "ع"]); // ع: صامت یا حذف
    } else if (CONS.has(base)) {
      cons();
    }
    i += 1;
  }
  return toks;
}

function markShortenable(wt: Tok[]): Tok[] {
  // مصوتِ بلندِ پایانِ واژه می‌تواند کوتاه شود (اختیارِ زبانی)
  if (wt.length && wt[wt.length - 1][0] === "V") {
    return [...wt.slice(0, -1), ["S", wt[wt.length - 1][1]]];
  }
  return wt;
}

export function tokenizeLine(line: string): Tok[] {
  const ws = line.split(/\s+/).filter(Boolean);
  const toks: Tok[] = [];
  ws.forEach((w, wi) => {
    if (toks.length) toks.push(["B", "B"]);
    const wt = markShortenable(tokenizeWord(w));
    toks.push(...wt);
    if (wi < ws.length - 1 && wt.length) {
      // کسرهٔ اضافهٔ اختیاری (نه بعدِ واژهٔ آخر)
      const last = wt[wt.length - 1][0];
      toks.push(
        ["V", "E", "W", "Y", "A", "Q"].includes(last) ? ["Z", "ی"] : ["Z", ""],
      );
    }
  });
  return toks;
}

// ==================================== ۳) گسترشِ ابهام (W/Y/A/E) → قطعی
export const PEN_MAX = 7; // هرسِ بی‌خطر
type ExpItem = [Tok[], number];
const EXP_CACHE = new Map<string, ExpItem[]>();

// جدول‌های گونه‌سازی — یک‌بار در بارگذاریِ ماژول ساخته می‌شوند (نه هر فراخوانی)
const OPT: Record<string, [Tok, number][]> = {
  W: [
    [["C", "و"], 0],
    [["V", "و"], 0],
  ],
  Y: [
    [["C", "ی"], 0],
    [["V", "ی"], 0],
  ],
  A: [
    [["v", ""], 0],
    [["V", "ا"], 0],
  ],
  E: [
    [["v", ""], 0],
    [["V", ""], 1],
  ],
};

function buildMulti(full: boolean): Record<string, [Tok[], number][]> {
  return {
    H: [
      [[["C", "ء"]], 0],
      [[], 0],
    ],
    N: [
      [[["C", "ع"]], 0],
      [[], 1],
    ],
    X: [
      [[], 0],
      [[["V", "و"]], 0],
    ],
    Q: [
      [[["v", ""]], 0],
      [
        [
          ["C", "و"],
          ["v", ""],
        ],
        0,
      ],
      [[["V", "و"]], 1],
    ],
    Z: [
      [[], 0],
      [[["v", ""]], 0],
      ...(full ? ([[[["V", ""]], 1]] as [Tok[], number][]) : []),
    ],
    Zy: [
      [[], 0],
      [
        [
          ["C", "ی"],
          ["v", ""],
        ],
        0,
      ],
      ...(full
        ? ([
            [
              [
                ["C", "ی"],
                ["V", ""],
              ],
              1,
            ],
          ] as [Tok[], number][])
        : []),
    ],
  };
}
const MULTI_FULL = buildMulti(true);
const MULTI_NOTFULL = buildMulti(false);

function tokKey(toks: Tok[]): string {
  let s = "";
  for (const [a, b] of toks) {
    s += a;
    s += "";
    s += b;
    s += "";
  }
  return s;
}

export function expandAmbiguous(toks: Tok[], full = false): ExpItem[] {
  const MULTI = full ? MULTI_FULL : MULTI_NOTFULL;

  const key = tokKey(toks) + (full ? "|1" : "|0");
  const cached = EXP_CACHE.get(key);
  if (cached) return cached;

  let res: ExpItem[] = [[[], 0]];
  for (const t of toks) {
    const s = t[0];
    if (s === "C" || s === "V" || s === "v" || s === "B") {
      res = res.map(([r, p]) => [[...r, t], p]);
    } else if (s === "Z") {
      const key2 = t[1] === "ی" ? "Zy" : "Z";
      const next: ExpItem[] = [];
      for (const [r, p] of res) {
        for (const [o, q] of MULTI[key2]) next.push([[...r, ...o], p + q]);
      }
      res = next;
    } else if (s in MULTI) {
      const next: ExpItem[] = [];
      for (const [r, p] of res) {
        for (const [o, q] of MULTI[s]) next.push([[...r, ...o], p + q]);
      }
      res = next;
    } else if (s === "S") {
      const next: ExpItem[] = [];
      for (const [r, p] of res) {
        next.push([[...r, ["V", t[1]]], p]);
        next.push([[...r, ["v", ""]], p + 1]);
      }
      res = next;
    } else {
      const next: ExpItem[] = [];
      for (const [r, p] of res) {
        for (const [o, q] of OPT[s]) next.push([[...r, o], p + q]);
      }
      res = next;
    }
    if (res.length > 4000) {
      res.sort((a, b) => a[1] - b[1]);
      const mn = res[0][1];
      res = res.filter((x) => x[1] <= mn + PEN_MAX).slice(0, 40000);
    }
  }
  res.sort((a, b) => a[1] - b[1]);
  const mn = res.length ? res[0][1] : 0;
  res = res.filter((x) => x[1] <= mn + PEN_MAX);
  EXP_CACHE.set(key, res);
  return res;
}

// ==================================== ۴) هجابندی + وزن (تجزیه‌گرِ مرزآگاه)
// خوشهٔ صامتیِ پایانیِ دوتایی فقط اگر در فارسی واقعاً وجود داشته باشد مجاز است.
const PH: Record<string, string> = {
  ب: "b",
  پ: "p",
  ت: "t",
  ث: "s",
  ج: "j",
  چ: "C",
  ح: "h",
  خ: "x",
  د: "d",
  ذ: "z",
  ر: "r",
  ز: "z",
  ژ: "Z",
  س: "s",
  ش: "S",
  ص: "s",
  ض: "z",
  ط: "t",
  ظ: "z",
  ع: "?",
  غ: "G",
  ف: "f",
  ق: "q",
  ک: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  و: "v",
  ه: "h",
  ی: "y",
  ء: "?",
};
const CODA_OK = new Set([
  "Sn","yd","f?","yx","zd","Sr","ld","fl","zf","ml","tn","rj","qt","rd","bk","kl","fs","nb",
  "xm","mn","bz","lh","qd","fz","t?","yn","rb","sm","hn","vj","fr","jm","^n","qr","yf","lt",
  "rx","tf","hl","lm","Sd","yl","sp","st","rt","lx","tl","z?","Sk","Sf","?q","bh","qf","dr",
  "nq","nc","nt","yt","St","yS","rC","ks","?d","nd","rv","hs","sn","ng","tb","nS","km","xz",
  "sx","mz","vl","qS","rk","yz","?n","jr","rl","xt","ys","yb","lc","mr","zn","rz","lb","rn",
  "mb","rS","jh","yv","m?","qs","nj","bs","sl","bl","rs","zm","ft","zb","?m","bq","sd","ql",
  "dl","xS","zr","lq","hr","nf","hd","tr","?y","th","?f","sr","bt","zv","rf","yr","Sq","xs",
  "rm","?r","lf","nz","rq","?l","Sm","sq","jz","vr","ms","mt","rh","?b","hm","rp","br","rg",
  "ns","sk","nk","kr","sb",
]);

function codaPenalty(cl: string[]): number {
  if (cl.length < 2) return 0.0;
  const k = cl.map((c) => PH[c] ?? "?").join("");
  return CODA_OK.has(k) ? 0.0 : 3.0;
}

export function weight(nuc: string, coda: string[]): string[] {
  if (nuc === "V") {
    if (coda.length === 0) return ["-"];
    if (coda.length === 1 && coda[0] === "ن") return ["-"]; // قاعدهٔ «ن» پس از مصوت بلند
    return ["-U"]; // کشیده
  }
  if (coda.length === 0) return ["U"];
  if (coda.length === 1) return ["-"];
  return ["-U"];
}

export function scanSeq(seq: Tok[]): Map<string, number> {
  const n = seq.length;
  const memo = new Map<number, Map<string, number>>();
  const isV = (t: string) => t === "V" || t === "v";

  function finish(
    nuc: string,
    _nl: string,
    j: number,
    parse: (i: number) => Map<string, number>,
  ): Map<string, number> {
    const out = new Map<string, number>();
    for (const c of [0, 1, 2]) {
      const end = j + c;
      if (end > n) break;
      const cl: string[] = [];
      let ok = true;
      for (let t = j; t < end; t++) {
        if (seq[t][0] !== "C") {
          ok = false;
          break;
        }
        cl.push(seq[t][1]);
      }
      if (!ok) break;
      const wl = weight(nuc, cl);
      const cp = codaPenalty(cl);
      let ws: [string, number][];
      if (end === n) {
        // ★ هجای پایانیِ مصراع همیشه دقیقاً یک هجای بلند است
        ws = [["-", cp]];
      } else {
        ws = wl.map((x) => [x, cp] as [string, number]);
        if (wl.includes("-U") && seq[end][0] === "B") {
          ws.push(["-", cp + 1]); // تخفیفِ کشیده در وسطِ مصراع
        }
      }
      for (const [wt, wp] of ws) {
        for (const [suf, sp] of parse(end)) {
          const k = wt + suf;
          const v = wp + sp;
          const existing = out.get(k);
          if (existing === undefined || v < existing) out.set(k, v);
        }
      }
      if (out.size > 40000) return out;
    }
    return out;
  }

  function parse(i0: number): Map<string, number> {
    let i = i0;
    while (i < n && seq[i][0] === "B") i += 1;
    if (i === n) return new Map([["", 0]]);
    const cached = memo.get(i);
    if (cached) return cached;
    const res = new Map<string, number>();
    const merge = (d: Map<string, number>) => {
      for (const [k, v] of d) {
        const existing = res.get(k);
        if (existing === undefined || v < existing) res.set(k, v);
      }
    };
    const s = seq[i][0];
    if (isV(s)) {
      if (i === 0 || seq[i - 1][0] === "B") {
        merge(finish(s, seq[i][1], i + 1, parse));
      }
    } else {
      const k = i + 1;
      if (k < n && isV(seq[k][0])) {
        merge(finish(seq[k][0], seq[k][1], k + 1, parse));
      } else if (k < n && seq[k][0] === "B") {
        let m = k;
        while (m < n && seq[m][0] === "B") m += 1;
        if (m < n && isV(seq[m][0])) {
          merge(finish(seq[m][0], seq[m][1], m + 1, parse));
        }
      } else if (k >= n) {
        // پایان
      } else {
        merge(finish("v", "", k, parse)); // مصوتِ کوتاهِ نانوشته
      }
    }
    memo.set(i, res);
    return res;
  }

  return parse(0);
}

// ═══════════ ادغامِ فعلِ «است» ═══════════
const AST = new Set(["است", "ست", "استی"]);

export function textVariants(line: string): [string[], number][] {
  const ws = line.split(/\s+/).filter(Boolean);
  const hasAst = ws.some((w, i) => i > 0 && AST.has(w));
  const outs: [string[], number][] = [[ws, hasAst ? 1.0 : 0.0]];
  ws.forEach((w, i) => {
    if (i > 0 && AST.has(w)) {
      const prev = ws[i - 1];
      let cand: string;
      if (prev.endsWith("ه")) cand = prev.slice(0, -1) + "ست";
      else cand = prev + "ست";
      const newWs = [...ws.slice(0, i - 1), cand, ...ws.slice(i + 1)];
      outs.push([newWs, 0.0]);
    }
  });
  const seen = new Set<string>();
  const res: [string[], number][] = [];
  for (const [v, p] of outs) {
    const s = v.join(" ");
    if (!seen.has(s)) {
      seen.add(s);
      res.push([v, p]);
    }
  }
  return res;
}

const AST_HE = /(\S+?)ه\s+(?:است|ست)(?=\s|$)/g;
const AST_VOW = /(\S*[اویآ])\s+(?:است|ست)(?=\s|$)/g;

export function lineForms(line: string): string[] {
  const out = [line];
  for (const rx of [AST_HE, AST_VOW]) {
    const v = line.replace(rx, (_m, p1) => p1 + "ست");
    if (v !== line && !out.includes(v)) out.push(v);
  }
  return out;
}

export const MAX_WORDS = 14;

export function scanLine(line: string, doNormalize = true): Map<string, number> {
  if (doNormalize) line = normalize(line);
  const wc = line.split(/\s+/).filter(Boolean).length;
  if (!line || wc > MAX_WORDS) return new Map();
  const out = new Map<string, number>();
  for (const form of lineForms(line)) {
    for (const [seq, pen] of expandAmbiguous(tokenizeLine(form), true)) {
      for (const [sc, sp] of scanSeq(seq)) {
        const tot = pen + sp;
        const existing = out.get(sc);
        if (existing === undefined || tot < existing) out.set(sc, tot);
      }
    }
  }
  return out;
}
