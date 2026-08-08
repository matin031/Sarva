import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { revokeSessionByToken } from "@/lib/auth/session";
import { REFRESH_COOKIE, clearedCookies } from "@/lib/auth/cookies";
import { handleError, ok, withCookies } from "@/lib/api/http";

/**
 * POST /api/v1/auth/logout — خروج از این دستگاه.
 *
 * دو کار جدا که هر دو لازم‌اند: باطل کردن ردیف سشن (تا refresh token دیگر کار
 * نکند) و پاک کردن کوکی‌ها. اگر فقط کوکی پاک می‌شد، هرکسی که نسخه‌ای از توکن
 * داشت همچنان می‌توانست سشن بگیرد.
 *
 * همیشه موفق برمی‌گردد. خروجی که «شکست خورد» بگوید کاربر را در وضعیتی رها
 * می‌کند که نمی‌داند وارد است یا نه — و در هر صورت کوکی‌ها پاک شده‌اند.
 */
export async function POST() {
  try {
    const token = (await cookies()).get(REFRESH_COOKIE)?.value;

    if (token) {
      // اگر ابطال در دیتابیس شکست بخورد هم کوکی‌ها پاک می‌شوند: از دید کاربر
      // خروج انجام شده، و سشنِ یتیم خودش با expires_at می‌میرد.
      await revokeSessionByToken(token).catch((err) => {
        console.error("[auth] ابطال سشن ناموفق بود:", err);
      });
    }

    return withCookies(ok({ signedOut: true }), clearedCookies()) as NextResponse;
  } catch (err) {
    return handleError(err);
  }
}
