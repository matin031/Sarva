"use client";

import { useEffect } from "react";

/**
 * وقتی کاربر با دکمهٔ back از صفحهٔ درگاه برمی‌گردد، مرورگر صفحه را از
 * bfcache برمی‌گرداند — با همان حالتِ React که لحظهٔ رفتن داشت.
 *
 * ⚠️ یعنی دکمهٔ «پرداخت» در حالتِ «در حال انتقال به درگاه…» یخ می‌زد و
 * کاربر هیچ راهی برای دوباره زدنش نداشت جز رفرش. `pageshow` با
 * `persisted` دقیقاً همین بازگشت را خبر می‌دهد.
 */
export function useBfcacheReset(reset: () => void): void {
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [reset]);
}
