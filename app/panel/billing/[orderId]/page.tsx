import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RecheckButton from "@/components/UI/plus/RecheckButton";
import PrintButton from "@/components/UI/plus/PrintButton";
import { getPanelUser } from "@/lib/panel/queries";
import { getOrderDetail } from "@/lib/plus/orders";
import { formatRials } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";
import { PAYMENT_STATE_LABEL } from "@/lib/plus/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

/**
 * جزئیات یک سفارش + رسیدِ قابلِ چاپ.
 *
 * ⚠️ **مالکیت روی سرور اعمال می‌شود.** `getOrderDetail` شرطِ `user_id` را در
 * خودِ کوئری دارد، پس عوض کردنِ شناسه در آدرس به سفارشِ کسِ دیگری نمی‌رسد —
 * «پیدا نشد» می‌گیرد. این تنها چیزی است که جلوی خواندنِ اطلاعات مالیِ بقیه
 * را می‌گیرد؛ در این پروژه RLS وجود ندارد.
 *
 * ⚠️ و این «فاکتور رسمی مالیاتی» **نیست** و هیچ‌جا چنین ادعایی نمی‌شود. یک
 * رسیدِ قابلِ چاپ است؛ فاکتور رسمی الزاماتِ حقوقی دارد که هنوز پیاده نشده.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/billing");

  const { orderId } = await params;
  const order = await getOrderDetail(user.id, orderId);
  if (!order) notFound();

  const unsettled =
    order.status === "pending" &&
    ["redirected", "pending", "unknown"].includes(order.latestPaymentState ?? "");

  return (
    <div dir="rtl" className="space-y-5">
      <nav className="text-xs">
        <Link href="/panel/billing" className="text-primary underline underline-offset-4">
          ← خریدهای من
        </Link>
      </nav>

      {/* ── رسید ─────────────────────────────────────────────────── */}
      <section
        id="receipt"
        className="glass space-y-4 rounded-2xl p-6 print:border print:bg-white print:text-black"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <h1 className="text-lg font-extrabold">رسید خرید سروا</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              سروا — سامانهٔ تمرین ادبیات فارسی
            </p>
          </div>
          <span className="select-all font-mono text-sm">{order.orderNumber}</span>
        </header>

        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="محصول" value={`سروا پلاس — ${order.planTitle}`} />
          <Field label="مدت" value={`${fa(order.durationDays)} روز`} />
          <Field label="مبلغ" value={formatRials(order.amountRials)} />
          <Field label="واحد" value="تومان" />
          <Field label="تاریخ ثبت" value={jalaliLong(order.createdAt)} />
          <Field
            label="وضعیت"
            value={order.status === "paid" ? "پرداخت موفق" : unsettled ? "در حال بررسی" : "پرداخت‌نشده"}
          />
          {order.paidAt && <Field label="تاریخ پرداخت" value={jalaliLong(order.paidAt)} />}
          {order.trackingId && <Field label="شماره پیگیری" value={order.trackingId} copyable />}
          {order.accessFrom && (
            <Field
              label="بازهٔ دسترسی"
              value={`${jalaliLong(order.accessFrom)} تا ${
                order.accessTo ? jalaliLong(order.accessTo) : "بدون محدودیت"
              }`}
            />
          )}
        </dl>

        <p className="border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          این رسید برای پیگیری خرید شماست و فاکتور رسمی مالیاتی به‌شمار
          نمی‌رود.
        </p>
      </section>

      <div className="flex flex-wrap gap-2 print:hidden">
        <PrintButton />
        <Link
          href="/panel/support"
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          پشتیبانی این سفارش
        </Link>
      </div>

      {/* ── وضعیت مبهم ───────────────────────────────────────────── */}
      {unsettled && (
        <section className="rounded-2xl border border-gold/40 bg-gold/10 p-4 print:hidden">
          <h2 className="text-sm font-bold plus-ink">وضعیت این پرداخت هنوز نهایی نشده</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            اگر مبلغی از حسابت کم شده، دوباره پرداخت نکن. با دکمهٔ زیر وضعیت را
            از درگاه می‌پرسیم.
          </p>
          <div className="mt-3">
            <RecheckButton orderId={order.id} />
          </div>
        </section>
      )}

      {/* ── تلاش‌های پرداخت ──────────────────────────────────────── */}
      {order.attempts.length > 0 && (
        <section className="glass rounded-2xl p-5 print:hidden">
          <h2 className="mb-3 text-sm font-bold">تلاش‌های پرداخت</h2>
          <ul className="space-y-2 text-xs">
            {order.attempts.map((attempt) => (
              <li
                key={attempt.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0"
              >
                <span className="font-medium">{PAYMENT_STATE_LABEL[attempt.state]}</span>
                <span className="text-muted-foreground">{jalaliLong(attempt.createdAt)}</span>
                {attempt.trackingId && (
                  <span className="select-all font-mono">{attempt.trackingId}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* شمارهٔ پیگیری و سفارش باید با یک کشیدن انتخاب شوند. */}
      <dd className={`mt-0.5 text-sm font-medium ${copyable ? "select-all font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
