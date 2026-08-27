"use client";

import { useEffect } from "react";
import type { PauseReason } from "@/lib/aruz-rapid/machine";

/**
 * دلایلِ مکث را از مرورگر جمع می‌کند.
 *
 * یک boolean کافی نبود: تب می‌تواند پنهان شود در حالی که پنجره هم فوکوس
 * ندارد. بازی فقط وقتی برمی‌گردد که هیچ دلیلی باقی نمانده باشد — و همین
 * را reducer نگه می‌دارد، نه این هوک.
 */
export function useRapidAruzPause({
  active,
  pauseOnVisibilityLoss,
  onPause,
  onResume,
}: {
  /** فقط وقتی بازی واقعاً در جریان است به این رویدادها گوش می‌دهیم. */
  active: boolean;
  pauseOnVisibilityLoss: boolean;
  onPause: (reason: PauseReason) => void;
  onResume: (reason: PauseReason) => void;
}) {
  useEffect(() => {
    if (!active || !pauseOnVisibilityLoss) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onPause("visibility");
      else onResume("visibility");
    };
    const onBlur = () => onPause("windowBlur");
    const onFocus = () => onResume("windowBlur");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);

    // اگر همین حالا پنهان است، از همین‌جا مکث کند.
    if (document.visibilityState === "hidden") onPause("visibility");

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [active, pauseOnVisibilityLoss, onPause, onResume]);
}

/**
 * چرخشِ گوشی.
 *
 * وسطِ چرخش، چند صد میلی‌ثانیه هست که کاربر عملاً نه چیزی می‌بیند و نه
 * می‌تواند چیزی بزند. آن مدت با دلیلِ layoutTransition مکث می‌شود تا از
 * زمانِ پاسخِ او کم نشود.
 */
export function useRapidAruzOrientationPause({
  active,
  onPause,
  onResume,
  settleMs = 350,
}: {
  active: boolean;
  onPause: (reason: PauseReason) => void;
  onResume: (reason: PauseReason) => void;
  settleMs?: number;
}) {
  useEffect(() => {
    if (!active) return;
    let timer = 0;
    let held = false;

    const settle = () => {
      if (!held) {
        held = true;
        onPause("layoutTransition");
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        held = false;
        onResume("layoutTransition");
      }, settleMs);
    };

    const portrait = window.matchMedia("(orientation: portrait)");
    portrait.addEventListener("change", settle);
    window.addEventListener("orientationchange", settle);

    return () => {
      portrait.removeEventListener("change", settle);
      window.removeEventListener("orientationchange", settle);
      window.clearTimeout(timer);
      // اگر وسطِ مکثِ چیدمان از بازی خارج شدیم، دلیل را باز می‌کنیم تا
      // بازی برای همیشه معلق نماند.
      if (held) onResume("layoutTransition");
    };
  }, [active, onPause, onResume, settleMs]);
}
