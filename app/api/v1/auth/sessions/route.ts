import type { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { revokeAllSessions, createSession } from "@/lib/auth/session";
import { listDevices } from "@/lib/auth/devices";
import { accessCookie, refreshCookie } from "@/lib/auth/cookies";
import { fail, handleError, ok, requestMeta, withCookies } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";

/**
 * دستگاه‌های واردشده با این حساب.
 *
 * `listActiveSessions` از فاز احراز هویت وجود داشت و کامنت خودش می‌گفت «برای
 * صفحهٔ دستگاه‌های من در آینده» — ولی هیچ‌جا صدا زده نمی‌شد. یعنی کاربری که
 * روی رایانهٔ مدرسه لاگین مانده بود، نه می‌توانست ببیندش و نه ببنددش؛ تنها
 * راهش عوض کردن رمز بود.
 *
 * صفحهٔ تنظیمات فهرست اول را خودش سمت سرور می‌گیرد. این endpoint برای بعد از
 * «خروج از همه» است که کلاینت باید فهرست تازه را بخواند.
 */
export async function GET() {
  try {
    const user = await requireUser();
    return ok({ sessions: await listDevices(user.id) });
  } catch (err) {
    return handleError(err, "GET /api/v1/auth/sessions");
  }
}

/**
 * خروج از همهٔ دستگاه‌ها.
 *
 * همهٔ سشن‌ها باطل می‌شوند و بلافاصله یکی تازه برای همین مرورگر ساخته می‌شود —
 * دقیقاً همان کاری که change-password می‌کند. بدون آن، کاربری که روی دکمه
 * می‌زند خودش هم بیرون می‌افتد، که از دید او شبیه خطاست نه شبیه موفقیت.
 */
export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const meta = requestMeta(request);

    const limit = rateLimit(`sessions-revoke:${user.id}`, 10, 15 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const revoked = await revokeAllSessions(user.id);
    const tokens = await createSession(user, meta);

    // کوکی‌های تازه روی همین پاسخ می‌نشینند، پس فهرستِ بعدی این مرورگر را
    // به‌عنوان «همین دستگاه» می‌شناسد.
    return withCookies(ok({ revoked }), [
      accessCookie(tokens.accessToken),
      refreshCookie(tokens.refreshToken),
    ]) as NextResponse;
  } catch (err) {
    return handleError(err, "DELETE /api/v1/auth/sessions");
  }
}

export const dynamic = "force-dynamic";
