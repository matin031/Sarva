"use client";

import { useCallback, useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   یک مالکِ واحد برای «الان روی چه‌جور صفحه‌ای هستیم».
   ═══════════════════════════════════════════════════════════════════════════

   سه دستهٔ ناهم‌پوشان، و همه‌شان *اینجا* تعیین می‌شوند — نه در چند پرسمانِ
   CSS که ترتیبِ تولیدشان برنده را عوض کند. باگ‌های چند پاسِ قبل دقیقاً از
   همان رقابت می‌آمدند.

   تشخیص از روی اندازهٔ واقعیِ پنجره است، نه از روی User-Agent: تبلتِ عمودی
   با پهنای ۸۲۰ و ارتفاعِ ۱۱۸۰ چیدمانِ دسکتاپ می‌گیرد، چون واقعاً جا دارد. */

export type ViewportMode = "desktop" | "portrait" | "landscape";

/** زیرِ این پهنا، ولی به‌شرطِ بلندبودن: گوشیِ عمودی. */
const PHONE_MAX_WIDTH = 640;
/** زیرِ این ارتفاع: صفحهٔ کوتاه، یعنی گوشیِ افقی. */
const SHORT_MAX_HEIGHT = 560;

export function classifyViewport(width: number, height: number): ViewportMode {
  // ترتیب مهم است و شرط‌ها را ناهم‌پوشان می‌کند: اول کوتاه، بعد باریک.
  if (height <= SHORT_MAX_HEIGHT) return "landscape";
  if (width <= PHONE_MAX_WIDTH) return "portrait";
  return "desktop";
}

/** آیا این حالت باید صفحهٔ تمام‌قدِ موبایلی بگیرد. */
export function isMobileMode(mode: ViewportMode): boolean {
  return mode === "portrait" || mode === "landscape";
}

export function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>("desktop");

  const sync = useCallback(() => {
    setMode(classifyViewport(window.innerWidth, window.innerHeight));
  }, []);

  useEffect(() => {
    /* اندازه‌گیریِ اولیه از دلِ یک callback می‌آید (نه تنهٔ effect) تا
       رندرِ آبشاری راه نیفتد. */
    const raf = requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    // چرخشِ گوشی گاهی پیش از به‌روزشدنِ اندازه‌ها شلیک می‌کند؛ یک فریم صبر می‌کنیم.
    const onOrientation = () => requestAnimationFrame(sync);
    window.addEventListener("orientationchange", onOrientation);
    window.visualViewport?.addEventListener("resize", sync);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", onOrientation);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [sync]);

  return mode;
}
