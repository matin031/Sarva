import { z } from "zod";
import { execute } from "@/lib/db";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { turnstileField, passwordField } from "@/lib/auth/schemas";
import { normalizePhone, maskPhone } from "@/lib/auth/phone";
import { issuePhoneOtp, checkPhoneOtp } from "@/lib/auth/phone-otp";
import { findUserByPhone, revokeAllSessions } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { sendOtpSms } from "@/lib/sms";
import { logger } from "@/lib/observability";

/**
 * POST /api/v1/auth/mobile/reset — بازنشانی رمز عبور با پیامک.
 *
 * دو مرحله در یک مسیر، چون هر دو یک موضوع‌اند و جدا کردنشان فقط یک فایلِ
 * دیگر با همان محافظت‌های تکراری می‌ساخت:
 *
 *   { phone, turnstileToken }            → ارسالِ کد
 *   { phone, code, newPassword }         → تعیینِ رمزِ تازه
 *
 * ⚠️ مثلِ مسیرِ ایمیل، پاسخ **هیچ‌وقت نمی‌گوید این شماره حساب دارد یا نه.**
 * اگر می‌گفت، این endpoint به ابزارِ فهرست کردنِ کاربران تبدیل می‌شد. برای
 * شماره‌ای که حساب ندارد هم پاسخِ موفق برمی‌گردد و فقط هیچ پیامکی نمی‌رود.
 *
 * ⚠️ و کاربری که با موبایل ثبت‌نام کرده اصلاً رمز ندارد — ورودش با کد است.
 * برای او این مسیر یک رمز *می‌سازد*، که درست است: از آن به بعد هر دو راه
 * برایش باز می‌شود.
 */

const sendSchema = z.object({
  phone: z.string().trim().min(1, "شمارهٔ موبایل را وارد کنید."),
  turnstileToken: turnstileField,
});

const resetSchema = z.object({
  phone: z.string().trim().min(1, "شمارهٔ موبایل را وارد کنید."),
  code: z.string().trim().min(4).max(8),
  newPassword: passwordField,
});

/** ارقامِ فارسی و عربی به لاتین — کاربر با کیبورد فارسی «۱۲۳۴۵۶» می‌نویسد. */
function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

export const POST = withRoute("/api/v1/auth/mobile/reset", async (request: Request) => {
  try {
    const meta = requestMeta(request);
    const payload = (await request.clone().json().catch(() => null)) as Record<string, unknown> | null;

    /* ── مرحلهٔ دوم: کد آمده، رمز تازه ثبت شود ───────────────────────── */
    if (payload && typeof payload.code === "string" && payload.code.trim() !== "") {
      const body = await readJson(request, resetSchema);
      if (!body.ok) return body.response;

      const phone = normalizePhone(body.data.phone);
      if (!phone) return fail("شمارهٔ موبایل معتبر نیست.", 400);

      /* سقفِ حدس، مستقل از سقفِ `attempts` روی خودِ کد: آن یکی کدِ فعلی را
         می‌سوزاند، این یکی جلوی گرفتنِ پی‌درپیِ کدِ تازه و پنج حدس در هر بار
         را می‌گیرد. */
      const guessLimit = await rateLimitDb(`sms-reset-verify:${phone}`, 12, 60 * 60);
      if (!guessLimit.allowed) {
        return fail(`تلاش‌های زیاد. ${guessLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
      }

      const checked = await checkPhoneOtp(phone, "password_reset", toLatinDigits(body.data.code));
      if (!checked.ok) return fail(checked.error, 400);

      const user = await findUserByPhone(phone);
      /* ⚠️ رسیدن به اینجا با کدِ درست ولی بدونِ کاربر یعنی کد برای شماره‌ای
         صادر شده که حساب نداشت — که نمی‌شود، چون کد فقط برای شمارهٔ دارای
         حساب فرستاده می‌شود. پیامِ عمومی، تا همین حالت هم چیزی لو ندهد. */
      if (!user) return fail("کد وارد شده اشتباه یا منقضی شده است.", 400);

      await execute("update users set password_hash = ? where id = ?", [
        await hashPassword(body.data.newPassword),
        user.id,
      ]);

      /* ⚠️ همهٔ نشست‌ها باطل می‌شوند و این عمدی است.
         بازنشانیِ رمز یعنی «شاید کسی به حسابم دسترسی داشته». اگر نشست‌های
         قبلی زنده می‌ماندند، همان کس با کوکیِ موجودش داخل می‌ماند و عوض
         کردنِ رمز هیچ کاری نکرده بود. */
      await revokeAllSessions(user.id);

      logger.info("رمز عبور با پیامک بازنشانی شد", {
        event: "auth.mobile.password_reset.succeeded",
        user_id: user.id,
      });

      return ok({ reset: true });
    }

    /* ── مرحلهٔ اول: ارسالِ کد ───────────────────────────────────────── */
    const body = await readJson(request, sendSchema);
    if (!body.ok) return body.response;

    const captcha = await verifyTurnstile(body.data.turnstileToken, meta.ip);
    if (!captcha.ok) return fail(captcha.error, 400);

    const phone = normalizePhone(body.data.phone);
    if (!phone) return fail("شمارهٔ موبایل معتبر نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹ بنویسید.", 400);

    const ipLimit = await rateLimitDb(`sms-reset-ip:${meta.ip ?? "unknown"}`, 8, 60 * 60);
    if (!ipLimit.allowed) {
      return fail(`درخواست‌های زیاد. ${ipLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const user = await findUserByPhone(phone);
    const masked = maskPhone(phone);

    /* ⚠️ شمارهٔ بدونِ حساب: پاسخِ موفق، بدونِ پیامک.
       این همان رفتارِ مسیرِ ایمیل است و دلیلش هم همان. */
    if (!user) {
      return ok({ sent: true, phoneMasked: masked });
    }

    const issued = await issuePhoneOtp(phone, "password_reset", meta.ip);
    if (!issued.ok) return fail(issued.error, issued.retryAfterSeconds ? 429 : 400);

    try {
      await sendOtpSms({ to: phone, code: issued.code });
    } catch (err) {
      logger.error("ارسال پیامک بازنشانی رمز ناموفق بود", {
        event: "auth.mobile.password_reset.send_failed",
        err,
      });
      return fail("ارسال پیامک انجام نشد. کمی بعد دوباره تلاش کنید.", 502);
    }

    return ok({ sent: true, phoneMasked: masked, expiresInMinutes: issued.expiresInMinutes });
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/mobile/reset");
  }
});

export const dynamic = "force-dynamic";
