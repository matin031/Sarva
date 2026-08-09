import "server-only";

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
 * ── خاموش بودن به‌صورت پیش‌فرض ─────────────────────────────────────────────
 *
 * تا وقتی TURNSTILE_SECRET_KEY در محیط نباشد، این ماژول همه چیز را می‌پذیرد و
 * فقط یک بار هشدار می‌دهد. عمدی است: سایت باید همین حالا و بدون حساب
 * Cloudflare کار کند، و روزی که کلیدها اضافه شدند کپچا با یک ری‌استارت فعال
 * شود — بدون تغییر کد و بدون deploy تازه.
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
export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

let warned = false;

function warnOnce() {
  if (warned) return;
  warned = true;
  console.warn(
    "[turnstile] TURNSTILE_SECRET_KEY تنظیم نشده — کپچا غیرفعال است. " +
      "برای فعال کردنش راهنمای بالای lib/auth/turnstile.ts را ببینید.",
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
    console.error("[turnstile] تأیید توکن ناموفق بود:", err);
    return { ok: false, error: "ارتباط با سرویس تأیید امنیتی برقرار نشد. کمی بعد تلاش کنید." };
  }

  if (!payload.success) {
    const codes = payload["error-codes"] ?? [];
    // کدها فقط به لاگ می‌روند: به کاربر می‌گویند دقیقاً چرا رد شد، که برای
    // کسی که دارد دور زدن را امتحان می‌کند اطلاعات مفیدی است.
    console.warn(`[turnstile] توکن رد شد: ${codes.join(", ") || "بدون کد"}`);
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
        console.warn(
          `[turnstile] hostname نامنتظره: ${payload.hostname} (انتظار: ${expectedHost})`,
        );
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
