import type { Difficulty } from "./types";

/**
 * همهٔ عددهای قابل‌تنظیمِ بازی در یک جا.
 *
 * قاعده: هیچ کامپوننتی حق ندارد یک عددِ زمانی یا فاصله‌ای را خودش بنویسد.
 * دلیلش فقط تمیزی نیست — زمان‌بندیِ «فرود → سکوت → ترک → خردشدن» تجربهٔ اصلیِ
 * بازی است و باید بشود آن را یک‌جا کوک کرد.
 */
export interface AruzBridgeConfig {
  /** چند میلی‌ثانیه متنِ پرسش دیده می‌شود، پیش از آنکه محو شود. */
  questionDisplayDuration: number;
  /** فرصتِ پاسخ، از لحظهٔ محوشدنِ پرسش. */
  answerTime: number;
  jumpDuration: number;
  /** سکوتِ بعد از فرود روی شیشهٔ نادرست — قلبِ حسِ تعلیق. */
  landingDelay: number;
  /** مدتی که ترک‌ها روی سطح پخش می‌شوند. */
  crackDuration: number;
  /** فاصلهٔ میانِ کاملْ‌ترک‌خوردن و جداشدنِ قطعات. */
  glassBreakDelay: number;
  /** طولِ سقوط، تا پیش از نمایشِ صفحهٔ پایان. */
  fallDuration: number;
  /** ضربانِ کوتاهِ فرودِ درست، پیش از مسلح‌شدنِ پرسشِ بعد.
   *  کوتاه نگهش دارید: هر میلی‌ثانیه‌اش وقتِ مرده‌ای است که بازیکن نمی‌تواند
   *  کاری بکند. بازخوردِ دیداری خودش ادامه می‌دهد و لازم نیست منتظرش بمانیم. */
  correctPauseDuration: number;
  /** شمارشِ ۳-۲-۱ پیش از اولین پرسش. بیرون از فرصتِ پاسخ است. */
  countdownDuration: number;
  /** هرچه کمتر، دوربین تنبل‌تر. واحدش «در ثانیه» است. */
  cameraFollowSpeed: number;
  questionsPerRun: number;
  fogNear: number;
  fogFar: number;
  soundVolume: number;
  difficulty: Difficulty;
  desktopShardCount: number;
  mobileShardCount: number;
  /** از این کسرِ پایانیِ تایمر به بعد، فشارِ دیداری/صوتی شروع می‌شود. */
  pressureThreshold: number;
  /** کسرِ پایانی‌ای که فشار در آن شدیدتر می‌شود. */
  panicThreshold: number;
}

export const defaultAruzBridgeConfig: AruzBridgeConfig = {
  questionDisplayDuration: 1000,
  answerTime: 4000,
  jumpDuration: 650,
  landingDelay: 170,
  crackDuration: 420,
  glassBreakDelay: 90,
  fallDuration: 1900,
  correctPauseDuration: 140,
  countdownDuration: 2400,
  cameraFollowSpeed: 2.6,
  questionsPerRun: 10,
  fogNear: 14,
  fogFar: 58,
  soundVolume: 0.7,
  difficulty: 1,
  desktopShardCount: 20,
  mobileShardCount: 11,
  pressureThreshold: 0.25,
  panicThreshold: 0.1,
};

/**
 * سختی فقط روی زمان اثر می‌گذارد، نه روی مکانیک.
 *
 * تفاوتِ واقعیِ سطح‌ها در *انتخابِ گزینهٔ نادرست* است (نگاه کنید به
 * `questions.ts`): سطح ۱ وزن‌های دور از هم، سطح ۳ وزن‌های بسیار نزدیک. اینجا
 * فقط فشارِ زمانی اضافه می‌شود.
 */
const DIFFICULTY_OVERRIDES: Record<Difficulty, Partial<AruzBridgeConfig>> = {
  1: { answerTime: 5000, questionDisplayDuration: 1200 },
  2: { answerTime: 4000, questionDisplayDuration: 1000 },
  3: { answerTime: 2800, questionDisplayDuration: 850 },
};

export function configForDifficulty(
  difficulty: Difficulty,
  overrides?: Partial<AruzBridgeConfig>,
): AruzBridgeConfig {
  return {
    ...defaultAruzBridgeConfig,
    ...DIFFICULTY_OVERRIDES[difficulty],
    difficulty,
    ...overrides,
  };
}

/** امتیازدهی جدا از gameplay نگه داشته شده تا بشود بعداً عوضش کرد بی‌آنکه بازی عوض شود. */
export interface ScoringConfig {
  base: number;
  /** بیشترین امتیازِ سرعت، وقتی بازیکن بلافاصله پاسخ می‌دهد. */
  maxSpeedBonus: number;
  /** ضریبِ streak به‌ازای هر پاسخِ درستِ پیاپی. */
  streakStep: number;
  /** سقفِ ضریب، تا امتیاز از کنترل خارج نشود. */
  maxStreakMultiplier: number;
}

export const defaultScoring: ScoringConfig = {
  base: 100,
  maxSpeedBonus: 60,
  streakStep: 0.1,
  maxStreakMultiplier: 2,
};
