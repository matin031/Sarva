import "server-only";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE } from "@/lib/auth/config";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { requestMeta } from "@/lib/api/http";

/**
 * محدودسازی نرخ، در حافظه.
 *
 * برای چه: جلوی حدس زدن رمز با تکرار. بدون آن، یک اسکریپت می‌تواند هزاران رمز
 * در دقیقه امتحان کند و argon2 هم فقط هر تلاش را گران می‌کند، نه غیرممکن.
 *
 * محدودیتی که باید بدانید: این شمارنده در حافظهٔ همین فرایند است. با یک
 * کانتینر — که پیکربندی فعلی است — درست کار می‌کند؛ اگر روزی چند نسخه از اپ
 * بالا آمد، هر کدام سهمیهٔ خودش را می‌شمارد و سقف واقعی چند برابر می‌شود.
 * وقتی به آنجا رسیدید این فایل باید به شمارندهٔ دیتابیسی یا Redis تبدیل شود.
 *
 * محدودیت‌های OTP در فاز ۴ عمداً در دیتابیس شمرده می‌شوند نه اینجا: آن‌ها باید
 * از ری‌استارت شدن اپ جان سالم به در ببرند، وگرنه ری‌استارت یعنی صفر شدن
 * سهمیهٔ ارسال ایمیل.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// جاروی تنبل: به‌جای تایمر، هر بار که نقشه بزرگ شد ردیف‌های منقضی پاک می‌شوند.
// تایمر در محیط سرورلس/HMR نشت می‌کند، این نمی‌کند.
const SWEEP_THRESHOLD = 5_000;

/* ⚠️ جارو حداکثر هر ده ثانیه یک بار. پیش از این، وقتی تعدادِ کلیدهای *زنده*
   از آستانه می‌گذشت (یعنی دقیقاً وقتی سایت شلوغ است — بیش از ۵۰۰۰ IP یا
   کاربرِ فعال در یک دقیقه)، جارو چیزی پاک نمی‌کرد و نقشه بالای آستانه
   می‌ماند؛ پس *هر* درخواست دوباره کلِ نقشه را پیمایش می‌کرد. هزینهٔ هر
   درخواست با تعدادِ کاربرانِ هم‌زمان خطی بالا می‌رفت. */
const SWEEP_INTERVAL_MS = 10_000;
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** ثانیهٔ باقی‌مانده تا آزاد شدن — برای پیام «چند ثانیه صبر کنید» */
  retryAfterSeconds: number;
  remaining: number;
};

/**
 * یک تلاش را می‌شمارد و می‌گوید مجاز است یا نه.
 *
 * @param key    چیزی که سهمیه به آن بسته است — مثلاً `login:ali@x.com` یا `login-ip:1.2.3.4`
 * @param limit  حداکثر تلاش در پنجره
 * @param windowSeconds طول پنجره
 */
export function rateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0, remaining: limit - 1 };
  }

  existing.count++;

  if (existing.count > limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      remaining: 0,
    };
  }

  return { allowed: true, retryAfterSeconds: 0, remaining: limit - existing.count };
}

/**
 * شمارندهٔ یک کلید را صفر می‌کند.
 *
 * بعد از ورود موفق صدا زده می‌شود: کسی که رمزش را درست وارد کرده نباید به خاطر
 * چند غلطِ قبلی قفل بماند.
 */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * «چه کسی» برای سقف‌هایی که جلوی اسکریپت را می‌گیرند و نه جلوی حدسِ رمز.
 *
 * ⚠️ چرا فقط IP کافی نبود: دانش‌آموزانِ یک کلاس یا یک مدرسه — و روی
 * اینترنتِ همراه، هزاران مشترکِ یک اپراتور (CGNAT) — با *یک* IP بیرون
 * می‌آیند. سقفی که برای یک اسکریپت تنظیم شده بود، بینِ سی دانش‌آموزی که با هم
 * بازی می‌کنند تقسیم می‌شد و وسطِ کلاس ۴۲۹ می‌داد: درست همان لحظه‌ای که
 * بیشترین کاربر روی سایت است.
 *
 * پس کاربرِ واردشده با شناسهٔ خودش شمرده می‌شود و فقط مهمان با IP. اسکریپتِ
 * بی‌حساب همچنان همان سقفِ قبلی را دارد؛ اسکریپتی که حساب دارد با سقفِ
 * همان حساب.
 *
 * بی‌هزینه است: فقط امضای توکنِ دسترسی بررسی می‌شود، بی‌هیچ کوئری. توکنِ
 * منقضی یا جعلی یعنی مهمان.
 *
 * ⚠️ برای سقف‌های ورود، بازیابیِ رمز و ارسالِ کد به کار نمی‌رود: آنجا
 * درخواست‌دهنده اصلاً وارد نشده و IP تنها چیزی است که داریم.
 */
export async function rateLimitSubject(request: NextRequest): Promise<string> {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const claims = token ? await verifyAccessToken(token) : null;
  if (claims) return `u:${claims.sub}`;
  return `ip:${requestMeta(request).ip ?? "unknown"}`;
}
