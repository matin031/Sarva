/**
 * تقطیعِ سریع — مدلِ داده.
 *
 * ⚠️ قاعدهٔ اصلی این ماژول: بازی هیچ‌وقت خودش تقطیع نمی‌کند.
 * نه هجا می‌شکند، نه اعراب اضافه می‌کند، نه از روی Unicode حدس می‌زند.
 * هر چیزی که «کوتاه» یا «بلند» است، از پیش در داده آمده و بازی فقط اجرایش
 * می‌کند. اگر روزی این فایل به جایی رسید که از متن، هجا استخراج می‌کند،
 * آن تغییر غلط است.
 */

/** معنیِ واحدِ عروضی — نه شکلِ نمایشی‌اش.
 *
 *  رابط امروز short را «U» و long را «_» نشان می‌دهد، ولی منطقِ بازی هرگز
 *  نباید به آن دو نماد گره بخورد؛ نمادها در config عوض می‌شوند. */
export type ScansionLength = "short" | "long";

export type RapidAruzDifficulty = 1 | 2 | 3;

export type RapidAruzQuestionType = "word" | "phrase" | "hemistich";

export interface RapidAruzUnit {
  id: string;

  /** متنِ نمایشیِ دقیق. عیناً همان چیزی که در داده آمده — بدون normalize،
   *  بدون حذف اعراب، بدون جایگزینیِ حرف. */
  display: string;

  length: ScansionLength;

  /** جای تجمعیِ آشکارسازیِ متنِ کامل پس از پاسخِ درست به این واحد (۰..۱).
   *  اختیاری است؛ اگر همهٔ واحدها داشته باشند، همان مرجعِ آشکارسازی است. */
  revealProgress?: number;
}

export interface RapidAruzQuestion {
  id: string;

  type: RapidAruzQuestionType;

  /** متنِ کاملِ اعراب‌گذاری‌شده. دست‌نخورده نمایش داده می‌شود. */
  previewText: string;

  units: RapidAruzUnit[];

  difficulty?: RapidAruzDifficulty;

  explanation?: string;

  audioUrl?: string;

  /**
   * چسباندنِ واحدها عمداً با previewText یکی نیست.
   *
   * در تقطیعِ واقعی این پیش می‌آید: «نَو اَز» که «نَ» + «وَز» می‌شود، حرفی
   * که بینِ دو هجا مشترک است («سی» + «یاه»)، یا تشدید که یک حرف را دو بار
   * می‌شمارد («عَلْ» + «لِم»). با این پرچم، اعتبارسنج دیگر دربارهٔ آن هشدار
   * نمی‌دهد — و هشدارش برای غلطِ تایپیِ واقعی کارآمد می‌ماند.
   */
  hasUnitTextOverlap?: boolean;

  /** دادهٔ نمایشی است و مرجعِ علمی نیست. */
  isDemo?: boolean;
}

/** از کجا آمد: برای آمار و برای جلوگیری از دوبار شمردنِ یک رویدادِ فیزیکی. */
export type RapidAruzInputMethod = "pointer" | "keyboard";

/** هر تلاشِ یک واحد دقیقاً یکی از این سه را می‌گیرد — نه دوتا. */
export type UnitOutcome = "correct" | "wrong" | "timeout";
