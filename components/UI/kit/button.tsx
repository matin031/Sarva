import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * دکمهٔ پایه — سبکِ shadcn، با یک وارییانتِ مخصوصِ سروا.
 *
 * ⚠️ `push` عمداً یک وارییانتِ جداست و نه پیش‌فرض: سایهٔ ۴ پیکسلیِ زیرِ دکمه
 * که با فشردن جمع می‌شود، لحنِ «بازی/تمرین» دارد. روی دکمه‌های عملیاتیِ
 * مسیرِ یادگیری (ادامهٔ تمرین، شروع مرور) درست است و روی «ذخیرهٔ تغییرات»
 * در تنظیماتِ حساب نیست.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-110 active:translate-y-px",
        push: "bg-primary text-primary-foreground shadow-[0_4px_0_var(--primary-deep)] hover:brightness-110 active:translate-y-[3px] active:shadow-[0_1px_0_var(--primary-deep)]",
        gold: "bg-gold text-[oklch(0.2_0.03_260)] shadow-[0_4px_0_var(--gold-deep)] hover:brightness-105 active:translate-y-[3px] active:shadow-[0_1px_0_var(--gold-deep)]",
        outline: "border border-border bg-transparent text-foreground hover:border-muted-foreground hover:bg-foreground/5",
        soft: "bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
        ghost: "bg-transparent text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110 active:translate-y-px",
        link: "text-primary underline-offset-[6px] hover:underline",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        default: "h-11 px-5",
        lg: "h-12 px-7 text-[15px]",
        icon: "size-10 rounded-full p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-panel-button={variant ?? "default"} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };
