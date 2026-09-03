"use client";

import { useCallback, useRef, useState } from "react";

/**
 * «همان ردیفی که از گزارش آمدی» را پیدا و برجسته می‌کند.
 *
 * ⚠️ چرا با ref و نه با یک `useEffect` که دنبالِ عنصر بگردد:
 *
 * ردیفِ هدف در لحظهٔ mount ممکن است هنوز روی صفحه نباشد — فهرست از سرور
 * می‌آید، یا پنل اول باید پایه و درس را عوض کند. به‌جای زمان‌بندیِ حدسی،
 * خودِ ردیف وقتی رندر شد `ref` را صدا می‌زند و همان‌جا اسکرول می‌شویم.
 *
 * ⚠️ و چرا هیچ افکتی برای «ریست» نیست: یک بار داشت و همان یک بار برجستگی را
 * می‌کشت. ترتیبِ React در mount این است: اول ref‌ها وصل می‌شوند، بعد افکت‌ها
 * اجرا می‌شوند. پس افکتی که `lit` را صفر می‌کرد، دقیقاً بعد از روشن‌شدنش
 * اجرا می‌شد و ردیف هیچ‌وقت برجسته دیده نمی‌شد. حالا «قبلاً این را نشان
 * داده‌ام؟» فقط با یک ref مقایسه می‌شود و هیچ افکتی در کار نیست.
 *
 * برجستگی بعد از چند ثانیه خودش می‌رود: یک حلقهٔ همیشگی دورِ یک ردیف، دفعهٔ
 * بعد که مدیر همان صفحه را باز می‌کند فقط گیج‌کننده است.
 */
export function useFocusedRow(focusId: string | null | undefined) {
  const [litFor, setLitFor] = useState<string | null>(null);
  const shownFor = useRef<string | null>(null);

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node || !focusId || shownFor.current === focusId) return;
      shownFor.current = focusId;
      setLitFor(focusId);
      // یک فریم صبر: در همان لحظهٔ mount هنوز چیدمان نهایی نشده و مرورگر به
      // جای غلط اسکرول می‌کند.
      requestAnimationFrame(() =>
        node.scrollIntoView({ block: "center", behavior: "smooth" }),
      );
      const timer = setTimeout(() => setLitFor(null), 4000);
      return () => clearTimeout(timer);
    },
    [focusId],
  );

  /** روی همان ردیف بگذارید: `ref={isFocused(id) ? ref : undefined}`. */
  const isFocused = useCallback(
    (id: string | number | null | undefined) =>
      focusId != null && focusId !== "" && id != null && String(id) === focusId,
    [focusId],
  );

  /** کلاسِ برجستگی — خالی وقتی نوبتش گذشته. */
  const litClass = litFor && litFor === focusId ? "admin-focus-ring" : "";

  return { ref, isFocused, litClass };
}
