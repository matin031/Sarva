import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPanelUser } from "@/lib/panel/queries";
import { countUnsettledOrders, listOrders } from "@/lib/plus/orders";
import { formatRials } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";
import { orderStatusLabel } from "@/lib/plus/labels";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "خریدهای من",
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 10;

function statusTone(label: string): string {
  if (label === "پرداخت موفق") return "text-primary";
  if (label === "پرداخت ناموفق") return "text-destructive";
  if (label === "در حال بررسی") return "plus-ink";
  return "text-muted-foreground";
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/billing");

  const { p } = await searchParams;
  const page = Math.max(1, Number(p) || 1);

  const [{ orders, hasMore }, unsettled] = await Promise.all([
    listOrders(user.id, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countUnsettledOrders(user.id),
  ]);

  return (
    <div dir="rtl" className="space-y-5">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold">خریدهای من</h1>
        <p className="mt-1 text-sm text-muted-foreground">سفارش‌ها، پرداخت‌ها و رسیدها</p>
      </header>

      {unsettled > 0 && (
        /* ⚠️ نوارِ «تکلیف روشن نیست». کاربری که صفحهٔ بانک را بسته، باید
           همین‌جا بفهمد سفارشش گم نشده و راهی برای پیگیری دارد. */
        <p className="rounded-2xl border border-gold/40 bg-gold/10 p-3 text-xs leading-relaxed plus-ink">
          {fa(unsettled)} سفارش داری که وضعیت پرداختش هنوز نهایی نشده است. اگر
          مبلغی از حسابت کم شده، دوباره پرداخت نکن — سفارش را باز کن و «بررسی
          دوبارهٔ وضعیت» را بزن.
        </p>
      )}

      {orders.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm text-muted-foreground">هنوز خریدی ثبت نشده است.</p>
          <Link
            href="/plus"
            className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            آشنایی با سروا پلاس
          </Link>
        </div>
      ) : (
        /* ⚠️ کارت و نه جدول. جدولِ پنج‌ستونه در عرض ۳۶۰ پیکسل یا از صفحه
           بیرون می‌زند یا آن‌قدر فشرده می‌شود که خوانده نمی‌شود. */
        <ul className="space-y-3">
          {orders.map((order) => {
            const label = orderStatusLabel(order.status, order.latestPaymentState);
            return (
              <li key={order.id} className="glass rounded-2xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{order.planTitle}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fa(order.durationDays)} روز • {jalaliLong(order.createdAt)}
                    </p>
                  </div>
                  {/* وضعیت با متن مشخص می‌شود، نه فقط با رنگ. */}
                  <span className={`text-xs font-bold ${statusTone(label)}`}>{label}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-sm">
                  {/* شمارهٔ سفارش باید قابلِ کپی باشد — کاربر آن را در تیکت
                      می‌نویسد. */}
                  <span className="select-all font-mono text-xs">{order.orderNumber}</span>
                  <span className="font-bold">{formatRials(order.amountRials)}</span>
                </div>

                <Link
                  href={`/panel/billing/${order.id}`}
                  className="mt-3 inline-block text-xs text-primary underline underline-offset-4"
                >
                  جزئیات و رسید
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {(page > 1 || hasMore) && (
        <nav className="flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link href={`/panel/billing?p=${page - 1}`} className="text-primary underline underline-offset-4">
              صفحهٔ قبل
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">صفحهٔ {fa(page)}</span>
          {hasMore ? (
            <Link href={`/panel/billing?p=${page + 1}`} className="text-primary underline underline-offset-4">
              صفحهٔ بعد
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
