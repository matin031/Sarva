"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * `<select>` — همان زبانِ بصریِ `Input` در `field.tsx`.
 *
 * ⚠️ عمداً یک `<select>` بومی است و نه یک منوی ساخته‌شده با Radix.
 *
 * دو تای اول از فرم‌های این صفحه، «استان» و «شهر» اند: ۳۱ و تا ۵۰ گزینه. یک
 * لیستِ ساخته‌شده با div باید جست‌وجو، پیمایش با کیبورد، اسکرول و رفتارِ
 * موبایل را از نو بسازد — و روی گوشی، `<select>` بومی چرخِ انتخابگرِ خودِ
 * سیستم را می‌آورد که از هر چیزی که ما بسازیم بهتر است.
 *
 * ⚠️ فلشِ سفارشی `pointer-events-none` دارد. بدونِ آن، کلیک روی خودِ فلش به
 * `<select>` نمی‌رسد و باز نمی‌شود — یعنی دقیقاً همان‌جایی که کاربر شهودی
 * کلیک می‌کند، هیچ اتفاقی نمی‌افتد.
 *
 * ⚠️ و `appearance-none` به‌تنهایی کافی نیست: در فایرفاکس باید
 * `-moz-appearance` هم صفر شود، که کلاسِ Tailwind هر دو را می‌نویسد.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full appearance-none rounded-xl border border-border bg-background/40 ps-4 pe-10 text-sm leading-normal",
          "transition-[border-color,box-shadow] duration-150",
          "hover:border-muted-foreground/50",
          "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-55",
          "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground"
      />
    </div>
  );
}

export { Select };
