import "server-only";
import { execute, queryOne } from "@/lib/db";

/**
 * «می‌خواهم پیامک/ایمیل بگیرم یا نه» — یک واقعیتِ حساب و نه یک تنظیمِ
 * مرورگر.
 *
 * ⚠️ چرا دو ستون روی `users` و نه یک جدولِ تنظیماتِ کاربر: چون فقط همین دو
 * تا هستند و احتمالاً می‌مانند. یک جدولِ کلید-مقدارِ عمومی برای دو بولین،
 * هر خواندنِ ساده را به یک join تبدیل می‌کرد — و `lib/notify` این را در
 * مسیرِ هر ارسال می‌خواند.
 *
 * ⚠️ و خاموش کردنشان **کدِ ورود و بازیابیِ رمز را خاموش نمی‌کند**. آن‌ها
 * پیامِ اطلاع‌رسانی نیستند؛ بدونشان کاربر اصلاً وارد نمی‌شود. اگر این دو
 * کلید آن‌ها را هم می‌گرفتند، کاربری که «پیامک نمی‌خواهم» را زده بود،
 * فردا از حسابِ خودش بیرون می‌ماند.
 */

export type NotifyPreferences = {
  sms: boolean;
  email: boolean;
};

export async function getNotifyPreferences(userId: string): Promise<NotifyPreferences> {
  const row = await queryOne<{ notify_sms: number; notify_email: number }>(
    "select notify_sms, notify_email from users where id = ?",
    [userId],
  );

  /* ⚠️ نبودِ ردیف به «روشن» ترجمه می‌شود و نه «خاموش». این حالت در عمل
     نمی‌افتد (کاربرِ واردشده ردیف دارد)، ولی اگر بیفتد، پیش‌فرضِ خاموش یعنی
     کاربر بی‌صدا هیچ پیامی نگیرد و هیچ‌کس نفهمد چرا. */
  return {
    sms: row ? row.notify_sms === 1 : true,
    email: row ? row.notify_email === 1 : true,
  };
}

/**
 * ذخیرهٔ ترجیحات.
 *
 * ⚠️ شرطِ مالکیت در خودِ دستور است (`where id = ?`) و نه در یک بررسیِ
 * جداگانه — همان قاعده‌ای که کلِ `lib/plus/notifications.ts` رویش بنا شده.
 */
export async function setNotifyPreferences(
  userId: string,
  prefs: NotifyPreferences,
): Promise<void> {
  await execute(
    "update users set notify_sms = ?, notify_email = ?, updated_at = now(6) where id = ?",
    [prefs.sms ? 1 : 0, prefs.email ? 1 : 0, userId],
  );
}
