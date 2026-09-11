import Link from "next/link";
import PanelPageHeader from "../PanelPageHeader";
import styles from "../panel-design.module.css";
import RecheckButton from "@/components/UI/plus/RecheckButton";
import PrintButton from "@/components/UI/plus/PrintButton";
import { formatRials } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";
import { PAYMENT_STATE_LABEL } from "@/lib/plus/labels";
import type { PlusOrderDetail } from "@/lib/plus/types";

export default function ReceiptView({ order }: { order: PlusOrderDetail; }) {
  const unsettled =
    order.status === "pending" &&
    ["redirected", "pending", "unknown"].includes(order.latestPaymentState ?? "");

  return (
    <div dir="rtl" className={styles.pageStack}>
      <nav className="text-xs">
        <Link href="/panel/billing" className="text-primary underline underline-offset-4">
          ← خریدهای من
        </Link>
      </nav>

      <div className="print:hidden"><PanelPageHeader title="جزئیات خریدت" description="اطلاعات سفارش و رسید قابل چاپ، برای وقتی که به آن نیاز داری." tone="lilac" /></div>

      {/* ── رسید ─────────────────────────────────────────────────── */}
      <section
        id="receipt"
        data-panel-card=""
        className="bg-surface border border-border/70 space-y-4 rounded-2xl p-6 print:border print:bg-white print:text-black"
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

        <dl className={styles.detailsGrid}>
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
        <section data-panel-card="" className="bg-surface border border-border/70 rounded-2xl p-5 print:hidden">
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
    <div className={styles.detailField}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* شمارهٔ پیگیری و سفارش باید با یک کشیدن انتخاب شوند. */}
      <dd className={`mt-0.5 text-sm font-medium ${copyable ? "select-all font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
