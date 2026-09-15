/**
 * قاعده‌های تحلیلِ کلاس — منطقِ خالص، بدونِ دیتابیس.
 *
 * ⚠️ چرا جدا: همان استدلالِ `lib/plus/skill-buckets.ts`. «این دانش‌آموز
 * نیازمندِ توجه است» جمله‌ای است که یک دبیر بر اساسش با یک نوجوانِ واقعی
 * حرف می‌زند. چنین قاعده‌ای باید بدونِ بالا آوردنِ دیتابیس قابلِ تست باشد،
 * و مهم‌تر از آن باید **قابلِ خواندن** باشد.
 */

/** کمینهٔ پاسخِ سنجیده‌شده تا بشود دربارهٔ دقتِ یک دانش‌آموز حرف زد. */
export const MIN_VERIFIED_FOR_ACCURACY = 12;

/** چند روز بی‌فعالیتی «غایب» شمرده می‌شود. */
export const INACTIVE_DAYS = 14;

/** چند روز پس از عضویت، «هنوز شروع نکرده» معنا پیدا می‌کند. */
export const NOT_STARTED_DAYS = 7;

/** زیرِ این دقت، با شواهدِ کافی، «نیازمندِ تمرین» است. */
export const LOW_ACCURACY = 0.5;

export type AttentionReason = "not_started" | "inactive" | "low_accuracy";

export const ATTENTION_LABEL: Record<AttentionReason, string> = {
  not_started: `بیش از ${NOT_STARTED_DAYS} روز از عضویتش می‌گذرد و هنوز فعالیتی ثبت نشده`,
  inactive: `بیش از ${INACTIVE_DAYS} روز است فعالیتی ثبت نشده`,
  low_accuracy: `دقتش در پاسخ‌های سنجیده‌شده زیر ${LOW_ACCURACY * 100}٪ است`,
};

export type AttentionInput = {
  joinedAt: string;
  lastActivityAt: string | null;
  verifiedTotal: number;
  verifiedCorrect: number;
  /** «حالا» — تزریق می‌شود تا تست به ساعتِ سیستم وابسته نباشد. */
  now: number;
};

/**
 * «چرا این دانش‌آموز نیازمندِ توجه است؟»
 *
 * ⚠️ عمداً یک **فهرستِ دلیل** برمی‌گرداند و نه یک عدد.
 *
 * یک «امتیازِ ریسک» بین ۰ تا ۱۰۰ خیلی حرفه‌ای‌تر به‌نظر می‌رسد و دقیقاً
 * همان چیزی است که نباید ساخته شود: دبیر نمی‌تواند بپرسد «چرا ۷۳؟»، پس یا
 * کورکورانه باور می‌کند یا کلاً نادیده می‌گیرد. هر دو بد است.
 *
 * هر دلیل یک جملهٔ فارسی دارد که همان‌طور که هست نمایش داده می‌شود.
 *
 * ⚠️ و `low_accuracy` فقط با شواهدِ کافی شمرده می‌شود. دانش‌آموزی که سه
 * پاسخ داده و یکی‌اش درست بوده، ۳۳٪ دارد — ولی این عدد دربارهٔ او هیچ
 * نمی‌گوید. همان قاعدهٔ `MIN_EVIDENCE_TOTAL` در تحلیلِ پلاس.
 */
export function attentionReasons(input: AttentionInput): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const day = 24 * 60 * 60 * 1000;

  const joined = Date.parse(input.joinedAt);
  const daysSinceJoin = Number.isFinite(joined) ? (input.now - joined) / day : 0;

  if (input.lastActivityAt === null) {
    /* ⚠️ عضوِ تازه «نیازمندِ توجه» نیست. دانش‌آموزی که دیروز به کلاس
       پیوسته و هنوز چیزی بازی نکرده، طبیعی است — علامت زدنش یعنی روزِ
       اولِ هر کلاس، فهرستِ «نیازمندِ توجه» همهٔ اسم‌ها را دارد و از همان
       روز بی‌معنی می‌شود. */
    if (daysSinceJoin >= NOT_STARTED_DAYS) reasons.push("not_started");
    return reasons;
  }

  const last = Date.parse(input.lastActivityAt);
  if (Number.isFinite(last) && (input.now - last) / day >= INACTIVE_DAYS) {
    reasons.push("inactive");
  }

  if (input.verifiedTotal >= MIN_VERIFIED_FOR_ACCURACY) {
    if (input.verifiedCorrect / input.verifiedTotal < LOW_ACCURACY) {
      reasons.push("low_accuracy");
    }
  }

  return reasons;
}

/**
 * دقت، یا `null` وقتی شواهد کافی نیست.
 *
 * ⚠️⚠️ `null` و صفر دو چیزِ کاملاً متفاوت‌اند و این تابع تنها جایی است که
 * تفاوتشان نگه داشته می‌شود.
 *
 *   • `0`    — تلاش کرده و همه را اشتباه زده.
 *   • `null` — هنوز نمی‌دانیم.
 *
 * برگرداندنِ `0` برای حالتِ دوم یعنی نوشتنِ «۰٪ — ضعیف» کنارِ نامِ
 * دانش‌آموزی که تازه عضو شده. رابط کاربری باید به‌جایش بنویسد «هنوز داده
 * کافی وجود ندارد».
 */
export function accuracyOrNull(correct: number, total: number): number | null {
  if (total < MIN_VERIFIED_FOR_ACCURACY) return null;
  return correct / total;
}
