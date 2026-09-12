import { randomUUID } from "node:crypto";
import "server-only";
import { execute } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { logger } from "@/lib/observability";

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
    logger.debug("پیامک آزمایشی (ارسال واقعی انجام نشد)", {
      event: "sms.send.mocked",
      sms_driver: this.name,
      body_length: message.body.length,
    });
    return { providerMessageId: null };
  }
}

// ---------------------------------------------------- سرویس‌های واقعی --

// ------------------------------------------------------------------ نجوا --

/** آدرسِ پیش‌فرضِ وب‌سرویسِ نجوا. با تنظیمِ `sms.base_url` قابلِ جایگزینی است. */
const NAJVA_ENDPOINT = "https://email.najva.com/v1/sms/transactional_sms/";

/**
 * نجوا (najva.com) — وب‌سرویسِ پیامکِ تراکنشی.
 *
 *   POST https://email.najva.com/v1/sms/transactional_sms/
 *   najva-token: najvasmskey-<کلید>
 *   { "sms_content": "...", "sender": "...", "mobile": "09..." }
 *
 * ⚠️ این کد **با سرویسِ واقعی آزمایش نشده است.** حساب هست ولی فرستادنِ یک
 * پیامکِ واقعی برای تست، هم هزینه دارد و هم به یک شمارهٔ واقعی می‌رود. پس
 * شکلِ درخواست از مستنداتِ نجوا آمده و نه از دیدنِ پاسخِ زنده. اولین ارسالِ
 * واقعی را در ‎/admin/activity‎ دنبال کنید؛ اگر ساختارِ پاسخ فرق داشت،
 * `providerMessageId` خالی می‌ماند ولی ارسال از کار نمی‌افتد.
 */
class NajvaSmsAdapter implements SmsAdapter {
  readonly name = "najva";

  constructor(
    private readonly apiKey: string,
    private readonly sender: string,
    private readonly endpoint: string,
  ) {}

  async send(message: SmsMessage): Promise<{ providerMessageId: string | null }> {
    /* ⚠️ نجوا کلید را با پیشوندِ `najvasmskey-` می‌خواهد. چون کلیدی که پنل
       نشان می‌دهد گاهی با پیشوند و گاهی بدونِ آن کپی می‌شود، اینجا فقط وقتی
       اضافه می‌شود که نباشد — وگرنه `najvasmskey-najvasmskey-…` می‌ساختیم و
       خطای احراز هویت می‌گرفتیم که دلیلش از پیام معلوم نمی‌شد. */
    const token = this.apiKey.startsWith("najvasmskey-")
      ? this.apiKey
      : `najvasmskey-${this.apiKey}`;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "najva-token": token,
      },
      body: JSON.stringify({
        sms_content: message.body,
        sender: this.sender,
        mobile: message.to,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const raw = await response.text().catch(() => "");

    if (!response.ok) {
      /* ⚠️ پاسخ بریده می‌شود چون در sms_log می‌نشیند و ممکن است خودِ متنِ
         پیامک — یعنی کدِ یک‌بارمصرف — را بازتاب دهد. */
      throw new Error(`نجوا پاسخ ${response.status} داد: ${raw.slice(0, 300)}`);
    }

    /* شناسهٔ پیام برای پیگیری. اگر نبود، ارسال موفق بوده و فقط پیگیری‌اش
       سخت‌تر است — پس دلیلی برای throw نیست. */
    let providerMessageId: string | null = null;
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const id = data.id ?? data.message_id ?? data.sms_id;
      if (typeof id === "string" || typeof id === "number") providerMessageId = String(id);
    } catch {
      /* پاسخ JSON نبود؛ مهم نیست، وضعیت ۲xx بوده. */
    }

    return { providerMessageId };
  }
}

// ---------------------------------------------------- سرویس‌های واقعی --

/**
 * سرویس‌هایی که واقعاً پیاده‌سازی شده‌اند.
 *
 * ⚠️ قاعده همان است که از اول بود: نامی که اینجا نیست، در پنل انتخاب‌شدنی
 * هست ولی به mock برمی‌گردد و یک هشدار در لاگ می‌نشیند — یعنی مدیر در
 * ‎/admin/activity‎ می‌بیند که پیامک نرفته، به‌جای اینکه سکوت را «رفت» فرض
 * کند. کاوه‌نگار و ملی‌پیامک هنوز نوشته نشده‌اند چون حسابشان را نداریم.
 */
const IMPLEMENTED_DRIVERS = new Set(["mock", "najva"]);

// --------------------------------------------------------------- انتخاب --

export async function smsAdapter(): Promise<SmsAdapter> {
  const driver = ((await getSetting("sms.driver")) ?? "mock").toLowerCase();

  if (!IMPLEMENTED_DRIVERS.has(driver)) {
    // عمداً throw نمی‌کند: اگر کسی سرویسی را انتخاب کند که هنوز پیاده‌سازی
    // نشده، سایت نباید از کار بیفتد. پیامک نرفتن بهتر از سایت بالا نیامدن است.
    logger.warn("سرویس پیامک هنوز پیاده‌سازی نشده؛ از حالت غیرفعال استفاده شد", {
      event: "sms.driver.unimplemented",
      sms_driver: driver,
    });
    return new MockSmsAdapter();
  }

  if (driver === "najva") {
    const [apiKey, sender, baseUrl] = await Promise.all([
      getSetting("sms.api_key"),
      getSetting("sms.sender"),
      getSetting("sms.base_url"),
    ]);

    /* ⚠️ نبودِ کلید به mock برمی‌گردد و throw نمی‌کند — همان منطقِ بالا.
       کسی که در پنل «نجوا» را انتخاب کرده ولی هنوز کلید نگذاشته، نباید
       ورودِ کاربرها را بشکند. هشدار در ‎/admin/activity‎ دیده می‌شود. */
    if (!apiKey || !sender) {
      logger.warn("نجوا انتخاب شده ولی کلید یا شمارهٔ فرستنده ثبت نشده؛ پیامک ارسال نشد", {
        event: "sms.driver.misconfigured",
        sms_driver: driver,
        has_api_key: Boolean(apiKey),
        has_sender: Boolean(sender),
      });
      return new MockSmsAdapter();
    }

    return new NajvaSmsAdapter(apiKey, sender, baseUrl || NAJVA_ENDPOINT);
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
  const startedAt = performance.now();

  try {
    const result = await adapter.send(message);
    logger.info("پیامک ارسال شد", {
      event: "sms.send.succeeded",
      sms_driver: adapter.name,
      duration_ms: Math.round(performance.now() - startedAt),
    });
    await execute(
      `insert into sms_log (id, to_number, body, provider, status, provider_message_id)
       values (?, ?, ?, ?, 'sent', ?)`,
      [randomUUID(), message.to, message.body, adapter.name, result.providerMessageId],
    );
  } catch (err) {
    logger.error("ارسال پیامک ناموفق بود", {
      event: "sms.send.failed",
      err,
      sms_driver: adapter.name,
      duration_ms: Math.round(performance.now() - startedAt),
    });

    await execute(
      `insert into sms_log (id, to_number, body, provider, status, error)
       values (?, ?, ?, ?, 'failed', ?)`,
      [randomUUID(), message.to, message.body, adapter.name, (err as Error).message.slice(0, 500)],
    ).catch(() => {});

    // تا در /admin/activity دیده شود — sms_log فقط تاریخچه است، این هشدار است.
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("sms", err, "ارسال پیامک");

    throw err;
  }
}
