import { kimiaMeterFor, type FootKey } from "./catalog";
import { KIMIA_HINTS, judge, type KimiaErrorType } from "./scansion";
import type { KimiaVerdict } from "./types";

/* ═══════════════════════════════════════════════════════════════════════════
   «این ترکیب درست است؟ و کاربر اجازه دارد چه چیزی بداند؟»
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ جدا از `server/rounds.ts` و بدونِ `"server-only"`، عمداً — و نه فقط
   برای معماری: قاعدهٔ «چه چیزی لو می‌رود» باید بدونِ دیتابیس تست شود.
   `tests/kimia/verdict.test.ts` می‌سنجد که بعد از پاسخِ غلط هیچ ردی از
   ارکانِ درست یا نامِ وزن در بدنهٔ پاسخ نباشد، و آن تستی است که اگر روزی
   کسی «یک کمکِ کوچک» اضافه کند، باید قرمز شود.

   ⚠️ با این حال این ماژول هیچ‌وقت در باندلِ مرورگر نمی‌نشیند، چون ورودیِ
   `decide` همان ارکانِ درست است و هیچ کامپوننتی آن را ندارد.
   ═══════════════════════════════════════════════════════════════════════════ */

/** نتیجهٔ داوری، پیش از آنکه به شکلِ پاسخِ HTTP دربیاید. */
export type Decision = {
  isCorrect: boolean;
  errorType: KimiaErrorType | null;
  acceptedSequence: readonly FootKey[] | null;
};

/**
 * داوریِ یک چیدمان در برابرِ ارکانِ یک وزن.
 *
 * ⚠️ `ark` از snapshotِ ردیفِ دور می‌آید (یا برای مهمان، از خودِ بانکِ
 * پرسش)، پس این تابع برای مهمان و کاربرِ واردشده *یکی* است و هیچ مسیرِ
 * دومی برای «درست بودن» وجود ندارد.
 *
 * `null` یعنی این وزن دیگر قابلِ داوری نیست — مثلاً فایلِ صوتی‌اش برداشته
 * شده و از دامنهٔ بازی بیرون رفته. حدس زدن جایگزینش نمی‌شود.
 */
export function decide(ark: string, selected: readonly FootKey[]): Decision | null {
  const meter = kimiaMeterFor(ark);
  if (!meter) return null;

  const verdict = judge(selected, meter.accepted);
  return verdict.correct
    ? { isCorrect: true, errorType: null, acceptedSequence: verdict.matched }
    : { isCorrect: false, errorType: verdict.errorType, acceptedSequence: null };
}

/**
 * ⚠️ پاسخِ درست چه چیزی را رو می‌کند و پاسخِ غلط چه چیزی را نه.
 *
 * بعد از پاسخِ درست: نامِ وزن و همان دنباله‌ای که پذیرفته شد. این لحظهٔ
 * یادگیری است و باید کامل باشد.
 *
 * بعد از پاسخِ غلط: **هیچ‌کدام** — و حتی «کدام جایگاه درست بود» هم نه.
 * قفل کردنِ جایگاه‌های درست بازی را به حذفِ تدریجی تبدیل می‌کند: بازیکن
 * بدونِ گوش دادن به ریتم و فقط با آزمون‌وخطا به جواب می‌رسد، و آن دیگر
 * تمرینِ عروض نیست. تنها چیزی که می‌آید یک راهنماییِ کلی است که هیچ رکنی
 * و هیچ شماره‌ای در آن نیست.
 */
export function toVerdict(
  decision: Decision,
  meterName: string,
  saved: boolean,
  attemptsCount: number | null,
): KimiaVerdict {
  return {
    isCorrect: decision.isCorrect,
    errorType: decision.errorType,
    hint: decision.errorType ? KIMIA_HINTS[decision.errorType] : null,
    meterName: decision.isCorrect ? meterName : null,
    acceptedSequence: decision.isCorrect ? decision.acceptedSequence : null,
    saved,
    attemptsCount,
  };
}
