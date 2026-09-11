"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/cn";

/**
 * لیبل، ورودی و پیامِ خطا — سه‌تایی که هر فرمِ پنل از آن ساخته می‌شود.
 *
 * ⚠️ نکتهٔ راست‌به‌چپ: هیچ‌کدام `text-left/right` یا `pl/pr` ندارند. رمز عبور
 * تنها جایی است که محتوایش لاتین است، و آنجا هم به‌جای `dir="ltr"` روی کلِ
 * فرم — که نسخهٔ قبلی می‌کرد و لیبل‌ها را هم برمی‌گرداند — فقط خودِ input
 * را `dir="ltr"` می‌کنیم.
 */

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-[13px] font-medium leading-normal text-muted-foreground select-none",
        "peer-disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-xl border border-border bg-background/40 px-4 text-sm leading-normal",
        "placeholder:text-muted-foreground/50",
        "transition-[border-color,box-shadow] duration-150",
        "hover:border-muted-foreground/50",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-55",
        "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/25",
        className,
      )}
      {...props}
    />
  );
}

/** ردیفِ کاملِ یک ورودی: لیبل، خودِ ورودی، و خطا یا راهنما زیرِ آن. */
function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {/* ⚠️ خطا جای راهنما را می‌گیرد و زیرِ آن اضافه نمی‌شود؛ دو خطِ متن زیرِ
          یک ورودی، چشم را وادار می‌کند تصمیم بگیرد کدام‌یک مهم‌تر است. */}
      {error ? (
        <p role="alert" className="text-xs leading-relaxed text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-muted-foreground/80">{hint}</p>
      ) : null}
    </div>
  );
}

export { Label, Input, Field };
