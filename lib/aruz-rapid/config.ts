import type { RapidAruzDifficulty } from "./types";

/** حالتِ منبعِ صدا.
 *
 *  «procedural» یعنی هیچ فایلی از شبکه خواسته نمی‌شود — صداها همان‌جا با
 *  Web Audio ساخته می‌شوند. تا وقتی بستهٔ صوتیِ واقعی کامل نشده، این حالت
 *  فعال است تا کنسول پر از ۴۰۴ نشود. */
export type AudioSourceMode = "procedural" | "assets";

export interface RapidAruzConfig {
  previewDurationMs: number;

  answerTimeByDifficulty: Record<RapidAruzDifficulty, number>;

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

  /** بیشترین تعدادِ سؤالِ یک نشست. ترتیب یک‌بار در شروعِ نشست ساخته می‌شود. */
  questionsPerSession: number;
}

/**
 * ⚠️ عمداً هیچ correctFeedbackMs ای اینجا نیست.
 *
 * بازخوردِ «درست» نباید دروازهٔ ورود به واحدِ بعد باشد. لحظه‌ای که پاسخِ درست
 * ثبت شد، واحدِ بعد همان‌جا آماده می‌شود و به‌محضِ اولین paint مسلح می‌شود؛
 * انیمیشنِ سبزِ دکمه در کنارش ادامه می‌دهد و هیچ‌کس منتظرش نمی‌ماند.
 */
export const DEFAULT_RAPID_ARUZ_CONFIG: RapidAruzConfig = {
  previewDurationMs: 4000,

  answerTimeByDifficulty: {
    1: 3000,
    2: 2500,
    3: 1750,
  },

  firstUnitExtraTimeMs: 500,

  spoilerTransitionMs: 260,

  wrongFeedbackMs: 300,
  timeoutFeedbackMs: 300,
  resetDelayMs: 100,

  completionRevealMs: 800,
  resumeOverlayMs: 700,

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
 * هیچ کامپوننتی حق ندارد عددِ زمانی خودش داشته باشد؛ اگر لازم شد سختیِ
 * تازه‌ای اضافه شود، فقط همین‌جا عوض می‌شود.
 */
export function getUnitDuration(
  config: RapidAruzConfig,
  difficulty: RapidAruzDifficulty | undefined,
  unitIndex: number,
): number {
  const base = config.answerTimeByDifficulty[difficulty ?? 1] ?? config.answerTimeByDifficulty[1];
  // واحدِ اولِ هر دور کمی وقتِ بیشتر می‌گیرد: با ریست کامل، بازیکن بارها به
  // این واحد برمی‌گردد و باید فرصتِ دوباره جا افتادن داشته باشد.
  return unitIndex === 0 ? base + config.firstUnitExtraTimeMs : base;
}
