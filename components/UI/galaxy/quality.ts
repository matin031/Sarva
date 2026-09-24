/** Fixed rendering quality for /game. DPR, geometry and materials keep the
 * existing device profiles; animation is a separate user preference. CPU and
 * memory hints may select balanced quality but must not stop motion.
 */

export type QualityTier = "high" | "balanced" | "low";

export type QualityProfile = {
  tier: QualityTier;
  /** حداکثر چگالیِ پیکسل. عمداً هرگز از ۱٫۲۵ بالاتر نمی‌رود: این یک صحنهٔ
   *  تزئینیِ تمام‌صفحه است و هزینه‌اش مستقیماً با تعداد پیکسل بالا می‌رود. */
  dpr: number;
  /** شیدرِ سنگینِ MeshDistortMaterial فقط در بالاترین سطح. */
  distort: boolean;
  /** Motion preference is independent of device/GPU quality. */
  reducedMotion: boolean;
  /** Reference cadence for the original star drift speed (now delta-based). */
  starFps: number;
  /** حلقهٔ دنباله‌دار و رسمِ تدریجیِ کابل. */
  cableAnimation: boolean;
};

const PROFILES: Record<QualityTier, Omit<QualityProfile, "tier">> = {
  high: { dpr: 1.25, distort: true, reducedMotion: false, starFps: 30, cableAnimation: true },
  balanced: { dpr: 1, distort: false, reducedMotion: false, starFps: 24, cableAnimation: true },
  low: { dpr: 1, distort: false, reducedMotion: true, starFps: 0, cableAnimation: false },
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
export function detectQuality(forceMotion = false): QualityProfile {
  if (typeof window === "undefined") {
    return { tier: "balanced", ...PROFILES.balanced };
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced && !forceMotion) return { tier: "low", ...PROFILES.low };

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  const weak = cores <= 4 || (memory !== undefined && memory <= 4);

  // CPU/memory hints must never silently turn animations off on a touch device.
  if (coarse || weak) return { tier: "balanced", ...PROFILES.balanced };

  // dpr بالا روی دسکتاپ یعنی مانیتورِ رتینا: پیکسلِ بیشتر با همان GPU.
  if (window.devicePixelRatio > 2) return { tier: "balanced", ...PROFILES.balanced };

  return { tier: "high", ...PROFILES.high };
}
