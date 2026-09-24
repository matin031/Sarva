/**
 * SMS.ir — تنها سرویسِ پیامکِ واقعیِ سروا.
 *
 * ⚠️ این فایل عمداً نه `server-only` است و نه به `lib/db` وصل: تستِ آداپتر با
 * `node --test` اجرا می‌شود و در آن حالت `server-only` throw می‌کند. هر چیزی
 * که تنظیمات یا لاگِ دیتابیس می‌خواهد در `./index` مانده است.
 *
 * ── دو لایهٔ خطا ──────────────────────────────────────────────────────────
 * ⚠️ **۲۰۰ گرفتن یعنی «درخواست رسید»، نه «پیامک رفت».**
 *
 * SMS.ir برای خطاهای منطقی هم می‌تواند HTTP 200 بدهد و وضعیتِ واقعی را در
 * `data.status` بگذارد (۱ = موفق). اعتبارِ ناکافی، قالبِ تأییدنشده، متغیرِ
 * جاافتاده — همه از همین راه می‌آیند. اگر فقط کدِ HTTP چک می‌شد، همهٔ این‌ها
 * «ارسال‌شده» ثبت می‌شدند و کاربر تا ابد منتظرِ کدی می‌ماند که هرگز نرفته.
 *
 * ── چه چیزی هرگز از اینجا بیرون نمی‌رود ──────────────────────────────────
 * ⚠️ کلیدِ API، کدِ یک‌بارمصرف و شمارهٔ کاملِ کاربر در هیچ پیام یا لاگی نوشته
 * نمی‌شوند. خطایِ axios عمداً *بازنویسی* می‌شود و خودش رها نمی‌شود، چون
 * `err.config.headers` کلید را در خود دارد و اولین کسی که آن را جایی paste
 * کند، کلیدِ پنل را لو داده است.
 */

import type {
  SmsAdapter,
  SmsMessage,
  SmsOtpMessage,
  SmsSendResult,
  SmsTemplateMessage,
} from "./types";

/** نامِ درایور — همان چیزی که در پنل ذخیره و در `sms_log.provider` ثبت می‌شود. */
export const SMSIR_DRIVER = "smsir";

/**
 * نامِ متغیرِ قالب.
 *
 * ⚠️ باید *دقیقاً* با متغیرِ قالبِ تأییدشده یکی باشد. قالبِ سروا `#CODE#` است
 * و نامِ متغیرش در پنل `Code`. اگر این نام فرق کند، SMS.ir خطا نمی‌دهد —
 * پیامکی می‌فرستد که جای کد در آن خالی است.
 */
export const OTP_PARAMETER_NAME = "Code";

/** پاسخِ خامِ axios، در حدی که اینجا لازم است. */
export type SmsIrHttpResponse = { status: number; data: unknown };

/**
 * همان تکه‌ای از SDK رسمی که سروا صدا می‌زند.
 *
 * ⚠️ چرا یک interface و نه مستقیم خودِ `Smsir`: تزریق‌پذیری. تستِ آداپتر باید
 * بدونِ شبکه اجرا شود؛ بدونِ این، تنها راهِ آزمودنِ «پاسخِ ۲۰۰ ولی status ≠ ۱»
 * فرستادنِ پیامکِ واقعی بود.
 */
export interface SmsIrClient {
  SendVerifyCode(
    mobile: string,
    templateId: number,
    parameters: { name: string; value: string }[],
  ): Promise<SmsIrHttpResponse>;
  SendBulk(
    messageText: string,
    mobiles: string[],
    sendDateTime?: number | null,
    lineNumber?: number | null,
  ): Promise<SmsIrHttpResponse>;
}

// --------------------------------------------------------------- شماره --

