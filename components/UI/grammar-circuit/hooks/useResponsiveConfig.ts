"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { GrammarCircuitConfig } from "@/lib/grammar-circuit";

/** اندازهٔ سوکت با عرضِ صفحه تغییر می‌کند.
 *
 *  دلیلش زیبایی نیست، خوانایی است: روی یک گوشیِ ۴۴۰ پیکسلی، چهار سوکتِ ۹۶
 *  پیکسلی به‌علاوهٔ باتری و لامپ از عرضِ صفحه بیرون می‌زند و کاربر اولین چیزی
 *  که می‌بیند یک مدارِ نصفه است. با سوکتِ کوچک‌ترِ متناسب، کلِ مدار — باتری،
 *  سوکت‌ها و لامپ — یکجا دیده می‌شود.
 *
 *  ناحیهٔ لمسی همچنان `slotWidth + ۲×padding` است، یعنی حتی در کوچک‌ترین حالت
 *  حدودِ ۹۲ پیکسل عرض و ۶۰ پیکسل ارتفاع — به‌راحتی انگشتی‌پسند. */
function readBucket(): "short" | "compact" | "medium" | "roomy" {
  if (typeof window === "undefined") return "roomy";
  const w = window.innerWidth;
  const h = window.innerHeight;
  /* ارتفاع هم به‌اندازهٔ عرض مهم است: گوشیِ خوابیده عریض ولی خیلی کوتاه است،
     و اگر فقط عرض را ببینیم سوکتِ بزرگ انتخاب می‌شود و تخته بریده می‌شود. */
  if (h <= 430) return "short";
  if (w < 480) return "compact";
  if (w < 760) return "medium";
  return "roomy";
}

const SLOT: Record<string, { slotWidth: number; slotHeight: number; slotGap: number }> = {
  // ناحیهٔ لمسی همیشه ارتفاعِ سوکت + ۱۴ پیکسل است، پس حتی این کوتاه‌ترین
  // حالت هم ۴۸ پیکسل هدفِ انگشتی می‌دهد.
  short: { slotWidth: 74, slotHeight: 34, slotGap: 8 },
  compact: { slotWidth: 74, slotHeight: 42, slotGap: 10 },
  medium: { slotWidth: 92, slotHeight: 48, slotGap: 13 },
  roomy: { slotWidth: 108, slotHeight: 52, slotGap: 16 },
};

export function useResponsiveConfig(base: GrammarCircuitConfig): GrammarCircuitConfig {
  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
    };
  }, []);

  // با useSyncExternalStore خوانده می‌شود تا نه رندرِ سرور با کلاینت فرق کند و
  // نه لازم باشد در افکت state بگذاریم.
  const bucket = useSyncExternalStore(subscribe, readBucket, () => "roomy" as const);

  return useMemo(() => ({ ...base, ...SLOT[bucket] }), [base, bucket]);
}
