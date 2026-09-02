/**
 * سطحِ کیفیتِ صحنهٔ کهکشان — یک بار در شروع تعیین می‌شود و بعد فقط می‌تواند
 * پایین بیاید.
 *
 * ⚠️ چرا جای `PerformanceMonitor` را گرفت:
 *
 * آن مؤلفه dpr را در هر دو جهت بالا و پایین می‌برد، و هر تغییرِ dpr یعنی
 * three.js بافرِ ترسیمِ GPU را دوباره تخصیص می‌دهد. روی موبایل با پروفایلِ
 * واقعی دیده شد که وسطِ اسکرول بافر از ۳۵۱×۷۵۹ به ۲۹۲×۶۳۳ عوض می‌شود —
 * یعنی دقیقاً روی همان دستگاهِ ضعیفی که قرار بود محافظت شود، یک reallocation
 * گران در بدترین لحظه.
 *
 * حالا کیفیت یک بار از روی نشانه‌های محافظه‌کارانهٔ خودِ مرورگر انتخاب
 * می‌شود (نه از روی user-agent) و بعد قفل است. یک تنزلِ *یک‌طرفه* هم ممکن
 * است، ولی فقط وقتی کاربر اسکرول نمی‌کند و فقط یک بار.
 */

export type QualityTier = "high" | "balanced" | "low";

export type QualityProfile = {
  tier: QualityTier;
  /** حداکثر چگالیِ پیکسل. عمداً هرگز از ۱٫۲۵ بالاتر نمی‌رود: این یک صحنهٔ
   *  تزئینیِ تمام‌صفحه است و هزینه‌اش مستقیماً با تعداد پیکسل بالا می‌رود. */
  dpr: number;
  /** شیدرِ سنگینِ MeshDistortMaterial فقط در بالاترین سطح. */
  distort: boolean;
  /** نرخِ فریمِ انیمیشن‌های تزئینی وقتی کاربر اسکرول نمی‌کند. */
  idleFps: number;
  /** حلقهٔ ستاره‌ها. */
  starFps: number;
  /** حلقهٔ دنباله‌دار و رسمِ تدریجیِ کابل. */
  cableAnimation: boolean;
};

const PROFILES: Record<QualityTier, Omit<QualityProfile, "tier">> = {
  high: { dpr: 1.25, distort: true, idleFps: 30, starFps: 30, cableAnimation: true },
  balanced: { dpr: 1, distort: false, idleFps: 24, starFps: 20, cableAnimation: true },
  low: { dpr: 1, distort: false, idleFps: 0, starFps: 0, cableAnimation: false },
};

/**
 * انتخابِ سطح — فقط با featureهای استاندارد.
 *
 * سه سیگنال، همه محافظه‌کارانه:
 *   • `prefers-reduced-motion` → پایین‌ترین سطح، بدون چون‌وچرا.
 *   • تعداد هستهٔ منطقی — یک عددِ استاندارد که همهٔ مرورگرهای امروزی می‌دهند.
 *   • `pointer: coarse` — یعنی لمسی؛ تقریباً همیشه یعنی GPU موبایل.
 *
 * `navigator.deviceMemory` هم خوانده می‌شود ولی *اختیاری* است: فقط
 * کرومیوم دارد و نبودنش نباید کسی را به سطحِ پایین بیندازد.
 */
export function detectQuality(): QualityProfile {
  if (typeof window === "undefined") {
    return { tier: "balanced", ...PROFILES.balanced };
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return { tier: "low", ...PROFILES.low };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  const weak = cores <= 4 || (memory !== undefined && memory <= 4);

  if (coarse && weak) return { tier: "low", ...PROFILES.low };
  if (coarse || weak) return { tier: "balanced", ...PROFILES.balanced };

  // dpr بالا روی دسکتاپ یعنی مانیتورِ رتینا: پیکسلِ بیشتر با همان GPU.
  if (window.devicePixelRatio > 2) return { tier: "balanced", ...PROFILES.balanced };

  return { tier: "high", ...PROFILES.high };
}

/** یک پله پایین‌تر. `low` پایین‌تر ندارد. */
export function degrade(profile: QualityProfile): QualityProfile {
  if (profile.tier === "high") return { tier: "balanced", ...PROFILES.balanced };
  if (profile.tier === "balanced") return { tier: "low", ...PROFILES.low };
  return profile;
}
