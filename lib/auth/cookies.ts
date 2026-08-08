import "server-only";
import { ACCESS_COOKIE, REFRESH_COOKIE, accessTtlSeconds, cookieSecure, refreshTtlSeconds } from "./config";

/**
 * گزینه‌های کوکی سشن.
 *
 * عمداً بدون وابستگی به دیتابیس، تا proxy.ts بتواند بدون کشیدن کل pg وارد
 * باندلش از این استفاده کند.
 */

export type CookieSpec = {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
};

function base(maxAge: number) {
  return {
    // جاوااسکریپت هرگز نباید بتواند بخواندش — یعنی یک XSS هم نمی‌تواند سشن را
    // بدزدد. به همین دلیل هیچ‌جای کد کلاینت توکن را نمی‌بیند.
    httpOnly: true,
    secure: cookieSecure(),
    // lax و نه strict: با strict، کاربری که از لینک ایمیلِ تأیید وارد می‌شود
    // کوکی‌اش فرستاده نمی‌شود و لاگین‌نشده به نظر می‌رسد. lax در برابر CSRF
    // برای درخواست‌های POST همان محافظت را می‌دهد.
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function accessCookie(token: string): CookieSpec {
  return { name: ACCESS_COOKIE, value: token, options: base(accessTtlSeconds()) };
}

export function refreshCookie(token: string): CookieSpec {
  return { name: REFRESH_COOKIE, value: token, options: base(refreshTtlSeconds()) };
}

/** کوکی‌های باطل‌کننده — همان نام‌ها با maxAge صفر. */
export function clearedCookies(): CookieSpec[] {
  return [
    { name: ACCESS_COOKIE, value: "", options: base(0) },
    { name: REFRESH_COOKIE, value: "", options: base(0) },
  ];
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
