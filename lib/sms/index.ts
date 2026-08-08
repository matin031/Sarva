import "server-only";
import { execute } from "@/lib/db";

/**
 * ارسال پیامک، پشت یک واسط.
 *
 * امروز هیچ بخشی از سایت پیامک نمی‌فرستد و تنها پیاده‌سازیِ موجود mock است.
 * این فایل الان نوشته شده تا وقتی پنل پیامک خریداری شد، اضافه کردنش یک کلاس
 * تازه و یک مقدار در .env باشد — نه گشتن در کد دنبال جاهایی که باید پیامک
 * بروند.
 *
 * فرم ورود (components/UI/MobileLoginForm.tsx) یک تبِ «ورود با موبایل» دارد
 * که هرگز کار نکرده؛ وقتی سرویس پیامک آمد، همان تب اولین مصرف‌کنندهٔ این
 * واسط خواهد بود.
 */

export type SmsMessage = {
  to: string;
  body: string;
};

export interface SmsAdapter {
  readonly name: string;
  send(message: SmsMessage): Promise<{ providerMessageId: string | null }>;
}

// ------------------------------------------------------------------ mock --

class MockSmsAdapter implements SmsAdapter {
  readonly name = "mock";

  async send(message: SmsMessage): Promise<{ providerMessageId: string | null }> {
    // در لاگ چاپ می‌شود تا در محیط توسعه بشود کد را دید و جریان را تست کرد
    // بدون اینکه سرویسی در کار باشد.
    console.log(`[sms:mock] → ${message.to}: ${message.body}`);
    return { providerMessageId: null };
  }
}

// --------------------------------------------------------------- انتخاب --

let cached: SmsAdapter | null = null;

export function smsAdapter(): SmsAdapter {
  if (cached) return cached;

  const driver = (process.env.SMS_DRIVER ?? "mock").toLowerCase();

  if (driver !== "mock") {
    // عمداً throw نمی‌کند: اگر کسی SMS_DRIVER را روی سرویسی بگذارد که هنوز
    // پیاده‌سازی نشده، سایت نباید بالا نیاید. پیامک نرفتن بهتر از سایت
    // بالا نیامدن است.
    console.warn(`[sms] SMS_DRIVER «${driver}» هنوز پیاده‌سازی نشده — از mock استفاده شد.`);
  }

  cached = new MockSmsAdapter();
  return cached;
}

/**
 * ارسال + ثبت در sms_log.
 *
 * لاگ در دیتابیس است و نه فقط در stdout، چون وقتی سرویس واقعی آمد اولین سؤال
 * همیشه «آیا پیامک رفت؟» است — و لاگ کانتینر تا آن موقع چرخیده و رفته.
 */
export async function sendSms(message: SmsMessage): Promise<void> {
  const adapter = smsAdapter();

  try {
    const result = await adapter.send(message);
    await execute(
      `insert into sms_log (to_number, body, provider, status, provider_message_id)
       values ($1, $2, $3, 'sent', $4)`,
      [message.to, message.body, adapter.name, result.providerMessageId],
    );
  } catch (err) {
    await execute(
      `insert into sms_log (to_number, body, provider, status, error)
       values ($1, $2, $3, 'failed', $4)`,
      [message.to, message.body, adapter.name, (err as Error).message.slice(0, 500)],
    ).catch(() => {});
    throw err;
  }
}
