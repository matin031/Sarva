import "server-only";
import { query, queryOne } from "@/lib/db";
import { orderNumber, ticketNumber } from "./order-number";
import type { TicketCategory, TicketDetail, TicketStatus, TicketSummary } from "./types";

/**
 * خواندنِ تیکت‌ها.
 *
 * ⚠️ **هر کوئریِ این فایل شرطِ مالکیت دارد و باید داشته باشد.** بدونِ RLS،
 * فراموش کردنِ `user_id = ?` در یکی از این توابع یعنی هر کاربری با عوض کردنِ
 * شناسه در آدرس، گفت‌وگوی خصوصیِ یک نفرِ دیگر با پشتیبانی را می‌خواند — که
 * معمولاً شامل شمارهٔ سفارش و گله‌های شخصی است.
 *
 * توابعِ سمتِ مدیر عمداً اینجا نیستند؛ در `admin-actions.ts` اند و همگی از
 * `requireAdmin()` می‌گذرند.
 */

/* برچسب‌های فارسی در `./labels` هستند تا کامپوننت‌های کلاینت هم بتوانند
   واردشان کنند بدونِ اینکه لایهٔ دیتابیس وارد باندلِ مرورگر شود. */
export { TICKET_CATEGORY_LABEL, TICKET_STATUS_LABEL } from "./labels";

type TicketRow = {
  id: string;
  ticket_seq: number;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  last_activity_at: string;
  created_at: string;
  user_unread: boolean;
  order_seq: number | null;
};

function toSummary(r: TicketRow): TicketSummary {
  return {
    id: r.id,
    ticketNumber: ticketNumber(r.ticket_seq),
    subject: r.subject,
    category: r.category,
    status: r.status,
    lastActivityAt: r.last_activity_at,
    createdAt: r.created_at,
    hasUnread: r.user_unread,
    orderNumber: r.order_seq === null ? null : orderNumber(r.order_seq),
  };
}

/**
 * فهرستِ تیکت‌های کاربر — فقط خلاصه.
 *
 * ⚠️ پیام‌ها اینجا خوانده نمی‌شوند. کاربری با ده تیکتِ سی‌پیامی یعنی سیصد
 * ردیفِ متن برای صفحه‌ای که فقط عنوان‌ها را نشان می‌دهد. رشتهٔ گفت‌وگو فقط
 * هنگام باز کردنِ تیکت خوانده می‌شود.
 */
export async function listTickets(
  userId: string,
  options: { limit?: number; offset?: number } = {},
): Promise<{ tickets: TicketSummary[]; hasMore: boolean }> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const offset = Math.max(options.offset ?? 0, 0);

  const rows = await query<TicketRow>(
    `select t.id, t.ticket_seq, t.subject, t.category, t.status,
            t.last_activity_at, t.created_at, t.user_unread,
            o.order_seq
       from plus_tickets t
       left join plus_orders o on o.id = t.order_id
      where t.user_id = ?
      order by t.last_activity_at desc, t.id
      limit ? offset ?`,
    [userId, limit + 1, offset],
  );

  return {
    tickets: rows.slice(0, limit).map(toSummary),
    hasMore: rows.length > limit,
  };
}

/** یک تیکت با رشتهٔ کاملش — فقط اگر مالِ همین کاربر باشد. */
export async function getTicket(userId: string, ticketId: string): Promise<TicketDetail | null> {
  const row = await queryOne<TicketRow>(
    `select t.id, t.ticket_seq, t.subject, t.category, t.status,
            t.last_activity_at, t.created_at, t.user_unread,
            o.order_seq
       from plus_tickets t
       left join plus_orders o on o.id = t.order_id
      where t.id = ? and t.user_id = ?`,
    [ticketId, userId],
  );
  if (!row) return null;

  const messages = await query<{
    id: string;
    author_role: "user" | "admin";
    author_name: string | null;
    body: string;
    created_at: string;
  }>(
    // ⚠️ نامِ نویسنده فقط برای پیامِ *مدیر* خوانده می‌شود، و آن هم «پشتیبانی
    // سروا» است نه نامِ واقعی. پشتیبان حق دارد پشتِ نامِ تیم بماند؛ ضمناً
    // نامِ همکارها اطلاعاتی است که کاربر لازم ندارد.
    `select m.id, m.author_role,
            case when m.author_role = 'admin' then null else u.full_name end as author_name,
            m.body, m.created_at
       from plus_ticket_messages m
       left join users u on u.id = m.author_id
      where m.ticket_id = ?
      order by m.created_at, m.id
      limit 200`,
    [ticketId],
  );

  return {
    ...toSummary(row),
    messages: messages.map((m) => ({
      id: m.id,
      authorRole: m.author_role,
      authorName: m.author_name,
      body: m.body,
      createdAt: m.created_at,
    })),
  };
}

/** تعداد تیکت‌هایی که پاسخِ خوانده‌نشده دارند — نشانِ کوچکِ ناوبری. */
export async function countUnreadTickets(userId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `select count(*) as n from plus_tickets where user_id = ? and user_unread = 1`,
    [userId],
  );
  return row?.n ?? 0;
}
