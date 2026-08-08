import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession, toAuthUser } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { registerSchema } from "@/lib/auth/schemas";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";

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
export async function POST(request: Request) {
  try {
    const meta = requestMeta(request);

    // جلوی ساخت انبوه حساب با اسکریپت. سخت‌گیرانه نیست — یک کلاس واقعی
    // ثبت‌نام می‌کند و ممکن است همه پشت یک IP مدرسه باشند.
    const limit = rateLimit(`register:${meta.ip ?? "unknown"}`, 10, 15 * 60);
    if (!limit.allowed) {
      return fail(`تعداد تلاش‌ها زیاد بود. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, registerSchema);
    if (!body.ok) return body.response;

    const { name, email, password } = body.data;

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
      return fail("این ایمیل قبلاً ثبت شده است. وارد شوید یا رمز را بازیابی کنید.", 409);
    }

    const user = toAuthUser(row);
    const tokens = await createSession(user, meta);

    return withCookies(ok({ user }, 201), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
}
