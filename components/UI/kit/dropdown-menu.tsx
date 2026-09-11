"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

/**
 * منوی کشویی — منوی کاربر در پایین سایدبار.
 *
 * ⚠️ راست‌به‌چپ: `dir="rtl"` روی Content لازم است، وگرنه Radix جهت را از
 * محیط حدس می‌زند و منو در تراز چپ باز می‌شود و از کنارِ صفحه بیرون می‌زند.
 * جهتِ کلیدهای جهت‌دار (چپ/راست برای زیرمنو) هم به همین وابسته است.
 */

/** ⚠️ `dir` روی **Root** می‌نشیند و نه روی Content — Radix جهت را از آنجا
 *  به کلِ زیردرختِ منو می‌دهد (تراز شدنِ منو، و معنیِ کلیدهای چپ/راست برای
 *  زیرمنوها). گذاشتنش روی Content هم تایپ‌چک را می‌شکند و هم بی‌اثر است. */
function DropdownMenu(props: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root dir="rtl" {...props} />;
}

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-120 min-w-52 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground",
          "shadow-[0_24px_50px_-30px_rgba(0,0,0,0.9)]",
          // گذار دستی، چون پلاگین tailwindcss-animate در پروژه نیست.
          "origin-[var(--radix-dropdown-menu-content-transform-origin)] transition-[opacity,transform] duration-150",
          "data-[state=closed]:scale-95 data-[state=closed]:opacity-0",
          "data-[state=open]:scale-100 data-[state=open]:opacity-100",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] outline-none",
        "transition-colors focus:bg-foreground/8 focus:text-foreground",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
        inset && "ps-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-3 py-1.5 text-[11px] leading-normal text-muted-foreground", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn("-mx-1.5 my-1.5 h-px bg-border", className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};
