/** تنظیماتِ بازی در یک جا. هیچ عددِ جادویی نباید داخلِ کامپوننت‌ها پخش شود. */

export type AudioSourceMode = "procedural" | "assets";

export interface GrammarCircuitConfig {
  /** فاصله‌ای که انگشت/موس باید طی کند تا «کشیدن» شروع شود؛ زیرِ آن، لمسِ ساده
   *  است و نباید تصادفاً به drag تبدیل شود. */
  dragActivationDistance: number;

  snapDurationMs: number;
  wrongReturnDurationMs: number;

  connectorAnimationDurationMs: number;
  localContactPulseDurationMs: number;

  /** فاصلهٔ آخرین اتصالِ درست تا شروعِ جریانِ کامل. عمداً کوتاه. */
  finalCompletionLeadInMs: number;

  /** سرعتِ جریان بر حسبِ پیکسل بر ثانیه — مدت از طولِ *واقعیِ* مسیر درمی‌آید،
   *  نه یک عددِ ثابت که روی صفحهٔ بزرگ کند و روی موبایل تند به نظر برسد. */
  currentTravelSpeedPxPerSec: number;
  currentTravelMinDurationMs: number;
  currentTravelMaxDurationMs: number;

  lampTurnOnDurationMs: number;
  rewardDisplayDurationMs: number;

  slotWidth: number;
  slotGap: number;
  /** کمینهٔ فاصلهٔ واقعی که باید بینِ دو ناحیهٔ لمسی باز بماند. */
  hitTargetMinGap: number;
  /** بزرگ‌ترین گشادکردنِ مجازِ ناحیهٔ لمسی نسبت به سوکتِ دیداری. */
  hitTargetPadding: number;

  /** جابه‌جاییِ افقیِ بیشتر از این مقدار، خطِ راهنما لازم دارد. */
  leaderLineThreshold: number;

  /** پیش‌نمایشِ کشیده‌شده روی لمس، این‌قدر بالاتر از انگشت دیده می‌شود؛
   *  محاسبهٔ مقصد همچنان با مختصاتِ واقعیِ انگشت است. */
  touchDragLiftPx: number;

  /** «لمس کن، بعد لمس کن» — روی موبایل مسیرِ اصلی است، نه راهِ دومِ اضطراری.
   *  خاموش‌کردنش فقط کشیدن و صفحه‌کلید را باقی می‌گذارد. */
  allowTapToPlace: boolean;
  /** برداشتنِ قطعه‌ای که *درست* نشسته.
   *
   *  فعلاً فقط `false` پیاده‌سازی شده: سوکتِ بسته اصلاً ناحیهٔ لمسی ندارد، پس
   *  نه drop می‌گیرد نه tap. اگر روزی `true` لازم شد، باید ناحیهٔ لمسیِ
   *  سوکتِ پرشده و کنش‌های reducerِ آن هم اضافه شوند؛ تا آن‌وقت مقدارِ `true`
   *  در حالتِ توسعه هشدار می‌دهد تا بی‌سروصدا بی‌اثر نماند. */
  allowCorrectModuleRemoval: boolean;

  soundVolume: number;
  audioSourceMode: AudioSourceMode;

  questionsPerSession: number;
}

export const GRAMMAR_CIRCUIT_CONFIG: GrammarCircuitConfig = {
  dragActivationDistance: 6,

  snapDurationMs: 150,
  wrongReturnDurationMs: 220,

  connectorAnimationDurationMs: 200,
  localContactPulseDurationMs: 420,

  finalCompletionLeadInMs: 120,

  currentTravelSpeedPxPerSec: 900,
  currentTravelMinDurationMs: 450,
  currentTravelMaxDurationMs: 1200,

  lampTurnOnDurationMs: 320,
  rewardDisplayDurationMs: 950,

  slotWidth: 96,
  slotGap: 14,
  hitTargetMinGap: 8,
  hitTargetPadding: 10,

  leaderLineThreshold: 3,

  touchDragLiftPx: 44,

  allowTapToPlace: true,
  allowCorrectModuleRemoval: false,

  soundVolume: 0.5,
  // تا وقتی بستهٔ صوتیِ واقعی اضافه و پیکربندی نشده، حالت باید «تولیدی» بماند:
  // در این حالت هیچ URL صوتیِ غایبی درخواست نمی‌شود.
  audioSourceMode: "procedural",

  questionsPerSession: 5,
};