/**
 * شکلِ متعارفِ سروا (`989123456789`) → شکلی که SMS.ir می‌پذیرد (`09123456789`).
 *
 * ⚠️ این تبدیل حذف‌شدنی نیست. `lib/auth/phone` همه‌جا `98…` ذخیره می‌کند و
 * SMS.ir شمارهٔ ایرانی را با `09` می‌خواهد؛ فرستادنِ `98…` خطای «شمارهٔ
 * نامعتبر» می‌گیرد — خطایی که چون فقط روی سرورِ اصلی دیده می‌شود، گران تمام
 * می‌شود.
 */
export function toSmsIrMobile(to: string): string {
  const digits = to.replace(/\D/g, "");

  const national = digits.startsWith("98")
    ? digits.slice(2)
    : digits.startsWith("0")
      ? digits.slice(1)
      : digits;

  if (!/^9\d{9}$/.test(national)) {
    // ⚠️ خودِ شماره در پیام نمی‌آید: این پیام به `sms_log` و لاگِ سرور می‌رود.
    throw new Error("شمارهٔ گیرنده برای SMS.ir معتبر نیست (باید موبایلِ ایرانی باشد).");
  }

  return `0${national}`;
}

// ---------------------------------------------------------- شناسهٔ قالب --

/**
 * شناسهٔ قالب از تنظیمات → عدد.
 *
 * ⚠️ در کد هاردکد نمی‌شود. قالب در پنلِ SMS.ir ساخته و تأیید می‌شود و
 * شناسه‌اش می‌تواند عوض شود (یا برای حسابِ دیگری فرق کند)؛ نوشتنش در کد یعنی
 * هر تغییرِ کوچکش یک deploy می‌خواهد.
 */
export function parseTemplateId(raw: string | null | undefined): number {
  /* ⚠️ ارقامِ فارسی هم قبول است: پنلِ SMS.ir شناسه را «۵۲۷۹۴۶» نشان می‌دهد و
     `Number` روی آن NaN می‌دهد — یعنی پیامک بی‌صدا با `no_template` رد می‌شد. */
  const trimmed = (raw ?? "")
    .trim()
    .replace(/[۰-۹٠-٩]/g, (d) => String(d.charCodeAt(0) - (d.charCodeAt(0) >= 0x06f0 ? 0x06f0 : 0x0660)));
  if (!trimmed) {
    throw new Error("شناسهٔ قالبِ پیامک ثبت نشده است (تنظیمات → پیامک → شناسهٔ قالب).");
  }

  const id = Number(trimmed);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("شناسهٔ قالبِ پیامک باید یک عددِ صحیحِ مثبت باشد.");
  }

  return id;
}

// ----------------------------------------------------------- پاسخ‌خوانی --

/** بدنهٔ پاسخِ SMS.ir. `status` وضعیتِ منطقی است و نه کدِ HTTP. */
type SmsIrBody = {
  status?: unknown;
  message?: unknown;
  data?: { messageId?: unknown; cost?: unknown } | null;
};

function asBody(data: unknown): SmsIrBody | null {
  return data !== null && typeof data === "object" ? (data as SmsIrBody) : null;
}

/** پیامِ سرویس، کوتاه‌شده — تا پاسخِ طولانی در `sms_log` ننشیند. */
function serviceMessage(body: SmsIrBody | null): string {
  const message = body?.message;
  return typeof message === "string" && message.trim()
    ? message.trim().slice(0, 200)
    : "بدون توضیح";
}

/**
 * پاسخِ موفق → شناسهٔ پیام. هر چیزِ دیگری throw می‌شود.
 *
 * ⚠️ `status === 1` تنها حالتِ موفق است، و نبودِ `messageId` هم شکست حساب
 * می‌شود: بدونِ شناسه هیچ راهی برای پیگیریِ «پیامک واقعاً رفت؟» نمی‌ماند و
 * همان سکوت است که «موفق» ثبت می‌شود.
 */
