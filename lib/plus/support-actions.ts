"use server";

import { revalidatePath } from "next/cache";
import { execute, queryOne, transaction } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { isUuid } from "@/lib/api/action-input";
import type { TicketCategory } from "./types";

/**
 * آنچه کاربر در پشتیبانی می‌تواند بکند.
 *
 * ⚠️ هر Server Action یک endpoint شبکه است: امضای TypeScript در زمان اجرا
 * وجود ندارد و هر کسی می‌تواند مستقیم به آن POST بزند. پس هر ورودی اینجا
 * دوباره بررسی می‌شود، و مهم‌تر — سه چیز هرگز از ورودی خوانده نمی‌شوند:
 *
 *   ✗ userId     → از سشن. وگرنه هر کسی به نامِ دیگری تیکت می‌ساخت.
 *   ✗ status     → کاربر وضعیتِ تیکت را تعیین نمی‌کند.
 *   ✗ authorRole → همیشه 'user'. وگرنه کاربر پیامِ «پشتیبانی» را جعل می‌کرد و
 *                  مثلاً به خودش می‌نوشت «مبلغ برگشت داده شد».
 *
 * ⚠️ پشتیبانی پشتِ paywall نیست. کاربر رایگان، کاربری که اشتراکش تمام شده و
 * کاربری که اصلاً پلاس ندارد همگی دسترسی دارند — چون بیشترِ تیکت‌ها دقیقاً از
 * همین‌ها می‌آید («پول دادم فعال نشد»). هیچ‌جای این فایل `requirePlus` صدا
 * زده نمی‌شود و نباید بشود.
 *
 * پاسخِ مدیر عمداً اینجا نیست و در `lib/plus/admin-actions.ts` است، تا هر
 * مسیرِ نوشتنِ «به نامِ پشتیبانی» از `requireAdmin()` بگذرد.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const CATEGORIES: TicketCategory[] = [
  "payment",
  "plus",
  "account",
  "technical",
  "content",
  "other",
];

const MAX_SUBJECT = 160;
const MAX_BODY = 4000;

/** سقفِ ساختِ تیکت و پیام. در دیتابیس است و نه در حافظه: محافظی که با
 *  ری‌استارت صفر شود، در برابر اسکریپت هیچ کاری نمی‌کند. */
const NEW_TICKET_LIMIT = { count: 5, windowSeconds: 60 * 60 };
const NEW_MESSAGE_LIMIT = { count: 30, windowSeconds: 60 * 60 };

/** نویسه‌های کنترلی — به‌جز خطِ تازه و tab که در متنِ چندخطی معنی دارند. */
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * پاک‌سازیِ متنِ کاربر پیش از ذخیره.
 *
 * ⚠️ این جایگزینِ رندرِ امن **نیست**. متنِ تیکت در رابط کاربری به‌صورت متنِ
 * ساده رندر می‌شود (هیچ‌جای این پروژه `dangerouslySetInnerHTML` روی متنِ
 * کاربر نیست) و همان چیزی است که واقعاً جلوی XSS را می‌گیرد. این تابع فقط
 * چیزهایی را می‌گیرد که ذخیره‌شان بی‌فایده است و خروجیِ لاگ و CSV را به‌هم
 * می‌ریزند.
 */
function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").replace(/\r\n/g, "\n").trim().slice(0, max);
}

