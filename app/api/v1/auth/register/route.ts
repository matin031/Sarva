import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession, toAuthUser } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { registerSchema } from "@/lib/auth/schemas";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { attachUserId, logger } from "@/lib/observability";
import { withRoute } from "@/lib/api/route";

/**
 * POST /api/v1/auth/register — ساخت حساب.
 *
 * حساب بلافاصله وارد می‌شود و `emailVerified: false` برمی‌گردد. کد تأیید ایمیل
 * جداگانه فرستاده می‌شود (فاز ۴) و ورودِ روزمره با رمز است، نه با کد — همان
 * چیزی که تصمیم گرفته شد.
 *
 * چرا ورود بلافاصله و نه بعد از تأیید: ایمیل ممکن است نرسد (فیلترینگ، اسپم،
 * سرویس ایمیل قطع). قفل کردن حساب پشت ایمیلی که شاید هرگز نیاید یعنی
 * دانش‌آموزی که ثبت‌نام کرده وارد سایت نمی‌شود. تأیید ایمیل چیزی است که اپ
 * می‌تواند بعداً برایش اصرار کند.
 */
export const POST = withRoute("/api/v1/auth/register", async (request: Request) => {
  try {
    const meta = requestMeta(request);

    // جلوی ساخت انبوه حساب با اسکریپت. سخت‌گیرانه نیست — یک کلاس واقعی
    // ثبت‌نام می‌کند و ممکن است همه پشت یک IP مدرسه باشند.
    const limit = rateLimit(`register:${meta.ip ?? "unknown"}`, 10, 15 * 60);
    if (!limit.allowed) {
      logger.warn("ثبت‌نام به‌خاطر سقف نرخ رد شد", {
        event: "auth.register.rate_limited",
        limit_scope: "ip",
        retry_after_seconds: limit.retryAfterSeconds,
      });
      return fail(`تعداد تلاش‌ها زیاد بود. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, registerSchema);
    if (!body.ok) return body.response;

    const { name, email, password, turnstileToken } = body.data;

    const captcha = await verifyTurnstile(turnstileToken, meta.ip);
    if (!captcha.ok) return fail(captcha.error, 400);

    // سقف دوم، روی خودِ ایمیل.
    //
    // این endpoint وجود یا نبودِ یک حساب را عمداً فاش می‌کند (توضیحش پایین‌تر
    // کنار پاسخ ۴۰۹). آن تصمیم درست است، ولی معنایش این است که ثبت‌نام یک
    // ابزار پرسش «آیا فلانی اینجا حساب دارد؟» هم هست. سقفِ IP به‌تنهایی جلویش
    // را نمی‌گیرد، چون مهاجم می‌تواند از چند IP بپرسد. با این سقف، هر ایمیل
    // در ربع ساعت فقط چند بار قابل پرسش است — بی‌فایده برای ساختن فهرست،
    // بی‌اثر برای کسی که واقعاً دارد ثبت‌نام می‌کند.
    const emailLimit = rateLimit(`register-email:${email}`, 5, 15 * 60);
    if (!emailLimit.allowed) {
      return fail(
        `تعداد تلاش‌ها زیاد بود. ${emailLimit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
        429,
      );
    }

    const passwordHash = await hashPassword(password);

    // insert ... on conflict do nothing و نه «اول select بعد insert»: آن روش
    // یک مسابقه دارد که دو درخواست همزمان می‌توانند هر دو از چکِ تکراری رد
    // شوند. اینجا خودِ unique index داور است.
    const row = await queryOne<{
      id: string;
      email: string;
      full_name: string | null;
      role: "student" | "admin";
      email_verified_at: string | null;
      is_banned: boolean;
      created_at: string;
    }>(
      `insert into users (email, password_hash, full_name)
       values ($1, $2, $3)
       on conflict (email) do nothing
       returning id, email, full_name, role, email_verified_at, is_banned, created_at`,
      [email, passwordHash, name],
    );

    if (!row) {
      // ردیفی برنگشت یعنی ایمیل از قبل هست.
      //
      // بله، این وجودِ حساب را فاش می‌کند. عمدی است: جایگزینش («کد تأیید
      // فرستادیم») کاربری را که ایمیلش را فراموش کرده در حلقهٔ بی‌پایان
      // می‌اندازد. صفحهٔ ورود هم همین اطلاعات را از راه «رمز را فراموش
      // کرده‌اید» می‌دهد، پس پنهان‌کاری اینجا چیزی اضافه نمی‌کرد.
      logger.info("ثبت‌نام تکراری", { event: "auth.register.duplicate" });
      return fail("این ایمیل قبلاً ثبت شده است. وارد شوید یا رمز را بازیابی کنید.", 409);
    }

    const user = toAuthUser(row);
    const tokens = await createSession(user, meta);

    attachUserId(user.id);
    logger.info("حساب تازه ساخته شد", { event: "auth.register.succeeded", user_id: user.id });

    return withCookies(ok({ user }, 201), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
});