export function readSmsIrResult(response: SmsIrHttpResponse): SmsSendResult {
  if (!Number.isFinite(response.status) || response.status < 200 || response.status >= 300) {
    throw new Error(`SMS.ir پاسخ HTTP ${response.status} داد.`);
  }

  const body = asBody(response.data);
  if (!body) {
    throw new Error("پاسخ SMS.ir قابلِ خواندن نبود (بدنهٔ JSON نبود).");
  }

  const status = typeof body.status === "number" ? body.status : Number(body.status);
  if (status !== 1) {
    throw new Error(
      `SMS.ir خطای ${Number.isFinite(status) ? status : "نامشخص"} داد: ${serviceMessage(body)}`,
    );
  }

  const messageId = body.data?.messageId;
  if (messageId === undefined || messageId === null || messageId === "") {
    throw new Error("SMS.ir موفق پاسخ داد ولی شناسهٔ پیام نداد.");
  }

  return { providerMessageId: String(messageId) };
}

/**
 * هر چیزی که از SDK بیرون آمد → یک پیامِ خطای تمیز.
 *
 * ⚠️ خودِ خطای axios هرگز به لاگ نمی‌رود. سه دلیل: هدرِ `X-API-KEY` داخلش
 * است، بدنهٔ درخواست (یعنی کد و شماره) هم، و پیامِ پیش‌فرضش («Request failed
 * with status code 400») چیزی به کسی نمی‌گوید. آنچه به‌درد می‌خورد فقط کدِ
 * HTTP، کدِ منطقیِ سرویس و پیامِ خودِ سرویس است.
 */
export function describeSmsIrError(err: unknown): string {
  const response = (err as { response?: { status?: unknown; data?: unknown } } | null)?.response;

  if (response && typeof response === "object") {
    const httpStatus = typeof response.status === "number" ? response.status : "نامشخص";
    const body = asBody(response.data);
    const logical = body?.status;
    const logicalPart =
      logical === undefined || logical === null
        ? ""
        : ` (کد سرویس: ${String(logical).slice(0, 20)})`;
    return `SMS.ir پاسخ HTTP ${httpStatus} داد${logicalPart}: ${serviceMessage(body)}`;
  }

  // شبکه، timeout، DNS — یعنی اصلاً به SMS.ir نرسیدیم.
  const code = (err as { code?: unknown } | null)?.code;
  if (typeof code === "string" && code) {
    return `ارتباط با SMS.ir برقرار نشد (${code.slice(0, 40)}).`;
  }

  const message = err instanceof Error ? err.message : String(err ?? "");
  return message
    ? `ارسال از SMS.ir ناموفق بود: ${message.slice(0, 200)}`
    : "ارسال از SMS.ir ناموفق بود.";
}

/**
 * هر بازتابِ احتمالیِ کد در متنِ خطا را می‌پوشاند.
 *
 * ⚠️ لازم است چون بعضی خطاهای اعتبارسنجیِ سرویس، *مقدارِ* متغیرها را در پیام
 * تکرار می‌کنند — و متغیرِ ما خودِ کدِ ورود است. این پیام در `sms_log` و
 * ‎/admin/activity‎ می‌نشیند؛ کدی که آنجا بنشیند یعنی هر کسی که به گزارش‌ها
 * دسترسی دارد، می‌تواند واردِ حسابِ کاربر شود.
 */
export function redactCode(message: string, code: string): string {
  if (!code || code.length < 3) return message;
  return message.split(code).join("***");
}

// ---------------------------------------------------------------- آداپتر --

export class SmsIrAdapter implements SmsAdapter {
  readonly name = SMSIR_DRIVER;

  private client: SmsIrClient | null;

  constructor(
    private readonly apiKey: string,
    private readonly templateId: number,
    /** فقط برای متنِ آزاد لازم است؛ کدِ ورود از قالب می‌رود و خط نمی‌خواهد. */
    private readonly lineNumber: number | null = null,
    client: SmsIrClient | null = null,
  ) {
    this.client = client;
  }

