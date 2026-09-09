import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import TicketReplyForm from "@/components/UI/plus/TicketReplyForm";
import { getPanelUser } from "@/lib/panel/queries";
import { getTicket } from "@/lib/plus/support";
import { markTicketRead } from "@/lib/plus/support-actions";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/plus/labels";
import { jalaliLong, clock } from "@/lib/panel/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تیکت پشتیبانی",
  robots: { index: false, follow: false },
};

/**
 * رشتهٔ گفت‌وگوی یک تیکت.
 *
 * ⚠️ **مالکیت در کوئری است.** `getTicket(userId, ticketId)` شرطِ `user_id`
 * دارد، پس عوض کردنِ شناسه در آدرس به تیکتِ کسِ دیگری نمی‌رسد. بدونِ RLS،
 * همین شرط تنها چیزی است که گفت‌وگوی خصوصیِ یک دانش‌آموز با پشتیبانی را از
 * بقیه جدا می‌کند.
 *
 * ⚠️ **متنِ پیام‌ها به‌صورت متنِ ساده رندر می‌شود.** هیچ‌جای این صفحه
 * `dangerouslySetInnerHTML` نیست — یعنی اگر کسی `<script>` بنویسد، همان
 * رشته نمایش داده می‌شود و اجرا نمی‌شود. (پاک‌سازیِ ورودی در سرور یک لایهٔ
 * اضافه است، نه جایگزینِ این.)
 */
export default async function Page({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const user = await getPanelUser();
  if (!user) redirect("/auth?returnTo=/panel/support");

  const { ticketId } = await params;
  const ticket = await getTicket(user.id, ticketId);
  if (!ticket) notFound();

  // باز کردنِ تیکت، نشانِ «پاسخ تازه» را برمی‌دارد. خودش هم مالکیت را دوباره
  // بررسی می‌کند.
  if (ticket.hasUnread) await markTicketRead(ticket.id);

  const closed = ticket.status === "closed";

  return (
    <div dir="rtl" className="space-y-4">
      <nav className="text-xs">
        <Link href="/panel/support" className="text-primary underline underline-offset-4">
          ← پشتیبانی
        </Link>
      </nav>

      <header className="glass rounded-2xl p-5">
        {/* شکستنِ کلمهٔ بلند تا عنوانِ طولانیِ فارسی از کارت بیرون نزند. */}
        <h1 className="break-words text-lg font-extrabold">{ticket.subject}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="select-all font-mono">{ticket.ticketNumber}</span>
          <span>{TICKET_CATEGORY_LABEL[ticket.category]}</span>
          <span>{TICKET_STATUS_LABEL[ticket.status]}</span>
          {ticket.orderNumber && (
            <span className="select-all">سفارش {ticket.orderNumber}</span>
          )}
        </div>
      </header>

      <ol className="space-y-3">
        {ticket.messages.map((message) => {
          const fromSupport = message.authorRole === "admin";
          return (
            <li
              key={message.id}
              className={`rounded-2xl p-4 ${
                fromSupport ? "plus-surface" : "glass"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                {/* ⚠️ پاسخِ پشتیبانی باید صریحاً قابلِ تشخیص باشد — با متن،
                    نه فقط با رنگِ پس‌زمینه. */}
                <span className={`font-bold ${fromSupport ? "plus-ink" : ""}`}>
                  {fromSupport ? "پشتیبانی سروا" : message.authorName || "تو"}
                </span>
                <span className="text-muted-foreground">
                  {jalaliLong(message.createdAt)} — {clock(message.createdAt)}
                </span>
              </div>
              {/* whitespace-pre-wrap تا خطِ تازه‌های کاربر حفظ شود، و
                  break-words تا یک آدرسِ بلند چیدمان را نشکند. */}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {message.body}
              </p>
            </li>
          );
        })}
      </ol>

      <TicketReplyForm ticketId={ticket.id} closed={closed} />
    </div>
  );
}
