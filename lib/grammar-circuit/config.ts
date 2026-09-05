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

  /* ── دنبالهٔ تشخیص ─────────────────────────────────────────────────────
     پالسِ تشخیصی خانه‌به‌خانه از راست به چپ می‌رود. باید آن‌قدر آهسته باشد
     که دانش‌آموز هر نتیجه را ببیند و آن‌قدر تند که کسل‌کننده نشود. */
  /** مکث پیش از رسیدنِ پالس به اولین خانه. */
  diagnosticLeadInMs: number;
  /** مدتِ حالتِ «در حالِ بررسی» هر خانه. */
  diagnosticCheckMs: number;
  /** فاصله تا شروعِ بررسیِ خانهٔ بعدی، پس از نمایشِ نتیجه. */
  diagnosticStepGapMs: number;
  /** مکث پس از آخرین نتیجه، پیش از دنبالهٔ موفقیت/شکست. */
  diagnosticTailMs: number;

  /* ── دنبالهٔ شکست ──────────────────────────────────────────────────── */
  lampFlickerDurationMs: number;
  lampPopDelayMs: number;
  failureTailMs: number;

  /** سرعتِ جریان بر حسبِ پیکسل بر ثانیه — مدت از طولِ *واقعیِ* مسیر درمی‌آید،
   *  نه یک عددِ ثابت که روی صفحهٔ بزرگ کند و روی موبایل تند به نظر برسد. */
  currentTravelSpeedPxPerSec: number;
  currentTravelMinDurationMs: number;
  currentTravelMaxDurationMs: number;

  lampTurnOnDurationMs: number;
  rewardDisplayDurationMs: number;

  /** کفِ عرضِ سوکت — واژهٔ خیلی کوتاه («را») نباید خانه‌ای بسازد که انگشت
   *  نتواند بزندش. */
  slotMinWidth: number;
  /** لقیِ افقیِ سوکت نسبت به عرضِ واژه. */
  slotWordPadding: number;
  slotHeight: number;
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
  /** تا این فاصله از یک خانه، قطعه به همان خانه می‌چسبد.
   *
   *  ⚠️ صفر یعنی همان رفتارِ قدیمی: «یا دقیقاً داخل، یا هیچ» — که روی گوشی
   *  عملاً یعنی «هیچ». اندازه‌اش عمداً هم‌مرتبهٔ پهنای انگشت است. */
  dropSnapTolerancePx: number;

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

  /** طولِ پیش‌فرضِ تمرین، وقتی کاربر چیزی انتخاب نکرده. */
  questionsPerSession: number;
  /** طول‌هایی که کاربر می‌تواند برگزیند. `0` یعنی «هرچه در درس‌های انتخابی
   *  هست» — با ۸۸ پرسش در یک درس، عددِ ثابت جوابگو نیست. */
  sessionLengthOptions: readonly number[];
  /** سقفِ درس‌های انتخابیِ یک جلسه — هم برای UI و هم برای اعتبارسنجیِ API. */
  maxLessonsPerSession: number;
}

export const GRAMMAR_CIRCUIT_CONFIG: GrammarCircuitConfig = {
  dragActivationDistance: 6,

  snapDurationMs: 150,
  wrongReturnDurationMs: 220,

  connectorAnimationDurationMs: 200,
  localContactPulseDurationMs: 420,

  finalCompletionLeadInMs: 120,

  diagnosticLeadInMs: 260,
  diagnosticCheckMs: 200,
  diagnosticStepGapMs: 150,
  diagnosticTailMs: 320,

  lampFlickerDurationMs: 520,
  lampPopDelayMs: 360,
  failureTailMs: 420,

  currentTravelSpeedPxPerSec: 900,
  currentTravelMinDurationMs: 450,
  currentTravelMaxDurationMs: 1200,

  lampTurnOnDurationMs: 320,
  rewardDisplayDurationMs: 950,

  slotMinWidth: 76,
  slotWordPadding: 30,
  slotHeight: 46,
  slotGap: 14,
  hitTargetMinGap: 8,
  hitTargetPadding: 10,

  leaderLineThreshold: 3,

  touchDragLiftPx: 44,
  dropSnapTolerancePx: 44,

  allowTapToPlace: true,
  allowCorrectModuleRemoval: false,

  soundVolume: 0.5,
  // تا وقتی بستهٔ صوتیِ واقعی اضافه و پیکربندی نشده، حالت باید «تولیدی» بماند:
  // در این حالت هیچ URL صوتیِ غایبی درخواست نمی‌شود.
  audioSourceMode: "procedural",

  questionsPerSession: 10,
  sessionLengthOptions: [5, 10, 20, 0],
  maxLessonsPerSession: 18,
};
