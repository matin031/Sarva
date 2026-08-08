import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { queryOne, execute } from "@/lib/db";

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
    `select
       -- filter باید مستقیماً به خودِ تابع تجمعی بچسبد، نه به عبارتی که آن را
       -- در بر گرفته: «extract(...) filter (...)» خطای نحوی است.
       extract(epoch from (now() - max(created_at)
                                     filter (where email = $1 and purpose = $2)))
                                                                as seconds_since_last,
       count(*) filter (
         where email = $1 and purpose = $2 and created_at > now() - interval '15 minutes'
       )                                                        as email_count,
       count(*) filter (
         where $3::inet is not null and requested_ip = $3::inet
           and created_at > now() - interval '1 hour'
       )                                                        as ip_count
     from email_otps`,
    [email, purpose, ip],
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
    `update email_otps set consumed_at = now()
      where email = $1 and purpose = $2 and consumed_at is null`,
    [email, purpose],
  );

  await execute(
    `insert into email_otps (email, code_hash, purpose, expires_at, requested_ip)
     values ($1, $2, $3, now() + make_interval(mins => $4::double precision), $5::inet)`,
    [email, hashCode(email, purpose, code), purpose, cfg.ttlMinutes, ip],
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

  const row = await queryOne<{ id: string; code_hash: string; attempts: number }>(
    `select id, code_hash, attempts
       from email_otps
      where email = $1 and purpose = $2
        and consumed_at is null
        and expires_at > now()
      order by created_at desc
      limit 1`,
    [email, purpose],
  );

  // پیام یکسان برای «کدی صادر نشده»، «منقضی شده» و «اشتباه است»: تفکیکشان فقط
  // به کسی که دارد حدس می‌زند اطلاعات می‌دهد.
  const invalid = { ok: false as const, error: "کد وارد شده اشتباه یا منقضی شده است." };

  if (!row) return invalid;

  // شمارش قبل از مقایسه: اگر بعدش بود، کسی می‌توانست با قطع کردن اتصال بعد از
  // ارسال، بی‌نهایت حدس بزند بدون اینکه شمارنده بالا برود.
  const attempts = row.attempts + 1;

  if (attempts > cfg.maxAttempts) {
    await execute("update email_otps set consumed_at = now() where id = $1", [row.id]);
    return { ok: false, error: "تعداد تلاش‌ها زیاد بود. کد تازه‌ای درخواست کنید." };
  }

  await execute("update email_otps set attempts = $1 where id = $2", [attempts, row.id]);

  if (!hashesMatch(row.code_hash, hashCode(email, purpose, code))) {
    // رسیدن به سقف با همین تلاش → کد همین‌جا می‌سوزد
    if (attempts >= cfg.maxAttempts) {
      await execute("update email_otps set consumed_at = now() where id = $1", [row.id]);
    }
    return invalid;
  }

  await execute("update email_otps set consumed_at = now() where id = $1", [row.id]);
  return { ok: true };
}
