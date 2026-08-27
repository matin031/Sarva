"use client";

import { useEffect, useState } from "react";

export interface RapidAruzLayout {
  /** صفحهٔ کوچک یا کوتاه: بازیِ فعال باید تمام‌صفحه و بدون اسکرول شود. */
  compact: boolean;
  portrait: boolean;
  /** ارتفاعِ کم — تقریباً همیشه یعنی گوشیِ خوابیده. */
  shortViewport: boolean;
}

/*
 * تصمیم بر اساسِ اندازهٔ واقعیِ پنجره است، نه رشتهٔ userAgent.
 *
 * دو پرسش، عمداً بی‌همپوشانی با قواعدِ CSS:
 *   • عرضِ کم  → چیدمانِ ایستادهٔ موبایل
 *   • ارتفاعِ کم → چیدمانِ فشرده (گوشیِ خوابیده، یا پنجرهٔ خیلی کوتاه)
 * در CSS، قاعدهٔ «ایستاده» به (min-height: 561px) مقید شده تا این دو هرگز
 * سرِ یک ویژگی با هم دعوا نکنند.
 */
const NARROW = "(max-width: 767px)";
const SHORT = "(max-height: 560px)";

function read(): RapidAruzLayout {
  if (typeof window === "undefined" || !window.matchMedia) {
    return { compact: false, portrait: true, shortViewport: false };
  }
  const narrow = window.matchMedia(NARROW).matches;
  const short = window.matchMedia(SHORT).matches;
  return {
    compact: narrow || short,
    portrait: window.innerHeight >= window.innerWidth,
    shortViewport: short,
  };
}

export function useRapidAruzLayout(): RapidAruzLayout {
  // رندرِ سرور و اولین رندرِ کلاینت باید یکی باشند؛ اندازهٔ واقعی بعد از
  // سوارشدن خوانده می‌شود.
  const [layout, setLayout] = useState<RapidAruzLayout>({
    compact: false,
    portrait: true,
    shortViewport: false,
  });

  useEffect(() => {
    const update = () => {
      setLayout((previous) => {
        const next = read();
        return previous.compact === next.compact &&
          previous.portrait === next.portrait &&
          previous.shortViewport === next.shortViewport
          ? previous
          : next;
      });
    };
    update();

    const queries = [window.matchMedia(NARROW), window.matchMedia(SHORT)];
    queries.forEach((q) => q.addEventListener("change", update));
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      queries.forEach((q) => q.removeEventListener("change", update));
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return layout;
}
