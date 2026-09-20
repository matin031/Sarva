import { kimiaMeterFor, type FootKey } from "./catalog";
import {
  attemptsRemaining,
  mayRevealSolution,
  type RoundSnapshot,
} from "./round-state";
import { KIMIA_HINTS, judge, type KimiaErrorType } from "./scansion";
import type { KimiaSolution, KimiaVerdict } from "./types";

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
  /** ارکانِ متعارفِ همین دور — مبنای ساختنِ `solution` در پایانِ دور. */
  ark: string;
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
    ? { isCorrect: true, errorType: null, acceptedSequence: verdict.matched, ark }
    : { isCorrect: false, errorType: verdict.errorType, acceptedSequence: null, ark };
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
 *
 * ── و حالا یک استثنای عمدی: پایانِ دور ─────────────────────────────────
 *
 * ⚠️ تا امروز بازیکنی که گیر می‌کرد **هیچ‌وقت** پاسخ را نمی‌دید، یعنی
 * سخت‌ترین بیت‌ها تنها بیت‌هایی بودند که چیزی یاد نمی‌دادند. حالا وقتی
 * دور تمام شد — درست ساخت، سه تلاشش رفت، یا خودش خواست — `solution`
 * می‌آید.
 *
 * ولی «تمام شد» را این فایل تصمیم نمی‌گیرد؛ `mayRevealSolution` در
 * `round-state.ts` می‌گیرد، و آن تنها دروازه است. تا وقتی دور باز است،
 * هر سه فیلدِ افشاگر (`meterName`، `acceptedSequence`، `solution`) صریحاً
 * `null` می‌شوند و نه «اتفاقی خالی».
 */
export function toVerdict(
  decision: Decision,
  meterName: string,
  saved: boolean,
  round: RoundSnapshot,
): KimiaVerdict {
  const open = mayRevealSolution(round);
  return {
    isCorrect: decision.isCorrect,
    errorType: decision.errorType,
    hint: decision.errorType ? KIMIA_HINTS[decision.errorType] : null,
    /* ⚠️ `isCorrect` و نه `open`: نامِ وزن در نوارِ وضعیت می‌نشیند و
       جمله‌اش («وزن درست است — رمل مثمن») فقط دربارهٔ یک پاسخِ درست
       معنا دارد. پاسخِ نهاییِ حالتِ reveal از `solution` می‌آید. */
    meterName: decision.isCorrect ? meterName : null,
    acceptedSequence: decision.isCorrect ? decision.acceptedSequence : null,
    saved,
    attemptsCount: round.attemptsCount,
    remaining: attemptsRemaining(round),
    revealed: round.revealReason !== null,
    solution: open ? solutionFor(meterName, decision) : null,
  };
}

/**
 * پاسخِ درستِ یک دور.
 *
 * ⚠️ از `kimiaMeterFor` روی همان `ark`ی که ردیفِ دور snapshot کرده ساخته
 * می‌شود و نه از بانکِ پرسش‌ها: اگر مدیر وسطِ بازی سؤال را اصلاح کند،
 * پاسخی که پشتِ کارت نوشته می‌شود باید همان چیزی باشد که بازیکن با آن
 * سنجیده شد.
 */
export function solutionFor(meterName: string, decision: Decision): KimiaSolution | null {
  const meter = kimiaMeterFor(decision.ark);
  if (!meter) return null;
  return { meterName, canonical: meter.canonical, accepted: meter.accepted };
}

/**
 * پاسخِ یک دور، بدونِ هیچ تلاشی — برای `POST /reveal`.
 *
 * ⚠️ اینجا عمداً `Decision` ساخته نمی‌شود: «نمایش پاسخ» یک داوری نیست و
 * نباید چیزی دربارهٔ چیدمانِ فعلیِ بازیکن بگوید.
 */
export function solutionForArk(ark: string, meterName: string): KimiaSolution | null {
  const meter = kimiaMeterFor(ark);
  if (!meter) return null;
  return { meterName, canonical: meter.canonical, accepted: meter.accepted };
}
