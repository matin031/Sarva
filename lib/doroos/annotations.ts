import type { Beyt } from "@/lib/doroos/types";

/** Turning the lesson's prose notes into things that can be *drawn* on the بیت.
 *
 *  The notes were written as plain strings — «دست، پای: مراعات‌نظیر» — but that
 *  string already carries everything a margin annotation needs: which words it
 *  points at, and what to call the relationship. So nothing here is authored a
 *  second time; the same array that feeds the قلمرو panels is parsed into marks.
 *
 *  Anything that cannot be tied to specific words stays a plain note rather than
 *  being forced onto the line — a wrong arrow is worse than no arrow. */

export type Realm = "linguistic" | "literary";

export type MarkKind =
  /** the word's meaning, written above it */
  | "gloss"
  /** the word underlined, the term written beneath */
  | "underline"
  /** two or more words joined by an arc, the term at its apex */
  | "link"
  /** one label per word, in order — used for sentence patterns */
  | "roles"
  /** applies to a whole مصراع, no specific word */
  | "line";

/** Which مصراع, and which run of words inside it. */
export type Span = { h: 0 | 1; from: number; to: number };

export type Mark = {
  id: string;
  realm: Realm;
  kind: MarkKind;
  spans: Span[];
  label: string;
  /** the second line of a label, e.g. the gloss under a term */
  sub?: string;
  /** roles only: one label per span */
  roleLabels?: string[];
};

/* ------------------------------------------------------------------ text */

const ZWNJ = "‌";

/** Persian text arrives with diacritics, both forms of ی/ک, and punctuation
 *  glued to words. Comparisons happen on a flattened copy so «شغالی» still
 *  matches «شغال» and «مصراع» matches «مصرع». */
function norm(s: string): string {
  return s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[«»(),.،؛:؟!\[\]]/g, "")
    .replace(new RegExp(ZWNJ, "g"), "")
    .trim();
}

export function tokenize(hemistich: string): string[] {
  return hemistich.split(/\s+/).filter(Boolean);
}

/** Function words. A note never points at «و» or «را», so they are not allowed
 *  to win a loose match — which is exactly how «فروماندن» once landed on the
 *  «و» of «بی‌دست و پای». */
const STOP = new Set([
  "و", "را", "به", "از", "در", "که", "این", "آن", "با", "بر", "تا", "ای", "هم", "یا", "چه",
]);

/** Notes cite verbs as masdar — «فروماندن» — while the بیت has «فرو ماند».
 *  Trying the stem as well is what bridges the two. */
function variants(phrase: string): string[] {
  const t = norm(phrase);
  const out = [t];
  const stem = t.replace(/(یدن|تن|دن|ن)$/, "");
  if (stem.length >= 2 && stem !== t) out.push(stem);
  // «بی‌دست و پا بودن» is the note's way of naming the state; the بیت only
  // carries «بی‌دست و پای». Dropping the trailing auxiliary keeps the anchor.
  const noAux = t.replace(/\s+(بودن|شدن|کردن|داشتن|گشتن|زدن|خوردن|بود|شد|کرد)$/, "");
  if (noAux !== t) out.push(noAux);
  return out;
}

/** How well one token answers one part of a phrase. 0 means "not a match". */
function score(token: string, part: string): number {
  if (!token || !part) return 0;
  if (token === part) return 3;
  if (token.startsWith(part) || part.startsWith(token)) return 2;
  if (token.includes(part)) return 1.5;
  // the reverse — a long phrase containing a short token — is only ever
  // meaningful for a substantial token, never for a preposition
  if (part.includes(token) && token.length >= 3 && !STOP.has(token)) return 1;
  return 0;
}

type Hit = { from: number; to: number; score: number };

/** Best contiguous run of words answering `phrase`, or null. Scored rather than
 *  first-wins, so «قوت روزش» prefers the two real words over any single token
 *  that merely happens to share letters with them. */
function locate(words: string[], phrase: string, skip: (h: Hit) => boolean = () => false): Hit | null {
  const n = words.map(norm);
  let best: Hit | null = null;
  const offer = (cand: Hit) => {
    if (skip(cand)) return;
    if (!best || cand.score > best.score) best = cand;
  };

  for (const target of variants(phrase)) {
    if (!target) continue;
    const parts = target.split(/\s+/).filter(Boolean);

    for (let i = 0; i + parts.length <= n.length; i++) {
      let total = 0;
      let ok = true;
      for (let j = 0; j < parts.length; j++) {
        const s = score(n[i + j], parts[j]);
        if (s === 0) {
          ok = false;
          break;
        }
        total += s;
      }
      // longer phrases are better evidence than a lucky single word
      if (ok) offer({ from: i, to: i + parts.length - 1, score: total + parts.length * 0.5 });
    }

    if (parts.length === 1) {
      for (let i = 0; i < n.length; i++) {
        const s = score(n[i], target);
        if (s === 0 || (s <= 1 && STOP.has(n[i]))) continue;
        offer({ from: i, to: i, score: s });
      }
    }
  }
  return best;
}

/** Searches both مصراع and keeps the stronger of the two, instead of taking
 *  whichever line happened to come first. `taken` lets the caller resolve the
 *  two halves of «روز، روزی» to two *different* words: without it both score
 *  the same on «روز» and the arc collapses onto a single token. */
function findSpan(hemis: string[][], phrase: string, taken: Span[] = []): Span | null {
  let best: (Hit & { h: 0 | 1 }) | null = null;
  for (let h = 0; h < hemis.length; h++) {
    const hit = locate(hemis[h], phrase, (c) =>
      taken.some((t) => t.h === h && t.from === c.from && t.to === c.to),
    );
    if (hit && (!best || hit.score > best.score)) best = { ...hit, h: h as 0 | 1 };
  }
  return best ? { h: best.h, from: best.from, to: best.to } : null;
}

