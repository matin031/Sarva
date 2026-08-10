"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * پوستهٔ مشترک هر پنجرهٔ مودالِ سایت.
 *
 * ⚠️ چرا portal، و نه یک `fixed inset-0` ساده که تا امروز همه‌جا بود:
 *
 * ۱) **`fixed` همیشه نسبت به پنجره نیست.** اگر هر جدِ عنصر `transform` داشته
 *    باشد، همان جد به containing block تبدیل می‌شود و `inset-0` یعنی «کلِ آن
 *    کارت»، نه «کلِ صفحه». دیالوگ گزارش دقیقاً همین‌جا گیر افتاده بود: کارتِ
 *    هر سروده داخل `TiltCard` است و `TiltCard` یک
 *    `perspective(900px) rotateX(...)` روی خودش می‌گذارد — حتی وقتی زاویه صفر
 *    است. نتیجه: پنجره وسطِ کارت باز می‌شد و `overflow-hidden` همان کارت
 *    می‌بریدش.
 *
 * ۲) **z-index در ستونِ اشتباه.** هدر سایت روی `z-200` می‌نشیند و کشوی موبایل
 *    روی `z-300`. دیالوگ‌ها روی ۵۰ و ۱۲۰ بودند، یعنی زیر هدر. با portal به
 *    `body`، پنجره از هر stacking context محلی بیرون می‌آید و `z-[400]` واقعاً
 *    یعنی بالاتر از همه.
 *
 * بقیه‌اش همان چیزی است که یک مودال باید داشته باشد و کپی‌شدنش در هر دیالوگ
 * فقط یعنی یکی‌شان روزی از قلم می‌افتد: Escape، حبس فوکوس، برگرداندن فوکوس به
 * جایی که از آن آمده، و قفل اسکرولِ پشت.
 */

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export default function Modal({
  onClose,
  children,
  labelledBy,
  describedBy,
  role = "dialog",
  className = "",
}: {
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  /** `alertdialog` برای تأییدِ کارِ خطرناک، `dialog` برای بقیه. */
  role?: "dialog" | "alertdialog";
  /** کلاس‌های خودِ پنل — اندازه و شکلش به هر دیالوگ مربوط است، نه به این پوسته. */
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // فوکوس و قفل اسکرول فقط به mount و unmount مربوط‌اند، پس وابستگیِ خالی
  // دارند: اگر با هر رندر دوباره اجرا می‌شدند، فوکوس کاربر وسط تایپ به ابتدای
  // دیالوگ برمی‌گشت.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null;

    // اولین چیزِ قابل فوکوس داخل پنل. اگر دیالوگ فرم دارد، همان اولین ورودی
    // است؛ اگر تأیید است، فراخوان خودش دکمهٔ امن را جلو می‌گذارد.
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    (focusables?.[0] ?? panelRef.current)?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      // فوکوس برمی‌گردد به دکمه‌ای که پنجره را باز کرده بود. بدون این، کاربرِ
      // صفحه‌کلید بعد از بستن، از ابتدای صفحه شروع می‌کند.
      returnTo?.focus?.();
    };
  }, []);

  // شنوندهٔ صفحه‌کلید جداست چون به `onClose` وابسته است و فراخوان‌ها معمولاً یک
  // تابعِ درجا می‌دهند. وصل و قطع کردن یک listener در هر رندر عملاً رایگان
  // است؛ ریختنش داخل افکتِ بالا اما یعنی یا فوکوس در هر رندر می‌پرد، یا
  // Escape یک نسخهٔ کهنه از onClose را صدا می‌زند.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // فهرست هر بار از نو خوانده می‌شود: محتوای دیالوگ ممکن است عوض شده باشد
      // (مثلاً دکمهٔ «ارسال» غیرفعال شده) و فهرستِ کهنه فوکوس را به جای مرده
      // می‌فرستد.
      const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // در سرور DOM ای نیست؛ این دیالوگ‌ها همیشه با یک کلیک باز می‌شوند، پس هرگز
  // در رندر سرور به اینجا نمی‌رسیم — ولی گاردش هزینه‌ای ندارد.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      dir="rtl"
      className="fixed inset-0 z-[400] flex items-center justify-center overflow-y-auto bg-black/55 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        // MouseDown و نه Click: با click، کشیدنِ متن از داخل پنل به بیرون هم
        // «کلیک روی پس‌زمینه» حساب می‌شد و پنجره وسطِ انتخاب متن بسته می‌شد.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`relative my-auto w-full rounded-2xl border border-border bg-card shadow-2xl outline-none ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
