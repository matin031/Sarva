"use client";

/**
 * قلاب‌های مشترکِ کارایی برای صفحهٔ عروض.
 *
 * سه چیز اینجاست که هر انیمیشنِ سنگینی به آن نیاز دارد:
 *
 *   useReducedMotion  خواستهٔ کاربر، بدون setState داخل effect
 *   useScrolling      آیا همین حالا در حالِ اسکرول‌ایم
 *   useRenderGate     جمعِ همهٔ دلایلِ «الان نباید رسم کنی»
 *
 * ⚠️ چرا مشترک: پیش از این هر کامپوننت شنوندهٔ خودش را می‌ساخت. روی یک صفحه
 * با چند انیمیشن یعنی چند شنوندهٔ scroll و چند matchMedia که همه یک چیز را
 * می‌پرسند. اینجا هرکدام *یک* اشتراک دارند و همه از همان می‌خوانند.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { pickTier, downgrade, shouldDowngrade, TIERS, type Tier, type TierSettings } from "./quality";

// ───────────────────────── حرکتِ کمتر ─────────────────────────

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * ⚠️ چرا useSyncExternalStore و نه useState+useEffect: با آن الگو، اولین
 * رندر همیشه «حرکت آزاد است» بود و تازه در effect به «کم» می‌رسید — یعنی
 * کاربرِ reduced-motion دستِ‌کم یک فریم انیمیشنِ کامل می‌دید. اینجا مقدار
 * در همان رندرِ اول درست است. (getServerSnapshot روی سرور false می‌دهد،
 * چون آنجا media query وجود ندارد.)
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false,
  );
}

// ───────────────────────── دیده‌شدنِ سند ─────────────────────────

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

/** تبِ پس‌زمینه: هیچ انیمیشنی نباید آنجا زنده بماند. */
export function useDocumentVisible(): boolean {
  return useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  );
}

// ───────────────────────── نوعِ اشاره‌گر ─────────────────────────

const FINE_QUERY = "(pointer: fine)";

/**
 * موس یا انگشت. برخلافِ گذشته، این *تنها* برای تصمیم‌های ظاهری به کار
 * می‌رود (نورافکن که با موس معنا دارد) — نه برای حدسِ توانِ دستگاه؛ آن کار
 * حالا با سیگنال‌های واقعی در quality.ts انجام می‌شود.
 */
export function useFinePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(FINE_QUERY);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(FINE_QUERY).matches,
    () => false,
  );
}

// ───────────────────────── فعالیتِ اسکرول ─────────────────────────

/**
 * یک تشخیص‌دهندهٔ اسکرولِ مشترک برای کلِ صفحه.
 *
 * قواعدی که رعایت می‌شوند چون هرکدام یک بار به ما ضربه زده‌اند:
 *   • شنونده passive است — وگرنه مرورگر باید منتظرِ handler بماند
 *   • داخل handler هیچ خواندنِ DOM یا setState پشت‌سرهم نیست
 *   • data-attribute دقیقاً یک بار در شروع و یک بار در پایان نوشته می‌شود
 */
const SCROLL_IDLE_MS = 150;

let scrolling = false;
let scrollTimer: ReturnType<typeof setTimeout> | null = null;
const scrollListeners = new Set<() => void>();
let scrollBound = false;

function emitScroll() {
  for (const fn of scrollListeners) fn();
}

function onScroll() {
  if (!scrolling) {
    scrolling = true;
    // یک نوشتن در شروع — CSS از همین برای خواباندنِ انیمیشن‌ها استفاده می‌کند.
    document.documentElement.dataset.scrolling = "true";
    emitScroll();
  }
  if (scrollTimer) clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    scrolling = false;
    delete document.documentElement.dataset.scrolling;
    emitScroll();
  }, SCROLL_IDLE_MS);
}

