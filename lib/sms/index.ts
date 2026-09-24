import { randomUUID } from "node:crypto";
import "server-only";
import { execute } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { logger } from "@/lib/observability";
import { normalizeSmsDriver } from "./driver";
import { SmsIrAdapter, parseTemplateId } from "./smsir";
import type {
  SmsAdapter,
  SmsMessage,
  SmsOtpMessage,
  SmsSendResult,
  SmsTemplateMessage,
} from "./types";

/**
 * ارسال پیامک، پشتِ یک واسط.
 *
 * سرویسِ واقعی **SMS.ir** است و تنها سرویسِ واقعی هم همان است. `mock` فقط یک
 * حالت است و نه یک سرویس: «پیامک خاموش» — برای توسعه و برای وقتی که مدیر
 * عمداً ارسال را قطع کرده.
 *
 * ⚠️ پیکربندی از **lib/settings** خوانده می‌شود و نه مستقیم از `process.env`.
 * یعنی راه‌اندازی «وارد کردنِ کلید در ‎/admin/settings‎» است و نه «ویرایشِ
 * ‎.env‎ روی سرور و ری‌استارتِ کانتینر». متغیرهای محیطی همچنان کار می‌کنند،
 * ولی به‌عنوان مقدارِ پیش‌فرض (getSetting اول دیتابیس را می‌بیند و بعد env).
 *
 * پیامدِ فنی‌اش این است که `smsAdapter()` async است: خواندنِ تنظیم یک کوئریِ
 * دیتابیس است (با کشِ یک‌دقیقه‌ای).
 */

export type { SmsAdapter, SmsMessage, SmsOtpMessage, SmsSendResult, SmsTemplateMessage };

// -------------------------------------------------------------------- mock --

class MockSmsAdapter implements SmsAdapter {
  readonly name = "mock";

  async send(message: SmsMessage): Promise<SmsSendResult> {
    // ⚠️ متنِ پیامک عمداً چاپ *نمی‌شود* و شمارهٔ گیرنده هم نه. یک نسخهٔ قدیمی
    // کلِ بدنه را لاگ می‌کرد؛ موقعِ mock بی‌ضرر به نظر می‌رسید، ولی
    // مصرف‌کنندهٔ اصلیِ این واسط «ورود با کدِ پیامکی» است و آن یعنی کدهای
    // یک‌بارمصرف در `docker compose logs` می‌نشستند.
    logger.debug("پیامک آزمایشی (ارسال واقعی انجام نشد)", {
      event: "sms.send.mocked",
      sms_driver: this.name,
      body_length: message.body.length,
    });
    return { providerMessageId: null };
  }

  async sendTemplate(message: SmsTemplateMessage): Promise<SmsSendResult> {
    logger.debug("پیامکِ قالبیِ آزمایشی (ارسال واقعی انجام نشد)", {
      event: "sms.send.mocked",
      sms_driver: this.name,
      sms_kind: "template",
      // ⚠️ نه شماره و نه مقدارِ متغیرها — فقط اینکه کدام قالب صدا زده شد.
      template_id: message.templateId,
    });
    return { providerMessageId: null };
  }

  async sendOtp(message: SmsOtpMessage): Promise<SmsSendResult> {
    logger.debug("کدِ پیامکی آزمایشی (ارسال واقعی انجام نشد)", {
      event: "sms.send.mocked",
      sms_driver: this.name,
      sms_kind: "otp",
      // ⚠️ نه خودِ کد و نه شماره — فقط اینکه کدی ساخته شده بود.
      code_length: message.code.length,
    });
    return { providerMessageId: null };
  }
}

// ------------------------------------------------------------------ انتخاب --

