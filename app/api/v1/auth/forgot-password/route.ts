import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { execute, queryOne } from "@/lib/db";
import { emailField, turnstileField } from "@/lib/auth/schemas";
import { sendMail } from "@/lib/mail";
import { passwordResetEmail } from "@/lib/mail/templates";
import { fail, handleError, ok, readJson, requestMeta } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { withRoute } from "@/lib/api/route";
import { logger } from "@/lib/observability";

const schema = z.object({ email: emailField, turnstileToken: turnstileField });

const TTL_MINUTES = 30;

/**
 * POST /api/v1/auth/forgot-password — ارسال لینک بازنشانی رمز.
 *
 * همیشه موفق برمی‌گردد، حتی وقتی آن ایمیل حسابی ندارد. اگر تفکیک می‌کرد، این
 * endpoint به ابزاری برای فهرست کردن کاربران سایت تبدیل می‌شد — و برخلاف صفحهٔ
 * ثبت‌نام (که آنجا فاش کردن، عمدی و به نفع کاربر بود)، اینجا هیچ سودی برای
 * کاربر ندارد: کسی که ایمیلش را درست وارد کرده، ایمیل را می‌گیرد.
 */
export const POST = withRoute("/api/v1/auth/forgot-password", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const { email, turnstileToken } = body.data;

    // اینجا هم قبل از هر کاری. بدون کپچا، این endpoint یک ابزار ارسال ایمیل
    // به هر آدرسی است — نه برای دزدیدن حساب، بلکه برای رساندن دامنهٔ سایت به
    // لیست سیاه اسپم.
    const captcha = await verifyTurnstile(turnstileToken, meta.ip);
    if (!captcha.ok) return fail(captcha.error, 400);

    const limit = await rateLimitDb(`forgot:${email}`, 3, 15 * 60);
    const ipLimit = await rateLimitDb(`forgot-ip:${meta.ip ?? "unknown"}`, 15, 60 * 60);
    if (!limit.allowed || !ipLimit.allowed) {
      // حتی در حالت محدودشده هم پاسخ همان است، وگرنه خودِ ۴۲۹ می‌گفت این ایمیل
      // وجود دارد و چند بار درخواست شده.
      return ok({ sent: true });
    }

    const user = await queryOne<{ id: string }>("select id from users where email = $1", [email]);

    if (user) {
      const token = randomBytes(32).toString("base64url");
      // مثل refresh token: آنتروپی بالا، پس SHA-256 خالی کافی است و چیزی برای
      // کند کردن وجود ندارد.
      const tokenHash = createHash("sha256").update(token).digest("hex");

      // درخواست‌های قبلی باطل می‌شوند: دو لینک فعال یعنی دو راه ورود.
      await execute(
        `update password_resets set consumed_at = now()
          where user_id = $1 and consumed_at is null`,
        [user.id],
      );

      // ⚠️ `secs` و نه `mins`: در make_interval تنها پارامترِ double precision
      // همان secs است و بقیه integer اند، پس `mins => $3::double precision` با
      // هیچ overload ای جور درنمی‌آمد و این insert همیشه خطا می‌داد — یعنی
      // «بازیابی رمز» از زمان مهاجرت به پستگرس هرگز کار نکرده.
      //
      // همین اشتباه در lib/auth/otp.ts هم بود. برای پیدا کردنِ بقیه:
      // npm run db:check-sql
      await execute(
        `insert into password_resets (user_id, token_hash, expires_at, requested_ip)
         values ($1, $2, now() + make_interval(secs => $3::double precision), $4::inet)`,
        [user.id, tokenHash, TTL_MINUTES * 60, meta.ip],
      );

      const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
      const link = `${base}/reset-password?token=${token}`;

      const template = passwordResetEmail(link, TTL_MINUTES);

      // شکست ارسال ایمیل نباید پاسخ را عوض کند — وگرنه اختلافِ پاسخ باز هم
      // می‌گفت کدام ایمیل‌ها حساب دارند.
      await sendMail({ ...template, to: email }).catch((err) => {
        // ⚠️ نه آدرس گیرنده، نه توکنِ داخل لینک.
        logger.error("ارسال ایمیل بازنشانی رمز ناموفق بود", {
          event: "auth.password_reset.mail_failed",
          err,
        });
      });
    }

    return ok({ sent: true });
  } catch (err) {
    // حتی خطای غیرمنتظره هم نباید وجود/عدم وجود حساب را لو بدهد؛ ولی خطای
    // اعتبارسنجی بالاتر برگشته و به اینجا نمی‌رسد.
    return handleError(err, "POST /api/v1/auth/forgot-password");
  }
});
