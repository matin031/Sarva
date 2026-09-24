import "server-only";
import { logger } from "@/lib/observability";
import { captchaMode, captchaPreflight, captchaOnUnreachable } from "@/lib/auth/captcha-policy";

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
 * ── کپچا یک *شاهد* است، نه دروازه ─────────────────────────────────────────
 *
 * ⚠️ رفتارِ این فایل را `lib/auth/captcha-policy.ts` تعیین می‌کند و **نه**
 * صرفاً بودن یا نبودنِ کلید. چراییِ کاملش آنجا نوشته شده؛ خلاصه‌اش اینکه
 * کاربرانِ سروا ایرانی‌اند و `challenges.cloudflare.com` ممکن است از ایران
 * در دسترس نباشد — و در آن حالت، کپچای اجباری یعنی قفل شدنِ ورود و ثبت‌نام
 * برای همان کاربرِ واقعی‌ای که سایت برای اوست.
 *
 * سه حالت: `off` (پیش‌فرض، وقتی کلیدی نیست)، `optional` (توکنِ موجود تأیید
 * می‌شود، نبودنش مانع نیست)، `required` (سخت‌گیرانه، فقط با تنظیمِ صریح).
 *
 * ⚠️ و محافظتِ واقعی جای دیگری است: سقف‌های نرخِ دیتابیسی، سقفِ تلاشِ حدس،
 * argon2id، و سقفِ سراسریِ خرجِ پیامک. هیچ‌کدام به سرویسِ خارجی وصل نیستند.
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
export { captchaMode };

export function turnstileEnabled(): boolean {
  return captchaMode() !== "off" && Boolean(process.env.TURNSTILE_SECRET_KEY);
}

let warnedOff = false;
let warnedMissingKey = false;
let warnedUnreachable = false;

function warnOffOnce() {
  if (warnedOff) return;
  warnedOff = true;
  logger.info(
    "کپچا خاموش است (CAPTCHA_MODE=off یا کلیدی تنظیم نشده). " +
      "محافظت از سقف‌های نرخ و سقفِ خرجِ پیامک می‌آید — توضیح در lib/auth/captcha-policy.ts.",
    { event: "captcha.disabled" },
  );
}

function warnMissingKeyOnce(mode: string) {
  if (warnedMissingKey) return;
  warnedMissingKey = true;
  logger.error(
    `CAPTCHA_MODE=${mode} است ولی TURNSTILE_SECRET_KEY تنظیم نشده. ` +
      "یا کلید را بگذارید یا CAPTCHA_MODE=off کنید.",
    { event: "captcha.misconfigured" },
  );
}

/**
 * ⚠️ «Cloudflare در دسترس نبود» در حالتِ `optional` درخواست را **رد نمی‌کند**
 * ولی بی‌صدا هم نمی‌ماند.
 *
 * این دقیقاً همان حالتی است که این بازنویسی برایش انجام شد: اگر دسترسی به
 * Cloudflare قطع شود، کاربر باید بتواند وارد شود. ولی اگر این خط لاگ نشود،
 * سروا می‌تواند ماه‌ها بدونِ کپچا کار کند و هیچ‌کس نفهمد — همان fail-open ِ
 * بی‌صدایی که نسخهٔ قبلی درست از آن می‌ترسید.
 */
function warnUnreachableOnce(err: unknown) {
  if (warnedUnreachable) return;
  warnedUnreachable = true;
  logger.error(
    "ارتباط با Cloudflare برقرار نشد (یا کلید نامعتبر است). در حالت optional " +
      "درخواست‌ها بدونِ بررسیِ کپچا **پذیرفته** می‌شوند — یعنی از این لحظه کپچا عملاً خاموش است.",
    { event: "captcha.unreachable", err },
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
  const mode = captchaMode();
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const hasToken = typeof token === "string" && token.length > 0 && token.length <= 2048;

  /* ⚠️ تصمیم در `lib/auth/captcha-policy.ts` گرفته می‌شود و نه اینجا — تا
     بشود آزمودش. این فایل `server-only` دارد و `node --test` نمی‌تواند
     بارش کند. */
  const decision = captchaPreflight(mode, { hasKey: Boolean(secret), hasToken });

  if (decision === "allow") {
    if (mode === "off") warnOffOnce();
    else if (!secret) warnMissingKeyOnce(mode);
    return { ok: true };
  }

  if (decision === "deny") {
    if (!secret) {
      warnMissingKeyOnce(mode);
      return { ok: false, error: "تأیید امنیتی پیکربندی نشده است. با پشتیبانی تماس بگیرید." };
    }
    return { ok: false, error: "تأیید امنیتی انجام نشده است. لطفاً کادر تأیید را کامل کنید." };
  }

  // `decision === "verify"` یعنی هر دو حتماً هستند؛ این فقط کامپایلر را قانع می‌کند.
  const body = new URLSearchParams({ secret: secret as string, response: token as string });
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
    /* ⚠️ Cloudflare در دسترس نیست.
       نسخهٔ قبلی اینجا رد می‌کرد، با این استدلال که «وگرنه مهاجم فقط کافی
       است دسترسیِ سرور به Cloudflare را مختل کند». استدلال درست است ولی
       برای سروا وزنِ دو طرف یکی نیست: قطعیِ دسترسی به دامنه‌های خارجی در
       ایران یک اتفاقِ روزمره است و نه یک حمله، و رد کردن یعنی کلِ ورود و
       ثبت‌نامِ سایت به در دسترس بودنِ یک دامنهٔ خارجی گره بخورد.
       پس در `optional` اجازه داده می‌شود و **بلند لاگ می‌شود**؛ در
       `required` همان رفتارِ سخت‌گیرانهٔ قبلی می‌ماند. */
    if (captchaOnUnreachable(mode) === "allow") {
      warnUnreachableOnce(err);
      return { ok: true };
    }
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
