"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * پوششِ تمام‌صفحه‌ای که واقعاً روی همه‌چیز می‌نشیند.
 *
 * ⚠️ دو باگی که این کامپوننت برای همیشه می‌بندد — هر دو در نسخهٔ
 * `fixed inset-0 z-50`ِ دستی وجود داشتند و در بازیِ واژه‌یاب دیده شدند:
 *
 * ۱) **`fixed` همیشه نسبت به پنجره نیست.** اگر هر جدِ عنصر `transform`،
 *    `filter` یا `backdrop-filter` داشته باشد، همان جد به containing block
 *    تبدیل می‌شود و `inset-0` یعنی «کلِ آن کارت»، نه «کلِ صفحه». صفحهٔ
 *    بازی‌ها پر از این‌هاست (کارت‌های متحرک، هاله‌ها، پوستهٔ بازی).
 *
 * ۲) **z-index در ستونِ اشتباه.** نردبانِ لایه‌های سایت این است:
 *      پاورقی ۲۰ · هدر ۲۰۰ · کشوی موبایل ۳۰۰ · پنجره‌ها ۴۰۰
 *    یک پوششِ `z-50` زیرِ هدر می‌ماند — و همان بود که «فهرست» را روی مودالِ
 *    باز نشان می‌داد و پاورقی را از زیرِ آن بیرون می‌آورد.
 *
 * portal کردن به `body` هر دو را حل می‌کند: عنصر از هر stacking context محلی
 * بیرون می‌آید و `z-[400]` واقعاً یعنی بالاتر از همه.
 *
 * برای دیالوگ‌های استانداردِ سایت `components/UI/Modal.tsx` را بردارید — آن
 * یکی حبس فوکوس و Escape هم دارد. این یکی برای پوشش‌هایی است که چیدمان و
 * انیمیشنِ خودشان را دارند (ورقهٔ پایینی، پنجرهٔ نتیجهٔ بازی) و فقط لایه و
 * قفلِ اسکرول کم دارند.
 */
export default function OverlayPortal({
  children,
  className = "",
  onPointerDown,
  lockScroll = true,
}: {
  children: ReactNode;
  /** چیدمانِ خودِ پوشش — مثلاً `items-end` برای ورقهٔ پایینی. */
  className?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  lockScroll?: boolean;
}) {
  useEffect(() => {
    if (!lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lockScroll]);

  // در رندر سرور DOM ای نیست. این پوشش‌ها همیشه با یک تعامل باز می‌شوند، پس
  // هرگز در سرور به اینجا نمی‌رسیم — ولی گاردش هزینه‌ای ندارد.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className={`fixed inset-0 z-[400] ${className}`} onPointerDown={onPointerDown}>
      {children}
    </div>,
    document.body,
  );
}
