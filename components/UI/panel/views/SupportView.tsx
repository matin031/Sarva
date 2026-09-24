import Link from "next/link";
import PanelPageHeader from "../PanelPageHeader";
import styles from "../panel-design.module.css";
import NewTicketForm from "@/components/UI/plus/NewTicketForm";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL, orderStatusLabel } from "@/lib/plus/labels";
import { jalaliLong } from "@/lib/panel/format";
import type { TicketSummary, PlusOrderSummary } from "@/lib/plus/types";

export default function SupportView({ tickets, orders, initialOrderId = "" }: { tickets: TicketSummary[]; orders: { orders: PlusOrderSummary[] }; initialOrderId?: string; }) {
  return (
    <div dir="rtl" className={styles.pageStack}>
      <PanelPageHeader title="پشتیبانی" description="مشکل یا سؤالت را بنویس. معمولاً همان روز جواب می‌دهیم." tone="rose" />

      <NewTicketForm
        orders={orders.orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          planTitle: order.planTitle,
          status: orderStatusLabel(order.status, order.latestPaymentState),
        }))}
        initialOrderId={initialOrderId}
      />

      {tickets.length === 0 ? (
        <div className={styles.emptyState}>
          <p className="font-semibold">هنوز تیکتی نزده‌ای</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            پیام‌های قبلی‌ات.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/panel/support/${ticket.id}`}
                data-panel-card="" className="block rounded-2xl border border-border p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  {/* ⚠️ عنوانِ بلندِ فارسی نباید چیدمان را بشکند. */}
                  <h2 className="min-w-0 flex-1 truncate font-bold">{ticket.subject}</h2>
                  {ticket.hasUnread && (
                    /* نشانِ «پاسخ تازه» — متن دارد، نه فقط یک نقطهٔ رنگی. */
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary">
                      پاسخ تازه
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="select-all font-mono">{ticket.ticketNumber}</span>
                  <span>{TICKET_CATEGORY_LABEL[ticket.category]}</span>
                  <span className={styles.statusPill}>{TICKET_STATUS_LABEL[ticket.status]}</span>
                  <span>{jalaliLong(ticket.lastActivityAt)}</span>
                  {ticket.orderNumber && <span>سفارش {ticket.orderNumber}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
