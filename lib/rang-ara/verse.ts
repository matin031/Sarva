import { LESSON_TITLES, faNum } from "@/lib/doroos/catalog";
import { isSelectableLesson, isStorableLesson } from "@/lib/grammar-circuit/curriculum";
import {
  CONCEPTS,
  GRADE_LABELS,
  paletteFor,
  tokenize,
  type ConceptId,
  type GradeKey,
  type Level,
  type Step,
  type TokenId,
} from "./content";

/* ═══════════════════════════════════════════════════════════════════════════
   «رنگ‌آرا» — یک بیتِ بانک: اعتبارسنجی و تبدیل به مرحلهٔ بازی.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ عمداً بدونِ `server-only` و بدونِ دیتابیس: همین تابع‌ها را اکشنِ ذخیرهٔ
   پنل (پیش از نوشتن)، بارگذارِ بازی (بیتِ ناسالمِ قدیمی را کنار بگذارد)،
   ویرایشگرِ پنل (پیامِ خطا پیش از فرستادن) و تست‌ها صدا می‌زنند. یک قاعده،
   یک جا. */

export const GRADE_KEYS: GradeKey[] = ["dahom", "yazdahom", "davazdahom"];
/* درس‌های آزادِ کتاب (درس ۴ هر پایه، و ۱۵ دهم، ۱۳ یازدهم، ۱۵ دوازدهم) همان
   فهرستِ «مدار دستور»اند؛ یک برنامهٔ درسی، یک جا. */
export { LESSONS_PER_GRADE, isSelectableLesson, selectableLessons } from "@/lib/grammar-circuit/curriculum";
export const MAX_STEPS = 8;

/** شکلِ ذخیره‌شدهٔ یک بیت — همان ستون‌های `rang_ara_verses`. */
export type VerseRecord = {
  id: string;
  grade: GradeKey | null;
  lesson: number | null;
  poet: string;
  source: string | null;
  lines: [string, string];
  meaning: string | null;
  steps: Step[];
};

export function isGradeKey(v: unknown): v is GradeKey {
  return typeof v === "string" && (GRADE_KEYS as string[]).includes(v);
}

export function lessonTitle(grade: GradeKey, lesson: number): string {
  return LESSON_TITLES[grade]?.[lesson] ?? `درس ${faNum(lesson)}`;
}

/** برچسبِ «درس ۵ · بیداد ظالمان» یا «دهم · درس ۵» برای جاهای کم‌جا. */
export function bookLabel(grade: GradeKey, lesson: number): string {
  const title = LESSON_TITLES[grade]?.[lesson];
  return title ? `درس ${faNum(lesson)} · ${title}` : `${GRADE_LABELS[grade]} · درس ${faNum(lesson)}`;
}

/** شکلِ گام‌ها را از JSONِ خام (دیتابیس یا فرم) بیرون می‌کشد؛ هرچه نشناسد دور می‌ریزد. */
export function parseSteps(raw: unknown): Step[] {
  const value = typeof raw === "string" ? safeJson(raw) : raw;
  if (!Array.isArray(value)) return [];
  const ids = (v: unknown): TokenId[] =>
    Array.isArray(v) ? v.filter((x): x is TokenId => typeof x === "string" && /^[01]-\d+$/.test(x)) : [];
  return value
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => {
      const accepted = Array.isArray(s.accepted) ? s.accepted.map(ids).filter((a) => a.length) : [];
      return {
        concept: s.concept as ConceptId,
        answer: ids(s.answer),
        ...(accepted.length ? { accepted } : {}),
        explanation: typeof s.explanation === "string" ? s.explanation : "",
        ...(typeof s.tip === "string" && s.tip.trim() ? { tip: s.tip } : {}),
      };
    });
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * شرط‌هایی که بدونِ آن‌ها بیت اصلاً ذخیره نمی‌شود: جایش در کتاب و اندازهٔ
 * ستون‌ها. بیتی که فقط `validateVerse` را رد کند (مثلاً توضیحِ یک گام هنوز
 * نوشته نشده) می‌تواند پیش‌نویس بماند — افزودنِ انبوه همین را لازم دارد.
 */
