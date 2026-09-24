"use client";

import Link from "next/link";
import { ShinyButton } from "@/components/UI/kit/ShinyButton";

/**
 * صفحهٔ خطای سرور — جای صفحهٔ پیش‌فرضِ انگلیسیِ Next.
 *
 * ⚠️ تا امروز وجود نداشت و هر خطای سرور (مثلاً دیتابیسی که جواب نمی‌دهد)
 * برای دانش‌آموز یک صفحهٔ سفیدِ انگلیسی با «This page couldn't load» بود.
 *
 * ⚠️ `digest` همان شناسه‌ای است که سرور کنارِ خطا در `app_error_log` ثبت
 * می‌کند. نشان دادنش به‌عنوان «کد پیگیری» یعنی کاربری که به پشتیبانی پیام
 * می‌دهد، چیزی دارد که می‌شود در لاگ جست‌وجویش کرد — بدونِ آن، «صفحه باز
 * نشد» هیچ ردی ندارد. خودِ پیامِ خطا نشان داده نمی‌شود: ممکن است جزئیاتِ
 * داخلی داشته باشد.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div dir="rtl" className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-extrabold text-foreground">مشکلی پیش آمد</h1>
      <p className="mt-3 text-muted-foreground">صفحه باز نشد. چند لحظه بعد دوباره امتحان کن.</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ShinyButton onClick={() => reset()}>تلاش دوباره</ShinyButton>
        <Link
          href="/"
          className="inline-flex min-h-12 items-center rounded-xl border border-border px-6 font-bold text-foreground transition-colors hover:border-primary"
        >
          صفحهٔ اصلی
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-8 text-xs text-muted-foreground">
          کد پیگیری:{" "}
          <bdi dir="ltr" className="select-all font-mono">
            {error.digest}
          </bdi>
        </p>
      ) : null}
    </div>
  );
}
