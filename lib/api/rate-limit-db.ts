import "server-only";
import { query, execute } from "@/lib/db";
import { logger } from "@/lib/observability";

/**
 * محدودسازی نرخ که ری‌استارت را تاب می‌آورد.
 *
 * ⚠️ چرا کنارِ نسخهٔ در-حافظه و نه به‌جایش:
 *
 * شمارندهٔ در-حافظه با هر ری‌استارتِ فرایند صفر می‌شود. برای مسیرهایی مثل
 * دریافتِ تصویر یا فهرستِ واژه‌ها این بی‌اهمیت است — بدترین حالتش چند
 * درخواستِ اضافه. ولی برای حدس زدنِ رمز مهم است: مهاجمی که هشت تلاشِ ناموفق
 * داشته، فقط باید صبر کند تا یک دیپلوی یا کرش سهمیه‌اش را از نو بسازد.
 *
 * پس این نسخه فقط جایی می‌رود که *امنیت* به شمارش وابسته است. جاهای دیگر
 * همان نسخهٔ ارزانِ در-حافظه را نگه می‌دارند؛ نوشتن در دیتابیس به‌ازای هر
 * درخواستِ تصویر هزینه‌ای است بی‌دلیل.
 *
 * محدودیت‌های OTP از قبل با همین استدلال در دیتابیس بودند (lib/auth/otp.ts).
 */

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * یک تلاش را می‌شمارد و می‌گوید اجازه هست یا نه.
 *
 * ⚠️ شمارش و تصمیم در *یک* statement انجام می‌شود (تابع rate_limit_hit در
 * مهاجرت ۰۱۳). با select-then-update، دو درخواستِ هم‌زمان هر دو مقدار قدیمی
 * را می‌خواندند و سقف عملاً دو برابر می‌شد — دقیقاً در حالتِ حمله که
 * درخواست‌ها موازی می‌آیند.
 */
export async function rateLimitDb(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const rows = await query<{ hits: number; reset_at: string }>(
      `select hits, reset_at from rate_limit_hit($1, $2)`,
      [key, windowSeconds],
    );
    const hits = rows[0]?.hits ?? 1;
    const resetAt = rows[0]?.reset_at ? new Date(rows[0].reset_at).getTime() : Date.now();
    const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

    return {
      allowed: hits <= limit,
      remaining: Math.max(0, limit - hits),
      retryAfterSeconds,
    };
  } catch (err) {
    // ⚠️ دیتابیس در دسترس نیست.
    //
    // اینجا عمداً *اجازه* داده می‌شود، نه رد. دلیلش این است که هر مسیری که
    // این محافظ را دارد، خودش هم به دیتابیس نیاز دارد: ورود بدونِ جدولِ
    // کاربران کار نمی‌کند. پس رد کردن اینجا چیزی را امن‌تر نمی‌کند و فقط
    // پیام خطای گمراه‌کننده می‌دهد؛ خودِ مسیر چند خط پایین‌تر شکست می‌خورد.
    //
    // ولی بی‌صدا هم نمی‌ماند: محافظِ از کار افتاده باید دیده شود.
    logger.error("محدودسازی نرخِ دیتابیسی شکست خورد", {
      event: "rate_limit.db_failed",
      err,
    });
    return { allowed: true, remaining: limit, retryAfterSeconds: 0 };
  }
}

/** آزاد کردنِ سهمیه — پس از ورودِ موفق. */
export async function resetRateLimitDb(key: string): Promise<void> {
  try {
    await execute(`select rate_limit_reset($1)`, [key]);
  } catch {
    // آزاد نشد؛ کاربر تا پایانِ پنجره سهمیهٔ سوخته دارد. آزاردهنده، نه خطرناک.
  }
}

/**
 * ردیف‌های منقضی را پاک می‌کند.
 *
 * ⚠️ چرا لازم است و چرا اینجا: کلیدها ایمیل و IP در خود دارند، پس این جدول
 * دادهٔ شخصی است و نباید برای همیشه بماند. جارو با احتمالِ کم اجرا می‌شود تا
 * هر درخواست یک delete اضافه نشود — تایمر عمداً نیست، چون در محیطِ
 * سرورلس/HMR نشت می‌کند (همان استدلالی که در نسخهٔ در-حافظه هست).
 */
export async function sweepRateLimits(probability = 0.01): Promise<void> {
  if (Math.random() >= probability) return;
  try {
    await execute(`delete from rate_limits where reset_at <= now()`);
  } catch {
    // جارو نشد؛ دفعهٔ بعد.
  }
}
