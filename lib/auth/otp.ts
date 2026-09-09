import "server-only";
import { createHmac, randomInt, timingSafeEqual, randomUUID } from "node:crypto";
import { queryOne, execute, transaction } from "@/lib/db";

/**
 * کدهای یک‌بارمصرف ایمیل.
 *
 * بازنویسی کاملِ app/api/send-otp و verify-otp، که سه نقص جدی داشتند:
 *
 *   ۱) کد را plaintext در جدول otp_codes ذخیره می‌کردند.
 *   ۲) هیچ محدودیتی نداشتند — نه روی تعداد ارسال، نه روی تعداد حدس. یک کد
 *      شش‌رقمی با هزار درخواست در ثانیه، در چند ثانیه شکسته می‌شود.
 *   ۳) verify-otp از کلاینتِ مرورگریِ Supabase (کلید anon) در سمت سرور استفاده
 *      می‌کرد، و در پایان فقط {success:true} برمی‌گرداند تا کلاینت باورش کند.
 *
 * اینجا هر سه بسته شده‌اند. محدودیت‌ها عمداً در دیتابیس شمرده می‌شوند نه در
 * حافظه (برخلاف lib/api/rate-limit.ts که برای ورود است): سهمیهٔ ارسال ایمیل
 * باید از ری‌استارت شدن اپ جان سالم به در ببرد، وگرنه هر ری‌استارت یعنی
 * شمارنده‌ها صفر و امکان ارسال انبوه.
 */

export type OtpPurpose = "signup_verify" | "email_change";

export type OtpIssue =
  | { ok: true; code: string; expiresInMinutes: number }
  | { ok: false; error: string; retryAfterSeconds?: number };

export type OtpCheck = { ok: true } | { ok: false; error: string };

function config() {
  return {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES ?? 10),
    cooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60),
    maxPerEmail: Number(process.env.OTP_MAX_PER_EMAIL ?? 3),
    maxPerIp: Number(process.env.OTP_MAX_PER_IP ?? 10),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
  };
}

/**
 * هشِ کد.
 *
 * HMAC-SHA256 با یک pepper که فقط در env است و هرگز وارد دیتابیس نمی‌شود.
 *
 * چرا HMAC و نه bcrypt/argon2: فضای یک کد شش‌رقمی فقط ۱۰⁶ است. هر هشِ کندی هم
 * که بگذاریم، کسی که دامپ دیتابیس را دارد می‌تواند همهٔ یک میلیون حالت را
 * امتحان کند — فقط کمی دیرتر. چیزی که واقعاً جلویش را می‌گیرد pepper است:
 * بدون آن، هیچ حالتی قابل بررسی نیست. و چون HMAC قطعی است، جست‌وجو در دیتابیس
 * هم ممکن می‌ماند.
 *
 * ایمیل و purpose داخل ورودیِ HMAC هستند تا کدی که برای یک نفر صادر شده،
 * حتی اگر لو برود، روی حساب دیگری یا برای کار دیگری قابل استفاده نباشد.
 */
function hashCode(email: string, purpose: OtpPurpose, code: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      "OTP_PEPPER تنظیم نشده یا خیلی کوتاه است. با `openssl rand -base64 48` یکی بسازید.",
    );
  }
  return createHmac("sha256", pepper)
    .update(`${purpose}:${email.toLowerCase()}:${code}`)
    .digest("hex");
}

