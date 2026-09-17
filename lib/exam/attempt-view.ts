/**
 * خواندنِ یک کارنامهٔ ذخیره‌شده — یک تعریف، برای دانش‌آموز و دبیرش.
 *
 * ⚠️ عمداً بدونِ `"server-only"`: پنلِ دانش‌آموز یک کامپوننتِ کلاینت است
 * (`ExamPanel`) و صفحهٔ دبیر سمتِ سرور رندر می‌شود. هر دو باید *یک* عدد
 * بسازند.
 *
 * =============================================================================
 * ⚠️ چرا این فایل ساخته شد
 * =============================================================================
 *
 * منطقِ زیر تا امروز داخلِ `ExamPanel.tsx` بود. با آمدنِ صفحهٔ «کارنامهٔ
 * دانش‌آموز» برای دبیر، دو راه بود: کپی کردنش، یا بیرون کشیدنش.
 *
 * کپی کردن یعنی روزی دانش‌آموز «۱۴ از ۲۰» ببیند و دبیرش «۱۳٫۵ از ۲۰» — و
 * هیچ‌کدام نفهمند کدام درست است. همان استدلالی که `lib/teacher/student-report.ts`
 * برای استفاده از `getWeightAnalysis` مشترک دارد.
 *
 * =============================================================================
 * ⚠️⚠️ دو شکلِ ذخیره‌سازی، و چرا هر دو باید پشتیبانی شوند
 * =============================================================================
 *
 * `exam_attempts.question_results` یک ستونِ JSON بدونِ اسکیماست و در طولِ
 * عمرِ سایت دو شکلِ متفاوت در آن نوشته شده:
 *
 *   • **قدیمی**  `{ "3": { score: 1.5, max: 2 } }`
 *   • **امروزی** `{ "3": { number: 3, parts: [{ score, maxScore, status, … }] } }`
 *
 * ردیف‌های قدیمی در دیتابیس **هستند** و پاک نمی‌شوند — کارنامهٔ کسی که
 * پارسال آزمون داده نباید ناپدید شود. پس هر خواننده‌ای باید هر دو را
 * بفهمد، و این تنها جایی است که آن دانش را دارد.
 *
 * ⚠️ در شکلِ امروزی، نمرهٔ سؤال از **جمعِ بخش‌ها** درمی‌آید و نه از یک
 * ستونِ آماده. خواندنِ `raw.score` روی آن ردیف‌ها همیشه صفر می‌دهد، چون آن
 * کلید اصلاً وجود ندارد — یعنی کارنامه‌ای پر از «۰ از ۰».
 */

/** یک بخشِ تصحیح‌شده، همان‌طور که در ستونِ JSON نشسته. */
export type StoredPart = {
  label?: string;
  score?: number;
  maxScore?: number;
  status?: "correct" | "incorrect" | "partial" | "needs_review";
  correctAnswerText?: string;
  feedback?: string;
  selfGrade?: boolean;
};

/** یک سؤالِ کارنامه، بعد از نرمال‌سازی. */
export type AttemptQuestion = {
  /** کلیدِ خامِ شیء — همان چیزی که `answers` هم با آن ایندکس می‌شود. */
  key: string;
  /** شمارهٔ سؤال. */
  number: number;
  score: number;
  max: number;
  parts: StoredPart[];
};

export const STATUS_LABEL: Record<string, string> = {
  correct: "درست",
  incorrect: "نادرست",
  partial: "نیمه‌درست",
  needs_review: "خودارزیابی",
};

/**
 * ⚠️ در MariaDB — که میزبانِ production است — ستونِ `JSON` یک نامِ مستعار
 * برای LONGTEXT است و `mysql2` **رشته** برمی‌گرداند؛ در MySQL همان ستون شیء
 * می‌دهد. کدی که فقط روی یکی امتحان شده باشد، روی آن یکی بی‌صدا یک کارنامهٔ
 * خالی نشان می‌دهد. (همان تفاوتی که `lib/aruz-rapid/content.ts` هم با آن
 * روبه‌روست و همان‌جا مفصل توضیح داده شده.)
 */
export function readJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** ستونِ DECIMAL — `mysql2` گاهی رشته می‌دهد و گاهی عدد. */
export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * `question_results` → فهرستِ سؤال‌ها، مرتب، با نمرهٔ درست.
 *
 * ⚠️ مرتب‌سازی **عددی** است و نه رشته‌ای. با مرتب‌سازیِ رشته‌ای «۱۰» پیش از
 * «۲» می‌آمد و کارنامه به ترتیبِ برگهٔ آزمون نبود — چیزی که دبیر موقعِ
 * مقایسه با برگهٔ اصلی بلافاصله رویش گیر می‌کند.
 */
export function readAttemptQuestions(questionResults: unknown): AttemptQuestion[] {
  const results = readJsonObject(questionResults);

  return Object.entries(results)
    .map(([key, value]) => {
      const raw = readJsonObject(value) as {
        score?: unknown;
        max?: unknown;
        number?: unknown;
        parts?: unknown;
      };

      const parts: StoredPart[] = Array.isArray(raw.parts) ? (raw.parts as StoredPart[]) : [];

      /* ⚠️ شکلِ امروزی اول: اگر `parts` هست، جمعِ آن معتبر است و
         `raw.score` اصلاً وجود ندارد. ترتیبِ برعکس یعنی هر کارنامهٔ تازه
         «۰ از ۰». */
      const score = parts.length
        ? parts.reduce((t, p) => t + num(p.score), 0)
        : num(raw.score);
      const max = parts.length
        ? parts.reduce((t, p) => t + num(p.maxScore), 0)
        : num(raw.max);

      const number = Number(raw.number ?? key);

      return { key, number: Number.isFinite(number) ? number : 0, score, max, parts };
    })
    .sort((a, b) => a.number - b.number);
}

/**
 * پاسخِ ذخیره‌شده → متنِ خواندنی.
 *
 * ⚠️ `exam_attempts.answers` هیچ اسکیمایی ندارد و انواعِ سؤال‌ها با هم فرق
 * دارند: چندگزینه‌ای یک رشته می‌نویسد، جای‌خالی یک آرایه، مرتب‌سازی یک
 * آرایهٔ دیگر.
 *
 * پس هیچ فرضی گذاشته نمی‌شود: هر چیزی که به متن تبدیل شود می‌شود و هر چیزِ
 * دیگری رشتهٔ خالی می‌گیرد. نوشتنِ `[object Object]` کنارِ نامِ یک
 * دانش‌آموز بدتر از ننوشتن است.
 */
export function answerText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => answerText(v))
      .filter((v) => v !== "")
      /* ⚠️ جداکننده دقیقاً همانی است که `ExamPanel` داشت. این کد از
         آنجا بیرون کشیده شده و قرار بود هیچ تغییرِ رفتاری ندهد. */
      .join("، ");
  }
  return "";
}

/**
 * کلیدِ پاسخِ یک بخش در ستونِ `answers`.
 *
 * ⚠️ شکلش `"<شمارهٔ سؤال>:<اندیسِ بخش>"` است و همان چیزی است که
 * `app/exam/[examKey]/actions.ts` هنگامِ ذخیره می‌سازد و اعتبارسنجی می‌کند
 * (`/^\d{1,4}:\d{1,3}$/`). هر خواننده‌ای که شکلِ دیگری بسازد، پاسخ‌ها را
 * پیدا نمی‌کند و بی‌صدا «پاسخی ثبت نشده» نشان می‌دهد.
 */
export function answerKey(questionNumber: number | string, partIndex: number): string {
  return `${questionNumber}:${partIndex}`;
}
