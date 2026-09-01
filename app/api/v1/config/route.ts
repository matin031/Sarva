import { handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";

/**
 * GET /api/v1/config — تنظیماتِ عمومیِ کلاینت، خوانده‌شده در زمان اجرا.
 *
 * ⚠️ این endpoint برای حل یک مشکل مشخص وجود دارد، و مشکل ظریف است:
 *
 * متغیرهای `NEXT_PUBLIC_*` وقتی در یک کامپوننت کلاینت خوانده شوند، در زمان
 * **build** داخل باندل جاوااسکریپت جاسازی می‌شوند — نه در زمان اجرا. حالا به
 * Dockerfile نگاه کنید: مرحلهٔ build فقط `COPY . .` و `npm run build` است و
 * هیچ `.env` ای در آن مرحله وجود ندارد؛ فایل .env تازه موقع اجرا با `env_file`
 * به کانتینر می‌رسد.
 *
 * نتیجه: اگر ویجت کپچا مستقیماً `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY`
 * را می‌خواند، آن مقدار روی سرور **همیشه** خالی می‌ماند — حتی بعد از اینکه
 * کلید در .env گذاشته شود. کپچا بی‌سروصدا خاموش می‌ماند و هیچ خطایی هم نمی‌دهد.
 * دقیقاً همان نوع نقصِ بی‌نشانه‌ای که این ممیزی دنبالش بود.
 *
 * Route handler ها همیشه در زمان اجرا اجرا می‌شوند، پس اینجا process.env
 * مقدارِ واقعیِ همان لحظه را دارد. یعنی افزودن کلید = گذاشتن در .env و یک
 * ری‌استارت، بدون build دوباره.
 *
 * فقط مقادیر عمومی برمی‌گردند. کلید مخفی (TURNSTILE_SECRET_KEY) هرگز اینجا
 * نمی‌آید و فقط lib/auth/turnstile.ts آن را می‌بیند.
 */
export const GET = withRoute("/api/v1/config", async () => {
  try {
    return ok({
      // site key عمومی است — در HTML هر سایتی که Turnstile دارد دیده می‌شود.
      // چیزی که امنیت را می‌سازد تأیید سمت سرور است، نه پنهان بودن این رشته.
      turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null,
    });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
