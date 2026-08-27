"use client";

import { useSyncExternalStore } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   حالتِ پوستهٔ سایت — یک کلیدِ سراسری که صفحه‌ها می‌توانند بچرخانند.
   ═══════════════════════════════════════════════════════════════════════════

   سه حالت، چون سه نیازِ متفاوت وجود دارد:

     off        پوستهٔ کاملِ سروا. پیش‌فرضِ همهٔ صفحه‌ها.
     compact    سربرگِ جمع‌شده و بدونِ پاورقی — بازیِ فعال روی دسکتاپ.
     fullscreen اصلاً سربرگ و پاورقیِ سایت رندر نمی‌شود؛ خودِ صفحه یک
                نوارِ بالای مخصوصِ بازی می‌سازد. برای بازیِ فعال روی موبایل،
                جایی که هر پیکسلِ عمودی ارزش دارد.

   چرا یک فروشگاهِ بیرونی و نه Context؟ چون مصرف‌کننده (`SiteChrome`) *بالای*
   تولیدکننده (بازی) در درخت است. همان الگویی که
   `components/UI/galaxy/planetSlots.ts` هم دارد.

   ایمنی: تا وقتی صفحه‌ای صریحاً چیزی جز `off` نگذارد، هیچ‌چیز عوض نمی‌شود، و
   هر صفحه هنگامِ برچیده‌شدن آن را برمی‌گرداند. */

export type ChromeMode = "off" | "compact" | "fullscreen";

let mode: ChromeMode = "off";
const listeners = new Set<() => void>();

export const immersiveMode = {
  set(next: ChromeMode) {
    if (mode === next) return;
    mode = next;
    for (const listener of listeners) listener();
  },
  get: (): ChromeMode => mode,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** روی سرور همیشه `off` است، تا نشانه‌گذاریِ اولیه پوستهٔ عادی باشد. */
export function useChromeMode(): ChromeMode {
  return useSyncExternalStore(
    immersiveMode.subscribe,
    immersiveMode.get,
    () => "off" as const,
  );
}
