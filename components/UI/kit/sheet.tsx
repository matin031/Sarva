"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * کشوی کناری — در پنل فقط برای سایدبارِ موبایل.
 *
 * ⚠️ راست‌به‌چپ: کشو از سمتِ **راست** باز می‌شود، چون سایدبارِ دسکتاپ هم
 * راست است. با ویژگی‌های منطقی نوشته نمی‌شود — Radix خودش `left/right` را
 * به `translate` تبدیل نمی‌کند — پس مقدارِ ثابتِ راست اینجا درست است و نه
 * یک خطای RTL.
 */

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;

function SheetContent({
  className,
  children,
  title,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { title: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        /* ⚠️ گذارها با transition نوشته شده‌اند و نه با کلاس‌های animate-in
           (پلاگین tailwindcss-animate در این پروژه نصب نیست و آن کلاس‌ها
           بی‌صدا نادیده گرفته می‌شدند). Radix تا پایانِ transition عنصر را
           در DOM نگه می‌دارد، پس بستنِ کشو هم انیمیشن دارد. */
        className={cn(
          "fixed inset-0 z-100 bg-background/70 backdrop-blur-sm",
          "transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        )}
      />
      <DialogPrimitive.Content
        dir="rtl"
        className={cn(
          "fixed inset-y-0 right-0 z-101 flex w-70 max-w-[86vw] flex-col",
          "border-s border-border bg-background shadow-2xl",
          "transition-transform duration-200 ease-out",
          "data-[state=closed]:translate-x-full data-[state=open]:translate-x-0",
          className,
        )}
        {...props}
      >
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Close
          aria-label="بستن"
          className="absolute left-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
        >
          <X className="size-4" />
        </DialogPrimitive.Close>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export { Sheet, SheetTrigger, SheetClose, SheetContent };
