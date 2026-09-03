import "server-only";
import { logger } from "@/lib/observability";
import { missingKeyPolicy } from "@/lib/auth/turnstile-policy";

/**
 * Cloudflare Turnstile — تأیید سمت سرور.
 *
 * ⚠️ نکتهٔ اصلیِ هر کپچایی: ویجتِ سمت مرورگر هیچ چیزی را امن نمی‌کند. آن فقط
 * یک رشته (توکن) تولید می‌کند؛ چیزی که واقعاً در را می‌بندد، همین فایل است که
 * آن رشته را از خودِ Cloudflare می‌پرسد. اگر جایی ویجت باشد ولی این تأیید
 * نباشد، مهاجم فقط فرم را دور می‌زند و مستقیم به API درخواست می‌فرستد — و
 * کپچا هیچ کاری نکرده.
 *
 * به همین دلیل فراخوانیِ این تابع در خودِ route ها است، نه در کامپوننت فرم.
 *
 * ── نبودِ کلید: در توسعه باز، در production بسته ────────────────────────────
 *
 * ⚠️ تا دیروز نبودِ TURNSTILE_SECRET_KEY یعنی «همه چیز را قبول کن» — در هر
 * محیطی، از جمله production. یعنی یک متغیرِ محیطیِ جاافتاده (یا پاک‌شده در یک
 * deploy) کپچا را بی‌صدا خاموش می‌کرد و هیچ‌کس نمی‌فهمید: نه خطایی، نه
 * تفاوتی در رفتار. این بدترین شکلِ fail-open است، چون *غیبتِ* محافظ شبیه
 * سلامت به نظر می‌رسد.
 *
 * حالا:
 *
 *   • خارج از production (توسعه و تست): بدون کلید، همه چیز پذیرفته می‌شود و
 *     یک بار هشدار می‌آید. سایت باید بدون حساب Cloudflare قابل اجرا باشد.
 *
 *   • در production: نبودِ کلید یعنی درخواست **رد** می‌شود، نه پذیرفته.
 *     اگر واقعاً می‌خواهید کپچا خاموش باشد، باید صریح بنویسید:
 *
 *         TURNSTILE_OPTIONAL=true
 *
 *     یعنی خاموشی یک تصمیمِ ثبت‌شده است، نه یک فراموشی.
 *
 * ── راه‌اندازی ─────────────────────────────────────────────────────────────
 *
 *   ۱) dash.cloudflare.com → Turnstile → Add Site
 *   ۲) دامنهٔ سایت را بدهید و «localhost» را هم اضافه کنید (وگرنه محیط توسعه
 *      کار نمی‌کند)، Widget Mode = Managed
 *   ۳) دو کلید را در .env بگذارید:
 *        NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAA...   (عمومی، در HTML می‌نشیند)
 *        TURNSTILE_SECRET_KEY=0x4AAAA...             (مخفی، فقط همین فایل)
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 10_000;

/** آیا کپچا در این نصب فعال است؟ */
export { missingKeyPolicy };

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  logger.warn(
    "TURNSTILE_SECRET_KEY تنظیم نشده — کپچا غیرفعال است. برای فعال کردنش راهنمای بالای lib/auth/turnstile.ts را ببینید.",
    { event: "captcha.disabled" },
  );
}

let deniedWarned = false;

function warnDeniedOnce() {
  if (deniedWarned) return;
  deniedWarned = true;
  logger.error(
    "TURNSTILE_SECRET_KEY در production تنظیم نشده — درخواست‌های محافظت‌شده رد می‌شوند. " +
      "کلید را بگذارید، یا اگر عمداً کپچا نمی‌خواهید TURNSTILE_OPTIONAL=true را صریح تنظیم کنید.",
    { event: "captcha.misconfigured" },
  );
}

type SiteVerifyResponse = {
  success?: boolean;
  hostname?: string;
  "error-codes"?: string[];
};

export type TurnstileResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR = "تأیید امنیتی ناموفق بود. صفحه را تازه کنید و دوباره تلاش کنید.";

