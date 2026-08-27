/** حالتِ منبعِ صدا.
 *
 *  «procedural» یعنی هیچ فایلی از شبکه خواسته نمی‌شود — صداها همان‌جا با
 *  Web Audio ساخته می‌شوند. تا وقتی بستهٔ صوتیِ واقعی کامل نشده، این حالت
 *  فعال است تا کنسول پر از ۴۰۴ نشود. */
export type AudioSourceMode = "procedural" | "assets";

export interface RapidAruzConfig {
  /** فرصتِ خواندنِ مصراعِ کامل، پیش از پوشیده‌شدنش. */
  previewDurationMs: number;

  /** مهلتِ پاسخ برای هر واحد. یک مدلِ منصف، بدونِ درجه‌بندیِ سختی. */
  answerTimeMs: number;

  /** واحدِ اولِ هر دور وقتِ بیشتری می‌گیرد. */
  firstUnitExtraTimeMs: number;

  /** فاصلهٔ کوتاهِ پوشاندنِ متن، بینِ پیش‌نمایش و اولین واحد. */
  spoilerTransitionMs: number;

  wrongFeedbackMs: number;
  timeoutFeedbackMs: number;
  resetDelayMs: number;

  completionRevealMs: number;
  resumeOverlayMs: number;

  replayPreviewOnReset: boolean;
  resetRevealOnMistake: boolean;
  pauseOnVisibilityLoss: boolean;

  shortSymbol: string;
  longSymbol: string;

  soundVolume: number;

  audioSourceMode: AudioSourceMode;

  /** بیشترین تعدادِ مصراعِ یک نشست. ترتیب یک‌بار در شروعِ نشست ساخته می‌شود. */
  questionsPerSession: number;
}

/**
 * ⚠️ عمداً هیچ correctFeedbackMs ای اینجا نیست.
 *
 * بازخوردِ «درست» نباید دروازهٔ ورود به واحدِ بعد باشد. لحظه‌ای که پاسخِ درست
 * ثبت شد، واحدِ بعد همان‌جا آماده می‌شود و به‌محضِ اولین paint مسلح می‌شود؛
 * انیمیشنِ سبزِ دکمه در کنارش ادامه می‌دهد و هیچ‌کس منتظرش نمی‌ماند.
 *
 * زمان‌ها پس از بازخوردِ واقعیِ بازی بازنگری شدند: پیش‌نمایشِ ۴ ثانیه‌ای برای
 * خواندنِ یک مصراعِ اعراب‌گذاری‌شده کم بود و مهلتِ ۱٫۷۵ ثانیه‌ایِ سطحِ سه،
 * بازی را از تمرینِ عروض به بازیِ واکنشی تبدیل می‌کرد. این اعداد عمداً
 * سخاوتمندترند — بدونِ اینکه جایی وقتِ مرده اضافه شود.
 */
export const DEFAULT_RAPID_ARUZ_CONFIG: RapidAruzConfig = {
  previewDurationMs: 7000,

  answerTimeMs: 2800,
  firstUnitExtraTimeMs: 1200,

  spoilerTransitionMs: 320,

  wrongFeedbackMs: 260,
  timeoutFeedbackMs: 260,
  resetDelayMs: 80,

  completionRevealMs: 850,
  resumeOverlayMs: 650,

  replayPreviewOnReset: false,
  resetRevealOnMistake: true,
  pauseOnVisibilityLoss: true,

  shortSymbol: "U",
  longSymbol: "_",

  soundVolume: 0.6,

  audioSourceMode: "procedural",

  questionsPerSession: 5,
};

/**
 * تنها جایی که مدتِ زمانِ یک واحد تعیین می‌شود.
 *
 * هیچ کامپوننتی حق ندارد عددِ زمانی خودش داشته باشد.
 */
export function getUnitDuration(config: RapidAruzConfig, unitIndex: number): number {
  // واحدِ اولِ هر دور کمی وقتِ بیشتر می‌گیرد: با ریست کامل، بازیکن بارها به
  // این واحد برمی‌گردد و باید فرصتِ دوباره جا افتادن داشته باشد.
  return unitIndex === 0 ? config.answerTimeMs + config.firstUnitExtraTimeMs : config.answerTimeMs;
}
