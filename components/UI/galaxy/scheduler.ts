/** The only /game animation clock. Each visible display frame advances R3F
 * directly; reduced motion, hidden tabs and offscreen hosts sleep completely.
 *
 * Chrome profiling found that the old setTimeout -> rAF -> invalidate -> rAF
 * chain submitted ~20 FPS despite its 30 FPS target. No timers or second render
 * loop are needed. Scroll reads happen in passive events, never in the tick.
 */

export type Tick = {
  /** `performance.now()` همان فریم. */
  now: number;
  /** Active seconds since the previous frame; zero on resume. */
  delta: number;
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
let lastTickAt: number | undefined;
let scrollY = 0;
let lastScrollAt = -Infinity;
let scrollDirty = false;
let animated = true;
let active = true;
let started = false;
let detach: (() => void) | null = null;

function canRun(): boolean {
  return started && active && !(typeof document !== "undefined" && document.hidden);
}

function clearPending() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  lastTickAt = undefined;
}

function loop(now: number) {
  raf = 0;
  if (!canRun()) return;

  const scrolling = now - lastScrollAt < SCROLL_IDLE_MS;

  scrollDirty = false;
  const delta = lastTickAt === undefined ? 0 : (now - lastTickAt) / 1000;
  lastTickAt = now;
  const tick: Tick = { now, delta, scrolling, scrollY };
  for (const l of listeners) l(tick);
  wake();
  if (!raf) lastTickAt = undefined;
}

function wake() {
  if (raf || !canRun() || (!animated && !scrollDirty)) return;
  raf = requestAnimationFrame(loop);
}

export const galaxyClock = {
  /** موقعیتِ اسکرولِ کش‌شده — مصرف‌کننده‌ها هرگز خودشان نمی‌خوانند. */
  get scrollY() {
    return scrollY;
  },

  /** Follow display cadence while visible; reduced motion requests single frames. */
  setAnimated(next: boolean) {
    animated = next;
    if (animated) wake();
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
  lastScrollAt = -Infinity;
}
