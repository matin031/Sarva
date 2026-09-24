import "server-only";
import { createHmac, randomInt, timingSafeEqual, randomUUID } from "node:crypto";
import { queryOne, execute, transaction } from "@/lib/db";
import { spendSmsBudget } from "@/lib/sms/spend";

/**
 * کدهای یک‌بارمصرفِ پیامکی.
 *
 * ⚠️ این فایل عمداً **آینهٔ `otp.ts`** است و نه یک پیاده‌سازیِ تازه. هر
 * تصمیمِ امنیتیِ آنجا اینجا هم تکرار شده، چون هر کدامشان جوابِ یک اشتباهِ
 * واقعی است:
 *
 *   • کد **هش‌شده با pepper** ذخیره می‌شود، نه plaintext. فضای یک کد
 *     شش‌رقمی فقط ۱۰⁶ است؛ بدونِ pepper، دامپِ دیتابیس یعنی همهٔ کدها.
 *   • شمارشِ تلاش **زیرِ قفلِ ردیف** بالا می‌رود، نه در جاوااسکریپت. وگرنه صد
 *     درخواستِ همزمان همگی `attempts = 0` می‌خوانند و سقفِ پنج‌تایی به «پنج
 *     دستهٔ همزمان» تبدیل می‌شود.
 *   • مقایسهٔ هش **بیرونِ تراکنش** است. اگر داخلش بود، هر خطایی در آن مسیر با
 *     rollback شمارشِ تلاشِ ناموفق را هم پاک می‌کرد و حدس زدن رایگان می‌شد.
 *   • محدودیت‌ها در **دیتابیس** شمرده می‌شوند و نه در حافظه: هر ری‌استارتِ اپ
 *     وگرنه شمارنده‌ها را صفر می‌کرد.
 *
 * ── و یک تفاوتِ مهم با ایمیل ──────────────────────────────────────────────
 * ⚠️ هر پیامک **پول** است. سقفِ ارسال اینجا سخت‌گیرانه‌تر از ایمیل است، چون
 * سوءاستفاده از این مسیر فقط آزاردهنده نیست — مستقیم از موجودیِ پنلِ پیامک
 * خرج می‌کند. یک اسکریپت که هزار بار «ارسال کد» بزند، با سقفِ ایمیلی می‌توانست
 * موجودی را در چند دقیقه صفر کند.
 */

export type PhoneOtpPurpose = "login" | "phone_verify" | "password_reset";

export type PhoneOtpIssue =
  | { ok: true; code: string; expiresInMinutes: number }
  | { ok: false; error: string; retryAfterSeconds?: number };

export type PhoneOtpCheck = { ok: true } | { ok: false; error: string };

function config() {
  return {
    ttlMinutes: Number(process.env.SMS_OTP_TTL_MINUTES ?? 5),
    cooldownSeconds: Number(process.env.SMS_OTP_RESEND_COOLDOWN_SECONDS ?? 90),
    // ⚠️ سه ارسال در ساعت برای هر شماره، و نه در ۱۵ دقیقه مثل ایمیل.
    maxPerPhone: Number(process.env.SMS_OTP_MAX_PER_PHONE ?? 3),
    maxPerIp: Number(process.env.SMS_OTP_MAX_PER_IP ?? 8),
    maxAttempts: Number(process.env.SMS_OTP_MAX_ATTEMPTS ?? 5),
  };
}

/**
 * هشِ کد — HMAC-SHA256 با pepper.
 *
 * شماره و purpose داخلِ ورودیِ HMAC هستند تا کدی که برای ورود صادر شده،
 * حتی اگر لو برود، برای بازیابیِ رمز قابل استفاده نباشد.
 *
 * ⚠️ همان `OTP_PEPPER` ایمیل استفاده می‌شود و نه یک رازِ تازه: چون purpose و
 * شماره در ورودی‌اند، فضای کدهای دو مسیر از هم جداست و رازِ دوم چیزی اضافه
 * نمی‌کرد جز یک متغیرِ محیطیِ دیگر که یادش می‌رود تنظیم شود.
 */