function subscribeScroll(onChange: () => void) {
  scrollListeners.add(onChange);
  if (!scrollBound) {
    scrollBound = true;
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  return () => {
    scrollListeners.delete(onChange);
    if (scrollListeners.size === 0) {
      scrollBound = false;
      window.removeEventListener("scroll", onScroll);
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = null;
      if (scrolling) {
        scrolling = false;
        delete document.documentElement.dataset.scrolling;
      }
    }
  };
}

export function useScrolling(): boolean {
  return useSyncExternalStore(subscribeScroll, () => scrolling, () => false);
}

// ───────────────────────── سطحِ کیفیت ─────────────────────────

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

function readSignals(reducedMotion: boolean) {
  const nav = navigator as NavigatorWithHints;
  return {
    reducedMotion,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
    dpr: window.devicePixelRatio,
    viewportPixels: window.innerWidth * window.innerHeight,
    saveData: nav.connection?.saveData,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
  };
}

/**
 * سطحِ کیفیت: اول از روی سیگنال‌های دستگاه، بعد یک بار تطبیق با واقعیت.
 *
 * تطبیق فقط رو به پایین و فقط یک بار انجام می‌شود؛ دلیلش در quality.ts
 * (shouldDowngrade) نوشته شده.
 */
export function useQuality(): { tier: Tier; settings: TierSettings } {
  const reduced = useReducedMotion();
  // ⚠️ تخمینِ اولیه در *مقداردهیِ* state خوانده می‌شود، نه در یک effect.
  // با effect، اولین رندر همیشه high بود و یک فریم با تنظیماتِ سنگین رد
  // می‌شد — دقیقاً روی دستگاهی که کمترین توانش را دارد.
  const [estimated, setEstimated] = useState<Tier | null>(null);
  const settledRef = useRef(false);
  const initial = useSyncExternalStore(
    () => () => {},
    () => (typeof window === "undefined" ? "high" : pickTier(readSignals(reduced))),
    () => "high" as Tier,
  );
  const tier: Tier = estimated ?? initial;

  // چند فریمِ اول را می‌سنجیم و اگر تخمین خوش‌بین بود یک پله پایین می‌آییم.
  useEffect(() => {
    if (reduced || settledRef.current) return;
    const samples: number[] = [];
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      samples.push(now - last);
      last = now;
      if (samples.length < 24) {
        raf = requestAnimationFrame(tick);
        return;
      }
      settledRef.current = true;
      if (shouldDowngrade(samples, TIERS[tier].fps)) setEstimated(downgrade(tier));
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, tier]);

  return { tier, settings: TIERS[tier] };
}

/**
 * سطحِ کیفیت را روی <html> می‌نویسد تا CSS هم بتواند تصمیم بگیرد.
 *
 * ⚠️ چرا از CSS: انیمیشن‌های تزئینی (شفق، مدارها، توری، درخششِ متن) و
 * backdrop-filter در استایل‌شیت‌اند، نه در جاوااسکریپت. بدون این پل، تنها
 * راهِ خاموش کردنشان روی دستگاهِ ضعیف این بود که هر کدام را به یک prop
 * ری‌اکتی وصل کنیم — که یعنی رندرِ دوباره برای چیزی که کارِ CSS است.
 */
export function useQualityAttribute(tier: Tier) {
  useEffect(() => {
    document.documentElement.dataset.quality = tier;
    return () => {
      delete document.documentElement.dataset.quality;
    };
  }, [tier]);
}

// ───────────────────────── دروازهٔ رسم ─────────────────────────

/**
 * «آیا الان اجازهٔ رسم دارم؟»
 *
 * چهار دلیلِ توقف را یک‌جا جمع می‌کند تا هر کامپوننت مجبور نباشد خودش هر
 * چهار تا را درست پیاده کند — که دقیقاً همان جایی بود که DemoBlob جا ماند و
 * حلقه‌اش خارج از viewport و در تبِ پنهان هم می‌چرخید.
 */
export function useRenderGate(inView: boolean): boolean {
  const visible = useDocumentVisible();
  const scrollingNow = useScrolling();
  const reduced = useReducedMotion();
  return inView && visible && !scrollingNow && !reduced;
}

/**
 * IntersectionObserver با حاشیه — «نزدیک شدن» را زودتر از «رسیدن» می‌گوید.
 *
 * rootMargin پیش‌فرض ۴۰۰ پیکسل است تا چیزی که کاربر به‌زودی می‌بیند فرصتِ
 * آماده شدن داشته باشد، بدون اینکه از همان اول ساخته شود.
 */
export function useInView<T extends Element>(
  rootMargin = "400px",
  /** یک بار که دیده شد، برای همیشه true بماند و مشاهده قطع شود. */
  once = false,
): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        // ⚠️ قفل داخلِ خودِ observer است، نه در یک effect جداگانه. اگر
        // بیرون باشد به setState داخل effect می‌رسیم که رندرِ آبشاری
        // می‌سازد (و لینت هم درست می‌گیردش).
        if (once) {
          if (!entry.isIntersecting) return;
          setInView(true);
          io.disconnect();
          return;
        }
        setInView(entry.isIntersecting);
      },
      { rootMargin, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, once]);

  return [ref, inView];
}
