"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * فیلدِ رمز با کلیدِ «نمایش».
 *
 * ⚠️ یک کامپوننت و نه سه کپی. همین بیست خط (با دو SVGِ دست‌نویسِ چشم) در
 * فرمِ ورود، فرمِ ثبت‌نام و صفحهٔ بازنشانی تکرار شده بود — و از قبل هم
 * کاملاً یکسان نبودند.
 *
 * ⚠️ `dir="ltr"` روی خودِ input و نه روی کادر: رمز از چپ تایپ می‌شود (تقریباً
 * همیشه لاتین) ولی برچسب و پیامِ خطا فارسی‌اند و باید راست‌به‌چپ بمانند.
 */
export default function PasswordField({
  className = "",
  ...props
}: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-muted-foreground/10 px-4 py-3 focus-within:border-primary">
      <input
        {...props}
        type={show ? "text" : "password"}
        dir="ltr"
        /* ⚠️ فاصله از کلیدِ چشم با `gap` روی کادر گرفته می‌شود و نه با
           padding روی input: خودِ input `dir="ltr"` دارد، پس `pe-*` روی آن
           سمتِ *راست* را پد می‌کند — یعنی دقیقاً سمتِ مخالفِ دکمه. */
        className={`h-full w-full text-left outline-none placeholder:text-muted-foreground/30 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        // ⚠️ برچسبِ دسترس‌پذیر لازم است: محتوای دکمه فقط یک آیکون است و
        // صفحه‌خوان بدونِ این، «دکمه» می‌خواند و بس.
        aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
        aria-pressed={show}
        className="shrink-0 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
      </button>
    </div>
  );
}
