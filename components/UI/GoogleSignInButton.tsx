"use client";

import { useState } from "react";

/**
 * دکمهٔ ورود با حساب گوگل.
 *
 * ⚠️ چرا یک لینکِ ساده و نه fetch: کلِ جریان OAuth یک رشته پیمایشِ مرورگر
 * است — سایت → گوگل → بازگشت. با fetch نه ریدایرکتِ گوگل کار می‌کند نه
 * کوکی‌های جریان درست می‌نشینند. مرورگر باید واقعاً برود.
 *
 * حالتِ «در حال رفتن» فقط برای این است که کاربر دوبار نزند: کلیکِ دوم یک
 * جریانِ تازه می‌سازد و کوکی‌های جریانِ اول را بازنویسی می‌کند، و آن‌وقت
 * بازگشتِ اول با state ناهماهنگ رد می‌شود.
 */
export default function GoogleSignInButton({ label }: { label: string }) {
  const [going, setGoing] = useState(false);

  return (
    <a
      href="/api/v1/auth/google"
      onClick={() => setGoing(true)}
      aria-disabled={going}
      className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border
        bg-card px-4 text-sm font-semibold text-foreground transition-all
        hover:border-primary/50 hover:bg-card/80 active:scale-[0.99]
        ${going ? "pointer-events-none opacity-60" : ""}`}
    >
      {/* نشانِ رسمیِ گوگل — چهار رنگش بخشی از الزاماتِ برندِ آن‌هاست. */}
      <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.46Z"
        />
        <path
          fill="#34A853"
          d="M12 23.5c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.71v2.98A11.5 11.5 0 0 0 12 23.5Z"
        />
        <path
          fill="#FBBC05"
          d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.71a11.5 11.5 0 0 0 0 10.32l3.84-2.98Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.08c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.63 15.11.5 12 .5A11.5 11.5 0 0 0 1.71 6.84l3.84 2.98C6.46 7.1 9 5.08 12 5.08Z"
        />
      </svg>
      {going ? "در حال انتقال به گوگل…" : label}
    </a>
  );
}