/**
 * آداپترِ فعال، بر اساسِ تنظیمات.
 *
 * ⚠️ هیچ‌کدام از حالت‌های «پیکربندیِ ناقص» throw نمی‌کنند و همه به mock
 * برمی‌گردند. دلیلش همان است که از اول بود: نبودِ یک کلید نباید سایت را از
 * کار بیندازد. در عوض هر کدام یک هشدارِ صریح در لاگ می‌گذارند و کارتِ وضعیتِ
 * ‎/admin/settings‎ هم دقیقاً می‌گوید چه چیزی کم است — وگرنه «پیامک نمی‌رود و
 * معلوم نیست چرا» تبدیل به یک روز کارِ تلف‌شده می‌شود.
 */
export async function smsAdapter(): Promise<SmsAdapter> {
  const configured = await getSetting("sms.driver");
  const driver = normalizeSmsDriver(configured);

  if (driver === null) {
    logger.warn("سرویس پیامکِ ناشناخته در تنظیمات؛ از حالت غیرفعال استفاده شد", {
      event: "sms.driver.unimplemented",
      sms_driver: configured ?? "(خالی)",
    });
    return new MockSmsAdapter();
  }

  if (driver === "mock") return new MockSmsAdapter();

  const [apiKey, templateId, sender] = await Promise.all([
    getSetting("sms.api_key"),
    getSetting("sms.template_id"),
    getSetting("sms.sender"),
  ]);

  if (!apiKey) {
    logger.warn("SMS.ir انتخاب شده ولی کلید API ثبت نشده؛ پیامک ارسال نشد", {
      event: "sms.driver.misconfigured",
      sms_driver: driver,
      // ⚠️ خودِ کلید هرگز لاگ نمی‌شود — فقط «هست یا نیست».
      has_api_key: false,
    });
    return new MockSmsAdapter();
  }

  let template: number;
  try {
    template = parseTemplateId(templateId);
  } catch (err) {
    logger.warn("شناسهٔ قالبِ SMS.ir درست نیست؛ پیامک ارسال نشد", {
      event: "sms.driver.misconfigured",
      sms_driver: driver,
      err,
    });
    return new MockSmsAdapter();
  }

  /* ⚠️ شمارهٔ خط برای کدِ ورود لازم **نیست**: مسیرِ Verify خودش خطِ خدماتیِ
     حساب را انتخاب می‌کند. فقط پیامکِ متنِ آزاد به آن نیاز دارد، و اگر ثبت
     نشده باشد همان‌جا صریح خطا می‌دهد. */
  const lineNumber = sender && /^\d+$/.test(sender.trim()) ? Number(sender.trim()) : null;

  return new SmsIrAdapter(apiKey, template, lineNumber);
}

// -------------------------------------------------------------- کدِ ورود --

/**
 * ارسالِ کدِ یک‌بارمصرف با قالبِ تأییدشده + ثبت در `sms_log`.
 *
 * ⚠️ چرا مسیرِ جدا از `sendSms`: این دو در سرویس دو endpointِ متفاوت‌اند، دو
 * جور محدودیت دارند و دو جور خطا می‌دهند. خطِ خدماتی متنِ آزاد نمی‌پذیرد و
 * متنِ آزادِ حاویِ کد یا رد می‌شود یا از خطِ تبلیغاتی می‌رود — که هم غیرمجاز
 * است و هم دیرتر می‌رسد.
 *
 * ⚠️ و آنچه در `sms_log` ثبت می‌شود **خودِ کد را ندارد**. نوشتنش در جدول یعنی
 * هر کسی که دسترسیِ خواندنِ دیتابیس دارد می‌تواند واردِ حساب‌ها شود.
 */
