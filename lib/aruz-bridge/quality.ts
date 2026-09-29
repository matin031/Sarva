import type { AruzBridgeConfig } from "./config";

/** سه پله کیفیت. تشخیص یک بار هنگامِ سوارشدنِ صحنه انجام می‌شود. */
export type QualityTier = "high" | "medium" | "low";

export interface QualitySettings {
  tier: QualityTier;
  /** سقفِ devicePixelRatio. بدونِ سقف، یک گوشیِ ۳x چهار برابرِ پیکسلِ لازم را می‌کشد. */
  dpr: [number, number];
  shardCount: number;
  /** ذراتِ معلق در عمق — صرفاً حسِ عمق می‌دهند، پس اولین چیزی‌اند که کم می‌شوند. */
  particleCount: number;
  antialias: boolean;
}

/* ⚠️ دیگر نه transmission هست، نه نقشهٔ سایه، نه نقشهٔ محیطی.

   هر سه در این جدول بودند و هر سه روی پلهٔ «متوسط» — یعنی تقریباً هر گوشی —
   روشن یا نیمه‌روشن بودند. transmission به‌تنهایی یک پاسِ رندرِ کاملِ اضافه
   در هر فریم بود. شیشه حالا یک شیدرِ یک‌پاسه است (glassMaterial.ts)، سایهٔ
   کاراکتر یک صفحهٔ کوچک، و آسمان یک گنبدِ شیدری؛ پس تفاوتِ پله‌ها فقط در
   وضوح و تعدادِ ذرات است و ظاهرِ اصلیِ بازی روی ضعیف‌ترین گوشی هم همان است.

   وضوح هم ثابت نمی‌ماند: `PerformanceMonitor` در `GameCanvas` اگر نرخِ فریم
   افت کند، آن را تا کفِ همین بازه پایین می‌آورد. */
const TIERS: Record<QualityTier, Omit<QualitySettings, "tier" | "shardCount">> = {
  high: {
    dpr: [1, 2],
    particleCount: 260,
    antialias: true,
  },
  medium: {
    dpr: [0.9, 1.5],
    particleCount: 150,
    antialias: true,
  },
  low: {
    dpr: [0.75, 1.2],
    particleCount: 60,
    antialias: false,
  },
};

/**
 * پله را از روی نشانه‌های دمِ‌دستیِ دستگاه حدس می‌زند.
 *
 * هیچ‌کدام از این‌ها معیارِ دقیقی نیستند و قرار هم نیست باشند: هزینهٔ یک
 * حدسِ محافظه‌کارانه چند بازتابِ کمتر است، ولی هزینهٔ اجرای شیشهٔ transmission
 * روی یک گوشیِ ضعیف، بازیِ غیرقابل‌بازی است. پس شک که کردیم، پایین می‌رویم.
 */
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

export function qualityFor(tier: QualityTier, config: AruzBridgeConfig): QualitySettings {
  return {
    tier,
    ...TIERS[tier],
    shardCount: tier === "high" ? config.desktopShardCount : tier === "medium" ? config.mobileShardCount + 4 : config.mobileShardCount,
  };
}

/** آیا WebGL اصلاً در دسترس است؟ اگر نه، بازی باید با احترام کنار برود. */
export function isWebGLAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl"),
    );
  } catch {
    return false;
  }
}
