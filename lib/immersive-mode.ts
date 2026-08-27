"use client";

import { useSyncExternalStore } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   حالتِ «غرق‌شده» — یک کلیدِ سراسری برای جمع‌کردنِ پوستهٔ سایت.
   ═══════════════════════════════════════════════════════════════════════════

   بعضی صفحه‌ها در بخشی از عمرشان به کلِ ناوبریِ سایت نیاز ندارند: وقتی
   بازیکن روی پل است، سربرگِ کامل و پاورقی فقط ارتفاع می‌خورند و چیزی به
   تجربه اضافه نمی‌کنند.

   چرا یک فروشگاهِ بیرونی و نه Context؟ چون مصرف‌کننده (`SiteChrome`) *بالای*
   تولیدکننده (بازی) در درخت است. با Context باید Provider را تا ریشه بالا
   می‌بردیم و همهٔ صفحه‌ها را درگیر می‌کرد. این الگو همان چیزی است که
   `components/UI/galaxy/planetSlots.ts` هم برای همین مسئله به‌کار می‌برد.

   نکتهٔ مهمِ ایمنی: این حالت *فقط* وقتی روشن می‌شود که صفحه‌ای صریحاً
   روشنش کند، و هنگامِ برچیده‌شدنش خاموش می‌شود. هیچ صفحهٔ دیگری — و هیچ
   بازیِ دیگری — تحتِ تأثیر قرار نمی‌گیرد مگر خودش بخواهد. */

let active = false;
const listeners = new Set<() => void>();

export const immersiveMode = {
  set(next: boolean) {
    if (active === next) return;
    active = next;
    for (const listener of listeners) listener();
  },
  get: () => active,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** روی سرور همیشه خاموش است، تا نشانه‌گذاریِ اولیه همان پوستهٔ عادی باشد. */
export function useImmersiveMode(): boolean {
  return useSyncExternalStore(immersiveMode.subscribe, immersiveMode.get, () => false);
}
