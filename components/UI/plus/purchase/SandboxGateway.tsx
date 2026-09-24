"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, CreditCard, FlaskConical, Lock } from "lucide-react";
import { ShinyButton } from "@/components/UI/kit/magic-shiny-button";

/**
 * نمای «صفحهٔ بانک» برای درگاهِ آزمایشی.
 *
 * شکلش عمداً شبیهِ یک درگاهِ بانکی است (مبلغ، پذیرنده، مهلت) تا مسیرِ خرید
 * همان حسی را بدهد که روزِ وصلِ درگاهِ واقعی خواهد داشت؛ و نوارِ «آزمایشی»
 * عمداً پررنگ است تا هیچ‌کس آن را با پرداختِ واقعی اشتباه نگیرد.
 *
 * ⚠️ همهٔ دکمه‌ها `submit`ِ یک فرم‌اند و نتیجه را سرور ثبت می‌کند. تایمر هم
 * وقتی به صفر برسد همان فرم را با «انصراف» می‌فرستد — مثلِ درگاهِ واقعی که
 * بعد از مهلت، کاربر را با «پرداخت انجام نشد» برمی‌گرداند.
 */
export default function SandboxGateway({
  providerRef,
  amount,
  orderNumber,
  planTitle,
  deadline,
  state,
}: {
  providerRef: string;
  amount: string;
  orderNumber: string;
  planTitle: string;
  deadline: string;
  state: "open" | "done" | "expired";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<HTMLButtonElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (state !== "open") return;
    const end = new Date(deadline).getTime();
    const tick = () => {
      const ms = Math.max(0, end - Date.now());
      setLeft(ms);
      if (ms === 0) {
        window.clearInterval(id);
        // همان مسیرِ «انصراف»، بدونِ دخالتِ کاربر.
        timeoutRef.current?.click();
      }
    };
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [deadline, state]);

  const mmss =
    left === null
      ? "--:--"
      : `${String(Math.floor(left / 60_000)).padStart(2, "0")}:${String(
          Math.floor((left % 60_000) / 1000),
        ).padStart(2, "0")}`;

  return (
    <main dir="rtl" className="container relative z-20 mx-auto mb-24 mt-10 max-w-md px-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)]">
        {/* نوارِ آزمایشی */}
        <div className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-2 text-xs font-bold text-destructive">
          <FlaskConical aria-hidden className="size-4" />
          درگاه آزمایشی — هیچ پولی جابه‌جا نمی‌شود
        </div>

        <div className="space-y-5 p-6">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CreditCard aria-hidden className="size-5" />
              </span>
              <div>
                <p className="text-sm font-bold">پرداخت اینترنتی</p>
                <p className="text-[11px] text-muted-foreground">پذیرنده: سروا</p>
              </div>
            </div>
            {state === "open" && (
              <span
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-xs tabular-nums ${
                  left !== null && left < 60_000
                    ? "border-destructive/40 text-destructive"
                    : "border-border text-muted-foreground"
                }`}
                aria-label="زمان باقی‌مانده"
              >
                <Clock aria-hidden className="size-3.5" />
                {mmss}
              </span>
            )}
          </header>

          <div className="rounded-xl bg-foreground/[0.03] p-4 text-center">
            <p className="text-xs text-muted-foreground">مبلغ</p>
            <p className="mt-1 text-2xl font-extrabold">{amount}</p>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">بابت</dt>
              <dd className="font-medium">{planTitle}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">شماره سفارش</dt>
              <dd className="font-mono">{orderNumber}</dd>
            </div>
          </dl>

          <form
            ref={formRef}
            method="post"
            action="/payment/sandbox/submit"
            /* ⚠️ غیرفعال‌کردنِ دکمه‌ها *بعد* از اینکه مرورگر دادهٔ فرم را برداشت.
               اگر همین‌جا و هم‌زمان disabled می‌شدند، مرورگر دکمهٔ disabled را از
               فرم کنار می‌گذاشت و `action=paid` هرگز به سرور نمی‌رسید — سرور هم
               آن را «انصراف» می‌فهمید. (آزمونِ مرورگر دقیقاً همین را گرفت.) */
            onSubmit={() => window.setTimeout(() => setSubmitting(true), 0)}
            className="space-y-3"
          >
            <input type="hidden" name="ref" value={providerRef} />

            {state === "open" ? (
              <>
                <ShinyButton
                  type="submit"
                  name="action"
                  value="paid"
                  disabled={submitting}
                  className="w-full border-primary/50 py-3 disabled:opacity-70"
                >
                  {submitting ? "در حال انجام…" : `پرداخت ${amount}`}
                </ShinyButton>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    name="action"
                    value="failed"
                    disabled={submitting}
                    className="rounded-xl border border-destructive/40 px-3 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                  >
                    پرداخت ناموفق
                  </button>
                  <button
                    type="submit"
                    name="action"
                    value="cancelled"
                    disabled={submitting}
                    className="rounded-xl border border-border px-3 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
                  >
                    انصراف
                  </button>
                </div>

                <button
                  type="submit"
                  name="action"
                  value="lost"
                  disabled={submitting}
                  className="w-full rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-foreground/5 disabled:opacity-60"
                >
                  پرداخت موفق، بدون بازگشت به سایت (قطع اتصال)
                </button>

                {/* دکمهٔ پنهانِ پایانِ مهلت */}
                <button ref={timeoutRef} type="submit" name="action" value="cancelled" hidden />
              </>
            ) : (
              <>
                <p className="rounded-xl border border-border p-3 text-center text-sm text-muted-foreground">
                  {state === "done" ? "این پرداخت قبلاً انجام شده است." : "مهلت پرداخت تمام شد."}
                </p>
                <ShinyButton
                  type="submit"
                  name="action"
                  value="cancelled"
                  disabled={submitting}
                  className="w-full py-3"
                >
                  بازگشت به سروا
                </ShinyButton>
              </>
            )}
          </form>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock aria-hidden className="size-3" />
            در سرور اصلی فقط مدیر این صفحه را می‌بیند.
          </p>
        </div>
      </div>
    </main>
  );
}
