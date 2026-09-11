import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * کارتِ پنل.
 *
 * ⚠️ سطحِ کارت `bg-surface` است و نه `bg-card`. تفاوتشان یک لایهٔ نازکِ
 * رنگِ متن است که در `globals.css` تعریف شده: در تمِ تیره کارت را کمی گرم و
 * روشن‌تر از زمینهٔ شب می‌کند و در تمِ روشن کمی عمیق‌تر از کاغذ. بدونِ آن،
 * کارت‌ها روی زمینه گم می‌شدند و پنل سرد به نظر می‌رسید.
 *
 * ⚠️ و سایه ندارد. در تمِ تیره سایه دیده نمی‌شود و فقط لبه را گل‌آلود
 * می‌کند؛ جداییِ کارت از زمینه کارِ بوردرِ یک‌پیکسلی است.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-panel-card=""
      className={cn(
        "rounded-2xl border border-border/70 bg-surface",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 p-5 pb-0", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-base font-bold leading-normal", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs leading-relaxed text-muted-foreground", className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
