"use client";

import { useEffect } from "react";
import type { Side } from "@/lib/aruz-bridge/types";

/**
 * صفحه‌کلید: A/← برای چپ، D/→ برای راست.
 *
 * چهار نکته که بدونشان بازی روی دسکتاپ اذیت می‌کند:
 *
 *  • `event.repeat` رد می‌شود. نگه‌داشتنِ کلید در مرورگر یک سیلِ keydown
 *    می‌سازد و بدونِ این شرط، بازیکن با یک بار فشردنِ طولانی چند مرحله را
 *    رد می‌کرد. (ماشینِ حالت هم جلویش را می‌گرفت، ولی بهتر است اصلاً نرسد.)
 *
 *  • جهت‌ها *برعکس نمی‌شوند*. صفحه RTL است، اما «چپ» در این بازی یک جای
 *    فیزیکی در صحنهٔ سه‌بعدی است، نه یک جهتِ متنی: کلیدِ ← همان شیشه‌ای را
 *    انتخاب می‌کند که بازیکن سمتِ چپِ تصویر می‌بیند.
 *
 *  • ⚠️ A و D از روی `event.code` شناخته می‌شوند، نه `event.key`.
 *
 *    `key` حرفی است که چیده‌مانِ فعلی تولید می‌کند. روی صفحه‌کلیدِ فارسی —
 *    یعنی چیده‌مانی که مخاطبِ این سایت بیشترِ وقت رویش است — همان دو کلید
 *    «ش» و «ی» می‌دهند، پس هیچ‌کدام از شاخه‌ها نمی‌گرفت و بازیکن فکر می‌کرد
 *    میان‌بُرها خراب‌اند. `code` جای *فیزیکیِ* کلید است و به چیده‌مان کاری
 *    ندارد. `key` هم برای چیده‌مان‌های لاتین نگه داشته شده.
 *
 *  • ⚠️ وقتی کاربر در حالِ تایپ است، بازی کلیدها را نمی‌قاپد. بدونِ این،
 *    نوشتنِ «داد» در کادرِ گزارشِ اشکال، دو بار پاسخ می‌فرستاد — و چون
 *    `preventDefault` هم صدا زده می‌شد، حرف اصلاً در کادر نمی‌نشست.
 */

/** آیا این هدف جایی است که کاربر در آن تایپ می‌کند؟ */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
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
      if (isTypingTarget(e.target)) return;
      /* گفت‌وگوی باز (خروج، محدودیتِ مهمان، گزارش) صاحبِ صفحه است. `:modal`
         فقط برای `showModal()` درست است، پس عنصرهای با نقشِ dialog هم
         بررسی می‌شوند — همان چیزی که این پروژه واقعاً رندر می‌کند. */
      if (document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]')) return;

      let side: Side | null = null;
      // جای فیزیکیِ کلید، مستقل از چیده‌مان
      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          side = "left";
          break;
        case "ArrowRight":
        case "KeyD":
          side = "right";
          break;
      }
      // چیده‌مان‌هایی که `code` نمی‌دهند (بعضی صفحه‌کلیدهای مجازی)
      if (side === null) {
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
      }
      // پیکان‌ها صفحه را می‌لغزانند؛ وسطِ بازی این یعنی صحنه از کادر بیرون می‌رود.
      e.preventDefault();
      onChoose(side);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onChoose]);
}