/** Every place a phrase occurs, one per مصراع — for «تکرار در دو مصراع». */
function findAll(hemis: string[][], phrase: string): Span[] {
  const out: Span[] = [];
  for (let h = 0; h < hemis.length; h++) {
    const hit = locate(hemis[h], phrase);
    if (hit && hit.score >= 2) out.push({ h: h as 0 | 1, from: hit.from, to: hit.to });
  }
  return out;
}

const sameSpan = (a: Span, b: Span) => a.h === b.h && a.from === b.from && a.to === b.to;

/* ------------------------------------------------------------- classify */

/** Terms that name a device rather than translate a word: these go *under* the
 *  line as a label, while a plain meaning goes *above* it as a gloss. */
const DEVICE = /کنایه|استعاره|تشبیه|مجاز|جناس|مراعات|تناسب|واج‌آرایی|واج آرایی|تلمیح|نماد|تضاد|اغراق|حس‌آمیزی|تکرار|هم‌خانواد|اشتقاق|پارادوکس|تشخیص|اسلوب|ایهام|حسن تعلیل/;

/** Grammar labels — same treatment as devices, but from the زبانی side. */
const GRAMMAR =
  /نهاد|مفعول|مسند|قید|صفت|هسته|مضاف|ترکیب|نکره|فعل|جمله|حرف ربط|بدل|متمم|شبه‌جمله|فک اضافه/;

const ROLE_SPLIT = /\s*\+\s*/;

/** «الگوی جملهٔ اول: نهاد + مفعول + فعل (یکی، روبهی، دید)» — roles on the left
 *  of the parenthesis, the words they belong to on the right, in the same
 *  order. Both halves have to line up or the note is left alone. */
function parseRoles(note: string, hemis: string[][], realm: Realm, id: string): Mark | null {
  const m = /^الگوی\s+جملهٔ?\s*(\S+)\s*:\s*([^(]+)\(([^)]+)\)/.exec(note);
  if (!m) return null;
  const which = m[1];
  const roles = m[2].split(ROLE_SPLIT).map((r) => r.trim()).filter(Boolean);
  const words = m[3].split("،").map((w) => w.trim()).filter(Boolean);
  if (roles.length !== words.length || roles.length < 2) return null;

  const h: 0 | 1 = /دوم|سوم/.test(which) ? 1 : 0;
  const spans: Span[] = [];
  const roleLabels: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const hit = locate(hemis[h], words[i]);
    if (!hit) continue;
    spans.push({ h, from: hit.from, to: hit.to });
    roleLabels.push(roles[i]);
  }
  if (spans.length < 2) return null;
  return { id, realm, kind: "roles", spans, label: `الگوی جملهٔ ${which}`, roleLabels };
}

function parseNote(note: string, hemis: string[][], realm: Realm, id: string): Mark {
  const roles = parseRoles(note, hemis, realm, id);
  if (roles) return roles;

  const colon = /^([^:]{1,60}):\s*(.+)$/.exec(note);
  if (colon) {
    const left = colon[1].trim();
    const right = colon[2].trim();

    // «دست، پای: مراعات‌نظیر» — every listed word must resolve, or this is not
    // a relation between words and we should not draw a line pretending it is
    const pieces = left.split("،").map((s) => s.trim()).filter(Boolean);
    if (pieces.length > 1) {
      const spans: Span[] = [];
      for (const p of pieces) {
        const s = findSpan(hemis, p, spans);
        if (s) spans.push(s);
      }
      if (spans.length === pieces.length) {
        return { id, realm, kind: "link", spans, label: right };
      }
    }

    // «خورد: تکرار در دو مصراع» — the note itself says there are two of them
    if (/تکرار|هر دو مصراع|دو مصراع/.test(right)) {
      const all = findAll(hemis, left);
      if (all.length > 1) return { id, realm, kind: "link", spans: all, label: right };
    }

    const span = findSpan(hemis, left);
    if (span) {
      const isDevice = DEVICE.test(right) || GRAMMAR.test(right);
      return {
        id,
        realm,
        kind: isDevice ? "underline" : "gloss",
        spans: [span],
        label: isDevice ? right : right,
        sub: isDevice ? undefined : left,
      };
    }
  }

  // «واج‌آرایی مصوّت «ی» در مصراع اول» — no word to point at, but it does say
  // which مصراع it belongs to
  const h: 0 | 1 = /مصراع\s*دوم/.test(note) ? 1 : 0;
  return { id, realm, kind: "line", spans: [{ h, from: -1, to: -1 }], label: note };
}

/* ---------------------------------------------------------------- public */

export function marksForBeyt(beyt: Beyt): Mark[] {
  const hemis = beyt.hemistichs.map(tokenize);
  const out: Mark[] = [];
  beyt.linguistic.forEach((n, i) =>
    out.push(parseNote(n, hemis, "linguistic", `b${beyt.n}-l${i}`)),
  );
  beyt.literary.forEach((n, i) =>
    out.push(parseNote(n, hemis, "literary", `b${beyt.n}-a${i}`)),
  );
  return out;
}

/** How many of a بیت's notes actually landed on words — used to decide whether
 *  the handwritten view is worth offering for that بیت at all. */
export function markCoverage(marks: Mark[]): number {
  if (marks.length === 0) return 0;
  return marks.filter((m) => m.kind !== "line").length / marks.length;
}
