import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { refreshSession } from "@/lib/auth/session";
import { REFRESH_COOKIE, accessCookie, clearedCookies } from "@/lib/auth/cookies";
import { fail, handleError, ok, withCookies } from "@/lib/api/http";

/**
 * POST /api/v1/auth/refresh — توکن دسترسیِ تازه.
 *
 * معمولاً لازم نیست کلاینت صدایش بزند: proxy.ts وقتی توکن دسترسی منقضی شده
 * باشد خودش این کار را در مسیر همان درخواست انجام می‌دهد. این endpoint برای
 * کدِ سمت مرورگر است که بعد از یک پاسخ ۴۰۱ می‌خواهد یک بار تلاش دوباره کند.
 */
export async function POST() {
  try {
    const token = (await cookies()).get(REFRESH_COOKIE)?.value;
    if (!token) return fail("سشنی وجود ندارد.", 401);

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
}
