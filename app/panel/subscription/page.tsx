import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { getPlusStatus } from "@/lib/plus/entitlement";
import { expiringSoonDays, isPlusEnabled } from "@/lib/plus/config";
import { listOrders } from "@/lib/plus/orders";
import { hasSellableOffers } from "@/lib/plus/plans";
import { fa, jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "سروا پلاس من",
  robots: { index: false, follow: false },
};

/**
 * «سروا پلاس من».
 *
 * ⚠️ این صفحه برای **همهٔ** کاربرانِ واردشده باز است — نه فقط مشترکان. کاربر
 * رایگان اینجا معرفیِ کوتاه و دکمهٔ فعال‌سازی می‌بیند، و کاربری که اشتراکش
 * تمام شده تاریخِ پایان و دکمهٔ تمدید. قفل کردنِ همین صفحه یعنی کسی که
 * پرداخت کرده ولی فعال نشده، هیچ‌جا برای دیدنِ وضعیتش ندارد.
 *
 * ⚠️ و حالتِ «نامعلوم» صریحاً از «اشتراک نداری» جدا است. اگر خواندنِ وضعیت
 * شکست بخورد، به کاربر گفته می‌شود «مشکلی در بررسی پیش آمد» و دکمهٔ تلاش
 * دوباره داده می‌شود — نه دکمهٔ خرید. آن پیام به کسی که دیروز پول داده
 * می‌گوید پولش را دور ریخته.
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/subscription");

  const [status, sellable, soonDays, recent] = await Promise.all([
    getPlusStatus(),
    hasSellableOffers(),
    expiringSoonDays(),
    listOrders(user.id, { limit: 3 }),
  ]);

  const plusOn = await isPlusEnabled();

  return (
    <div dir="rtl" className="space-y-6">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold">سروا پلاس من</h1>
        <p className="mt-1 text-sm text-muted-foreground">وضعیت اشتراک و دسترسی‌ها</p>
      </header>

      {/* ── وضعیت ─────────────────────────────────────────────────── */}
      {status.state === "unavailable" ? (
        <section
          role="alert"
          className="glass space-y-3 rounded-2xl border border-destructive/40 p-6"
        >
          <h2 className="font-bold">در بررسی وضعیت اشتراک مشکلی پیش آمد</h2>
          <p className="text-sm text-muted-foreground">
            این یک اشکال از سمتِ ماست، نه از حساب شما. اگر اشتراکی دارید سرِ
            جایش است. لحظه‌ای بعد دوباره این صفحه را باز کنید.
          </p>
          <Link
            href="/panel/subscription"
            className="inline-block rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            تلاش دوباره
          </Link>
        </section>
      ) : !plusOn ? (
        <section className="glass rounded-2xl p-6 text-center">
          <h2 className="font-bold">همهٔ امکانات سروا در حال حاضر رایگان است</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            اشتراک سروا پلاس فعلاً فعال نیست و هیچ بخشی از سایت قفل نشده است.
          </p>
        </section>
      ) : status.state === "active" ? (
        <section className="plus-surface space-y-4 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-extrabold plus-ink">
              <span aria-hidden="true">✦</span> سروا پلاس فعال است
            </h2>
            {/* ⚠️ هدیهٔ مدیر «پرداخت موفق» جا زده نمی‌شود. */}
            {status.isTrial && (
              <span className="rounded-full border border-border px-3 py-0.5 text-xs">
                دسترسی آزمایشی
              </span>
            )}
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            {status.startsAt && <Field label="شروع" value={jalaliLong(status.startsAt)} />}
            <Field
              label="پایان"
              value={status.expiresAt ? jalaliLong(status.expiresAt) : "بدون محدودیت زمانی"}
            />
            <Field
              label="باقی‌مانده"
              value={
                status.daysRemaining === null ? "دائمی" : `${fa(status.daysRemaining)} روز`
              }
            />
            <Field
              label="نوع دسترسی"
              value={status.isTrial ? "اعطاشده توسط سروا" : "خریداری‌شده"}
            />
          </dl>

          {status.expiringSoon && (
            /* هشدارِ آرام. اشتراک هنوز فعال است و ترساندنِ کاربر بی‌جاست. */
            <p className="rounded-xl border border-gold/40 bg-gold/10 p-3 text-xs plus-ink">
              کمتر از {fa(soonDays)} روز تا پایان اشتراک باقی مانده. اگر همین
              حالا تمدید کنی، دورهٔ تازه به انتهای همین دوره اضافه می‌شود و
              روزهای باقی‌مانده‌ات از بین نمی‌رود.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Link
              href="/panel/analysis"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              برنامهٔ من
            </Link>
            {sellable && (
              <Link href="/plus" className="rounded-xl border border-border px-4 py-2 text-sm font-bold">
                تمدید
              </Link>
            )}
            <Link
              href="/panel/billing"
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              خریدهای من
            </Link>
          </div>
        </section>
      ) : status.state === "revoked" ? (
        <section className="glass space-y-3 rounded-2xl p-6">
          <h2 className="font-bold">دسترسی سروا پلاس متوقف شده است</h2>
          <p className="text-sm text-muted-foreground">
            اگر فکر می‌کنی اشتباهی رخ داده، از بخش پشتیبانی پیام بده.
          </p>
          <Link
            href="/panel/support"
            className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            پشتیبانی
          </Link>
        </section>
      ) : status.state === "expired" ? (
        <section className="glass space-y-3 rounded-2xl p-6">
          <h2 className="font-bold">دورهٔ سروا پلاس پایان یافته است</h2>
          {/* ⚠️ کاربر باید مطمئن باشد که سابقه‌اش پاک نشده. */}
          <p className="text-sm leading-relaxed text-muted-foreground">
            هیچ‌کدام از پاسخ‌ها، نشان‌شده‌ها و کارنامه‌هایت پاک نشده‌اند. با
            تمدید، همه‌شان دوباره در تحلیل‌ها به کار می‌آیند.
          </p>
          {sellable && (
            <Link
              href="/plus"
              className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              تمدید سروا پلاس
            </Link>
          )}
        </section>
      ) : (
        <section className="glass space-y-3 rounded-2xl p-6">
          <h2 className="font-bold">هنوز اشتراک فعالی نداری</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            سروا پلاس از پاسخ‌های خودت می‌فهمد کدام وزن و کدام نقش دستوری را
            باید مرور کنی، و به‌جای فهرستِ بی‌پایانِ تمرین همان چند مورد را
            جلویت می‌گذارد.
          </p>
          {sellable ? (
            <Link
              href="/plus"
              className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              آشنایی با سروا پلاس
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">
              فروش اشتراک هنوز شروع نشده است.
            </p>
          )}
        </section>
      )}

      {/* ── آخرین خریدها ──────────────────────────────────────────── */}
      {recent.orders.length > 0 && (
        <section className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">آخرین خریدها</h2>
            <Link href="/panel/billing" className="text-xs text-primary underline underline-offset-4">
              همه
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {recent.orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-2">
                <span className="select-all font-mono text-xs">{order.orderNumber}</span>
                <span className="text-muted-foreground">{jalaliLong(order.createdAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ⚠️ این بخش‌ها هرگز پشتِ اشتراک قفل نمی‌شوند. */}
      <nav className="flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
        <Link href="/panel/setting" className="underline underline-offset-4">
          امنیت حساب
        </Link>
        <Link href="/panel/billing" className="underline underline-offset-4">
          خریدها
        </Link>
        <Link href="/panel/support" className="underline underline-offset-4">
          پشتیبانی
        </Link>
      </nav>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold">{value}</dd>
    </div>
  );
}
