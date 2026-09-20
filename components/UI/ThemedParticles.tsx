"use client";

import { useSyncExternalStore } from "react";

import {
  Floating3DParticles,
  type Floating3DParticlesProps,
} from "@/components/UI/floating-3d-particles";

/**
 * همان میدانِ ذراتِ `floating-3d-particles`، با رنگی که خودش از تم می‌گیرد.
 *
 * ── چرا این لایهٔ نازک وجود دارد ──────────────────────────────────────────
 * بومِ زیرین فقط hex می‌فهمد (`hexToRgba` در همان فایل)، پس نمی‌شود رنگش را
 * با یک توکنِ CSS داد و رهایش کرد. هر کال‌سایتی که ذرات می‌خواهد، مجبور
 * می‌شد خودش تم را بخواند — و همان‌جا سه‌بار همین چند خط تکرار می‌شد.
 *
 * ⚠️ **با `next-themes` کار نمی‌کند و نباید بکند.** تمِ سروا یک کلاسِ `dark`
 * روی `<html>` است که `DarkModeButton` مستقیم می‌نشاند؛ هیچ `ThemeProvider`ای
 * در درخت نیست. `useTheme()` بیرون از provider همیشه `resolvedTheme:
 * undefined` می‌دهد، یعنی ذرات در تمِ تیره هم *سیاه* می‌شدند — روی زمینهٔ
 * شب یعنی نامرئی. پس منبعِ حقیقت همان کلاسِ روی `<html>` است.
 *
 * ⚠️ `useSyncExternalStore` و نه یک effect: تم می‌تواند پیش از سوارشدنِ این
 * کامپوننت عوض شده باشد و خواندن در effect یعنی یک فریمِ اول با رنگِ غلط.
 * همان الگوی `lib/theme/palette.ts` و `lib/poets-shelf/theme.ts`.
 *
 * ⚠️ سفید/مشکی و نه رنگِ پالت: این ذرات گردوغبارِ معلقِ پس‌زمینه‌اند و نه
 * یک عنصرِ برند. اگر روزی باید رنگِ پالت بگیرند، راهش نوشتنِ یک هگزِ تازه
 * نیست — `readScenePalette` در `lib/poets-shelf/theme.ts` نشان می‌دهد چطور
 * یک عبارتِ CSS با بومِ ۱×۱ به hex حل می‌شود.
 */
const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);

  if (!observer && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => {
      for (const l of listeners) l();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}

function isDark() {
  return document.documentElement.classList.contains("dark");
}

/* روی سرور تمی وجود ندارد؛ بوم هم آنجا رندر نمی‌شود، پس این مقدار فقط باید
   با اولین رندرِ کلاینت یکی باشد و هیچ‌وقت دیده نمی‌شود. */
function serverSnapshot() {
  return false;
}

export default function ThemedParticles(
  props: Omit<Floating3DParticlesProps, "color">,
) {
  const dark = useSyncExternalStore(subscribe, isDark, serverSnapshot);
  return <Floating3DParticles {...props} color={dark ? "#ffffff" : "#101014"} />;
}
