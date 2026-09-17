/**
 * شکلِ داده‌هایِ پیامک — عمداً بدونِ هیچ import ای.
 *
 * ⚠️ چرا جدا از `./index`: آن فایل `server-only` است و به `lib/db` وصل، پس
 * هر ماژولی که فقط به *نوع*ها نیاز دارد — از جمله آداپترِ SMS.ir و تست‌هایش —
 * با import کردنش کلِ زنجیرهٔ دیتابیس را هم می‌کشید. تست‌ها با
 * `node --test` اجرا می‌شوند و بدونِ شرطِ `react-server`؛ در آن حالت
 * `server-only` عمداً throw می‌کند.
 */

/** پیامکِ متنِ آزاد (خطِ تبلیغاتی/اطلاع‌رسانی). */
export type SmsMessage = {
  to: string;
  body: string;
};

/**
 * کدِ یک‌بارمصرف.
 *
 * ⚠️ چرا `code` و نه یک متنِ آماده: خطِ خدماتی متنِ دلخواه نمی‌پذیرد. متن باید
 * از قالبِ تأییدشده در پنلِ سرویس بیاید و فقط متغیرش پر شود. شناسهٔ قالب هم
 * اینجا نیست چون تنظیمِ سایت است و نه تصمیمِ فراخوان — `lib/sms` خودش
 * می‌خواندش.
 */
export type SmsOtpMessage = {
  to: string;
  code: string;
};

/** شناسهٔ پیام در سمتِ سرویس — برای پیگیری. `null` یعنی سرویس نداد. */
export type SmsSendResult = { providerMessageId: string | null };

export interface SmsAdapter {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsSendResult>;
  /**
   * ارسالِ کد با قالبِ تأییدشده.
   *
   * ⚠️ اختیاری نیست. در نسخهٔ قبلی بود و هر فراخوان باید یادش می‌ماند که
   * نبودنش را چک کند — وگرنه کدِ ورود بی‌صدا از مسیرِ متنِ آزاد می‌رفت.
   */
  sendOtp(message: SmsOtpMessage): Promise<SmsSendResult>;
}
