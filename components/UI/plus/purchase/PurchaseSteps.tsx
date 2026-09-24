import { Check } from "lucide-react";

/**
 * مراحلِ خرید: انتخاب پلن ← ورود ← پرداخت ← فعال‌سازی.
 *
 * ⚠️ `current` شمارهٔ مرحلهٔ *در جریان* است. مرحله‌های پیش از آن تیک
 * می‌خورند؛ `4` یعنی همه تمام شده‌اند. عمداً بدونِ «۰۱ / ۰۴»: شمارهٔ مرحله
 * چیزی به کاربر نمی‌گوید که برچسبش نگوید.
 */
const STEPS = ["انتخاب پلن", "ورود", "پرداخت", "فعال‌سازی"] as const;

export default function PurchaseSteps({ current }: { current: 0 | 1 | 2 | 3 | 4 }) {
  return (
    /* ⚠️ حاشیهٔ افقی: برچسبِ دو سرِ ردیف از دایره‌اش پهن‌تر است و در عرضِ
       ۳۹۰ پیکسل بدونِ این از لبهٔ صفحه بیرون می‌زد. */
    <ol dir="rtl" className="mx-auto flex max-w-md items-center px-5" aria-label="مراحل خرید">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={label}
            className="flex flex-1 items-center last:flex-none"
            aria-current={active ? "step" : undefined}
          >
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex size-7 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                  done
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/10"
                      : "border-border text-muted-foreground"
                }`}
              >
                {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : (index + 1).toLocaleString("fa-IR")}
              </span>
              <span
                className={`whitespace-nowrap text-[11px] ${
                  active ? "font-bold text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`mx-1.5 mb-5 h-px flex-1 ${done ? "bg-primary" : "bg-border"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
