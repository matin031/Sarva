"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  availableOptionalAssets,
  optionalAssetPaths,
  type OptionalAssetKey,
} from "@/lib/aruz-bridge/assets";

export type AssetAvailability = Record<OptionalAssetKey, boolean>;

const NONE: AssetAvailability = {
  playerModel: false,
  fracturedGlass: false,
  crackTexture: false,
  hdri: false,
};

/**
 * پیش از استفاده، وجودِ هر دارایی *اختیاری* را با یک درخواستِ HEAD می‌سنجد.
 *
 * چرا این‌طوری و نه با try/catch دورِ خودِ بارگذار؟ چون `useGLTF` و
 * `useLoader` از Suspense استفاده می‌کنند: یک فایلِ ۴۰۴ به‌صورتِ استثنا در
 * میانهٔ رندر بالا می‌آید و کلِ صحنه را می‌اندازد. سنجیدنِ قبلی یعنی هرگز
 * بارگذاری‌ای شروع نمی‌شود که قرار است شکست بخورد.
 *
 * تا وقتی پاسخ نیامده همه‌چیز «نبود» فرض می‌شود، پس بازی همیشه با نسخهٔ
 * رویه‌ای بالا می‌آید و اگر دارایی‌ای بود، جایگزین می‌شود.
 */
export function useOptionalAssets(): AssetAvailability {
  const [available, setAvailable] = useState<AssetAvailability>(NONE);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      /* فقط دارایی‌هایی سنجیده می‌شوند که فهرست می‌گوید وجود دارند.
         پیش‌تر هر چهار مسیر با HEAD سنجیده می‌شد و هر چهار ۴۰۴ برمی‌گشت —
         چهار درخواستِ بی‌فایده در هر بارگذاریِ صفحه. */
      const keys = availableOptionalAssets as readonly OptionalAssetKey[];
      if (keys.length === 0) return;
      const results = await Promise.all(
        keys.map(async (key) => {
          try {
            const res = await fetch(optionalAssetPaths[key], {
              method: "HEAD",
              signal: controller.signal,
            });
            // Next برای مسیرِ ناموجود صفحهٔ ۴۰۴ـِ HTML برمی‌گرداند، نه خطای شبکه؛
            // پس بررسیِ نوعِ محتوا لازم است، وگرنه یک صفحهٔ HTML را «مدل» می‌شماریم.
            const type = res.headers.get("content-type") ?? "";
            return [key, res.ok && !type.includes("text/html")] as const;
          } catch {
            return [key, false] as const;
          }
        }),
      );
      if (!cancelled) {
        setAvailable(Object.fromEntries(results) as AssetAvailability);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return available;
}

/**
 * احترام به `prefers-reduced-motion` — لرزشِ دوربین و شدتِ حرکت را کم می‌کند.
 *
 * با `useSyncExternalStore` خوانده می‌شود و نه با effect+setState: تنظیمِ
 * سیستم یک منبعِ بیرونی است، و این قلّابْ همان چیزی است که React برای
 * خواندنِ منبعِ بیرونی دارد. سودِ عملی‌اش این است که مقدارِ درست از همان
 * اولین رندرِ مرورگر در دست است، پس صحنه یک فریم با حرکتِ کامل بالا نمی‌آید
 * و بعد خودش را اصلاح کند.
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    // روی سرور چیزی برای پرسیدن نیست؛ «حرکتِ عادی» فرضِ محافظه‌کارانه است.
    () => false,
  );
}
