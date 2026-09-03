/**
 * انتخابِ سطحِ کیفیت برای انیمیشن‌های سنگین.
 *
 * ⚠️ چرا این فایل هست: پیش از این تنها معیارِ تصمیم `(pointer: coarse)` بود.
 * آن پرس‌وجو می‌گوید کاربر انگشت دارد یا موس — نه اینکه دستگاهش چقدر توان
 * دارد. یک لپ‌تاپِ ضعیفِ اداری با موس «دسکتاپ» حساب می‌شد و کاملِ بار را
 * می‌گرفت؛ یک تبلتِ قوی بی‌دلیل تنزل می‌خورد.
 *
 * اینجا چند سیگنالِ واقعی با هم وزن می‌شوند. همه اختیاری‌اند: هیچ‌کدام در
 * تمام مرورگرها نیست، پس نبودشان نباید تصمیم را خراب کند — «نمی‌دانم» یعنی
 * امتیازِ خنثی، نه بدترین حالت.
 *
 * منطق عمداً خالص و بدون `window` است تا مستقل تست شود؛ جمع‌آوریِ سیگنال‌ها
 * کارِ use-quality.ts است.
 */

export type Tier = "high" | "balanced" | "low";

export type QualitySignals = {
  /** کاربر صریحاً حرکتِ کمتر خواسته — این یکی حرفِ آخر است. */
  reducedMotion?: boolean;
  /** navigator.hardwareConcurrency */
  cores?: number;
  /** navigator.deviceMemory — گیگابایت، فقط در کرومیوم */
  memoryGb?: number;
  /** devicePixelRatio */
  dpr?: number;
  /** عرض × ارتفاعِ viewport به پیکسلِ CSS */
  viewportPixels?: number;
  /** کاربر «کمتر داده مصرف کن» را روشن کرده */
  saveData?: boolean;
  /** یکی از سیگنال‌ها، نه معیارِ اصلی */
  coarsePointer?: boolean;
};

/** تنظیماتِ هر سطح؛ همان چیزی که کامپوننت‌ها می‌خوانند. */
export type TierSettings = {
  fps: number;
  /** سقفِ devicePixelRatio برای بوم */
  dprCap: number;
  /** تعداد نقطهٔ غبار روی کره */
  dust: number;
  /** نورافکنِ دنبال‌کنندهٔ اشاره‌گر */
  spotlight: boolean;
  /** انیمیشن‌های تزئینیِ پس‌زمینه (شفق، مدارها، توری، متنِ گرادیانی) */
  ambient: boolean;
  /** backdrop-filter — روی دستگاهِ ضعیف و سافاری گران است */
  blur: boolean;
};

export const TIERS: Record<Tier, TierSettings> = {
  high: { fps: 30, dprCap: 1.5, dust: 170, spotlight: true, ambient: true, blur: true },
  balanced: { fps: 22, dprCap: 1, dust: 80, spotlight: false, ambient: true, blur: false },
  low: { fps: 14, dprCap: 1, dust: 40, spotlight: false, ambient: false, blur: false },
};

/**
 * سیگنال‌ها → سطح.
 *
 * روش: هر سیگنالِ ضعیف یک امتیازِ منفی می‌دهد. نبودِ سیگنال هیچ امتیازی
 * نمی‌دهد، پس مرورگری که چیزی گزارش نمی‌کند بی‌دلیل تنزل نمی‌خورد.
 */
export function pickTier(s: QualitySignals): Tier {
  // این یکی رأی‌گیری نیست؛ خواستهٔ صریحِ کاربر است.
  if (s.reducedMotion) return "low";
  // «داده کم مصرف کن» معمولاً یعنی دستگاه یا شبکهٔ ضعیف.
  if (s.saveData) return "low";

  let penalty = 0;

  if (s.cores !== undefined) {
    if (s.cores <= 2) penalty += 2;
    else if (s.cores <= 4) penalty += 1;
  }

  if (s.memoryGb !== undefined) {
    if (s.memoryGb <= 2) penalty += 2;
    else if (s.memoryGb <= 4) penalty += 1;
  }

  // DPR بالا یعنی هر فریم پیکسلِ بیشتری دارد — روی موبایلِ متوسط گران است.
  if (s.dpr !== undefined && s.dpr >= 2.5) penalty += 1;

  // صفحهٔ بزرگ یعنی سطحِ رنگ‌آمیزیِ بزرگ.
  if (s.viewportPixels !== undefined && s.viewportPixels > 2_300_000) penalty += 1;

  // لمسی بودن فقط یک نشانهٔ ضعیف است، نه حکم.
  if (s.coarsePointer) penalty += 1;

  if (penalty >= 3) return "low";
  if (penalty >= 1) return "balanced";
  return "high";
}

/** یک پله پایین — برای وقتی اندازه‌گیریِ فریم‌ها می‌گوید تخمین خوش‌بین بوده. */
export function downgrade(tier: Tier): Tier {
  return tier === "high" ? "balanced" : "low";
}

/**
 * آیا اندازه‌گیریِ فریم‌ها می‌گوید باید تنزل بدهیم؟
 *
 * ⚠️ عمداً فقط یک بار و فقط رو به پایین. اگر اجازه بدهیم مدام بالا و پایین
 * برود، خودِ تغییرِ کیفیت (ساختِ دوبارهٔ بوم، عوض شدنِ لایه‌ها) منبعِ jank
 * می‌شود — همان چیزی که می‌خواستیم درمان کنیم.
 */
export function shouldDowngrade(frameMs: number[], targetFps: number): boolean {
  if (frameMs.length < 10) return false;
  const sorted = [...frameMs].sort((a, b) => a - b);
  // میانه، نه میانگین: چند فریمِ پرتِ اولِ کار نباید تصمیم را عوض کند.
  const median = sorted[Math.floor(sorted.length / 2)];
  const budget = 1000 / targetFps;
  // ۱٫۶ برابرِ بودجه یعنی واقعاً عقب مانده، نه نوسانِ عادی.
  return median > budget * 1.6;
}
