import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query, queryOne } from "@/lib/db";
import { logger } from "@/lib/observability";
import type { PlusNotification, PlusNotificationKind } from "./types";

/**
 * اعلان‌های درون‌سایتی — عمداً کوچک.
 *
 * ⚠️ این «سامانهٔ نوتیفیکیشن» نیست و نباید بشود. فقط چند رویدادِ مشخص که
 * کاربر باید بعداً هم پیدایشان کند:
 *   • پلاس فعال یا تمدید شد
 *   • نزدیکِ پایان است / تمام شد
 *   • پشتیبانی پاسخ داد
 *   • پرداختی هست که تکلیفش روشن نیست
 *
 * ایمیل و پیامک اینجا نیست: بدونِ رضایتِ صریح و بدونِ provider، پیامِ خارجی
 * فرستاده نمی‌شود.
 */

export type NotifyParams = {
  userId: string;
  kind: PlusNotificationKind;
  title: string;
  body?: string | null;
  /** فقط مسیرِ داخلی. constraint دیتابیس هم همین را می‌گوید. */
  href?: string | null;
  /**
   * کلیدِ یکتاسازی.
   *
   * ⚠️ بدونِ این، هشدارِ «۳ روز تا پایان اشتراک» هر بار که کاربر صفحه را باز
   * می‌کند یک ردیفِ تازه می‌ساخت و تا پایانِ اشتراک صدها اعلانِ یکسان
   * می‌شد. با آن، همان یک بار ساخته می‌شود.
   */
  dedupeKey?: string | null;
};

/**
 * ثبتِ یک اعلان.
 *
 * ⚠️ هرگز throw نمی‌کند. اعلان یک کارِ جانبی است؛ اگر شکستش بتواند خرید یا
 * پاسخِ تیکت را بشکند، یک جدولِ فرعی به مسیرِ حیاتی وصل شده که نباید.
 */
export async function notify(params: NotifyParams): Promise<void> {
  try {
    // ⚠️ `insert ignore` جای `on conflict … do nothing` را می‌گیرد: اگر
    // اعلانی با همان `dedupe_key` برای همان کاربر باشد، ردیفِ دوم ساخته
    // نمی‌شود. بدون آن، هشدارِ «۳ روز تا پایان اشتراک» هر بار که کاربر صفحه
    // را باز می‌کند یک ردیفِ تازه می‌ساخت.
    await execute(
      `insert ignore into plus_notifications
         (id, user_id, kind, title, body, href, dedupe_key)
       values (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        params.userId,
        params.kind,
        params.title,
        params.body ?? null,
        params.href ?? null,
        params.dedupeKey ?? null,
      ],
    );
  } catch (err) {
    logger.error("ثبت اعلان سروا پلاس ناموفق بود", {
      event: "plus.notification.failed",
      err,
      notification_kind: params.kind,
    });
  }
}

/** آخرین اعلان‌های کاربر. سقفِ سخت دارد تا صفحهٔ پنل هیچ‌وقت هزار ردیف نکشد. */
export async function listNotifications(
  userId: string,
  limit = 20,
): Promise<PlusNotification[]> {
  const rows = await query<{
    id: string;
    kind: PlusNotificationKind;
    title: string;
    body: string | null;
    href: string | null;
    read_at: string | null;
    created_at: string;
  }>(
    `select id, kind, title, body, href, read_at, created_at
       from plus_notifications
      where user_id = ?
      order by created_at desc, id
      limit ?`,
    [userId, Math.min(Math.max(limit, 1), 50)],
  );

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    `select count(*) as n from plus_notifications where user_id = ? and read_at is null`,
    [userId],
  );
  return row?.n ?? 0;
}

/** همه را خوانده‌شده علامت می‌زند — شرطِ مالکیت در همان دستور. */
export async function markNotificationsRead(userId: string): Promise<number> {
  return execute(
    `update plus_notifications set read_at = now(6)
      where user_id = ? and read_at is null`,
    [userId],
  );
}

/**
 * اعلانِ «خوش‌آمد» که هنوز دیده نشده.
 *
 * ⚠️ چرا از همین جدول و نه از localStorage:
 *
 * «این پیام را قبلاً دیده‌ام» یک واقعیتِ *حساب* است، نه یک تنظیمِ دستگاه.
 * با localStorage، همان کاربر روی گوشی‌اش دوباره پیامِ «سروا پلاس فعال شد»
 * را می‌دید — و بدتر، پاک کردنِ داده‌های مرورگر آن را برای همیشه تکرار
 * می‌کرد. اینجا خوانده‌شدن یک ردیف در دیتابیس است، پس دقیقاً یک بار دیده
 * می‌شود.
 *
 * ⚠️ و تمدید با فعال‌سازیِ اول یکی نیست: `plus_renewed` نباید کلِ onboarding
 * را تکرار کند، فقط یک تأییدِ کوتاه می‌گیرد.
 */
export async function getUnreadWelcome(
  userId: string,
): Promise<{ id: string; kind: PlusNotificationKind } | null> {
  const row = await queryOne<{ id: string; kind: PlusNotificationKind }>(
    `select id, kind
       from plus_notifications
      where user_id = ?
        and read_at is null
        and kind in ('plus_activated', 'plus_renewed')
      order by created_at desc
      limit 1`,
    [userId],
  );
  return row ?? null;
}

/** یک اعلانِ مشخص را خوانده‌شده می‌کند — با شرطِ مالکیت در همان دستور. */
export async function markNotificationRead(userId: string, id: string): Promise<void> {
  await execute(
    `update plus_notifications set read_at = now(6)
      where id = ? and user_id = ? and read_at is null`,
    [id, userId],
  );
}