function hashCode(phone: string, purpose: PhoneOtpPurpose, code: string): string {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      "OTP_PEPPER تنظیم نشده یا خیلی کوتاه است. با `openssl rand -base64 48` یکی بسازید.",
    );
  }
  return createHmac("sha256", pepper).update(`sms:${purpose}:${phone}:${code}`).digest("hex");
}

function hashesMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * صدور کد تازه.
 *
 * کدِ متنی برگردانده می‌شود تا فراخوان پیامکش کند؛ در دیتابیس فقط هش می‌رود.
 *
 * ⚠️ ورودیِ `phone` باید **از قبل نرمال شده** باشد (`989…`). این تابع خودش
 * نرمال نمی‌کند، چون آن‌وقت دو جا مسئولِ یک کار بودند و شکلِ ذخیره‌شده به
 * اینکه کدام مسیر صدایش زده وابسته می‌شد.
 */
export async function issuePhoneOtp(
  phone: string,
  purpose: PhoneOtpPurpose,
  ip: string | null,
): Promise<PhoneOtpIssue> {
  const cfg = config();

  // یک کوئری برای هر سه محدودیت — همان شکلِ `otp.ts`:
  // COUNT(CASE …) و نه SUM(شرط)، چون SUM روی مجموعهٔ خالی NULL می‌دهد و NULL
  // از سقف رد می‌شود. و TIMESTAMPDIFF با MICROSECOND، چون SECOND عددِ بریده
  // می‌دهد و cooldown با کسرِ ثانیه مقایسه می‌شود.
  const limits = await queryOne<{
    seconds_since_last: number | null;
    phone_count: number;
    ip_count: number;
  }>(
    `select
       timestampdiff(
         microsecond,
         max(case when phone = ? and purpose = ? then created_at end),
         now(6)
       ) / 1000000                                              as seconds_since_last,
       count(case
               when phone = ? and purpose = ?
                and created_at > now(6) - interval 1 hour
               then 1 end)                                      as phone_count,
       count(case
               when ? is not null and requested_ip = ?
                and created_at > now(6) - interval 1 hour
               then 1 end)                                      as ip_count
     from phone_otps`,
    [phone, purpose, phone, purpose, ip, ip],
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

  if ((limits?.phone_count ?? 0) >= cfg.maxPerPhone) {
    return {
      ok: false,
      error: "تعداد درخواست کد برای این شماره زیاد بود. یک ساعت دیگر تلاش کنید.",
    };
  }

  if (ip && (limits?.ip_count ?? 0) >= cfg.maxPerIp) {
    return { ok: false, error: "تعداد درخواست‌ها از این دستگاه زیاد بود. یک ساعت دیگر تلاش کنید." };
  }

  /* ── سقفِ سراسریِ خرجِ پیامک ──────────────────────────────────────────────
   *
   * ⚠️ **اینجا** و نه در route ها. `issuePhoneOtp` تنها گلوگاهی است که هر
   * پیامکِ کدِ یک‌بارمصرف از آن رد می‌شود (ورود، ثبت‌نام، تأیید شماره،
   * بازیابی رمز). گذاشتنش در route ها یعنی چهار تکرار — و همان محافظی که
   * باید در چهار فایل تکرار شود، همانی است که در فایلِ پنجم فراموش می‌شود.
   *
   * ⚠️ و **بعد** از سقف‌های شماره/IP و cooldown، درست پیش از ساختنِ کد.
   * چراییِ این ترتیب بالای `spendSmsBudget` نوشته شده.
   *
   * ⚠️ خودِ منطقِ سقف از اینجا به `lib/sms/spend.ts` رفت، وقتی مصرف‌کنندهٔ
   * دومی پیدا کرد: پیامک‌های اطلاع‌رسانی (`lib/notify`) هم باید از همان یک
   * کیسه خرج کنند، وگرنه سقفِ «سراسری» نصفِ ارسال‌ها را نمی‌بیند. */
  const spent = await spendSmsBudget();
  if (!spent.allowed) {
    /* ⚠️ پیام عمداً دلیلِ واقعی را نمی‌گوید. «سقفِ روزانهٔ سایت پر شده» به
       کسی که همین حالا آن را پر کرده می‌گوید حمله‌اش گرفته. */
    return {
      ok: false,
      error: "ارسال پیامک موقتاً ممکن نیست. کمی بعد دوباره تلاش کنید.",
      retryAfterSeconds: spent.retryAfterSeconds,
    };
  }

  // randomInt و نه Math.random: مولدِ Math.random قابلِ پیش‌بینی است.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  // کدهای قبلیِ همین شماره و همین purpose باطل می‌شوند: اگر کاربر «ارسال
  // دوباره» زد، کدِ قدیمی نباید همچنان کار کند — وگرنه هر درخواست یک حدسِ
  // معتبرِ بیشتر می‌سازد.
  await execute(
    `update phone_otps set consumed_at = now(6)
      where phone = ? and purpose = ? and consumed_at is null`,
    [phone, purpose],
  );

  await execute(
    `insert into phone_otps (id, phone, code_hash, purpose, expires_at, requested_ip)
     values (?, ?, ?, ?, now(6) + interval ? second, ?)`,
    [randomUUID(), phone, hashCode(phone, purpose, code), purpose, cfg.ttlMinutes * 60, ip],
  );

  return { ok: true, code, expiresInMinutes: cfg.ttlMinutes };
}

/**
 * بررسی کد.
 *
 * موفقیت، کد را مصرف‌شده علامت می‌زند؛ شکست، شمارندهٔ تلاش را بالا می‌برد و در
 * صورت رسیدن به سقف، کد را می‌سوزاند.
 */
export async function checkPhoneOtp(
  phone: string,
  purpose: PhoneOtpPurpose,
  code: string,
): Promise<PhoneOtpCheck> {
  const cfg = config();

  // ⚠️ select و update داخلِ *یک* تراکنش و روی *یک* اتصال، با `for update`.
  // MySQL نه RETURNING دارد و نه می‌شود در یک UPDATE هم شمرد و هم خواند؛
  // ترجمهٔ ساده‌لوحانه («select کن، بعد update کن») همان مسابقهٔ همزمانی را
  // برمی‌گرداند که بالای این فایل توضیح داده شد.
  const row = await transaction(async (tx) => {
    const found = await tx.queryOne<{ id: string; code_hash: string; attempts: number }>(
      `select id, code_hash, attempts
         from phone_otps
        where phone = ? and purpose = ?
          and consumed_at is null
          and expires_at > now(6)
        order by created_at desc
        limit 1
        for update`,
      [phone, purpose],
    );
    if (!found) return null;

    // شرطِ دومِ consumed_at عمدی است: بین گرفتن قفل و رسیدن به اینجا،
    // درخواستِ دیگری ممکن است همین کد را سوزانده باشد.
    const bumped = await tx.execute(
      `update phone_otps set attempts = attempts + 1
        where id = ? and consumed_at is null`,
      [found.id],
    );
    if (bumped === 0) return null;

    return { ...found, attempts: found.attempts + 1 };
  });

  // پیام یکسان برای «کدی صادر نشده»، «منقضی شده» و «اشتباه است»: تفکیکشان فقط
  // به کسی که دارد حدس می‌زند اطلاعات می‌دهد.
  const invalid = { ok: false as const, error: "کد وارد شده اشتباه یا منقضی شده است." };

  if (!row) return invalid;

  if (row.attempts > cfg.maxAttempts) {
    await execute("update phone_otps set consumed_at = now(6) where id = ?", [row.id]);
    return { ok: false, error: "تعداد تلاش‌ها زیاد بود. کد تازه‌ای درخواست کنید." };
  }

  if (!hashesMatch(row.code_hash, hashCode(phone, purpose, code))) {
    // رسیدن به سقف با همین تلاش → کد همین‌جا می‌سوزد
    if (row.attempts >= cfg.maxAttempts) {
      await execute("update phone_otps set consumed_at = now(6) where id = ?", [row.id]);
    }
    return invalid;
  }

  await execute("update phone_otps set consumed_at = now(6) where id = ?", [row.id]);
  return { ok: true };
}
