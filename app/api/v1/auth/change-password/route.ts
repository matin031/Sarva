import type { NextResponse } from "next/server";
import { execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, findUserByEmail, revokeAllSessions } from "@/lib/auth/session";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { changePasswordSchema } from "@/lib/auth/schemas";
import { fail, handleError, ok, readJson, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";

/**
 * POST /api/v1/auth/change-password — تغییر رمز از داخل حساب.
 *
 * رمز فعلی خواسته می‌شود، دقیقاً مثل کاری که AccountSettings.tsx امروز با
 * signInWithPassword می‌کند: اگر کسی پشت یک لپ‌تاپِ باز بنشیند، نباید بتواند
 * رمز را عوض کند و صاحب حساب را بیرون بیندازد.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const meta = requestMeta(request);

    const limit = rateLimit(`change-password:${user.id}`, 5, 15 * 60);
    if (!limit.allowed) {
      return fail(`تلاش‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, changePasswordSchema);
    if (!body.ok) return body.response;

    const { currentPassword, newPassword } = body.data;

    // getCurrentUser عمداً هش را برنمی‌گرداند، پس اینجا دوباره خوانده می‌شود.
    const full = await findUserByEmail(user.email);
    if (!full) return fail("حساب کاربری پیدا نشد.", 404);

    if (!(await verifyPassword(full.passwordHash, currentPassword))) {
      return fail("رمز عبور فعلی اشتباه است.", 400);
    }

    if (currentPassword === newPassword) {
      return fail("رمز جدید نباید با رمز فعلی یکی باشد.", 400);
    }

    await execute("update users set password_hash = $1 where id = $2", [
      await hashPassword(newPassword),
      user.id,
    ]);

    // تغییر رمز یعنی «هرکسی جز من که وارد است باید بیرون برود» — این تنها
    // کاری است که کاربر می‌تواند بعد از دزدیده شدن سشنش انجام بدهد.
    await revokeAllSessions(user.id);

    // ...ولی خودِ او نباید بیرون بیفتد. سشن تازه بلافاصله صادر می‌شود، وگرنه
    // موفق شدن در تغییر رمز از دید کاربر مثل بیرون انداخته شدن به نظر می‌رسد.
    const tokens = await createSession(user, meta);

    return withCookies(ok({ changed: true }), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
}
