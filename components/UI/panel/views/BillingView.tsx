import Link from "next/link";
import PanelPageHeader from "../PanelPageHeader";
import styles from "../panel-design.module.css";
import { formatRials } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";
import { orderStatusLabel } from "@/lib/plus/labels";
import type { PlusOrderSummary } from "@/lib/plus/types";

function statusTone(label: string): string {
  if (label === "پرداخت موفق") return "text-primary";
  if (label === "پرداخت ناموفق") return "text-destructive";
  if (label === "در حال بررسی") return "plus-ink";
  return "text-muted-foreground";
}

export default function BillingView({ orders, hasMore, unsettled, page }: { orders: PlusOrderSummary[]; hasMore: boolean; unsettled: number; page: number; }) {
  return (
    <div dir="rtl" className={styles.pageStack}>
      <PanelPageHeader title="خریدهای من" description="همهٔ سفارش‌ها و رسیدها، مرتب و یک‌جا برای پیگیری تو." tone="lilac" />

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
        <div className={styles.emptyState}>
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
        <ul className={styles.recordGrid}>
          {orders.map((order) => {
            const label = orderStatusLabel(order.status, order.latestPaymentState);
            return (
              <li key={order.id} data-panel-card="" className={styles.record}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{order.planTitle}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fa(order.durationDays)} روز • {jalaliLong(order.createdAt)}
                    </p>
                  </div>
                  {/* وضعیت با متن مشخص می‌شود، نه فقط با رنگ. */}
                  <span className={`${styles.statusPill} ${statusTone(label)}`}>{label}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3 text-sm">
                  {/* شمارهٔ سفارش باید قابلِ کپی باشد — کاربر آن را در تیکت
                      می‌نویسد. */}
                  <span className="select-all font-mono text-xs">{order.orderNumber}</span>
                  <span className="font-bold">{formatRials(order.amountRials)}</span>
                </div>

                <Link
                  href={`/panel/billing/${order.id}`}
                  className={`mt-4 ${styles.resumeCta}`}
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
