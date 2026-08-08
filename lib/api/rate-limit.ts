import "server-only";

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

function sweep(now: number) {
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
