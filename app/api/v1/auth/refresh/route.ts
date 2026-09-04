import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/session";
import { hashRefreshToken } from "@/lib/auth/tokens";
import { REFRESH_COOKIE, accessCookie, clearedCookies } from "@/lib/auth/cookies";
import { fail, handleError, ok, withCookies } from "@/lib/api/http";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { withRoute } from "@/lib/api/route";

/**
 * POST /api/v1/auth/refresh — توکن دسترسیِ تازه.
 *
 * معمولاً لازم نیست کلاینت صدایش بزند: proxy.ts وقتی توکن دسترسی منقضی شده
 * باشد خودش این کار را در مسیر همان درخواست انجام می‌دهد. این endpoint برای
 * کدِ سمت مرورگر است که بعد از یک پاسخ ۴۰۱ می‌خواهد یک بار تلاش دوباره کند.
 */
export const POST = withRoute("/api/v1/auth/refresh", async () => {
  try {
    const token = (await cookies()).get(REFRESH_COOKIE)?.value;
    if (!token) return fail("سشنی وجود ندارد.", 401);

    // هر تازه‌سازی یک JOIN روی sessions×users است. سقف روی خودِ توکن بسته شده
    // و نه روی IP: کاربر واقعی هر ۱۵ دقیقه یک بار به اینجا می‌رسد، پس ۲۰ در
    // ربع ساعت یعنی فقط حلقه‌ای که خودش را تکرار می‌کند گرفته می‌شود. کلید،
    // هشِ توکن است نه خودش، تا مقدار خام در حافظهٔ محدودساز ننشیند.
    const limit = await rateLimitDb(`refresh:${hashRefreshToken(token)}`, 20, 15 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const result = await refreshSession(token);

    if (!result) {
      // توکن ناشناخته، باطل‌شده، منقضی، یا کاربر مسدود — همه یعنی «دوباره وارد
      // شو». کوکی‌ها پاک می‌شوند تا مرورگر توکنِ مرده را بارها نفرستد.
      return withCookies(fail("سشن معتبر نیست. دوباره وارد شوید.", 401), clearedCookies()) as NextResponse;
    }

    return withCookies(ok({ user: result.user }), [
      accessCookie(result.tokens.accessToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
});
