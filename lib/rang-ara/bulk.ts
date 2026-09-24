import { faNum } from "@/lib/doroos/catalog";
import { CONCEPTS, GRADE_LABELS, tokenize, type ConceptId, type GradeKey, type Step, type Token, type TokenId } from "./content";
import { isSelectableLesson, storageProblem, validateVerse, type VerseRecord } from "./verse";

/* ═══════════════════════════════════════════════════════════════════════════
   «رنگ‌آرا» — افزودنِ انبوه: متنِ ساده → بیت‌های آمادهٔ ذخیره.
   ═══════════════════════════════════════════════════════════════════════════

   هر بیت یک بند است و بندها با سطرِ خالی جدا می‌شوند:

     # دهم، درس ۵                     ← سرتیتر (اختیاری): جای بیت‌های بعدی
     مصراع اول / مصراع دوم           ← یا دو مصراع در دو سطر
     شاعر: حافظ
     معنی: …
     استعاره: سرو | توضیح | نکته      ← یا «سرو: استعاره | توضیح»

   جواب همان متنِ واژه یا عبارت در بیت است؛ اگر واژه دو بار آمده، «ما#۲» یعنی
   دومی. جواب‌های دیگرِ همان گام با «؛» جدا می‌شوند و واژه‌های جدا از همِ یک
   جواب (جناس، سجع) با «+»: «جناس: دست + دوست#۲».

   ⚠️ بیتی که فقط `validateVerse` را رد کند (مثلاً توضیح ندارد) خطا نیست؛
   پیش‌نویس ذخیره می‌شود تا مدیر بعداً در ویرایشگر کاملش کند. خطا فقط چیزی
   است که یا ذخیره‌شدنی نیست یا متنش فهمیده نشد. */

export type BulkPlace = { grade: GradeKey; lesson: number } | null;

export type BulkItem = {
  /** شمارهٔ سطرِ آغازِ بند (از ۱)، برای پیام‌ها. */
  line: number;
  verse: Omit<VerseRecord, "id">;
  /** نمی‌گذارد این بیت ذخیره شود. */
  error: string | null;
  /** بیت ساخته می‌شود ولی تا رفعِ این، پیش‌نویس می‌ماند. */
  problem: string | null;
};

/** کلیدِ مقایسه: بی‌اعراب، بی‌فاصله و نیم‌فاصله، بی‌نشانه، با ی و کِ فارسی. */
export function looseText(s: string): string {
  return s
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/[^\p{L}\p{N}]|ـ/gu, "");
}

/** کلیدِ تکراری بودنِ یک بیت. */
export function verseKey(lines: readonly [string, string]): string {
  return `${looseText(lines[0])}/${looseText(lines[1])}`;
}

const latinDigits = (s: string) => s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

const CONCEPT_BY_KEY = new Map<string, ConceptId>();
for (const c of Object.values(CONCEPTS)) {
  CONCEPT_BY_KEY.set(looseText(c.label), c.id);
  if (c.short) CONCEPT_BY_KEY.set(looseText(c.short), c.id);
}
const conceptOf = (s: string) => CONCEPT_BY_KEY.get(looseText(s));

/* ⚠️ «دوازدهم» و «یازدهم» هر دو به «دهم» ختم می‌شوند؛ بلندتر اول. */
const GRADE_WORDS: [string, GradeKey][] = [
  ["دوازدهم", "davazdahom"],
  ["یازدهم", "yazdahom"],
  ["دهم", "dahom"],
];

function parsePlace(header: string): { place: BulkPlace } | { error: string } {
  if (/خارج/.test(header)) return { place: null };
  const grade = GRADE_WORDS.find(([w]) => header.includes(w))?.[1];
  const lesson = Number(latinDigits(header).match(/\d+/)?.[0]);
  if (!grade || !lesson) return { error: "پایه و درس را بنویسید؛ مثلاً «# دهم، درس ۵» یا «# خارج از کتاب»." };
  if (!isSelectableLesson(grade, lesson)) {
    return { error: `درس ${faNum(lesson)} ${GRADE_LABELS[grade]} در کتاب نیست یا آزاد است.` };
  }
  return { place: { grade, lesson } };
}

/** شناسهٔ واژه‌های یک عبارت در بیت؛ `nth` برای واژه‌ای که چند بار آمده. */
function findPhrase(tokens: Token[], phrase: string, nth: number): TokenId[] | null {
  const target = looseText(phrase);
  if (!target) return null;
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    let acc = "";
    for (let j = i; j < tokens.length && tokens[j].line === tokens[i].line; j++) {
      acc += looseText(tokens[j].text);
      if (acc === target) {
        if (++seen === nth) return tokens.slice(i, j + 1).map((t) => t.id);
        break;
      }
      if (!target.startsWith(acc)) break;
    }
  }
  return null;
}

/** واژه‌های جدا از هم، هر کدام جایی که هنوز برداشته نشده («دوست دوست» دو «دوست» را می‌گیرد). */
function findWords(tokens: Token[], phrase: string): TokenId[] | null {
  const words = phrase.split(/\s+/);
  if (words.length < 2) return null;
  const out: TokenId[] = [];
  for (const w of words) {
    let n = 1;
    let hit = findPhrase(tokens, w, n);
    while (hit && hit.some((id) => out.includes(id))) hit = findPhrase(tokens, w, ++n);
    if (!hit) return null;
    out.push(...hit);
  }
  return out;
}

