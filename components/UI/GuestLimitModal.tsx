"use client";

import Link from "next/link";
import {
  guestContinueLabel,
  guestLimitMessage,
  type GuestSection,
} from "@/lib/guest/policy";

/**
 * «برای ادامه وارد شوید».
 *
 * ⚠️ این مدال قبلاً فقط یک عدد می‌گرفت و همیشه دربارهٔ «سؤال» حرف می‌زد.
 * وقتی همان مدال بالای بازی جاسوس یا پلِ وزن می‌آمد، جملهٔ «۵ سؤال برای شما
 * قابل دسترسی است» بی‌معنی بود. حالا بخش را می‌گیرد و متن را از سیاستِ
 * مرکزی (lib/guest/policy.ts) می‌خواند، پس هر بخش جملهٔ درستِ خودش را دارد
 * و عوض کردنِ سیاست هم یک‌جا انجام می‌شود.
 *
 * `onContinue` اختیاری است: بخش‌هایی مثل واژه‌یاب که محتوای قفل‌شده را
 * انتخاب کرده‌اند جایی برای «ادامه» ندارند و فقط باید برگردند.
 */
interface GuestLimitModalProps {
  section: GuestSection;
  /** اگر داده شود، دکمهٔ «فعلاً ادامه بده» نمایش داده می‌شود. */
  onContinue?: () => void;
  /** متنِ جایگزین برای دکمهٔ دوم، وقتی ادامه معنا ندارد. */
  onDismiss?: () => void;
}

function GuestLimitModal({ section, onContinue, onDismiss }: GuestLimitModalProps) {
  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className=" fixed h-screen  w-screen inset-0
      backdrop-blur-sm z-30 flex items-center justify-center"
    >
      <div
        className=" sm:w-full max-w-md glass relative z-100 gap-y-6 rounded-xl
       flex flex-col items-center p-4 sm:p-6 text-center w-[90%]"
      >
        <div
          className=" size-12 rounded-full bg-primary/20 text-primary
        flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>

        <h3 className=" text-lg font-bold">وارد حساب کاربری خود نشده‌اید</h3>

        <p className=" text-muted-foreground text-sm sm:text-base">
          {guestLimitMessage(section)}
        </p>

        <div className=" w-full flex flex-col sm:flex-row items-center gap-3 mt-2">
          <Link
            href="/auth"
            className=" w-full font-bold bg-primary py-2 text-center rounded-xl
            brightness-90 hover:brightness-100 transition-all text-white"
          >
            ورود / ثبت‌نام
          </Link>
          {onContinue && (
            <button
              onClick={onContinue}
              className=" w-full font-medium bg-muted py-2 text-center rounded-xl
              brightness-90 hover:brightness-100 active:scale-95 transition-all"
            >
              {guestContinueLabel(section)}
            </button>
          )}
          {!onContinue && onDismiss && (
            <button
              onClick={onDismiss}
              className=" w-full font-medium bg-muted py-2 text-center rounded-xl
              brightness-90 hover:brightness-100 active:scale-95 transition-all"
            >
              بازگشت
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuestLimitModal;
