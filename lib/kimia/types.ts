import type { FootKey } from "./catalog";
import type { KimiaErrorType } from "./scansion";

export type { FootKey } from "./catalog";
export type { KimiaErrorType, Confusion } from "./scansion";

/**
 * آنچه مرورگر دربارهٔ یک دور می‌داند.
 *
 * ⚠️ فهرستِ زیر عمداً **کامل** است: هر چیزی که اینجا نیست، به کلاینت
 * نمی‌رود. پیش از پاسخ، مرورگر نه ارکانِ درست را دارد، نه نامِ وزن را، نه
 * پاسخ‌های بدیل را، و نه هیچ چیزی که بشود از آن‌ها بازسازی‌شان کرد.
 *
 * ⚠️ `slotCount` سرنخ است و عمدی: دانستنِ «این وزن چهار رکن دارد» بخشی از
 * صورتِ مسئله است، نه پاسخ. چیزی که لو نمی‌رود *هویتِ* جایگاه‌هاست.
 *
 * ⚠️ `rhythmUrl` هم عمداً به شناسهٔ پرسش گره خورده و نه به نامِ فایل. فایلِ
 * واقعی `‎/audio/مفاعیلن-مفاعیلن-فعولن.mp3` نام دارد — یعنی نامِ فایل
 * *خودش پاسخ است*. سرو کردنِ آن آدرس یعنی پاسخ در تبِ Network نوشته شده
 * باشد. مسیرِ `/api/v1/kimia/rhythm/<questionId>` همان صدا را می‌دهد بدونِ
 * اینکه چیزی بگوید: شناسهٔ پرسش را مرورگر از قبل دارد و از آن هیچ وزنی
 * قابلِ استنتاج نیست.
 */
export type KimiaRound = {
  /** شناسهٔ دور — سرور می‌سازد، و چرخهٔ عمرِ ثبت به آن گره می‌خورد. */
  readonly roundId: string;
  /** شناسهٔ پرسشِ منبع. برای «گزارشِ اشکال» و برای آدرسِ ریتم. */
  readonly questionId: string;
  /** بیت، همان‌طور که در بانکِ عروضِ سماعی هست: دو مصراع. */
  readonly verse: readonly string[];
  /** تعدادِ جایگاه‌های مخزن = تعدادِ ارکانِ یک مصراع. */
  readonly slotCount: number;
  /** آدرسِ خنثای ریتمِ وزن. */
  readonly rhythmUrl: string;
};

/** پاسخِ سرور به یک تلاش. */
export type KimiaVerdict = {
  readonly isCorrect: boolean;
  /** فقط وقتی غلط است. هیچ‌وقت جایگاهِ خاصی را نام نمی‌برد. */
  readonly errorType: KimiaErrorType | null;
  /** فقط وقتی غلط است — متنِ راهنماییِ غیرافشاگر. */
  readonly hint: string | null;
  /** ⚠️ فقط و فقط وقتی پاسخ درست است. */
  readonly meterName: string | null;
  /** ⚠️ فقط و فقط وقتی پاسخ درست است: همان دنباله‌ای که پذیرفته شد. */
  readonly acceptedSequence: readonly FootKey[] | null;
  /** آیا نتیجه در کارنامه نشست؟ برای مهمان `false` است و این عادی است. */
  readonly saved: boolean;
  /** چندمین تلاشِ همین دور. برای مهمان `null`. */
  readonly attemptsCount: number | null;
};

/**
 * حالت‌های صحنه.
 *
 * ⚠️ صریح و شمارشی، چون هر گذارِ مبهم اینجا یک باگِ مسابقه‌ای در صفحه است:
 * دوبار زدنِ «آزمایش»، ریختنِ جوهر وسطِ ریختنِ قبلی، یا پاسخی که برای دورِ
 * قبل بوده و حالا رسیده.
 */
export type KimiaPhase =
  | "intro"
  | "loading"
  | "playing"
  | "pouring"
  | "readyToCheck"
  | "validating"
  | "correctReveal"
  | "wrongReveal"
  | "result"
  | "error";

/** یک تغییرِ واقعی در مخزن — مبنای «واگرد». */
export type SlotMutation = {
  readonly slotIndex: number;
  readonly previousFoot: FootKey | null;
  /**
   * `null` یعنی این تغییر یک **برداشتن** بوده (کلیک روی جایگاهِ پر).
   *
   * ⚠️ این تایپ فقط سمتِ کلاینت زندگی می‌کند و هیچ‌وقت به سرور نمی‌رود؛
   * قراردادِ API و اعتبارسنجیِ سرور دست‌نخورده‌اند.
   */
  readonly nextFoot: FootKey | null;
};