/**
 * «؛» جواب‌های دیگرِ همان گام را جدا می‌کند و «+» واژه‌های جدا از همِ یک
 * جواب را. برای جناس و سجع که واژه‌ها کنارِ هم نیستند «دست دوست» هم کافی
 * است: اگر عبارتِ پیوسته پیدا نشد، تک‌تکِ واژه‌ها جست‌وجو می‌شوند.
 */
function parseAnswer(tokens: Token[], raw: string, pair: boolean): { ids: TokenId[][] } | { error: string } {
  const ids: TokenId[][] = [];
  for (const alt of raw.split(/[؛;]/)) {
    const sel: TokenId[] = [];
    for (const part of alt.split("+")) {
      const m = latinDigits(part.trim()).match(/^(.*?)(?:#(\d+))?$/);
      const phrase = (m?.[1] ?? "").trim();
      if (!phrase) continue;
      const found = findPhrase(tokens, phrase, Number(m?.[2] ?? 1)) ?? (pair ? findWords(tokens, phrase) : null);
      if (!found) return { error: `«${phrase}» در بیت پیدا نشد.` };
      sel.push(...found);
    }
    if (sel.length) ids.push(sel);
  }
  return ids.length ? { ids } : { error: "جوابِ گام خالی است." };
}

export function parseBulk(text: string, start: BulkPlace): { items: BulkItem[]; errors: string[] } {
  const items: BulkItem[] = [];
  const errors: string[] = [];
  let place: BulkPlace | undefined = start;
  const seen = new Map<string, number>();

  let block: { n: number; text: string }[] = [];
  const flush = () => {
    if (block.length) items.push(parseBlock(block, place, seen));
    block = [];
  };

  text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .forEach((raw, i) => {
      const line = raw.trim();
      if (!line) return flush();
      if (line.startsWith("#")) {
        flush();
        const r = parsePlace(line.slice(1));
        if ("error" in r) {
          errors.push(`سطر ${faNum(i + 1)}: ${r.error}`);
          place = undefined;
        } else {
          place = r.place;
        }
        return;
      }
      block.push({ n: i + 1, text: line });
    });
  flush();
  return { items, errors };
}

function parseBlock(
  block: { n: number; text: string }[],
  place: BulkPlace | undefined,
  seen: Map<string, number>,
): BulkItem {
  const first = block[0];
  const split = first.text.indexOf("/");
  const [l1, l2, rest] =
    split >= 0
      ? [first.text.slice(0, split), first.text.slice(split + 1), block.slice(1)]
      : [first.text, block[1]?.text ?? "", block.slice(2)];
  const lines: [string, string] = [l1.trim(), l2.trim()];
  const tokens = tokenize(lines);

  const verse: Omit<VerseRecord, "id"> = {
    grade: place?.grade ?? null,
    lesson: place?.lesson ?? null,
    poet: "",
    source: null,
    lines,
    meaning: null,
    steps: [],
  };
  const item = (error: string | null): BulkItem => ({
    line: first.n,
    verse,
    error,
    problem: error ? null : validateVerse(verse),
  });

  if (place === undefined) return item("سرتیترِ بالای این بیت نامعتبر است.");
  if (!lines[0] || !lines[1] || lines[1].includes(":")) {
    return item("دو مصراع لازم است؛ با «/» جدا کنید یا در دو سطر بنویسید.");
  }

  for (const { n, text } of rest) {
    const at = (msg: string) => item(`سطر ${faNum(n)}: ${msg}`);
    const colon = text.search(/[:：]/);
    if (colon < 0) return at("قالبِ «کلید: مقدار» ندارد.");
    const key = text.slice(0, colon).trim();
    const value = text.slice(colon + 1).trim();
    const k = looseText(key);

    if (k === "شاعر") verse.poet = value;
    else if (k === "منبع") verse.source = value || null;
    else if (k === "معنی" || k === "معنا") verse.meaning = value || null;
    else if (k === "نکته") {
      const last = verse.steps[verse.steps.length - 1];
      if (!last) return at("نکته باید بعد از یک گام بیاید.");
      last.tip = value;
    } else {
      const parts = value.split("|").map((p) => p.trim());
      /* «استعاره: سرو | …» یا «سرو: استعاره | …» */
      const byKey = conceptOf(key);
      const concept = byKey ?? conceptOf(parts[0]);
      if (!concept) return at(`«${key}» شناخته نشد؛ نامِ آرایه، «شاعر»، «منبع»، «معنی» یا «نکته» بنویسید.`);
      const answer = parseAnswer(tokens, byKey ? parts[0] : key, CONCEPTS[concept].pair === true);
      if ("error" in answer) return at(answer.error);
      const tip = (parts[2] ?? "").replace(/^نکته\s*[:：]\s*/, "");
      const step: Step = {
        concept,
        answer: answer.ids[0],
        ...(answer.ids.length > 1 ? { accepted: answer.ids.slice(1) } : {}),
        explanation: parts[1] ?? "",
        ...(tip ? { tip } : {}),
      };
      verse.steps.push(step);
    }
  }

  if (place !== null) verse.source = null;
  const stored = storageProblem(verse);
  if (stored) return item(stored);

  const key = verseKey(lines);
  const dup = seen.get(key);
  if (dup !== undefined) return item(`تکراری است؛ همین بیت در سطر ${faNum(dup)} هم آمده.`);
  seen.set(key, first.n);
  return item(null);
}
