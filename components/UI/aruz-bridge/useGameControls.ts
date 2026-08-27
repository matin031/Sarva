"use client";

import { useEffect } from "react";
import type { Side } from "@/lib/aruz-bridge/types";

/**
 * صفحه‌کلید: A/← برای چپ، D/→ برای راست.
 *
 * دو نکته که بدونشان بازی روی دسکتاپ اذیت می‌کند:
 *
 *  • `event.repeat` رد می‌شود. نگه‌داشتنِ کلید در مرورگر یک سیلِ keydown
 *    می‌سازد و بدونِ این شرط، بازیکن با یک بار فشردنِ طولانی چند مرحله را
 *    رد می‌کرد. (ماشینِ حالت هم جلویش را می‌گرفت، ولی بهتر است اصلاً نرسد.)
 *
 *  • جهت‌ها *برعکس نمی‌شوند*. صفحه RTL است، اما «چپ» در این بازی یک جای
 *    فیزیکی در صحنهٔ سه‌بعدی است، نه یک جهتِ متنی: کلیدِ ← همان شیشه‌ای را
 *    انتخاب می‌کند که بازیکن سمتِ چپِ تصویر می‌بیند.
 */
export function useGameControls({
  enabled,
  onChoose,
}: {
  enabled: boolean;
  onChoose: (side: Side) => void;
}) {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;

      let side: Side | null = null;
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          side = "left";
          break;
        case "ArrowRight":
        case "d":
        case "D":
          side = "right";
          break;
        default:
          return;
      }
      // پیکان‌ها صفحه را می‌لغزانند؛ وسطِ بازی این یعنی صحنه از کادر بیرون می‌رود.
      e.preventDefault();
      onChoose(side);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onChoose]);
}
