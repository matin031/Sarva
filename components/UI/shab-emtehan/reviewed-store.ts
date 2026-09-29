"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * «کدام درس‌ها را امشب مرور کرده‌ام؟» — فقط در همین مرورگر.
 *
 * ⚠️ عمداً در سرور ذخیره نمی‌شود: این یک یادداشتِ شخصی و کوتاه‌عمر برای یک
 * شب است و ارزشِ یک جدول و یک درخواستِ شبکه را ندارد. اگر ذخیره‌سازیِ مرورگر
 * بسته باشد، تیک‌ها فقط تا بستنِ صفحه می‌مانند — که از خراب شدنِ صفحه بهتر
 * است.
 *
 * useSyncExternalStore به همان دلیلِ نوارِ اعلان: localStorage در رندرِ سرور
 * نیست، و عکسِ فوریِ سرور («هیچ درسی مرور نشده») با اولین رندرِ مرورگر یکی
 * می‌ماند.
 */

const KEY = "sarva:exam-night:reviewed";
const listeners = new Set<() => void>();
/** وقتی localStorage در دسترس نیست، همین‌جا نگه داشته می‌شود. */
let memory = "[]";

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return memory;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function parse(raw: string): Set<string> {
  try {
    const list: unknown = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export const lessonId = (grade: string, number: number) => `${grade}:${number}`;

export function useReviewed() {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  const reviewed = useMemo(() => parse(raw), [raw]);

  const toggle = useCallback((id: string, value?: boolean) => {
    const next = parse(read());
    const on = value ?? !next.has(id);
    if (on) next.add(id);
    else next.delete(id);
    const serialised = JSON.stringify([...next]);
    memory = serialised;
    try {
      window.localStorage.setItem(KEY, serialised);
    } catch {
      /* مرورگرِ ناشناس — در حافظه می‌ماند */
    }
    for (const listener of listeners) listener();
  }, []);

  return { reviewed, toggle };
}