export async function sendOtpSms(message: SmsOtpMessage): Promise<void> {
  const adapter = await smsAdapter();
  const startedAt = performance.now();
  const logBody = "[کد یک‌بارمصرف]";

  try {
    const result = await adapter.sendOtp(message);
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info("کد پیامکی ارسال شد", {
      event: "sms.send.succeeded",
      sms_driver: adapter.name,
      sms_kind: "otp",
      // شناسهٔ پیام نه راز است و نه شخصی؛ تنها راهِ پیگیری در پنلِ سرویس است.
      provider_message_id: result.providerMessageId,
      duration_ms: durationMs,
    });
    /* ⚠️ `duration_ms` در جدول هم نوشته می‌شود و نه فقط در لاگ.

       سؤالی که این ستون برایش اضافه شد: «کد با ده دقیقه تأخیر می‌رسد —
       از ماست یا از سرویس؟» لاگِ هاستِ اشتراکی می‌چرخد و می‌رود، و اولین
       سؤال همیشه دربارهٔ چیزی است که *دیروز* افتاده.

       این عدد **مدتِ رفت‌وبرگشتِ HTTP** است و نه زمانِ رسیدنِ پیامک. اگر
       کوچک باشد و پیامک دیر برسد، تأخیر در صفِ سرویس یا اپراتور است.
       (`npm run sms:latency` همین را گزارش می‌کند.) */
    await execute(
      `insert into sms_log (id, to_number, body, provider, status, provider_message_id, duration_ms)
       values (?, ?, ?, ?, 'sent', ?, ?)`,
      [randomUUID(), message.to, logBody, adapter.name, result.providerMessageId, durationMs],
    );
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    logger.error("ارسال کد پیامکی ناموفق بود", {
      event: "sms.send.failed",
      err,
      sms_driver: adapter.name,
      sms_kind: "otp",
      duration_ms: durationMs,
    });

    /* ⚠️ مدت برای ردیفِ شکست‌خورده هم ثبت می‌شود و شاید مهم‌تر باشد:
       «خطا بعد از ۳۰ ثانیه» یک timeout است و «خطا بعد از ۲۰۰ میلی‌ثانیه»
       یک ردِ منطقی (اعتبار تمام شده، قالبِ غلط). دو مشکلِ کاملاً متفاوت که
       بدونِ این عدد یک‌شکل دیده می‌شوند. */
    await execute(
      `insert into sms_log (id, to_number, body, provider, status, error, duration_ms)
       values (?, ?, ?, ?, 'failed', ?, ?)`,
      [
        randomUUID(),
        message.to,
        logBody,
        adapter.name,
        (err as Error).message.slice(0, 500),
        durationMs,
      ],
    ).catch(() => {});

    const { recordError } = await import("@/lib/admin/audit");
    await recordError("sms", err, "ارسال کد پیامکی");

    throw err;
  }
}

// ------------------------------------------------------------------ وضعیت --

/** آیا پیامک واقعاً پیکربندی شده؟ — برای نمایشِ وضعیت در پنلِ تنظیمات. */
export async function smsStatus(): Promise<{
  /** مقدارِ متعارف، یا همان چیزی که ذخیره شده اگر ناشناخته باشد. */
  driver: string;
  /** درایورِ شناخته‌شده و پیاده‌سازی‌شده است؟ */
  implemented: boolean;
  hasApiKey: boolean;
  hasTemplateId: boolean;
  /** فقط برای پیامکِ متنِ آزاد لازم است و نه برای کدِ ورود. */
  hasSender: boolean;
}> {
  const configured = await getSetting("sms.driver");
  const driver = normalizeSmsDriver(configured);
  const [apiKey, templateId, sender] = await Promise.all([
    getSetting("sms.api_key"),
    getSetting("sms.template_id"),
    getSetting("sms.sender"),
  ]);

  let templateOk = false;
  try {
    parseTemplateId(templateId);
    templateOk = true;
  } catch {
    templateOk = false;
  }

  return {
    driver: driver ?? (configured ?? "").trim(),
    implemented: driver !== null,
    hasApiKey: Boolean(apiKey),
    hasTemplateId: templateOk,
    hasSender: Boolean(sender),
  };
}

// --------------------------------------------------------------- متنِ آزاد --

/**
 * ارسالِ پیامکِ متنِ آزاد + ثبت در `sms_log`.
 *
 * لاگ در دیتابیس است و نه فقط در stdout، چون اولین سؤال همیشه «آیا پیامک
 * رفت؟» است — و لاگِ کانتینر تا آن موقع چرخیده و رفته.
 */
