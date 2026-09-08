import "server-only";
import { execute, transaction } from "@/lib/db";
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
    // ⚠️ چرا تراکنش، و چرا تابعِ دیتابیسی جایگزین نشد.
    //
    // در PostgreSQL این کار را تابع rate_limit_hit در یک statement انجام
    // می‌داد: INSERT … ON CONFLICT DO UPDATE … RETURNING. هیچ‌کدام از سه
    // تکه در MySQL وجود ندارد — نه RETURNING، و نه تابعی که مجموعه
    // برگرداند.
    //
    // ترجمهٔ ساده‌لوحانه یک رویه بود که upsert کند و بعد SELECT بزند. ولی
    // بدنهٔ رویه در حالت autocommit دو تراکنشِ جداست: قفلِ ردیف بعد از
    // upsert آزاد می‌شود و SELECT می‌تواند مقدارِ درخواستِ دیگری را بخواند.
    // یعنی همان lost-update ای که این ماژول اصلاً برای جلوگیری از آن نوشته
    // شده، از در پشتی برمی‌گشت — و دقیقاً در حالتِ حمله که درخواست‌ها
    // موازی می‌آیند.
    //
    // پس upsert و SELECT داخل *یک* تراکنش روی *یک* اتصال. قفلِ ردیفِ
    // InnoDB که با upsert گرفته می‌شود تا COMMIT نگه داشته می‌شود، پس هیچ
    // درخواستِ موازی‌ای نمی‌تواند بین این دو بنویسد.
    const row = await transaction(async (tx) => {
      await tx.execute(
        `insert into rate_limits (\`key\`, count, reset_at)
              values (?, 1, now(6) + interval ? second)
         on duplicate key update
              -- پنجره تمام شده؟ از نو شروع کن. وگرنه یکی اضافه کن.
              count    = if(reset_at <= now(6), 1, count + 1),
              reset_at = if(reset_at <= now(6),
                            now(6) + interval ? second,
                            reset_at)`,
        [key, windowSeconds, windowSeconds],
      );
      return tx.queryOne<{ hits: number; reset_at: string }>(
        "select count as hits, reset_at from rate_limits where `key` = ?",
        [key],
      );
    });

    const hits = row?.hits ?? 1;
    const resetAt = row?.reset_at ? new Date(row.reset_at).getTime() : Date.now();
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
    // تابعِ rate_limit_reset فقط یک delete بود؛ در MySQL خودِ delete کافی
    // است و روتینِ جدا چیزی اضافه نمی‌کرد.
    await execute("delete from rate_limits where `key` = ?", [key]);
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
    await execute(`delete from rate_limits where reset_at <= now(6)`);
  } catch {
    // جارو نشد؛ دفعهٔ بعد.
  }
}
