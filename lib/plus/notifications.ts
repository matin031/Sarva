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
 * نتیجهٔ ثبتِ اعلان.
 *
 * ⚠️ سه حالت و نه دو، چون «ساخته نشد» دو معنای کاملاً متفاوت دارد:
 *
 *   • `created`   — ردیف نوشته شد.
 *   • `duplicate` — کلیدِ dedupe از قبل بود. این یک **موفقیت** است؛ دقیقاً
 *                   همان چیزی که `dedupeKey` برایش وجود دارد.
 *   • `failed`    — چیزی خراب است: ستون نیست، `kind` در CHECK نیست
 *                   (migration اجرا نشده)، یا دیتابیس در دسترس نیست.
 *
 * قاطی کردنِ دوتای آخر همان چیزی بود که باید رفع می‌شد.
 */
export type NotifyResult = "created" | "duplicate" | "failed";

/**
 * ثبتِ یک اعلان.
 *
 * ⚠️ هرگز throw نمی‌کند. اعلان یک کارِ جانبی است؛ اگر شکستش بتواند خرید یا
 * پاسخِ تیکت را بشکند، یک جدولِ فرعی به مسیرِ حیاتی وصل شده که نباید.
 *
 * ⚠️⚠️ ولی «throw نمی‌کند» با «بی‌صدا رد می‌شود» یکی نیست — و تا دیروز یکی
 * بود.
 *
 * نسخهٔ قبلی `INSERT IGNORE` می‌زد. آن دستور *هر* خطایی را به هشدار تبدیل
 * می‌کند و نه فقط کلیدِ تکراری: ستونِ ناموجود، جدولِ ناموجود، و مهم‌تر از
 * همه نقضِ CHECK روی `kind`. یعنی اگر مهاجرتی که مقدارِ تازهٔ `kind` را
 * اضافه می‌کند روی سرور اجرا نشده بود، اعلان **بی‌صدا ناپدید می‌شد** و
 * `execute` هم موفق برمی‌گشت. نه خطایی، نه لاگی، نه ردیفی.
 *
 * حالا `ON DUPLICATE KEY UPDATE id = id` جایش را گرفته: *فقط* کلیدِ تکراری
 * را می‌بلعد و هر خطای دیگری واقعاً throw می‌شود تا اینجا گرفته و با صدای
 * بلند ثبت شود.
 */
export async function notify(params: NotifyParams): Promise<NotifyResult> {
  const id = randomUUID();

  try {
    /* ⚠️ `on duplicate key update id = id` و نه `insert ignore`.
       یک no-opِ هدفمند: تنها چیزی که بی‌صدا رد می‌شود، برخورد با
       `(user_id, dedupe_key)` است — همان چیزی که `dedupeKey` برایش هست. */
    await execute(
      `insert into plus_notifications
         (id, user_id, kind, title, body, href, dedupe_key)
       values (?, ?, ?, ?, ?, ?, ?)
       on duplicate key update id = id`,
      [
        id,
        params.userId,
        params.kind,
        params.title,
        params.body ?? null,
        params.href ?? null,
        params.dedupeKey ?? null,
      ],
    );

    /* ⚠️ «درج شد یا تکراری بود؟» از روی `affectedRows` تشخیص داده
       **نمی‌شود**.

       مستندات می‌گویند برای `ON DUPLICATE KEY UPDATE` مقدارش برای درج ۱ و
       برای به‌روزرسانیِ بی‌تغییر ۰ است — و در کلاینتِ خط فرمان دقیقاً همین
       است. ولی از مسیرِ statementهای آماده‌ی این درایور، هر دو حالت ۱
       برمی‌گردانند (آزموده شد). تکیه به آن یعنی هر اعلانِ تکراری «تازه»
       گزارش شود.

       پس وقتی کلیدِ dedupe داریم، یک نگاهِ ارزان به ایندکسِ یکتا قطعی
       جواب می‌دهد: اگر شناسهٔ ذخیره‌شده همانی باشد که ما ساختیم، درج شده.
       بدونِ کلیدِ dedupe اصلاً برخوردی ممکن نیست و این کوئری هم زده
       نمی‌شود. */
    if (params.dedupeKey == null) return "created";

    const stored = await queryOne<{ id: string }>(
      `select id from plus_notifications where user_id = ? and dedupe_key = ?`,
      [params.userId, params.dedupeKey],
    );
    return stored?.id === id ? "created" : "duplicate";
  } catch (err) {
    /* ⚠️ «مهاجرت اجرا نشده» از «دیتابیس خراب است» جدا گزارش می‌شود.
       اولی یک کارِ انجام‌نشدهٔ استقرار است و راه‌حلش یک دستور است؛ دومی
       یک حادثه. یک پیامِ عمومی برای هر دو، آن یکی را که راه‌حلِ ساده دارد
       زیرِ نویز دفن می‌کرد. */
    const deployment = isSchemaError(err);

    logger.error(
      deployment
        ? "ثبت اعلان ناموفق بود — به‌نظر می‌رسد مهاجرت دیتابیس اجرا نشده"
        : "ثبت اعلان ناموفق بود",
      {
        event: deployment ? "notification.schema_missing" : "plus.notification.failed",
        err,
        notification_kind: params.kind,
        ...(deployment ? { hint: "npm run db:migrate" } : {}),
      },
    );

    return "failed";
  }
}

/**
 * آیا این خطا یعنی «اسکیما با کد جور نیست»؟
 *
 * ⚠️ بر اساس *کدِ* خطا و نه متنِ پیام: متن با زبان و نسخهٔ سرور عوض می‌شود.
 *
 *   1054 ER_BAD_FIELD_ERROR          — ستون نیست
 *   1146 ER_NO_SUCH_TABLE            — جدول نیست
 *   3819 ER_CHECK_CONSTRAINT_VIOLATED (MySQL 8)
 *   4025 ER_CONSTRAINT_FAILED         (MariaDB) — `kind`ِ تازه در CHECK نیست
 */
function isSchemaError(err: unknown): boolean {
  const code = (err as { errno?: unknown })?.errno;
  return code === 1054 || code === 1146 || code === 3819 || code === 4025;
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
