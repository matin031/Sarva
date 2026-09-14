import { z } from "zod";
import { execute, isUniqueViolation } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/auth/session";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { withRoute } from "@/lib/api/route";
import { normalizePhone } from "@/lib/auth/phone";
import { checkPhoneOtp } from "@/lib/auth/phone-otp";
import { logger } from "@/lib/observability";

/**
 * POST /api/v1/auth/phone/verify — تأییدِ کد و وصل کردنِ شماره به حساب.
 *
 * ⚠️ این تنها جایی است که `users.phone_verified_at` برای یک کاربرِ
 * واردشده نوشته می‌شود، و بند ۵ به همین ستون تکیه دارد: بدونِ آن، درخواستِ
 * دبیری ثبت نمی‌شود.
 *
 * (`/auth/mobile/verify` هم این ستون را می‌نویسد، ولی آنجا در مسیرِ *ورود*
 * است — کسی که با پیامک وارد می‌شود، همان لحظه صاحبِ خط بودنش اثبات شده.)
 */

const schema = z.object({
  phone: z.string().trim().min(1, "شمارهٔ موبایل را وارد کنید."),
  code: z.string().trim().min(4).max(8),
});

/** ارقامِ فارسی به لاتین — کاربر با کیبورد فارسی «۱۲۳۴۵۶» می‌نویسد. */
function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

export const POST = withRoute("/api/v1/auth/phone/verify", async (request: Request) => {
  try {
    const user = await requireUser();

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const phone = normalizePhone(body.data.phone);
    if (!phone) return fail("شمارهٔ موبایل معتبر نیست.", 400);

    /* ⚠️ سقفِ حدس، مستقل از سقفِ `attempts` روی خودِ کد.
       آن یکی کدِ *فعلی* را می‌سوزاند؛ این یکی جلوی کسی را می‌گیرد که پشتِ
       سرِ هم کدِ تازه بگیرد و هر بار پنج حدس بزند. بدونِ آن، فضای
       یک‌میلیونیِ کد با صبر و حوصله قابلِ گشتن بود. */
    const guessLimit = await rateLimitDb(`phone-verify-guess:${user.id}`, 12, 60 * 60);
    if (!guessLimit.allowed) {
      return fail(`تلاش‌های زیاد. ${guessLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const checked = await checkPhoneOtp(phone, "phone_verify", toLatinDigits(body.data.code));
    if (!checked.ok) return fail(checked.error, 400);

    /* ── از اینجا به بعد: صاحبِ شماره اثبات شده ───────────────────────── */

    try {
      await execute(
        "update users set phone = ?, phone_verified_at = now(6), updated_at = now(6) where id = ?",
        [phone, user.id],
      );
    } catch (err) {
      /* ⚠️ مسابقه با `send-code`: آنجا بررسی شد که شماره آزاد است، ولی بینِ
         آن لحظه و اینجا می‌تواند کسِ دیگری همان شماره را تأیید کرده باشد.
         `users_phone_key` نگهبانِ نهایی است و پیامش باید همان چیزی باشد که
         `send-code` می‌داد. */
      if (isUniqueViolation(err)) {
        return fail("این شماره قبلاً به حساب دیگری وصل شده است.", 409);
      }
      throw err;
    }

    logger.info("شمارهٔ موبایل کاربر تأیید شد", {
      event: "auth.phone_verify.succeeded",
      // ⚠️ خودِ شماره لاگ نمی‌شود.
      user_id: user.id,
    });

    const updated = await findUserById(user.id);
    return ok({ user: updated });
  } catch (err) {
    return handleError(err, "POST /api/v1/auth/phone/verify");
  }
});

export const dynamic = "force-dynamic";
