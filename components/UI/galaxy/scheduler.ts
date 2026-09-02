/**
 * تنها حلقهٔ انیمیشنِ صفحهٔ کهکشان.
 *
 * ⚠️ چرا یکی و نه چندتا:
 *
 * قبلاً سه چیز مستقل تیک می‌زدند — حلقهٔ ۳۰fps ستاره‌ها، حلقهٔ `always`ِ
 * React Three Fiber، و انیمیشنِ اسکرولِ کابل. هیچ‌کدام از وجودِ دیگری خبر
 * نداشت، پس در هر فریمِ اسکرول هر سه بیدار می‌شدند و دو canvas تمام‌صفحه
 * مستقلاً repaint می‌شدند.
 *
 * حالا یک requestAnimationFrame وجود دارد و مشترک‌ها به آن گوش می‌دهند. یعنی
 * می‌شود گفت «موقعِ اسکرول فقط موقعیتِ سیاره‌ها مهم است، ستاره‌ها صبر کنند» —
 * چیزی که با سه حلقهٔ جدا اصلاً قابلِ بیان نبود.
 *
 * قواعدِ سرسختانه:
 *   • هیچ‌وقت state ری‌اکت را عوض نمی‌کند.
 *   • وقتی چیزی برای کشیدن نیست، rAF کاملاً کنسل می‌شود — نه اینکه بچرخد و
 *     کاری نکند. با `prefers-reduced-motion`، تبِ مخفی، یا صفحهٔ بیرون از
 *     دیدرس، حلقه اصلاً وجود ندارد.
 *   • در حالتِ بی‌کاری، فریمِ بعدی با `setTimeout` زمان‌بندی می‌شود و نه با
 *     یک rAF که در هر ۱۶ms بیدار شود و ردش کند. سی فریم در ثانیه یعنی سی
 *     بیدارباش، نه شصت.
 *   • `window.scrollY` فقط داخلِ شنوندهٔ scroll خوانده می‌شود، هرگز داخلِ
 *     حلقه — پس هیچ خواندنِ layout ای در فریم نیست.
 */

export type Tick = {
  /** `performance.now()` همان فریم. */
  now: number;
  /** آیا همین حالا در حالِ اسکرول هستیم؟ مشترک‌ها با این تصمیم می‌گیرند
   *  کارِ تزئینی را عقب بیندازند. */
  scrolling: boolean;
  /** موقعیتِ اسکرول، از آخرین رویداد. بدون خواندنِ DOM. */
  scrollY: number;
};

type Listener = (tick: Tick) => void;

/** بعد از این مدت سکوت، اسکرول «تمام‌شده» حساب می‌شود. */
const SCROLL_IDLE_MS = 140;

const listeners = new Set<Listener>();

let raf = 0;
let timer = 0;
let scrollY = 0;
let lastScrollAt = 0;
let lastIdleTick = 0;
let scrollDirty = false;
let idleFps = 30;
let active = true;
let started = false;
let detach: (() => void) | null = null;

function canRun(): boolean {
  return started && active && !(typeof document !== "undefined" && document.hidden);
}

function clearPending() {
  if (raf) cancelAnimationFrame(raf);
  if (timer) clearTimeout(timer);
  raf = 0;
  timer = 0;
}

function loop(now: number) {
  raf = 0;

  const scrolling = now - lastScrollAt < SCROLL_IDLE_MS;

  let notify = false;
  if (scrollDirty) {
    scrollDirty = false;
    notify = true;
  } else if (idleFps > 0 && now - lastIdleTick >= 1000 / idleFps) {
    lastIdleTick = now;
    notify = true;
  }

  if (notify) {
    const tick: Tick = { now, scrolling, scrollY };
    for (const l of listeners) l(tick);
  }

  scheduleNext(scrolling, now);
}

function scheduleNext(scrolling: boolean, now: number) {
  if (raf || timer || !canRun()) return;

  // اسکرولِ در جریان: فریمِ بعدی بلافاصله، چون موقعیتِ سیاره باید به جعبه‌اش
  // چسبیده بماند.
  if (scrolling || scrollDirty) {
    raf = requestAnimationFrame(loop);
    return;
  }

  if (idleFps <= 0) return; // خوابِ کامل

  const wait = Math.max(0, 1000 / idleFps - (now - lastIdleTick));
  timer = window.setTimeout(() => {
    timer = 0;
    if (canRun()) raf = requestAnimationFrame(loop);
  }, wait);
}

function wake() {
  if (raf || timer || !canRun()) return;
  raf = requestAnimationFrame(loop);
}

export const galaxyClock = {
  /** موقعیتِ اسکرولِ کش‌شده — مصرف‌کننده‌ها هرگز خودشان نمی‌خوانند. */
  get scrollY() {
    return scrollY;
  },

  /** نرخِ فریمِ کارهای تزئینی در حالتِ بی‌کاری. صفر یعنی حلقه بخوابد. */
  setIdleFps(fps: number) {
    idleFps = Math.max(0, fps);
    if (idleFps > 0) wake();
    else if (!scrollDirty) clearPending();
  },

  /** وقتی صفحهٔ کهکشان از دیدرس بیرون می‌رود، هیچ فریمی لازم نیست. */
  setActive(next: boolean) {
    if (active === next) return;
    active = next;
    if (active) {
      scrollDirty = true;
      wake();
    } else {
      clearPending();
    }
  },

  /** یک فریمِ تکی — بعد از resize، mount، یا بازیابیِ context. */
  requestFrame() {
    scrollDirty = true;
    wake();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    if (!started) start();
    scrollDirty = true;
    wake();
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) stop();
    };
  },
};

// ---------------------------------------------------------------------------
// راه‌اندازی و برچیدن
// ---------------------------------------------------------------------------

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  active = true;
  scrollY = window.scrollY;

  const onScroll = () => {
    // تنها خواندنِ layout در کلِ این فایل، و عمداً داخلِ شنونده است نه حلقه:
    // مرورگر شنوندهٔ scroll را بعد از چیدمان صدا می‌زند، پس اینجا رایگان است.
    scrollY = window.scrollY;
    lastScrollAt = performance.now();
    scrollDirty = true;
    wake();
  };

  const onResize = () => {
    scrollY = window.scrollY;
    scrollDirty = true;
    wake();
  };

  const onVisibility = () => {
    if (document.hidden) clearPending();
    else {
      scrollY = window.scrollY;
      scrollDirty = true;
      wake();
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  detach = () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

function stop() {
  clearPending();
  detach?.();
  detach = null;
  started = false;
  active = true;
  scrollDirty = false;
  lastIdleTick = 0;
  lastScrollAt = 0;
}
