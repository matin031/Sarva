import "server-only";
import { execute } from "@/lib/db";
import { getSetting } from "@/lib/settings";

/**
 * ارسال پیامک، پشت یک واسط.
 *
 * امروز هیچ بخشی از سایت پیامک نمی‌فرستد و درایور پیش‌فرض mock است.
 *
 * ⚠️ تغییر مهم نسبت به نسخهٔ قبلی: پیکربندی از **lib/settings** خوانده می‌شود
 * و نه مستقیم از process.env. یعنی وقتی پنل پیامک خریداری شد، راه‌اندازی‌اش
 * «وارد کردن کلید در /admin/settings» است — نه ویرایش .env روی سرور و
 * ری‌استارت کانتینر. متغیرهای محیطی همچنان کار می‌کنند، ولی به‌عنوان مقدارِ
 * پیش‌فرض (getSetting اول دیتابیس را می‌بیند و بعد env را).
 *
 * پیامد فنی‌اش این است که smsAdapter() حالا async است: خواندن تنظیم یک کوئری
 * دیتابیس است (با کش یک‌دقیقه‌ای). چون تنها مصرف‌کننده‌اش sendSms است، این
 * تغییر جای دیگری را لمس نمی‌کند.
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
    // ⚠️ متن پیامک عمداً چاپ *نمی‌شود*.
    //
    // نسخهٔ قبلی کل بدنه را در لاگ می‌نوشت، که موقع mock بی‌ضرر به نظر می‌رسید
    // — ولی اولین مصرف‌کنندهٔ واقعیِ این واسط «ورود با کد پیامکی» است، و آن
    // یعنی کدهای یک‌بارمصرف در `docker compose logs` می‌نشستند. شمارهٔ گیرنده
    // هم بریده می‌شود.
    const masked = message.to.replace(/\d(?=\d{4})/g, "*");
    console.log(`[sms:mock] → ${masked} (${message.body.length} نویسه)`);
    return { providerMessageId: null };
  }
}

// ---------------------------------------------------- سرویس‌های واقعی --

/**
 * جای پیاده‌سازی سرویس‌های واقعی.
 *
 * عمداً هنوز خالی است: نوشتن کدِ کاوه‌نگار یا ملی‌پیامک بدون داشتن حساب و
 * دیدن پاسخ واقعی‌شان یعنی کدی که هیچ‌وقت تست نشده و اولین بار در production
 * اجرا می‌شود. وقتی پنل خریداری شد، اینجا یک کلاس اضافه می‌شود و نامش به
 * SETTING_SPECS["sms.driver"].options می‌رود.
 *
 * تا آن موقع، انتخاب هر سرویسی در پنل به mock برمی‌گردد و یک هشدار در لاگ
 * خطا می‌نشیند — که یعنی مدیر در /admin/activity می‌بیند که پیامک واقعاً
 * نرفته، به‌جای اینکه سکوت را «رفت» فرض کند.
 */
const IMPLEMENTED_DRIVERS = new Set(["mock"]);

// --------------------------------------------------------------- انتخاب --

export async function smsAdapter(): Promise<SmsAdapter> {
  const driver = ((await getSetting("sms.driver")) ?? "mock").toLowerCase();

  if (!IMPLEMENTED_DRIVERS.has(driver)) {
    // عمداً throw نمی‌کند: اگر کسی سرویسی را انتخاب کند که هنوز پیاده‌سازی
    // نشده، سایت نباید از کار بیفتد. پیامک نرفتن بهتر از سایت بالا نیامدن است.
    console.warn(`[sms] سرویس «${driver}» هنوز پیاده‌سازی نشده — از حالت غیرفعال استفاده شد.`);
  }

  return new MockSmsAdapter();
}

/** آیا پیامک واقعاً پیکربندی شده؟ — برای نمایش وضعیت در پنل تنظیمات. */
export async function smsStatus(): Promise<{
  driver: string;
  implemented: boolean;
  hasApiKey: boolean;
  hasSender: boolean;
}> {
  const driver = ((await getSetting("sms.driver")) ?? "mock").toLowerCase();
  return {
    driver,
    implemented: IMPLEMENTED_DRIVERS.has(driver),
    hasApiKey: Boolean(await getSetting("sms.api_key")),
    hasSender: Boolean(await getSetting("sms.sender")),
  };
}

/**
 * ارسال + ثبت در sms_log.
 *
 * لاگ در دیتابیس است و نه فقط در stdout، چون وقتی سرویس واقعی آمد اولین سؤال
 * همیشه «آیا پیامک رفت؟» است — و لاگ کانتینر تا آن موقع چرخیده و رفته.
 */
export async function sendSms(message: SmsMessage): Promise<void> {
  const adapter = await smsAdapter();

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

    // تا در /admin/activity دیده شود — sms_log فقط تاریخچه است، این هشدار است.
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("sms", err, "ارسال پیامک");

    throw err;
  }
}