/** مقایسهٔ دو هش در زمان ثابت. */
function hashesMatch(a: string, b: string): boolean {
  // طول‌ها همیشه یکی‌اند (هر دو hex از SHA-256)، ولی timingSafeEqual روی طول
  // نابرابر خطا می‌دهد — پس محافظت لازم است.
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * صدور کد تازه.
 *
 * کدِ متنی برگردانده می‌شود تا فراخوان ایمیلش کند؛ در دیتابیس فقط هش می‌رود.
 */
export async function issueOtp(
  email: string,
  purpose: OtpPurpose,
  ip: string | null,
): Promise<OtpIssue> {
  const cfg = config();

  // یک کوئری برای هر سه محدودیت، چون هر سه یک بازهٔ زمانی را می‌شمارند.
  const limits = await queryOne<{
    seconds_since_last: number | null;
    email_count: number;
    ip_count: number;
  }>(
    // ⚠️ FILTER (WHERE …) در MySQL وجود ندارد. معادلش conditional aggregate
    // است: مقدارِ داخلِ تابع تجمعی وقتی شرط برقرار نیست NULL می‌شود و توابع
    // تجمعی NULL را نادیده می‌گیرند.
    //
    // COUNT(CASE WHEN … THEN 1 END) و نه SUM(شرط): روی مجموعهٔ خالی، COUNT
    // مقدار ۰ می‌دهد ولی SUM مقدار NULL — و NULL از سقف رد می‌شد و
    // محدودیت را بی‌اثر می‌کرد.
    //
    // extract(epoch from …) هم معادل ندارد. TIMESTAMPDIFF با واحد
    // MICROSECOND گرفته شده و نه SECOND، چون SECOND عددِ صحیحِ بریده می‌دهد
    // و cooldown اینجا با کسر ثانیه مقایسه می‌شود.
    //
    // پارامترها: در PostgreSQL شماره‌ها تکرار می‌شدند ($1 و $2 و $3 هرکدام
    // دو بار). در MySQL هر ? یک جاست، پس همان مقدار چند بار در آرایه می‌آید.
    `select
       timestampdiff(
         microsecond,
         max(case when email = ? and purpose = ? then created_at end),
         now(6)
       ) / 1000000                                              as seconds_since_last,
       count(case
               when email = ? and purpose = ?
                and created_at > now(6) - interval 15 minute
               then 1 end)                                      as email_count,
       count(case
               when ? is not null and requested_ip = ?
                and created_at > now(6) - interval 1 hour
               then 1 end)                                      as ip_count
     from email_otps`,
    [email, purpose, email, purpose, ip, ip],
  );

  const sinceLast = limits?.seconds_since_last ?? null;

  if (sinceLast !== null && sinceLast < cfg.cooldownSeconds) {
    const wait = Math.ceil(cfg.cooldownSeconds - sinceLast);
    return {
      ok: false,
      error: `برای ارسال دوبارهٔ کد ${wait} ثانیه صبر کنید.`,
      retryAfterSeconds: wait,
    };
  }

  if ((limits?.email_count ?? 0) >= cfg.maxPerEmail) {
    return { ok: false, error: "تعداد درخواست کد برای این ایمیل زیاد بود. کمی بعد تلاش کنید." };
  }

  if (ip && (limits?.ip_count ?? 0) >= cfg.maxPerIp) {
    return { ok: false, error: "تعداد درخواست‌ها از این دستگاه زیاد بود. یک ساعت دیگر تلاش کنید." };
  }

  // randomInt و نه Math.random: کد قبلی با Math.random ساخته می‌شد، که مولدش
  // قابل پیش‌بینی است — با دیدن چند خروجی می‌شود بقیه را حساب کرد.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // کدهای قبلیِ همین ایمیل باطل می‌شوند: اگر کاربر «ارسال دوباره» زد، کد قدیمی
  // نباید همچنان کار کند — وگرنه هر درخواست یک حدسِ معتبرِ بیشتر می‌سازد.
  await execute(
    `update email_otps set consumed_at = now(6)
      where email = ? and purpose = ? and consumed_at is null`,
    [email, purpose],
  );

  // این همان insert ای است که در دوران PostgreSQL ماه‌ها شکسته بود:
  // `make_interval(mins => $4::double precision)` با هیچ overload ای جور
  // درنمی‌آمد (فقط secs از نوع double precision است) و هر «ارسال کد تأیید»
  // را با ۵۰۰ برمی‌گرداند. tsc نمی‌دیدش چون SQL برایش فقط یک رشته است.
  //
  // در MySQL کلاً تابعی لازم نیست: بازهٔ زمانی نحوِ خودش را دارد و پارامتر هم
  // می‌پذیرد. `npm run db:check-sql` همین را با PREPARE می‌سنجد، و
  // آزموده شد که «تابع وجود ندارد» را هم می‌گیرد — یعنی اگر دوباره چنین
  // اشتباهی بیفتد، این بار قبل از استقرار دیده می‌شود.
  await execute(
    `insert into email_otps (id, email, code_hash, purpose, expires_at, requested_ip)
     values (?, ?, ?, ?, now(6) + interval ? second, ?)`,
    [randomUUID(), email, hashCode(email, purpose, code), purpose, cfg.ttlMinutes * 60, ip],
  );

  return { ok: true, code, expiresInMinutes: cfg.ttlMinutes };
}

/**
 * بررسی کد.
 *
 * موفقیت، کد را مصرف‌شده علامت می‌زند؛ شکست، شمارندهٔ تلاش را بالا می‌برد و در
 * صورت رسیدن به سقف کد را می‌سوزاند.
 */
export async function checkOtp(
  email: string,
  purpose: OtpPurpose,
  code: string,
): Promise<OtpCheck> {
  const cfg = config();

  // ⚠️ خواندن و شمردن در *یک* دستور.
  //
  // قبلاً اول یک select بود و بعد `set attempts = $1`. مقدارِ تازه در
  // جاوااسکریپت حساب می‌شد، پس صد درخواستِ همزمان همگی `attempts = 0` را
  // می‌خواندند و همگی `1` می‌نوشتند: سقفِ پنج‌تایی عملاً به «پنج *دستهٔ*
  // همزمان» تبدیل می‌شد و مهاجم می‌توانست فضای یک‌میلیونیِ کد را با رگبارِ
  // موازی بگردد.
  //
  // حالا `attempts + 1` را خودِ پستگرس زیر قفلِ ردیف حساب می‌کند، پس هر
  // درخواست عددِ یکتای خودش را می‌گیرد. شرطِ دومِ `consumed_at is null` روی
  // خودِ update عمدی است: پس از گرفتن قفل دوباره سنجیده می‌شود، پس کدی که
  // درخواستِ دیگری همین لحظه سوزانده باشد صفر ردیف برمی‌گرداند.
  //
  // شمارش هنوز *قبل* از مقایسه است: اگر بعدش بود، کسی می‌توانست با قطع کردن
  // اتصال بعد از ارسال، بی‌نهایت حدس بزند بدون اینکه شمارنده بالا برود.
  // ⚠️ MySQL نه RETURNING دارد و نه می‌شود در یک UPDATE هم شمرد و هم خواند.
  //
  // ترجمهٔ ساده‌لوحانه — «select کن، بعد update کن» — دقیقاً همان باگی را
  // برمی‌گرداند که کامنت بالا می‌گوید حذف شده: صد درخواستِ همزمان همگی
  // attempts=0 را می‌خوانند و همگی ۱ می‌نویسند.
  //
  // پس select و update داخل *یک* تراکنش و روی *یک* اتصال، با
  // `for update` روی select. قفلِ ردیفِ InnoDB درخواست‌های همزمان را پشت سر
  // هم می‌کند، پس هر کدام عددِ یکتای خودش را می‌گیرد.
  //
  // ⚠️ تراکنش عمداً همین‌جا تمام می‌شود و مقایسهٔ هش *بیرونِ* آن انجام
  // می‌شود. اگر مقایسه داخل تراکنش بود، هر خطایی در آن مسیر با rollback
  // شمارشِ تلاشِ ناموفق را هم پاک می‌کرد — یعنی حدس زدن رایگان می‌شد.
  const row = await transaction(async (tx) => {
    const found = await tx.queryOne<{ id: string; code_hash: string; attempts: number }>(
      `select id, code_hash, attempts
         from email_otps
        where email = ? and purpose = ?
          and consumed_at is null
          and expires_at > now(6)
        order by created_at desc
        limit 1
        for update`,
      [email, purpose],
    );
    if (!found) return null;

    // شرطِ دومِ consumed_at عمدی است: بین گرفتن قفل و رسیدن به اینجا،
    // درخواستِ دیگری ممکن است همین کد را سوزانده باشد.
    const bumped = await tx.execute(
      `update email_otps set attempts = attempts + 1
        where id = ? and consumed_at is null`,
      [found.id],
    );
    if (bumped === 0) return null;

    // شمارهٔ همین تلاش، نه تلاشِ قبلی — مثل RETURNING قبلی.
    return { ...found, attempts: found.attempts + 1 };
  });

  // پیام یکسان برای «کدی صادر نشده»، «منقضی شده» و «اشتباه است»: تفکیکشان فقط
  // به کسی که دارد حدس می‌زند اطلاعات می‌دهد.
  const invalid = { ok: false as const, error: "کد وارد شده اشتباه یا منقضی شده است." };

  if (!row) return invalid;

  // attempts دیگر شمارهٔ همین تلاش است، نه شمارهٔ تلاشِ قبلی.
  const attempts = row.attempts;

  if (attempts > cfg.maxAttempts) {
    await execute("update email_otps set consumed_at = now(6) where id = ?", [row.id]);
    return { ok: false, error: "تعداد تلاش‌ها زیاد بود. کد تازه‌ای درخواست کنید." };
  }

  if (!hashesMatch(row.code_hash, hashCode(email, purpose, code))) {
    // رسیدن به سقف با همین تلاش → کد همین‌جا می‌سوزد
    if (attempts >= cfg.maxAttempts) {
      await execute("update email_otps set consumed_at = now(6) where id = ?", [row.id]);
    }
    return invalid;
  }

  await execute("update email_otps set consumed_at = now(6) where id = ?", [row.id]);
  return { ok: true };
}
