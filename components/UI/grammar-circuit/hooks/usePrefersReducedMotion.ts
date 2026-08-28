"use client";

import { useCallback, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** با `useSyncExternalStore` خوانده می‌شود تا نه رندرِ سرور با کلاینت فرق کند
 *  و نه لازم باشد در افکت state بگذاریم. */
export function usePrefersReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(QUERY);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