/**
 * توکنِ آمده از فرم را با Cloudflare بررسی می‌کند.
 *
 * @param token توکنی که ویجت ساخته (فیلد `cf-turnstile-response`)
 * @param ip    آدرس کلاینت — اختیاری ولی مفید: Cloudflare با آن سیگنال بهتری
 *              می‌سازد. حتماً از requestMeta بیاید، نه از هدر خام، وگرنه
 *              همان جعلِ X-Forwarded-For اینجا هم تکرار می‌شود.
 */
export async function verifyTurnstile(
  token: unknown,
  ip: string | null,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (missingKeyPolicy() === "deny") {
      // ⚠️ در production، نبودِ کلید یعنی محافظ غایب است — و غیبتِ محافظ
      //    نباید شبیه سلامت به نظر برسد. رد کردن، تنها رفتاری است که این را
      //    دیدنی می‌کند. راهِ خاموشیِ آگاهانه TURNSTILE_OPTIONAL=true است.
      warnDeniedOnce();
      return { ok: false, error: "تأیید امنیتی پیکربندی نشده است. با پشتیبانی تماس بگیرید." };
    }
    warnOnce();
    return { ok: true };
  }

  if (typeof token !== "string" || !token || token.length > 2048) {
    return { ok: false, error: "تأیید امنیتی انجام نشده است. لطفاً کادر تأیید را کامل کنید." };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  let payload: SiteVerifyResponse;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) throw new Error(`siteverify پاسخ ${response.status} داد`);
    payload = (await response.json()) as SiteVerifyResponse;
  } catch (err) {
    // ⚠️ در دسترس نبودن Cloudflare = رد کردن درخواست، نه پذیرفتنش.
    //
    // انتخاب سختی است: این یعنی اگر Cloudflare از ایران در دسترس نباشد، ورود
    // و ثبت‌نام از کار می‌افتند. ولی جایگزینش («خطا؟ پس قبول کن») یعنی مهاجم
    // فقط کافی است دسترسی سرور به Cloudflare را مختل کند تا کپچا ناپدید شود —
    // که همان چیزی است که کپچا برای جلوگیری از آن گذاشته شده.
    //
    // اگر روزی این تصمیم به مشکل خورد، راهش برداشتن TURNSTILE_SECRET_KEY از
    // .env است (یعنی خاموش کردنِ آگاهانهٔ کپچا)، نه نرم کردن این خط.
    // ⚠️ خودِ توکن هرگز لاگ نمی‌شود؛ فقط اینکه ارتباط برقرار نشد.
    logger.error("تأیید کپچا ناموفق بود", { event: "captcha.verify_failed", err });
    return { ok: false, error: "ارتباط با سرویس تأیید امنیتی برقرار نشد. کمی بعد تلاش کنید." };
  }

  if (!payload.success) {
    const codes = payload["error-codes"] ?? [];
    // کدها فقط به لاگ می‌روند: به کاربر می‌گویند دقیقاً چرا رد شد، که برای
    // کسی که دارد دور زدن را امتحان می‌کند اطلاعات مفیدی است.
    logger.warn("توکن کپچا رد شد", {
      event: "captcha.rejected",
      captcha_error_codes: codes.slice(0, 5),
    });
    return { ok: false, error: GENERIC_ERROR };
  }

  // بررسی hostname: بدون این، توکنی که در سایت دیگری با همین site key گرفته
  // شده اینجا هم قبول می‌شود. Cloudflare خودش دامنه‌ها را محدود می‌کند، ولی
  // این چک ارزان است و به همان محدودسازیِ سمت آن‌ها تکیه نمی‌کند.
  const expected = process.env.NEXT_PUBLIC_SITE_URL;
  if (expected && payload.hostname) {
    try {
      const expectedHost = new URL(expected).hostname;
      if (payload.hostname !== expectedHost && payload.hostname !== "localhost") {
        logger.warn("hostname کپچا با دامنهٔ سایت نمی‌خواند", {
          event: "captcha.hostname_mismatch",
          captcha_hostname: payload.hostname,
          expected_hostname: expectedHost,
        });
        return { ok: false, error: GENERIC_ERROR };
      }
    } catch {
      /* NEXT_PUBLIC_SITE_URL بدشکل — این چک را رد می‌کنیم، بقیه سر جایشان */
    }
  }

  return { ok: true };
}

/** نام فیلدی که ویجت در فرم می‌گذارد — یک رشته، در دو جا استفاده می‌شود. */
export const TURNSTILE_FIELD = "turnstileToken";
