import { z } from "zod";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { turnstileField } from "@/lib/auth/schemas";
import { normalizePhone, maskPhone } from "@/lib/auth/phone";
import { issuePhoneOtp } from "@/lib/auth/phone-otp";
import { sendOtpSms } from "@/lib/sms";
import { logger } from "@/lib/observability";

/**
 * POST /api/v1/auth/mobile/send-code — ارسالِ کدِ ورود/ثبت‌نام با پیامک.
 *
 * ── چرا پاسخ نمی‌گوید این شماره حساب دارد یا نه ───────────────────────────
 * ⚠️ پاسخ برای شمارهٔ ثبت‌شده و ثبت‌نشده **یکسان** است. اگر فرق می‌کرد، این
 * endpoint به ابزاری برای فهرست کردنِ کاربرانِ سایت تبدیل می‌شد: کافی بود کسی
 * ده هزار شماره را امتحان کند تا بفهمد کدام‌ها حساب دارند.
 *
 * تصمیمِ «ورود یا ثبت‌نام» *بعد* از تأیید کد گرفته می‌شود، در مسیرِ verify —
 * جایی که صاحبِ شماره بودن اثبات شده.
 *
 * ⚠️ و به همین دلیل purpose همیشه `login` است، حتی برای شماره‌ای که هنوز
 * حساب ندارد. اگر دو purpose متفاوت می‌داشت، خودِ همان تفاوت همان چیزی را لو
 * می‌داد که بالا گفته شد.
 *
 * ── چرا کپچا ─────────────────────────────────────────────────────────────
 * ⚠️ هر پیامک پول است. بدونِ کپچا این endpoint یک دکمهٔ «خرج کردنِ موجودیِ
 * پنلِ پیامک» بود که هر اسکریپتی می‌توانست فشارش بدهد. سقف‌های
 * `issuePhoneOtp` لایهٔ دوم‌اند و نه اول.
 */

const schema = z.object({
  phone: z.string().trim().min(1, "شمارهٔ موبایل را وارد کنید."),
  turnstileToken: turnstileField,
});

export const POST = withRoute("/api/v1/auth/mobile/send-code", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    // ⚠️ کپچا پیش از هر کارِ دیگری — پیش از کوئری، پیش از پیامک.
    const captcha = await verifyTurnstile(body.data.turnstileToken, meta.ip);
    if (!captcha.ok) return fail(captcha.error, 400);

    const phone = normalizePhone(body.data.phone);
    if (!phone) {
      return fail("شمارهٔ موبایل معتبر نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹ بنویسید.", 400);
    }

    // سقفِ IP در دیتابیس، مستقل از سقفِ خودِ شماره در `issuePhoneOtp`.
    const ipLimit = await rateLimitDb(`sms-code-ip:${meta.ip ?? "unknown"}`, 10, 60 * 60);
    if (!ipLimit.allowed) {
      return fail(`درخواست‌های زیاد. ${ipLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const issued = await issuePhoneOtp(phone, "login", meta.ip);
    if (!issued.ok) {
      return fail(issued.error, issued.retryAfterSeconds ? 429 : 400);
    }

    /* ⚠️ با **قالبِ تأییدشده** فرستاده می‌شود و نه متنِ آزاد.
       خطِ خدماتی متنِ دلخواه نمی‌پذیرد؛ متن باید از قالبی بیاید که SMS.ir
       تأیید کرده و فقط متغیرش (`#CODE#`) پر شود. متنِ آزاد یا رد می‌شود یا
       از خطِ تبلیغاتی می‌رود — که برای کدِ ورود هم غیرمجاز است و هم دیرتر می‌رسد.

       شناسهٔ قالب اینجا خوانده نمی‌شود: تنظیمِ سایت است و نه تصمیمِ این مسیر،
       پس `lib/sms` خودش می‌خواندش. */
    /* ⚠️ `sendOtpSms` در صورت شکست **throw** می‌کند (و خودش در `sms_log` و
       «فعالیت و خطاها» ثبتش می‌کند). پس اینجا گرفته می‌شود و نه رها:

       کدِ صادرشده عمداً باطل نمی‌شود. ممکن است پیامک واقعاً رفته باشد و فقط
       پاسخِ سرویس گم شده باشد؛ باطل کردنِ کد یعنی کاربری که همین حالا کد را
       روی گوشی‌اش دارد، نتواند استفاده کند. */
    try {
      await sendOtpSms({ to: phone, code: issued.code });
    } catch (err) {
      logger.error("ارسال پیامک کد ورود ناموفق بود", {
        event: "auth.sms_code.send_failed",
        // ⚠️ نه خودِ شماره و نه کد.
        err,
      });
      return fail("ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.", 502);
    }

    return ok({
      sent: true,
      // شمارهٔ پوشیده، تا کاربر مطمئن شود درست وارد کرده بدونِ اینکه صفحه
      // شمارهٔ کامل را به هر کسی که نگاهش می‌کند نشان بدهد.
      phoneMasked: maskPhone(phone),
      expiresInMinutes: issued.expiresInMinutes,
    });
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/mobile/send-code");
  }
});

export const dynamic = "force-dynamic";
