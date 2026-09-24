import "server-only";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import { logger } from "@/lib/observability";
import { SMS_BUDGET_LOW_RATIO, smsBudget } from "./budget";

/**
 * خرج کردن از سقفِ **سراسریِ** پیامک.
 *
 * ⚠️ چرایی‌اش — یعنی «بدترین حالت، امشب چقدر پول می‌رود؟» و اینکه چرا
 * سقف‌های نسبیِ موجود به آن جواب نمی‌دهند — کامل در `lib/sms/budget.ts`
 * نوشته شده. اینجا فقط *اعمالِ* آن است.
 *
 * ⚠️ این تابع از دلِ `lib/auth/phone-otp.ts` بیرون کشیده شد، وقتی مصرف‌کنندهٔ
 * دومی پیدا کرد (`lib/notify`). دلیلش همان جمله‌ای است که بالای `proxy.ts`
 * هم نوشته شده: محافظی که باید در دو فایل تکرار شود، همان محافظی است که در
 * فایلِ سوم فراموش می‌شود. و برای یک سقف، فراموش شدنش یعنی یک مسیرِ ارسال
 * که اصلاً شمرده نمی‌شود — یعنی سقف دیگر سقف نیست.
 *
 * ⚠️ کلیدها (`sms-budget:hour` و `sms-budget:day`) بینِ همهٔ مسیرها
 * **مشترک**اند و باید باشند: یک بودجهٔ سراسری یعنی یک شمارنده. کدِ ورود و
 * پیامکِ «اشتراکت تمام شد» از یک کیسه خرج می‌کنند.
 */

export type SmsSpendResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * یک پیامک از سهمیه کم می‌کند، یا می‌گوید سهمیه تمام است.
 *
 * ⚠️ **درست پیش از ارسال** صدا زده شود و نه زودتر.
 *
 * ترتیبش یک بار برعکس نوشته شد: اگر بودجه پیش از سقف‌های شماره/IP و
 * cooldown سنجیده شود، کسی که پشتِ هم «ارسال دوباره» می‌زند سهمیهٔ سراسری
 * را می‌سوزاند بدونِ اینکه حتی یک پیامک رفته باشد — یعنی محافظِ بودجه خودش
 * به ابزارِ تمام کردنِ بودجه تبدیل می‌شود. فقط درخواست‌هایی شمرده شوند که
 * واقعاً به ارسال می‌رسند.
 */
export async function spendSmsBudget(): Promise<SmsSpendResult> {
  const budget = smsBudget();

  for (const [scope, limit, windowSeconds] of [
    ["hour", budget.perHour, 60 * 60],
    ["day", budget.perDay, 24 * 60 * 60],
  ] as const) {
    const spent = await rateLimitDb(`sms-budget:${scope}`, limit, windowSeconds);

    if (!spent.allowed) {
      /* ⚠️ این خط باید در لاگ **پیدا** شود: یا سایت زیر حمله است یا سقف
         واقعاً کم است، و هر دو تصمیمِ آدم می‌خواهند. */
      logger.error("سقفِ سراسریِ ارسال پیامک پر شد؛ ارسال متوقف شد", {
        event: "sms.budget.exhausted",
        budget_scope: scope,
        budget_limit: limit,
        retry_after_seconds: spent.retryAfterSeconds,
      });
      return { allowed: false, retryAfterSeconds: spent.retryAfterSeconds };
    }

    // هشدارِ زودهنگام: رسیدن به سقف نباید اولین خبر باشد.
    if (spent.remaining <= Math.ceil(limit * SMS_BUDGET_LOW_RATIO)) {
      logger.warn("سهمیهٔ ارسال پیامک رو به اتمام است", {
        event: "sms.budget.low",
        budget_scope: scope,
        budget_limit: limit,
        budget_remaining: spent.remaining,
      });
    }
  }

  return { allowed: true };
}