export async function createTicket(input: {
  category: unknown;
  subject: unknown;
  message: unknown;
  orderId?: unknown;
}): Promise<ActionResult<{ id: string; ticketNumber: string }>> {
  const user = await requireUser();

  const limit = await rateLimitDb(
    `plus-ticket-new:${user.id}`,
    NEW_TICKET_LIMIT.count,
    NEW_TICKET_LIMIT.windowSeconds,
  );
  if (!limit.allowed) {
    return { ok: false, errors: ["تعداد تیکت‌های تازه زیاد است. کمی بعد دوباره تلاش کنید."] };
  }

  const category = CATEGORIES.includes(input.category as TicketCategory)
    ? (input.category as TicketCategory)
    : null;
  if (!category) return { ok: false, errors: ["موضوع تیکت را انتخاب کنید."] };

  const subject = cleanText(input.subject, MAX_SUBJECT);
  if (subject.length < 3) return { ok: false, errors: ["عنوان باید دست‌کم ۳ نویسه باشد."] };

  const body = cleanText(input.message, MAX_BODY);
  if (body.length < 5) return { ok: false, errors: ["متن پیام خیلی کوتاه است."] };

  // ⚠️ ضمیمه کردنِ سفارش: مالکیت *اینجا* بررسی می‌شود. بدون این، کاربر
  // می‌توانست شناسهٔ سفارشِ کسِ دیگری را بفرستد و پشتیبان — با حسن‌نیت —
  // اطلاعات مالیِ یک نفرِ سوم را در پاسخ می‌نوشت.
  let orderId: string | null = null;
  if (input.orderId) {
    if (!isUuid(input.orderId)) return { ok: false, errors: ["سفارش انتخاب‌شده معتبر نیست."] };
    const owned = await queryOne<{ id: string }>(
      "select id from plus_orders where id = $1 and user_id = $2",
      [input.orderId, user.id],
    );
    if (!owned) return { ok: false, errors: ["این سفارش در حساب شما پیدا نشد."] };
    orderId = owned.id;
  }

  const created = await transaction(async (tx) => {
    const ticket = await tx.queryOne<{ id: string; ticket_number: string }>(
      // status و admin_unread صریحاً نوشته می‌شوند و از ورودی نمی‌آیند.
      `insert into plus_tickets (user_id, category, subject, order_id, status, admin_unread, user_unread)
       values ($1, $2, $3, $4, 'waiting_for_support', true, false)
       returning id, ticket_number`,
      [user.id, category, subject, orderId],
    );
    if (!ticket) throw new Error("ساخت تیکت انجام نشد.");

    await tx.execute(
      `insert into plus_ticket_messages (ticket_id, author_id, author_role, body)
       values ($1, $2, 'user', $3)`,
      [ticket.id, user.id, body],
    );

    return ticket;
  });

  revalidatePath("/panel/support");
  return { ok: true, data: { id: created.id, ticketNumber: created.ticket_number } };
}

export async function replyToTicket(input: {
  ticketId: unknown;
  message: unknown;
}): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();

  if (!isUuid(input.ticketId)) return { ok: false, errors: ["این تیکت پیدا نشد."] };

  const limit = await rateLimitDb(
    `plus-ticket-msg:${user.id}`,
    NEW_MESSAGE_LIMIT.count,
    NEW_MESSAGE_LIMIT.windowSeconds,
  );
  if (!limit.allowed) {
    return { ok: false, errors: ["پیام‌های زیادی فرستاده‌اید. کمی بعد دوباره تلاش کنید."] };
  }

  const body = cleanText(input.message, MAX_BODY);
  if (body.length < 2) return { ok: false, errors: ["متن پیام خالی است."] };

  const message = await transaction(async (tx) => {
    // شرطِ مالکیت در همین update — نه در یک select جدا که بینشان فاصله باشد.
    const ticket = await tx.queryOne<{ id: string }>(
      `update plus_tickets
          set status = case when status = 'resolved' then 'waiting_for_support' else status end,
              last_activity_at = now(),
              admin_unread = true,
              user_unread = false
        where id = $1 and user_id = $2 and status <> 'closed'
        returning id`,
      [input.ticketId, user.id],
    );
    if (!ticket) return null;

    return tx.queryOne<{ id: string }>(
      `insert into plus_ticket_messages (ticket_id, author_id, author_role, body)
       values ($1, $2, 'user', $3)
       returning id`,
      [ticket.id, user.id, body],
    );
  });

  if (!message) {
    // «پیدا نشد» و «بسته است» عمداً یک پیام می‌گیرند تا شناسهٔ تیکتِ دیگران
    // قابلِ کشف نباشد.
    return { ok: false, errors: ["این تیکت پیدا نشد یا بسته شده است."] };
  }

  revalidatePath("/panel/support");
  return { ok: true, data: { id: message.id } };
}

/** کاربر تیکتِ خودش را می‌بندد. */
export async function closeTicket(ticketId: unknown): Promise<ActionResult<null>> {
  const user = await requireUser();
  if (!isUuid(ticketId)) return { ok: false, errors: ["این تیکت پیدا نشد."] };

  const affected = await execute(
    `update plus_tickets set status = 'closed', last_activity_at = now(), user_unread = false
      where id = $1 and user_id = $2 and status <> 'closed'`,
    [ticketId, user.id],
  );
  if (!affected) return { ok: false, errors: ["این تیکت پیدا نشد."] };

  revalidatePath("/panel/support");
  return { ok: true, data: null };
}

/** باز کردنِ تیکت، نشانِ «پاسخ تازه» را برمی‌دارد. */
export async function markTicketRead(ticketId: unknown): Promise<void> {
  const user = await requireUser();
  if (!isUuid(ticketId)) return;

  await execute(
    `update plus_tickets set user_unread = false where id = $1 and user_id = $2 and user_unread`,
    [ticketId, user.id],
  );
}
