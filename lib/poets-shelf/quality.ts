"use client";

/* ═══════════════════════════════════════════════════════════════════════════
   پلهٔ کیفیت — یک بار هنگامِ سوارشدنِ صحنه تشخیص داده می‌شود.
   ═══════════════════════════════════════════════════════════════════════════

   همان فلسفهٔ `lib/aruz-bridge/quality.ts`: هیچ‌کدام از این نشانه‌ها معیارِ
   دقیقی نیستند و قرار هم نیست باشند. هزینهٔ یک حدسِ محافظه‌کارانه چند ذرهٔ
   کمتر است، ولی هزینهٔ کشیدنِ بافتِ ۲۰۴۸ دیوار روی یک گوشیِ ضعیف، بازیِ
   غیرقابلِ بازی است. پس شک که کردیم، پایین می‌رویم.
   ═══════════════════════════════════════════════════════════════════════════ */

export type QualityTier = "high" | "medium" | "low";

export interface QualitySettings {
  tier: QualityTier;
  /** سقفِ devicePixelRatio. بدونِ سقف، یک گوشیِ ۳x نُه برابرِ پیکسلِ لازم را می‌کشد. */
  dpr: [number, number];
  /** پهنای بافتِ دیوار. ارتفاع از نسبتِ دیوار می‌آید. */
  wallTexture: number;
  /** ذراتِ معلق — فقط حسِ عمق می‌دهند، پس اولین چیزی‌اند که حذف می‌شوند. */
  particleCount: number;
  shadows: boolean;
  /** اندازهٔ نقشهٔ سایه. */
  shadowMap: number;
  antialias: boolean;
}

const TIERS: Record<QualityTier, Omit<QualitySettings, "tier">> = {
  high: { dpr: [1, 1.85], wallTexture: 1536, particleCount: 46, shadows: true, shadowMap: 1024, antialias: true },
  medium: { dpr: [1, 1.5], wallTexture: 1024, particleCount: 26, shadows: true, shadowMap: 512, antialias: true },
  low: { dpr: [1, 1.25], wallTexture: 640, particleCount: 0, shadows: false, shadowMap: 0, antialias: false },
};

export function detectQualityTier(): QualityTier {
  if (typeof window === "undefined") return "medium";

  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = Math.min(window.innerWidth, window.innerHeight) < 500;

  if (coarse && (cores <= 4 || memory <= 3)) return "low";
  if (coarse || narrow || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

export function qualityFor(tier: QualityTier): QualitySettings {
  return { tier, ...TIERS[tier] };
}

/** آیا WebGL اصلاً در دسترس است؟ اگر نه، بازی باید با احترام کنار برود. */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * ترجیحِ «حرکتِ کمتر».
 *
 * ⚠️ این *بازی را خاموش نمی‌کند*. دویدنِ شخصیت و افتادنِ کتاب خودِ پیامِ
 * بازی‌اند و بدونشان هیچ‌چیز فهمیده نمی‌شود. چیزی که کم می‌شود حرکتِ
 * ثانویه است: ذرات، تکانِ دوربین، چرخشِ ستاره‌های گیجی و شناوریِ کتاب‌ها.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
