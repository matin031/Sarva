import type { AruzBridgeQuestion, Difficulty } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   پیکربندیِ یک دورِ بازی — چیزی که بازیکن پیش از رفتن روی پل انتخاب می‌کند.
   ═══════════════════════════════════════════════════════════════════════════ */

export const QUESTION_COUNTS = [5, 10, 15, 20] as const;
export type QuestionCount = (typeof QUESTION_COUNTS)[number];

/** کلیدهای معنایی؛ برچسبِ فارسی‌شان کارِ لایهٔ نمایش است. */
export type GamePace = "relaxed" | "normal" | "fast";

export interface AruzBridgeSessionConfig {
  questionCount: QuestionCount;
  pace: GamePace;
  /** اگر خاموش باشد، هیچ پرسشی در یک دور دو بار نمی‌آید. */
  allowRepeatQuestions: boolean;
  reviewMistakes: boolean;
  soundEnabled: boolean;
}

export const defaultSessionConfig: AruzBridgeSessionConfig = {
  questionCount: 10,
  pace: "normal",
  allowRepeatQuestions: false,
  reviewMistakes: true,
  soundEnabled: true,
};

/**
 * تنها جایی که «سرعت» به عدد تبدیل می‌شود.
 *
 * `answerTime` فرصتِ پاسخ است و `questionDisplayDuration` مدتِ دیده‌شدنِ واژه
 * پیش از بازشدنِ آن فرصت. هر دو با هم عوض می‌شوند تا آهنگِ کلی هماهنگ بماند.
 */
export const PACE_TIMINGS: Record<
  GamePace,
  { answerTime: number; questionDisplayDuration: number }
> = {
  relaxed: { answerTime: 6000, questionDisplayDuration: 1400 },
  normal: { answerTime: 4000, questionDisplayDuration: 1100 },
  fast: { answerTime: 2500, questionDisplayDuration: 800 },
};

/** برچسب‌های فارسی — کنارِ همان کلیدها، تا از هم دور نیفتند. */
export const PACE_LABELS: Record<GamePace, string> = {
  relaxed: "آرام",
  normal: "معمولی",
  fast: "سریع",
};

export const COUNT_LABELS: Record<QuestionCount, string> = {
  5: "سریع",
  10: "معمولی",
  15: "بلند",
  20: "ماراتن",
};

/* ═══════════════════════════════════════════════════════════════════════════
   نمونه‌گیریِ پرسش‌ها
   ═══════════════════════════════════════════════════════════════════════════ */

export interface SampleResult {
  questions: AruzBridgeQuestion[];
  /** چند پرسشِ *یکتا* اصلاً موجود بود. */
  available: number;
  /** اگر کمتر از خواسته تحویل شد، یعنی مخزن کفاف نداد. */
  truncated: boolean;
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * دنبالهٔ پرسش‌های یک دور را می‌سازد — یک بار، و برای همیشه.
 *
 * قاعدهٔ سخت: وقتی تکرار خاموش است، **هرگز** برای پرکردنِ تعدادِ خواسته‌شده
 * پرسشی دو بار نمی‌آید. اگر مخزن کم بیاورد، دورِ کوتاه‌تر تحویل داده می‌شود و
 * `truncated` بالا می‌رود تا رابطِ کاربری بتواند صادقانه بگوید چه شد. سکوت و
 * تکرارِ پنهانی بدترین حالتِ ممکن است: بازیکن فکر می‌کند دارد چیز تازه‌ای
 * تمرین می‌کند.
 */
export function sampleSessionQuestions({
  pool,
  count,
  allowRepeat,
  random = Math.random,
}: {
  pool: readonly AruzBridgeQuestion[];
  count: number;
  allowRepeat: boolean;
  random?: () => number;
}): SampleResult {
  // مخزن ممکن است پرسشِ تکراری داشته باشد؛ یکتاییِ واقعی بر اساسِ شناسه است.
  const unique = new Map<string, AruzBridgeQuestion>();
  for (const q of pool) if (!unique.has(q.id)) unique.set(q.id, q);
  const uniqueList = [...unique.values()];
  const available = uniqueList.length;

  if (available === 0) return { questions: [], available: 0, truncated: count > 0 };

  const bag = shuffled(uniqueList, random);

  if (!allowRepeat) {
    const take = Math.min(count, available);
    return { questions: bag.slice(0, take), available, truncated: take < count };
  }

  /* با تکرارِ مجاز: کیسه‌های پیاپیِ درهم‌ریخته. یعنی پیش از آنکه پرسشی دوباره
     بیاید، همهٔ پرسش‌های دیگر یک بار آمده‌اند — بازی هنوز متنوع حس می‌شود. */
  const questions: AruzBridgeQuestion[] = [];
  let current = bag;
  let cursor = 0;
  while (questions.length < count) {
    if (cursor >= current.length) {
      current = shuffled(uniqueList, random);
      cursor = 0;
    }
    questions.push(current[cursor++]);
  }
  return { questions, available, truncated: false };
}

/** بیشترین تعدادی که با تنظیماتِ فعلی *بدونِ تکرار* شدنی است. */
export function maxUniqueCount(available: number): number {
  return available;
}

/** دورِ مرورِ اشتباهات: فقط همان پرسش‌ها، به‌ترتیبِ درهم. */
export function buildReviewQuestions({
  pool,
  failedIds,
  random = Math.random,
}: {
  pool: readonly AruzBridgeQuestion[];
  failedIds: readonly string[];
  random?: () => number;
}): AruzBridgeQuestion[] {
  const byId = new Map(pool.map((q) => [q.id, q]));
  const picked = failedIds
    .map((id) => byId.get(id))
    .filter((q): q is AruzBridgeQuestion => q != null);
  // یکتا، چون یک پرسش ممکن است در چند دور شکست خورده باشد
  const unique = new Map(picked.map((q) => [q.id, q]));
  return shuffled([...unique.values()], random);
}

/** سختی از سرعت مشتق می‌شود؛ صفحهٔ تنظیمات گزینهٔ جدایی برایش ندارد. */
export function difficultyForPace(pace: GamePace): Difficulty {
  return pace === "relaxed" ? 1 : pace === "normal" ? 2 : 3;
}
