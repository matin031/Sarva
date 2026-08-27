import { ARKAN } from "@/lib/aruz/meters";
import type { AruzBridgeQuestion, Difficulty } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️  دادهٔ نمایشی — محتوای علمیِ سروا نیست.
   ═══════════════════════════════════════════════════════════════════════════

   هر پرسشِ این فایل `isDemo: true` دارد و فقط برای این وجود دارد که چرخهٔ
   بازی قابلِ اجرا و قابلِ تست باشد. این‌ها *مرجعِ عروضی نیستند* و نباید در
   نسخهٔ عمومی به‌عنوان محتوای آموزشیِ تأییدشدهٔ سروا نمایش داده شوند.

   دادهٔ واقعی بعداً از منبعِ معتبر می‌آید و از راهِ `RemoteQuestionSource`
   (نگاه کنید به `source.ts`) وارد می‌شود؛ موتورِ بازی برای آن تغییری لازم
   ندارد، چون هرگز مستقیم به این فایل نگاه نمی‌کند.
   ═══════════════════════════════════════════════════════════════════════════ */

/** نامِ رکن‌هایی که در دادهٔ نمایشی به‌کار می‌روند. */
const DEMO_FEET = [
  "فعولن",
  "فاعلن",
  "فاعلاتن",
  "فعلاتن",
  "مفاعیلن",
  "مفاعلن",
  "مستفعلن",
  "مفتعلن",
  "مفعولن",
] as const;

/**
 * فاصلهٔ دو وزن: چند هجا باید عوض شود تا یکی به دیگری برسد.
 *
 * همان فاصلهٔ لِوِنشتاین روی رشتهٔ `-`/`U` است. سطحِ سختی از روی همین ساخته
 * می‌شود، پس «شبیه‌بودنِ گزینه‌ها» یک حسِ سلیقه‌ای نیست و اندازه‌گیری می‌شود.
 */
export function patternDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, j) => j);
  for (let i = 1; i < rows; i++) {
    const cur = [i];
    for (let j = 1; j < cols; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[cols - 1];
}

/** بیشترین فاصلهٔ مجاز تا گزینهٔ نادرست، به‌ازای هر سطح. */
const MAX_DISTANCE: Record<Difficulty, number> = { 1: 99, 2: 2, 3: 1 };
/** کمترین فاصلهٔ لازم — سطحِ ۱ باید *دور* باشد تا انتخاب آسان بماند. */
const MIN_DISTANCE: Record<Difficulty, number> = { 1: 3, 2: 2, 3: 1 };

/**
 * گزینهٔ نادرست را متناسب با سطح انتخاب می‌کند.
 *
 * سطح ۱ دورترین‌ها، سطح ۳ نزدیک‌ترین‌ها. اگر هیچ نامزدی در بازهٔ خواسته‌شده
 * نبود، به نزدیک‌ترین گزینهٔ موجود عقب‌نشینی می‌کند تا هرگز `undefined` برنگردد.
 */
export function pickDistractor(
  correctFoot: string,
  difficulty: Difficulty,
  random: () => number = Math.random,
): string {
  const correctPattern = ARKAN[correctFoot];
  const scored = DEMO_FEET.filter((f) => f !== correctFoot)
    .map((f) => ({ foot: f, d: patternDistance(correctPattern, ARKAN[f]) }))
    .filter((c) => c.d > 0);

  const inBand = scored.filter(
    (c) => c.d >= MIN_DISTANCE[difficulty] && c.d <= MAX_DISTANCE[difficulty],
  );
  const pool = inBand.length
    ? inBand
    : // بازه خالی بود: نزدیک‌ترین‌ها برای سطحِ سخت، دورترین‌ها برای سطحِ آسان
      [...scored].sort((x, y) => (difficulty === 1 ? y.d - x.d : x.d - y.d)).slice(0, 3);

  return pool[Math.floor(random() * pool.length) % pool.length].foot;
}

/** یک ورودیِ خام: واژه + رکنی که دادهٔ نمایشی به آن نسبت می‌دهد. */
type DemoEntry = { id: string; text: string; foot: (typeof DEMO_FEET)[number] };

/* واژه‌های کوتاه و آشنا؛ عمداً ساده نگه داشته شده‌اند چون نقشِ اینجا فقط
   «چیزی برای خواندن در ۱ ثانیه» است، نه آموزشِ تقطیع. */
const DEMO_ENTRIES: DemoEntry[] = [
  { id: "demo-01", text: "بهاران", foot: "فعولن" },
  { id: "demo-02", text: "بنی‌آدم", foot: "مفعولن" },
  { id: "demo-03", text: "دلاور", foot: "مفاعلن" },
  { id: "demo-04", text: "پروانه", foot: "مفعولن" },
  { id: "demo-05", text: "ای دوست", foot: "فاعلن" },
  { id: "demo-06", text: "سرو روان", foot: "مفتعلن" },
  { id: "demo-07", text: "شب تاریک", foot: "مستفعلن" },
  { id: "demo-08", text: "گلستان", foot: "فعولن" },
  { id: "demo-09", text: "خورشید", foot: "مفعولن" },
  { id: "demo-10", text: "دریای بی‌کران", foot: "فاعلاتن" },
  { id: "demo-11", text: "نسیم سحری", foot: "فعلاتن" },
  { id: "demo-12", text: "کاروان", foot: "فاعلن" },
  { id: "demo-13", text: "بی‌قرارم", foot: "فاعلاتن" },
  { id: "demo-14", text: "همنشین", foot: "فاعلن" },
  { id: "demo-15", text: "آرزوها", foot: "فاعلاتن" },
  { id: "demo-16", text: "دلبند", foot: "مفعولن" },
];

/**
 * پرسش‌های نمایشی را برای یک سطحِ مشخص می‌سازد.
 *
 * `wrongPattern` در همین‌جا و بر اساسِ فاصلهٔ وزنی حساب می‌شود، پس همین
 * دادهٔ ثابت در سطح ۱ آسان و در سطح ۳ سخت است.
 */
export function buildDemoQuestions(
  difficulty: Difficulty,
  random: () => number = Math.random,
): AruzBridgeQuestion[] {
  return DEMO_ENTRIES.map((e) => {
    const wrong = pickDistractor(e.foot, difficulty, random);
    return {
      id: e.id,
      promptText: e.text,
      correctPattern: e.foot,
      wrongPattern: wrong,
      distractors: [wrong],
      difficulty,
      explanation: `در این دادهٔ نمایشی، «${e.text}» با رکنِ «${e.foot}» (${ARKAN[e.foot]}) جفت شده است.`,
      isDemo: true,
    } satisfies AruzBridgeQuestion;
  });
}
