import "server-only";
import { parseDuration } from "./duration";

/** پیکربندی احراز هویت — همه از محیط، هیچ‌چیز هاردکد. */

export const ACCESS_COOKIE = "sarva_at";
export const REFRESH_COOKIE = "sarva_rt";

/* ⚠️ `parseDuration` در `./duration` است و نه اینجا.

   تنها دلیلش این است که این فایل `server-only` است و آزمون‌های
   `node --test` نمی‌توانند واردش کنند. آن تابع هیچ اتصالی به سرور ندارد —
   یک رشته می‌گیرد و یک عدد می‌دهد — ولی مدتِ ورودِ کاربر را همان تعیین
   می‌کند، و «سی روز وارد می‌ماند» چیزی است که باید آزمون داشته باشد.
   (همان استدلالِ `lib/db/errors.ts`.) */
export { parseDuration } from "./duration";

export function accessTtlSeconds(): number {
  return parseDuration(process.env.AUTH_ACCESS_TTL, 15 * 60);
}

export function refreshTtlSeconds(): number {
  return parseDuration(process.env.AUTH_REFRESH_TTL, 30 * 86400);
}

/**
 * پرچم Secure کوکی سشن.
 *
 * روی http محلی باید false باشد وگرنه مرورگر کوکی را اصلاً نگه نمی‌دارد و
 * ورود بی‌سروصدا کار نمی‌کند؛ روی production با HTTPS باید true باشد وگرنه
 * کوکی سشن روی اتصال رمزنگاری‌نشده هم فرستاده می‌شود و هرکسی در همان شبکه
 * می‌تواند سشن را بردارد.
 *
 * ⚠️ منطق این تابع عوض شده و دلیلش مهم است. نسخهٔ قبلی این بود:
 *
 *     return process.env.AUTH_COOKIE_SECURE === "true";
 *
 * یعنی حالتِ *ناامن* پیش‌فرض بود. اگر کسی موقع راه‌اندازی سرور یادش می‌رفت
 * AUTH_COOKIE_SECURE=true را در .env بگذارد (و مقدارِ .env.example هم false
 * است، پس فراموش کردنش کاملاً محتمل بود)، سایت بی‌هیچ خطا و هشداری بالا
 * می‌آمد و فقط کوکی‌ها ناامن بودند. یک نقصِ امنیتی که هیچ نشانهٔ بیرونی ندارد،
 * بدترین نوعِ نقص است.
 *
 * حالا برعکس شده: در production پیش‌فرض true است و متغیر محیطی فقط برای
 * *غیرفعال* کردنِ عمدی به کار می‌رود — کاری که کسی تصادفاً انجام نمی‌دهد.
 * برای کسی که روی سرور از http استفاده می‌کند (که به‌هرحال توصیه نمی‌شود)،
 * AUTH_COOKIE_SECURE=false همچنان کار می‌کند.
 */
export function cookieSecure(): boolean {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  return process.env.NODE_ENV === "production";
}

let cachedSecret: Uint8Array | null = null;

/**
 * کلید امضای JWT.
 *
 * با تنبلی خوانده می‌شود و نه در زمان import: اگر در زمان import می‌خواندیم،
 * یک .env ناقص باعث می‌شد `next build` شکست بخورد — حتی برای صفحه‌هایی که
 * اصلاً به احراز هویت کاری ندارند.
 */
export function jwtSecret(): Uint8Array {
  if (cachedSecret) return cachedSecret;

  const raw = process.env.AUTH_JWT_SECRET;
  if (!raw) {
    throw new Error(
      "AUTH_JWT_SECRET تنظیم نشده است. با `openssl rand -base64 48` یکی بسازید و در .env بگذارید.",
    );
  }
  // کلید کوتاه یعنی امضای قابل حدس؛ HS256 دست‌کم ۳۲ بایت می‌خواهد.
  if (raw.length < 32) {
    throw new Error("AUTH_JWT_SECRET خیلی کوتاه است — دست‌کم ۳۲ کاراکتر لازم است.");
  }

  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}
