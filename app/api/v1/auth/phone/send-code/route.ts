import { z } from "zod";
import { queryOne } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { withRoute } from "@/lib/api/route";
import { maskPhone, normalizePhone } from "@/lib/auth/phone";
import { issuePhoneOtp } from "@/lib/auth/phone-otp";
import { sendOtpSms } from "@/lib/sms";
import { logger } from "@/lib/observability";

/**
 * POST /api/v1/auth/phone/send-code — افزودن یا تأییدِ شماره از داخلِ حساب.
 *
 * =============================================================================
 * ⚠️ چرا مسیرِ جدا و نه استفاده از `/auth/mobile/send-code`
 * =============================================================================
 *
 * آن مسیر برای *ورود* است و دو چیزِ آن با اینجا نمی‌خواند:
 *
 *   ۱. آنجا عمداً هیچ‌وقت نمی‌گوید این شماره حساب دارد یا نه — وگرنه به یک
 *      ابزارِ فهرست کردنِ کاربران تبدیل می‌شد. اینجا برعکس، کاربر *باید*
 *      بفهمد شماره‌ای که وارد کرده مالِ حسابِ دیگری است، وگرنه کد را
 *      می‌گیرد و در مرحلهٔ بعد بدونِ توضیح شکست می‌خورد. (این نشت نیست:
 *      کاربر از قبل وارد شده و می‌تواند همان را با فرمِ «فراموشی رمز»
 *      بفهمد.)
 *
 *   ۲. آنجا `purpose` همیشه `login` است. کدی که برای ورود صادر شده نباید
 *      برای تأییدِ شمارهٔ یک حسابِ دیگر کار کند — و چون `purpose` داخلِ
 *      ورودیِ HMACِ کد است، دو فضای کاملاً جدا می‌سازد.
 *
 * ── چرا کپچا ندارد ─────────────────────────────────────────────────────────
 * ⚠️ هر پیامک پول است، پس این تصمیم باید صریح نوشته شود.
 *
 * مسیرِ ورود کپچا دارد چون *ناشناس* است: هر کسی از هر جایی می‌تواند
 * فشارش بدهد. اینجا پشتِ `requireUser()` است، یعنی مهاجم اول باید حساب
 * بسازد — و آن حساب با هر بار سوءاستفاده شناسایی و مسدود می‌شود.
 *
 * به‌جایش سه سقفِ هم‌زمان: هر کاربر ۳ بار در ساعت (همین‌جا)، هر شماره ۳ بار
 * در ساعت و هر IP ۸ بار (`issuePhoneOtp`). سخت‌گیرانه است چون تأییدِ شماره
 * کاری است که یک نفر در کلِ عمرِ حسابش یکی دو بار انجام می‌دهد.
 */

const schema = z.object({
  phone: z.string().trim().min(1, "شمارهٔ موبایل را وارد کنید."),
});

export const POST = withRoute("/api/v1/auth/phone/send-code", async (request: Request) => {
  try {
    const user = await requireUser();
    const meta = requestMeta(request);

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const phone = normalizePhone(body.data.phone);
    if (!phone) {
      return fail("شمارهٔ موبایل معتبر نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹ بنویسید.", 400);
    }

    // ⚠️ سقفِ هر کاربر — قبل از هر کوئریِ دیگری و قبل از پیامک.
    const userLimit = await rateLimitDb(`phone-verify-user:${user.id}`, 3, 60 * 60);
    if (!userLimit.allowed) {
      return fail(
        `درخواست‌های زیاد. ${userLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
        429,
      );
    }

    /* ⚠️ شماره‌ای که مالِ حسابِ دیگری است، همین‌جا رد می‌شود و نه در مرحلهٔ
       تأیید.

       دلیلش فقط تجربهٔ کاربری نیست: `users_phone_key` یکتاست، پس UPDATE در
       مرحلهٔ بعد با خطای یکتایی شکست می‌خورد — یعنی پیامک فرستاده و پولش
       خرج شده برای کاری که از اول شدنی نبود. */
    const taken = await queryOne<{ id: string }>(
      "select id from users where phone = ? and id <> ?",
      [phone, user.id],
    );
    if (taken) {
      return fail("این شماره قبلاً به حساب دیگری وصل شده است.", 409);
    }

    if (user.phone === phone && user.phoneVerified) {
      // پیامکِ بی‌فایده فرستاده نمی‌شود. پاسخ موفق است چون از دیدِ کاربر
      // نتیجه همان است که می‌خواست.
      return ok({ sent: false, alreadyVerified: true, phoneMasked: maskPhone(phone) });
    }

    const issued = await issuePhoneOtp(phone, "phone_verify", meta.ip);
    if (!issued.ok) return fail(issued.error, issued.retryAfterSeconds ? 429 : 400);

    /* با **قالبِ تأییدشده** و نه متنِ آزاد — همان دلیلِ مسیرِ ورود: خطِ
       خدماتی متنِ دلخواه نمی‌پذیرد و متنِ آزاد یا رد می‌شود یا از خطِ
       تبلیغاتی می‌رود. شناسهٔ قالب تنظیمِ سایت است و `lib/sms` خودش می‌خواندش. */

    try {
      await sendOtpSms({ to: phone, code: issued.code });
    } catch (err) {
      /* ⚠️ کدِ صادرشده عمداً باطل نمی‌شود: ممکن است پیامک رفته باشد و فقط
         پاسخِ سرویس گم شده باشد. باطل کردنش یعنی کاربری که کد را روی
         گوشی‌اش دارد نتواند استفاده کند. */
      logger.error("ارسال پیامک تأیید شماره ناموفق بود", {
        event: "auth.phone_verify.send_failed",
        // ⚠️ نه شماره، نه کد.
        user_id: user.id,
        err,
      });
      return fail("ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.", 502);
    }

    return ok({
      sent: true,
      phoneMasked: maskPhone(phone),
      expiresInMinutes: issued.expiresInMinutes,
    });
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/phone/send-code");
  }
});

export const dynamic = "force-dynamic";
