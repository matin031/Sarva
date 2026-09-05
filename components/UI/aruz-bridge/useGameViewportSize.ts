"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   اندازهٔ کادرِ بازی — یک مالکِ واحد، بدونِ رقابتِ پرسمان‌های CSS.
   ═══════════════════════════════════════════════════════════════════════════

   قاعدهٔ اصلی، که دو بار پیش‌تر شکسته بود:

       اگر ارتفاع کم آمد، *پهنا و ارتفاع با هم* کوچک می‌شوند.
       هیچ‌وقت فقط ارتفاع.

   پیش‌تر ارتفاع مستقیم از `calc(100dvh - X)` می‌آمد و پهنا مستقل بود، پس
   نسبتِ تصویر بی‌مهار خراب می‌شد. حالا ارتفاعِ در دسترس ابتدا به یک
   *سقفِ پهنا* ترجمه می‌شود و ارتفاع از روی نسبت بیرون می‌آید — پس نسبت
   ذاتاً حفظ می‌شود و امکان ندارد به نوار تبدیل شود.

   چرا اندازه‌گیری و نه CSS خالص؟ چون ارتفاعِ پوستهٔ بالای بازی (سربرگِ سایت
   و HUD) به تمِ کاربر، اندازهٔ قلم و شکستنِ خط بستگی دارد. یک عددِ ثابت در
   فرمول همان «عددِ جادویی» می‌شد که بار قبل اشتباه از آب درآمد. اینجا
   همان چیزی که واقعاً روی صفحه است اندازه گرفته می‌شود.

   این قلّاب *فقط* برای دسکتاپ است. بازیِ فعال روی موبایل ابعادش را از
   flex می‌گیرد (ریشهٔ ۱۰۰dvh، نوارها به اندازهٔ محتوا، بوم بقیه) و هیچ
   نسبتِ ثابتی تحمیل نمی‌شود — چون همان نسبتِ تحمیلی بود که سرریز می‌ساخت.
   دسته‌بندیِ نوعِ صفحه در `useViewportMode` است و فقط یک مالک دارد.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface GameViewportSize {
  width: number;
  height: number;
}

/** بیشترین پهنای کادر روی نمایشگرِ بزرگ. */
const MAX_WIDTH = 1180;
/**
 * کمترین اندازه‌ای که هنوز قابلِ بازی است (۷۲۰×۴۰۵).
 *
 * وقتی به این می‌رسیم دیگر کوچک نمی‌شویم و می‌گذاریم صفحه اسکرول شود:
 * خوانایی بازی از جاشدنِ همه‌چیز در یک پرده مهم‌تر است.
 */
const MIN_WIDTH = 720;

const DESKTOP_RATIO = 16 / 9;