export async function sendSms(message: SmsMessage): Promise<void> {
  const adapter = await smsAdapter();
  const startedAt = performance.now();

  try {
    const result = await adapter.send(message);
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info("پیامک ارسال شد", {
      event: "sms.send.succeeded",
      sms_driver: adapter.name,
      provider_message_id: result.providerMessageId,
      duration_ms: durationMs,
    });
    await execute(
      `insert into sms_log (id, to_number, body, provider, status, provider_message_id, duration_ms)
       values (?, ?, ?, ?, 'sent', ?, ?)`,
      [randomUUID(), message.to, message.body, adapter.name, result.providerMessageId, durationMs],
    );
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    logger.error("ارسال پیامک ناموفق بود", {
      event: "sms.send.failed",
      err,
      sms_driver: adapter.name,
      duration_ms: durationMs,
    });

    await execute(
      `insert into sms_log (id, to_number, body, provider, status, error, duration_ms)
       values (?, ?, ?, ?, 'failed', ?, ?)`,
      [
        randomUUID(),
        message.to,
        message.body,
        adapter.name,
        (err as Error).message.slice(0, 500),
        durationMs,
      ],
    ).catch(() => {});

    // تا در ‎/admin/activity‎ دیده شود — `sms_log` فقط تاریخچه است، این هشدار است.
    const { recordError } = await import("@/lib/admin/audit");
    await recordError("sms", err, "ارسال پیامک");

    throw err;
  }
}

// -------------------------------------------------------- پیامکِ قالبی --

/**
 * ارسالِ پیامک با قالبِ تأییدشده + ثبت در `sms_log`.
 *
 * ⚠️ مصرف‌کننده‌اش `lib/notify` است و نه route ها. اینجا فقط «چطور فرستاده
 * می‌شود» زندگی می‌کند؛ «آیا باید فرستاده شود» (رضایتِ کاربر، تکراری بودن،
 * وجودِ شمارهٔ تأییدشده) تصمیمِ آن لایه است.
 *
 * ⚠️ آنچه در `sms_log.body` می‌نشیند فقط شمارهٔ قالب است و نه متغیرها.
 * متغیرها نامِ کاربر و تاریخِ اشتراکش‌اند — دادهٔ شخصی‌ای که یک جدولِ
 * تاریخچه دلیلی برای نگه داشتنش ندارد، و متنِ نهایی هم اصلاً دستِ ما نیست
 * (در پنلِ سرویس است).
 */
export async function sendTemplateSms(message: SmsTemplateMessage): Promise<void> {
  const adapter = await smsAdapter();
  const startedAt = performance.now();
  const logBody = `[قالب ${message.templateId}]`;

  try {
    const result = await adapter.sendTemplate(message);
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info("پیامک قالبی ارسال شد", {
      event: "sms.send.succeeded",
      sms_driver: adapter.name,
      sms_kind: "template",
      template_id: message.templateId,
      provider_message_id: result.providerMessageId,
      duration_ms: durationMs,
    });
    await execute(
      `insert into sms_log (id, to_number, body, provider, status, provider_message_id, duration_ms)
       values (?, ?, ?, ?, 'sent', ?, ?)`,
      [randomUUID(), message.to, logBody, adapter.name, result.providerMessageId, durationMs],
    );
  } catch (err) {
    const durationMs = Math.round(performance.now() - startedAt);
    logger.error("ارسال پیامک قالبی ناموفق بود", {
      event: "sms.send.failed",
      err,
      sms_driver: adapter.name,
      sms_kind: "template",
      template_id: message.templateId,
      duration_ms: durationMs,
    });

    await execute(
      `insert into sms_log (id, to_number, body, provider, status, error, duration_ms)
       values (?, ?, ?, ?, 'failed', ?, ?)`,
      [
        randomUUID(),
        message.to,
        logBody,
        adapter.name,
        (err as Error).message.slice(0, 500),
        durationMs,
      ],
    ).catch(() => {});

    const { recordError } = await import("@/lib/admin/audit");
    await recordError("sms", err, "ارسال پیامک قالبی");

    throw err;
  }
}
