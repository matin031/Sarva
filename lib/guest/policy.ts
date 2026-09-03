/**
 * سیاستِ دسترسیِ مهمان — تنها منبعِ حقیقت.
 *
 * ⚠️ چرا یک‌جا: پیش از این هر بخش عددِ خودش را داشت. `ExamRunner` ثابتِ
 * `GUEST_QUESTION_LIMIT = 3` را داخل خودش نگه می‌داشت و کوییز جای دیگری.
 * عوض کردنِ سیاست یعنی گشتن دنبالِ ثابت‌های پراکنده، و هر بخشی که جا بماند
 * بی‌صدا با قانونِ قدیمی کار می‌کند. حالا هر عددی که به مهمان مربوط است
 * اینجاست و بخش‌ها فقط می‌خوانندش.
 *
 * منطق عمداً خالص است — نه `server-only`، نه `window` — تا هم سرور و هم
 * کلاینت یک قانون را ببینند و تست هم مستقیم اجرا شود.
 */

export type GuestSection =
  | "quiz"
  | "exam"
  | "vocab"
  | "aruz-bridge"
  | "jasoos"
  | "ninja"
  | "pairs"
  | "aruz-rapid"
  | "grammar-circuit"
  | "vazn-yab";

/**
 * شکلِ محدودیت. سه شکل داریم چون سه *جنسِ* متفاوت‌اند و پیامِ کاربر هم باید
 * فرق کند:
 *
 *   unlimited  اصلاً محدودیتی نیست
 *   count      «N تا» — سؤال، دست، یا دور
 *   subset     بخشی از محتوا باز است، بقیه قفل — «درس اول»، «نیمهٔ اول»
 */
export type GuestAllowance =
  | { kind: "unlimited" }
  | { kind: "count"; limit: number; unit: string }
  | { kind: "subset"; description: string };

export type SectionPolicy = {
  /** نامِ بخش، همان‌طور که کاربر می‌شناسدش. در مدال نشان داده می‌شود. */
  title: string;
  allowance: GuestAllowance;
};

export const GUEST_POLICY: Record<GuestSection, SectionPolicy> = {
  // ── آزادِ کامل ────────────────────────────────────────────────
  //
  // موتورِ عروض ابزار است نه محتوا: کسی که می‌خواهد وزنِ یک مصراع را بداند
  // باید بتواند بلافاصله بداند. بستنش یعنی بستنِ همان چیزی که آدم‌ها برای
  // آن به سایت می‌آیند.
  "vazn-yab": { title: "موتور عروض", allowance: { kind: "unlimited" } },
  ninja: { title: "نینجای دستور زبان", allowance: { kind: "unlimited" } },

  // ── شمارشی ───────────────────────────────────────────────────
  quiz: { title: "عروض سماعی", allowance: { kind: "count", limit: 5, unit: "سؤال" } },
  "aruz-bridge": { title: "پلِ وزن", allowance: { kind: "count", limit: 1, unit: "دست" } },
  jasoos: { title: "جاسوسِ نقش‌ها", allowance: { kind: "count", limit: 1, unit: "دور" } },
  "aruz-rapid": { title: "تقطیعِ سریع", allowance: { kind: "count", limit: 3, unit: "بیت" } },
  "grammar-circuit": {
    title: "مدار دستور",
    allowance: { kind: "count", limit: 1, unit: "دور" },
  },

  // ── زیرمجموعه‌ای ─────────────────────────────────────────────
  exam: { title: "آزمون‌های نهایی", allowance: { kind: "subset", description: "آزمونِ اول" } },
  vocab: {
    title: "واژه‌یاب",
    allowance: { kind: "subset", description: "درسِ اولِ هر پایه" },
  },
  pairs: {
    title: "جفت‌های ادبی",
    allowance: { kind: "subset", description: "نیمهٔ اولِ کتابِ هر پایه" },
  },
};

/** سقفِ شمارشیِ یک بخش، یا null اگر شمارشی نیست. */
export function guestLimit(section: GuestSection): number | null {
  const a = GUEST_POLICY[section].allowance;
  return a.kind === "count" ? a.limit : null;
}

/** آیا این بخش برای مهمان کاملاً باز است؟ */
export function isUnlimited(section: GuestSection): boolean {
  return GUEST_POLICY[section].allowance.kind === "unlimited";
}

