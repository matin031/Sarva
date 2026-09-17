import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PanelPageHeader from "../PanelPageHeader";
import styles from "../panel-design.module.css";
import TicketReplyForm from "@/components/UI/plus/TicketReplyForm";
import { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "@/lib/plus/labels";
import { jalaliLong, clock } from "@/lib/panel/format";
import type { TicketDetail } from "@/lib/plus/types";

/**
 * رشتهٔ گفت‌وگوی یک تیکت.
 *
 * ⚠️ **عنوانِ تیکت دیگر در سرصفحه نیست.**
 *
 * تا دیروز `subject` — متنی که خودِ کاربر نوشته و تا ۱۶۰ نویسه می‌تواند
 * باشد — داخلِ همان کادرِ تزئینیِ بالای صفحه می‌نشست، کنارِ یک نهال. سه
 * مشکل داشت:
 *
 *   ۱. یک عنوانِ بلند، سرصفحه را دو سه برابر می‌کرد و نهال را به لبه
 *      می‌چسباند — چیدمان عملاً می‌شکست.
 *   ۲. آن جایگاه، جایگاهِ *حرفِ سایت* است. متنِ کاربر آنجا شبیه عنوانی
 *      می‌شود که ما نوشته‌ایم.
 *   ۳. و عنوانِ صفحه در هر تیکت عوض می‌شد، پس کاربر از روی سرصفحه
 *      نمی‌فهمید کجای پنل است.
 *
 * حالا سرصفحه ثابت است و عنوانِ تیکت بالای خودِ گفت‌وگو می‌آید، با
 * `line-clamp-2`: بلند که باشد، بریده می‌شود و `title` کاملش را نگه می‌دارد.
 */
export default function TicketView({ ticket }: { ticket: TicketDetail }) {
  const closed = ticket.status === "closed";

  return (
    <div dir="rtl" className={styles.pageStack}>
      {/* ⚠️ لینکِ بازگشت بالای سرصفحه و نه پایینِ آن؛ و با آیکن، تا روی
          موبایل هم هدفِ لمسی داشته باشد. */}
      <nav>
        <Link
          href="/panel/support"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowRight aria-hidden className="size-3.5" />
          همهٔ گفت‌وگوها
        </Link>
      </nav>

      <PanelPageHeader
        title="پشتیبانی سروا"
        description="هر پاسخی که بدهیم همین‌جا می‌آید و برایت ایمیل هم می‌شود."
        eyebrow="گفت‌وگو"
        tone="rose"
      />

      <div data-panel-card="" className="rounded-2xl border border-border/70 p-5">
        <h2
          title={ticket.subject}
          className="line-clamp-2 text-[17px] font-bold break-words"
        >
          {ticket.subject}
        </h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="panel-num select-all font-mono">{ticket.ticketNumber}</span>
          <span aria-hidden className="text-border">·</span>
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
            <li key={message.id} data-support={fromSupport} className={styles.message}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* ⚠️ پاسخِ پشتیبانی باید صریحاً قابلِ تشخیص باشد — با متن،
                    نه فقط با رنگِ پس‌زمینه. */}
                <span className={`font-bold ${fromSupport ? "plus-ink" : ""}`}>
                  {fromSupport ? "پشتیبانی سروا" : message.authorName || "تو"}
                </span>
                <time
                  dateTime={message.createdAt}
                  className="panel-num text-muted-foreground"
                >
                  {jalaliLong(message.createdAt)} — {clock(message.createdAt)}
                </time>
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
