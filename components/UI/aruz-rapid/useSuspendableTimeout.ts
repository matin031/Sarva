"use client";

import { useEffect, useRef } from "react";

/**
 * یک setTimeout که با مکث می‌ایستد و بعد از سرِ باقی‌مانده ادامه می‌دهد.
 *
 * `key` هویتِ این انتظار است: تا وقتی عوض نشده، همان انتظار ادامه دارد و
 * onDone فقط یک بار صدا زده می‌شود — حتی اگر React در StrictMode افکت را
 * دو بار سوار کند. با key = null اصلاً چیزی زمان‌بندی نمی‌شود.
 *
 * توجه: این فقط برای انتظارهای «نمایشی» است (پیش‌نمایش، بازخوردِ کوتاه،
 * روپوشِ بازگشت). مهلتِ پاسخِ بازیکن اینجا نیست؛ آن مرجعِ خودش را دارد.
 */
export function useSuspendableTimeout({
  timeoutKey,
  durationMs,
  paused,
  onDone,
}: {
  timeoutKey: string | null;
  durationMs: number;
  paused: boolean;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  const stateRef = useRef<{ key: string | null; remaining: number; done: boolean }>({
    key: null,
    remaining: 0,
    done: false,
  });

  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (timeoutKey === null) return;

    if (stateRef.current.key !== timeoutKey) {
      stateRef.current = { key: timeoutKey, remaining: durationMs, done: false };
    }
    const entry = stateRef.current;
    if (entry.done || paused) return;

    const startedAt = performance.now();
    const id = window.setTimeout(
      () => {
        entry.done = true;
        onDoneRef.current();
      },
      Math.max(0, entry.remaining),
    );

    return () => {
      window.clearTimeout(id);
      if (!entry.done) {
        entry.remaining = Math.max(0, entry.remaining - (performance.now() - startedAt));
      }
    };
  }, [timeoutKey, durationMs, paused]);
}