  /**
   * SDK رسمی، با importِ تنبل.
   *
   * ⚠️ `await import` و نه importِ بالای فایل: بسته CommonJS است و `axios` را
   * با خود می‌آورد. تا وقتی کسی واقعاً پیامک نفرستاده، هیچ‌کدام وارد گرافِ
   * ماژولِ سرور نمی‌شوند — و تستِ آداپتر هم بدونِ آن‌ها اجرا می‌شود.
   */
  private async sdk(): Promise<SmsIrClient> {
    if (!this.client) {
      const mod = await import("smsir-js");
      // ⚠️ بستهٔ CommonJS: بسته به باندلر، کلاس یا مستقیم بیرون است یا زیرِ
      // `default`. یک خط بررسی، جلوی خطای «Smsir is not a constructor» را
      // می‌گیرد — خطایی که فقط روی سرورِ اصلی و فقط سرِ راهِ ورودِ کاربر
      // دیده می‌شد.
      const Ctor = mod.Smsir ?? mod.default.Smsir;
      this.client = new Ctor(this.apiKey, this.lineNumber);
    }
    return this.client;
  }

  async sendOtp(message: SmsOtpMessage): Promise<SmsSendResult> {
    const mobile = toSmsIrMobile(message.to);
    const client = await this.sdk();

    let response: SmsIrHttpResponse;
    try {
      response = await client.SendVerifyCode(mobile, this.templateId, [
        { name: OTP_PARAMETER_NAME, value: message.code },
      ]);
    } catch (err) {
      throw new Error(redactCode(describeSmsIrError(err), message.code));
    }

    try {
      return readSmsIrResult(response);
    } catch (err) {
      throw new Error(redactCode((err as Error).message, message.code));
    }
  }

  /**
   * پیامکِ قالبی — همان endpointِ Verify، با متغیرهای دلخواه.
   *
   * ⚠️ چرا `SendVerifyCode` و نه `SendBulk`: نامش گمراه‌کننده است، ولی این
   * متد در SDK همان مسیرِ «ارسالِ قالبی از خطِ خدماتی» است و به کدِ ورود
   * اختصاص ندارد. تمامِ پیامک‌های خدماتیِ سروا — خوش‌آمد، فعال‌سازیِ
   * اشتراک، یادآوریِ تمدید — از همین راه می‌روند.
   *
   * ⚠️ و متنِ خطا اینجا **پاک‌سازی نمی‌شود**، برخلافِ `sendOtp`. لازم هم
   * نیست: متغیرهای این مسیر نام و تاریخ‌اند و نه راز. اگر روزی رویدادی
   * متغیرِ حساس گرفت، باید مسیرِ خودش را داشته باشد و نه یک پرچمِ اختیاری
   * اینجا.
   */
  async sendTemplate(message: SmsTemplateMessage): Promise<SmsSendResult> {
    const mobile = toSmsIrMobile(message.to);
    const client = await this.sdk();

    let response: SmsIrHttpResponse;
    try {
      response = await client.SendVerifyCode(mobile, message.templateId, message.parameters);
    } catch (err) {
      throw new Error(describeSmsIrError(err));
    }

    return readSmsIrResult(response);
  }

  async send(message: SmsMessage): Promise<SmsSendResult> {
    if (!this.lineNumber) {
      /* ⚠️ متنِ آزاد بدونِ شمارهٔ خط ممکن نیست. صریح throw می‌شود و بی‌صدا به
         مسیرِ قالب برنمی‌گردد: آن دو، دو مسیرِ متفاوت با دو قیمت و دو قاعده‌اند. */
      throw new Error("برای پیامکِ متنِ آزاد باید «شمارهٔ خط» در تنظیمات ثبت شود.");
    }

    const mobile = toSmsIrMobile(message.to);
    const client = await this.sdk();

    let response: SmsIrHttpResponse;
    try {
      response = await client.SendBulk(message.body, [mobile], null, this.lineNumber);
    } catch (err) {
      throw new Error(describeSmsIrError(err));
    }

    return readSmsIrResult(response);
  }
}
