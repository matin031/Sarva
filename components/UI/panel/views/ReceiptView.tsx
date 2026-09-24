import Link from "next/link";
import PanelPageHeader from "../PanelPageHeader";
import styles from "../panel-design.module.css";
import RecheckButton from "@/components/UI/plus/RecheckButton";
import PrintButton from "@/components/UI/plus/PrintButton";
import PayOrderButton from "@/components/UI/plus/purchase/PayOrderButton";
import { formatRials } from "@/lib/plus/money";
import { fa, jalaliLong } from "@/lib/panel/format";
import { PAYMENT_STATE_LABEL, orderStatusLabel } from "@/lib/plus/labels";
import type { PlusOrderDetail } from "@/lib/plus/types";

/** حالت‌هایی که ممکن است پولی پشتشان باشد؛ اینجا «پرداخت دوباره» پیشنهاد نمی‌شود. */
const AMBIGUOUS = ["redirected", "pending", "unknown"];

export default function ReceiptView({
  order,
  buyer,
}: {
  order: PlusOrderDetail;
  buyer: { name: string; contact: string | null; contactLtr: boolean };
}) {
  const open = order.status === "pending";
  const unsettled = open && AMBIGUOUS.includes(order.latestPaymentState ?? "");
  const payable = open && !unsettled;
  const closed = order.status === "expired" || order.status === "cancelled";
  const statusLabel = orderStatusLabel(order.status, order.latestPaymentState);

  return (
    <div dir="rtl" className={styles.pageStack}>
      <nav className="text-xs print:hidden">
        <Link href="/panel/billing" className="text-primary underline underline-offset-4">
          ← خریدهای من
        </Link>
      </nav>

      <div className="print:hidden">
        <PanelPageHeader
          title={order.status === "paid" ? "فاکتور خرید" : "جزئیات سفارش"}
          description={`سفارش ${order.orderNumber}`}
          tone="lilac"
          art={false}
        />
      </div>

      {/* ── وضعیت مبهم ───────────────────────────────────────────── */}
      {unsettled && (
        <section className="rounded-2xl border border-gold/40 bg-gold/10 p-4 print:hidden">
          <h2 className="text-sm font-bold plus-ink">نتیجهٔ این پرداخت هنوز مشخص نیست</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            اگر مبلغی از حسابت کم شده، دوباره پرداخت نکن.
          </p>
          <div className="mt-3">
            <RecheckButton orderId={order.id} />
          </div>
        </section>
      )}

      {/* ── پرداخت‌نشده ──────────────────────────────────────────── */}
      {payable && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4 print:hidden">
          <p className="text-sm">
            این سفارش هنوز پرداخت نشده است.
          </p>
          <PayOrderButton orderId={order.id} planCode={order.planCode} label="ادامهٔ پرداخت" />
        </section>
      )}

      {closed && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border p-4 print:hidden">
          <p className="text-sm text-muted-foreground">
            {order.status === "expired" ? "مهلت پرداخت این سفارش تمام شده است." : "این سفارش لغو شده است."}
          </p>
          <Link
            href={`/checkout?plan=${encodeURIComponent(order.planCode)}`}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            خرید دوباره
          </Link>
        </section>
      )}

      {/* ── فاکتور ───────────────────────────────────────────────── */}
      <section
        id="receipt"
        data-panel-card=""
        className="bg-surface border border-border/70 space-y-5 rounded-2xl p-6 print:border print:bg-white print:text-black"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-lg font-extrabold">
              {order.status === "paid" ? "فاکتور خرید سروا" : "سفارش سروا"}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">sarvaedu.ir</p>
          </div>
          <div className="text-left">
            <p className="select-all font-mono text-sm">{order.orderNumber}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{jalaliLong(order.createdAt)}</p>
          </div>
        </header>

        <dl className={styles.detailsGrid}>
          <Field label="خریدار" value={buyer.name} />
          {buyer.contact && <Field label="حساب" value={buyer.contact} ltr={buyer.contactLtr} />}
          <Field label="وضعیت" value={statusLabel} />
          {order.paidAt && <Field label="تاریخ پرداخت" value={jalaliLong(order.paidAt)} />}
          {order.trackingId && <Field label="شماره پیگیری" value={order.trackingId} copyable />}
          {order.accessFrom && (
            <Field
              label="بازهٔ اشتراک"
              value={`${jalaliLong(order.accessFrom)} تا ${
                order.accessTo ? jalaliLong(order.accessTo) : "بدون محدودیت"
              }`}
            />
          )}
        </dl>

        {/* ردیفِ کالا — مثلِ هر فاکتور: شرح، مدت، مبلغ. */}
        <div className="overflow-hidden rounded-xl border border-border/60">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 bg-foreground/[0.03] px-4 py-2 text-xs text-muted-foreground">
            <span>شرح</span>
            <span>مدت</span>
            <span className="text-left">مبلغ</span>
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-3 text-sm">
            <span className="font-medium">
              {order.planTitle}
              {order.isRenewal && <span className="text-xs text-muted-foreground"> (تمدید)</span>}
            </span>
            <span>{fa(order.durationDays)} روز</span>
            <span className="text-left">{formatRials(order.amountRials)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3 text-sm font-extrabold">
            <span>{order.status === "paid" ? "پرداخت‌شده" : "قابل پرداخت"}</span>
            <span>{formatRials(order.amountRials)}</span>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          این فاکتور برای پیگیری خرید است و فاکتور رسمی مالیاتی به‌شمار نمی‌رود.
        </p>
      </section>

      <div className="flex flex-wrap gap-2 print:hidden">
        {order.status === "paid" && <PrintButton />}
        <Link
          href={`/panel/support?order=${order.id}`}
          className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
        >
          پشتیبانی این سفارش
        </Link>
      </div>

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
                {attempt.errorMessage && attempt.state !== "verified" && (
                  <span className="text-muted-foreground">{attempt.errorMessage}</span>
                )}
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
  ltr,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  ltr?: boolean;
}) {
  return (
    <div className={styles.detailField}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      {/* شمارهٔ پیگیری و سفارش باید با یک کشیدن انتخاب شوند. */}
      <dd
        dir={ltr ? "ltr" : undefined}
        className={`mt-0.5 text-sm font-medium ${ltr ? "text-right" : ""} ${copyable ? "select-all font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
