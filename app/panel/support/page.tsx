import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import NewTicketForm from "@/components/UI/plus/NewTicketForm";
import { getPanelUser } from "@/lib/panel/queries";
import { listTickets } from "@/lib/plus/support";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/plus/labels";
import { listOrders } from "@/lib/plus/orders";
import { jalaliLong } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پشتیبانی",
  robots: { index: false, follow: false },
};

/**
 * پشتیبانی.
 *
 * ⚠️ **این صفحه هرگز پشتِ اشتراک نمی‌رود.** بیشترِ تیکت‌های یک محصولِ پولی
 * دقیقاً از کسانی می‌آید که هنوز اشتراک ندارند («پول دادم فعال نشد»، «نمی‌توانم
 * وارد شوم»). قفل کردنِ پشتیبانی پشتِ همان چیزی که کاربر دربارهٔ آن مشکل دارد،
 * بدترین حلقهٔ ممکن است. پس هیچ‌جای این مسیر `requirePlus` صدا زده نمی‌شود.
 */
export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/support");

  const [{ tickets }, orders] = await Promise.all([
    listTickets(user.id, { limit: 30 }),
    // فقط برای فهرستِ «سفارش مرتبط» در فرم — و فقط سفارش‌های خودِ کاربر.
    listOrders(user.id, { limit: 20 }),
  ]);

  return (
    <div dir="rtl" className="space-y-5">
      <header className="text-center">
        <h1 className="text-2xl font-extrabold">پشتیبانی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مشکل حساب، خرید، پرداخت یا هر چیز دیگر — همین‌جا بپرس.
        </p>
      </header>

      <NewTicketForm
        orders={orders.orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          planTitle: order.planTitle,
        }))}
      />

      {tickets.length === 0 ? (
        <p className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
          هنوز تیکتی نساخته‌ای.
        </p>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/panel/support/${ticket.id}`}
                className="glass block rounded-2xl p-4 transition-all hover:bg-accent/10"
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
                  <span>{TICKET_STATUS_LABEL[ticket.status]}</span>
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