export function storageProblem(v: Omit<VerseRecord, "id">): string | null {
  if (v.grade === null) {
    if (v.lesson !== null) return "بیتِ خارج از کتاب شمارهٔ درس ندارد.";
  } else {
    if (!isGradeKey(v.grade)) return "پایه نامعتبر است.";
    if (!isStorableLesson(v.lesson as number)) return "شمارهٔ درس را انتخاب کنید.";
    if (!isSelectableLesson(v.grade, v.lesson as number)) {
      return `درس ${faNum(v.lesson as number)} ${GRADE_LABELS[v.grade]} آزاد است و بیت ندارد.`;
    }
  }

  const [l1, l2] = v.lines.map((l) => l.trim());
  if (!l1 || !l2) return "هر دو مصراع را وارد کنید.";
  if (l1.length > 300 || l2.length > 300) return "هر مصراع نباید بیشتر از ۳۰۰ نویسه باشد.";
  if (v.poet.trim().length > 120) return "نام شاعر بیش از حد بلند است.";
  if ((v.source ?? "").trim().length > 160) return "منبع بیش از حد بلند است.";
  if ((v.meaning ?? "").trim().length > 2000) return "معنی بیش از حد بلند است.";
  if (v.steps.length > MAX_STEPS) return `هر بیت حداکثر ${faNum(MAX_STEPS)} گام دارد.`;
  return null;
}

/**
 * همهٔ شرط‌هایی که یک بیت باید داشته باشد تا قابل بازی باشد. خروجی پیامِ
 * فارسیِ آمادهٔ نمایش است — مدیر باید بداند *کدام* شرط برقرار نیست.
 */
export function validateVerse(v: Omit<VerseRecord, "id">): string | null {
  const stored = storageProblem(v);
  if (stored) return stored;
  if (!v.steps.length) return "دست‌کم یک آرایه برای پیدا کردن تعریف کنید.";

  const [l1, l2] = v.lines.map((l) => l.trim());
  const tokenIds = new Set(tokenize([l1, l2]).map((t) => t.id));
  /* کلید «واژه:آرایه»: یک واژه می‌تواند جوابِ دو آرایهٔ مختلف باشد (مجازی
     در دلِ کنایه)، ولی نه دو بار جوابِ یک آرایه. */
  const owner = new Map<string, number>();
  for (const [i, step] of v.steps.entries()) {
    const n = `گامِ ${faNum(i + 1)}`;
    if (!(step.concept in CONCEPTS)) return `${n}: آرایه را انتخاب کنید.`;
    if (!step.answer.length) return `${n}: واژهٔ جواب را روی بیت انتخاب کنید.`;
    if (CONCEPTS[step.concept].pair && [step.answer, ...(step.accepted ?? [])].some((sel) => sel.length < 2)) {
      return `${n}: ${CONCEPTS[step.concept].label} دست‌کم دو واژه لازم دارد.`;
    }
    if (!step.explanation.trim()) return `${n}: توضیح را بنویسید.`;
    if (step.explanation.trim().length > 600) return `${n}: توضیح نباید بیشتر از ۶۰۰ نویسه باشد.`;
    if ((step.tip ?? "").length > 400) return `${n}: نکته نباید بیشتر از ۴۰۰ نویسه باشد.`;
    for (const sel of [step.answer, ...(step.accepted ?? [])]) {
      if (new Set(sel).size !== sel.length) return `${n}: یک واژه دو بار انتخاب شده.`;
      for (const id of sel) {
        if (!tokenIds.has(id)) return `${n}: یکی از واژه‌های انتخاب‌شده دیگر در بیت نیست؛ دوباره انتخاب کنید.`;
        /* ⚠️ دو گام با یک آرایه روی یک واژه یعنی داوری نمی‌داند ضربه مالِ
           کدام است. */
        const key = `${id}:${step.concept}`;
        const prev = owner.get(key);
        if (prev !== undefined && prev !== i) {
          return `${n}: این واژه با همین آرایه جوابِ گامِ ${faNum(prev + 1)} هم هست.`;
        }
        owner.set(key, i);
      }
    }
  }
  return null;
}

/** بیتِ سالم → مرحلهٔ بازی. بیتِ ناسالم `null` می‌دهد و بازی کنارش می‌گذارد. */
export function toLevel(v: VerseRecord): Level | null {
  if (validateVerse(v)) return null;
  const lines: [string, string] = [v.lines[0].trim(), v.lines[1].trim()];
  const book =
    v.grade && v.lesson ? { grade: v.grade, lesson: v.lesson, title: lessonTitle(v.grade, v.lesson) } : undefined;
  return {
    id: v.id,
    poet: v.poet.trim(),
    source: book ? bookLabel(book.grade, book.lesson) : v.source?.trim() || undefined,
    ...(book ? { book } : {}),
    ...(v.meaning?.trim() ? { meaning: v.meaning.trim() } : {}),
    lines,
    tokens: tokenize(lines),
    palette: paletteFor(v.steps),
    steps: v.steps,
  };
}
