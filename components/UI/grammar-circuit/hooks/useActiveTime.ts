"use client";

import { useCallback, useEffect, useRef } from "react";

/** زمانِ *فعالِ* بازی.
 *
 *  مدتی که تب پنهان است یا پنجره فوکوس ندارد شمرده نمی‌شود؛ صفحهٔ معرفی و
 *  صفحهٔ پاداش هم شمرده نمی‌شوند چون آنجا شمارنده اصلاً روشن نیست. همه‌چیز در
 *  ref می‌ماند تا گذشتِ زمان هیچ رندرِ اضافه‌ای نسازد. */
export function useActiveTime() {
  const accumulatedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  /** آیا بازی *می‌خواهد* ساعت روشن باشد (یعنی در حالِ بازی است). */
  const intentRef = useRef(false);
  /** آیا صفحه واقعاً جلوی چشمِ کاربر است. */
  const presentRef = useRef(true);

  const sync = useCallback(() => {
    const shouldRun = intentRef.current && presentRef.current;
    if (shouldRun && startedAtRef.current === null) {
      startedAtRef.current = performance.now();
    } else if (!shouldRun && startedAtRef.current !== null) {
      accumulatedRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
  }, []);

  const setRunning = useCallback(
    (running: boolean) => {
      intentRef.current = running;
      sync();
    },
    [sync],
  );

  /** شروعِ شمارشِ یک سؤالِ تازه. */
  const reset = useCallback(
    (running: boolean) => {
      accumulatedRef.current = 0;
      startedAtRef.current = null;
      intentRef.current = running;
      sync();
    },
    [sync],
  );

  const read = useCallback(() => {
    const live =
      startedAtRef.current === null ? 0 : performance.now() - startedAtRef.current;
    return Math.round(accumulatedRef.current + live);
  }, []);

  useEffect(() => {
    const onPresence = () => {
      presentRef.current = !document.hidden && document.hasFocus();
      sync();
    };
    // مقدارِ اولیه را هم از خودِ مرورگر می‌گیریم؛ ممکن است بازی در تبی باز شده
    // باشد که همان اول هم جلوی چشم نیست.
    onPresence();
    document.addEventListener("visibilitychange", onPresence);
    window.addEventListener("blur", onPresence);
    window.addEventListener("focus", onPresence);
    return () => {
      document.removeEventListener("visibilitychange", onPresence);
      window.removeEventListener("blur", onPresence);
      window.removeEventListener("focus", onPresence);
    };
  }, [sync]);

  return { setRunning, reset, read };
}