export function useGameViewportSize({
  /** ظرفی که پهنای در دسترس را تعیین می‌کند. */
  containerRef,
  /** HUDـی که بالای کادر می‌نشیند و از ارتفاع کم می‌کند. */
  hudRef,
  /** آیا کادرِ بازی همین حالا روی صفحه است.
   *  لازم است چون HUD تا شروعِ بازی وجود ندارد؛ بدونِ این، ناظرِ اندازه
   *  هرگز به آن وصل نمی‌شد و ارتفاعش صفر می‌ماند. */
  active,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
  hudRef: React.RefObject<HTMLElement | null>;
  active: boolean;
}): GameViewportSize {
  const [size, setSize] = useState<GameViewportSize>({
    width: MIN_WIDTH,
    height: MIN_WIDTH / DESKTOP_RATIO,
  });

  /* آخرین اندازه در ref هم نگه داشته می‌شود تا فقط وقتی *واقعاً* عوض شده
     setState صدا بزنیم. بدونِ این، هر بار که ResizeObserver شلیک می‌کند یک
     رندر راه می‌افتد و چون رندر خودش اندازه را عوض می‌کند، حلقه می‌شود. */
  const lastRef = useRef<GameViewportSize>(size);

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") return;

    const vh = window.innerHeight;

    /* ⚠️ `clientWidth` بالشتک (padding) را *در خود دارد*، ولی کادرِ بازی
       داخلِ جعبهٔ محتوای همین ظرف می‌نشیند. اینجا مستقیم `clientWidth`
       گرفته می‌شد، پس کادر به اندازهٔ کلِ بالشتکِ دو طرف پهن‌تر از جای
       واقعی‌اش می‌شد و با `mx-auto` از هر طرف نصفش بیرون می‌زد.

       اندازه‌گیریِ پذیرش این را نشان داد — ظرف `px-3 sm:px-4` دارد:

         نمایشگر ۷۶۸   کادر ۷۵۳px پهن، از ‎−۱۶‎ تا ۷۳۷ → سرریزِ افقیِ ۱۶px
         نمایشگر ۱۰۲۴  کادر ۱۰۰۹px پهن، از ‎−۱۶‎ تا ۹۹۳ → سرریزِ ۱px

       روی ۱۴۴۰ پیدا نبود، چون آنجا سقفِ ۱۱۵۲ زودتر می‌رسید و کادر هنوز از
       جعبهٔ محتوا کوچک‌تر بود — برای همین تا امروز از چشم افتاده بود. */
    const style = window.getComputedStyle(container);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const containerWidth = Math.max(0, container.clientWidth - padX);
    const hudHeight = hudRef.current?.offsetHeight ?? 0;

    /* بالای ظرف در فضای *سند*، نه در فضای دید: سربرگِ سایت و هر چیزِ دیگری
       که واقعاً آنجاست. با `scrollY` جمع می‌شود تا اگر صفحه لغزیده باشد هم
       همان عدد بیرون بیاید — وگرنه اسکرول‌کردن اندازهٔ بازی را عوض می‌کرد. */
    const chromeAbove = container.getBoundingClientRect().top + window.scrollY;
    /* آنچه *زیرِ* کادر می‌نشیند: حاشیهٔ پایینِ صفحه و یادداشتِ دادهٔ نمایشی.
       اگر حساب نشود، بازی خودش جا می‌شود ولی همان چند ده پیکسل باعثِ
       پیدا شدنِ نوارِ اسکرول می‌شود — یعنی دقیقاً همان اسکرولِ بی‌دلیلی که
       قرار بود از بین برود. */
    const breathingRoom = 46;

    const availableHeight = vh - chromeAbove - hudHeight - breathingRoom;

    /* ── قلبِ ماجرا ──
       ارتفاعِ در دسترس ابتدا به سقفِ پهنا ترجمه می‌شود، بعد پهنای نهایی از
       کمینهٔ سه محدودیت می‌آید، و ارتفاع از روی نسبت. */
    const heightLimitedWidth = availableHeight * DESKTOP_RATIO;
    const width = Math.min(
      containerWidth,
      MAX_WIDTH,
      Math.max(MIN_WIDTH, heightLimitedWidth),
    );
    const height = width / DESKTOP_RATIO;

    const next = { width: Math.round(width), height: Math.round(height) };
    const prev = lastRef.current;
    // آستانهٔ یک پیکسل: نوسانِ ریزِ اندازه‌گیری نباید رندر بسازد.
    if (Math.abs(prev.width - next.width) < 1 && Math.abs(prev.height - next.height) < 1) {
      return;
    }
    lastRef.current = next;
    setSize(next);
  }, [containerRef, hudRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // `active` در وابستگی‌ها هست تا با ظاهرشدنِ HUD دوباره وصل شویم.
    void active;

    /* ResizeObserver بلافاصله بعد از observe یک بار شلیک می‌کند، پس
       اندازه‌گیریِ اولیه هم از دلِ callback می‌آید و نه از تنهٔ effect. */
    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    if (hudRef.current) observer.observe(hudRef.current);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [containerRef, hudRef, measure, active]);

  return size;
}
