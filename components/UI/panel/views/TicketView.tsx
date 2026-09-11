import Link from "next/link";
import PanelPageHeader from "../PanelPageHeader";
import styles from "../panel-design.module.css";
import TicketReplyForm from "@/components/UI/plus/TicketReplyForm";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/plus/labels";
import { jalaliLong, clock } from "@/lib/panel/format";
import type { TicketDetail } from "@/lib/plus/types";

export default function TicketView({ ticket }: { ticket: TicketDetail; }) {
  const closed = ticket.status === "closed";

  return (
    <div dir="rtl" className={styles.pageStack}>
      <nav className="text-xs">
        <Link href="/panel/support" className="text-primary underline underline-offset-4">
          ← پشتیبانی
        </Link>
      </nav>

      <div>
        {/* شکستنِ کلمهٔ بلند تا عنوانِ طولانیِ فارسی از کارت بیرون نزند. */}
        <PanelPageHeader title={ticket.subject} eyebrow="گفت‌وگوی تو با سروا" tone="rose" />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="select-all font-mono">{ticket.ticketNumber}</span>
          <span>{TICKET_CATEGORY_LABEL[ticket.category]}</span>
          <span className={styles.statusPill}>{TICKET_STATUS_LABEL[ticket.status]}</span>
          {ticket.orderNumber && (
            <span className="select-all">سفارش {ticket.orderNumber}</span>
          )}
        </div>
      </div>

      <ol className="space-y-3">
        {ticket.messages.map((message) => {
          const fromSupport = message.authorRole === "admin";
          return (
            <li
              key={message.id}
              data-support={fromSupport} className={styles.message}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
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