/**
 * آیا مهمان با این تعدادِ مصرف‌شده هنوز اجازه دارد؟
 *
 * `used` تعدادِ *تمام‌شده*هاست، نه شمارهٔ فعلی. با limit=5 و used=5 دیگر
 * اجازه‌ای نیست؛ با used=4 هست.
 */
export function guestMayContinue(section: GuestSection, used: number): boolean {
  const limit = guestLimit(section);
  if (limit === null) return isUnlimited(section);
  return used < limit;
}

/**
 * درس‌های بازِ واژه‌یاب: درسِ اولِ هر پایه.
 *
 * ⚠️ «اول» یعنی کمترین شمارهٔ درسِ همان پایه، نه عددِ ثابتِ ۱. اگر روزی
 * درس‌های یک پایه از ۳ شروع شوند، این تابع همچنان درست کار می‌کند و
 * کسی مجبور نیست یادش بیاید عددِ ثابت را عوض کند.
 */
export function freeVocabLessons(
  lessons: { grade: string; lesson: number }[],
): { grade: string; lesson: number }[] {
  const firstOf = new Map<string, number>();
  for (const l of lessons) {
    const seen = firstOf.get(l.grade);
    if (seen === undefined || l.lesson < seen) firstOf.set(l.grade, l.lesson);
  }
  return [...firstOf].map(([grade, lesson]) => ({ grade, lesson }));
}

/**
 * آیا این درسِ واژه‌یاب برای مهمان باز است؟
 */
export function vocabLessonOpen(
  target: { grade: string; lesson: number },
  all: { grade: string; lesson: number }[],
): boolean {
  return freeVocabLessons(all).some(
    (f) => f.grade === target.grade && f.lesson === target.lesson,
  );
}

/**
 * نیمهٔ اولِ کتاب — برای «جفت‌های ادبی».
 *
 * ⚠️ `Math.ceil` عمدی است: با ۷ درس، ۴ تا باز می‌شود نه ۳. وقتی تعداد فرد
 * است، نیمهٔ سخاوتمندانه‌تر انتخاب می‌شود؛ مهمانی که یک درس بیشتر ببیند
 * ضرری ندارد، ولی مهمانی که وسطِ کتاب ناگهان قفل بخورد گیج می‌شود.
 */
export function firstHalfLessons(lessonNumbers: number[]): Set<number> {
  const sorted = [...new Set(lessonNumbers)].sort((a, b) => a - b);
  return new Set(sorted.slice(0, Math.ceil(sorted.length / 2)));
}

export function pairsLessonOpen(lesson: number, allInGrade: number[]): boolean {
  return firstHalfLessons(allInGrade).has(lesson);
}

/**
 * متنِ مدال برای هر بخش.
 *
 * ⚠️ چرا اینجا و نه در کامپوننت: مدال یکی است و همه‌جا استفاده می‌شود. اگر
 * متن داخلش هاردکد بود، یا همه‌جا یک جملهٔ عمومی می‌دیدند («سؤالات») که در
 * بازی بی‌معنی است، یا هر بخش کپیِ خودش از مدال را می‌ساخت.
 */
export function guestLimitMessage(section: GuestSection): string {
  const { title, allowance } = GUEST_POLICY[section];
  switch (allowance.kind) {
    case "unlimited":
      return `${title} برای همه باز است.`;
    case "count":
      return `در حالت مهمان ${toFa(allowance.limit)} ${allowance.unit} از ${title} برای شما باز است. برای ادامه و ذخیرهٔ پیشرفتتان وارد شوید.`;
    case "subset":
      return `در حالت مهمان ${allowance.description} از ${title} برای شما باز است. برای دسترسی به همه و ذخیرهٔ پیشرفتتان وارد شوید.`;
  }
}

/** متنِ دکمهٔ «فعلاً ادامه بده». */
export function guestContinueLabel(section: GuestSection): string {
  const a = GUEST_POLICY[section].allowance;
  if (a.kind === "count") return `ادامه با ${toFa(a.limit)} ${a.unit}`;
  if (a.kind === "subset") return `ادامه با ${a.description}`;
  return "ادامه";
}

/** ارقامِ فارسی. کپیِ کوچکی از toFa تا این ماژول به UI وابسته نشود. */
function toFa(n: number): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
