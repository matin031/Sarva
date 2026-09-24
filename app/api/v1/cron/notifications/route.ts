import { timingSafeEqual } from "node:crypto";
import { fail, handleError, ok } from "@/lib/api/http";
import { withRoute } from "@/lib/api/route";
import { logger } from "@/lib/observability";
import { runExpirySweep } from "@/lib/notify/expiry";

/**
 * POST /api/v1/cron/notifications — یادآوریِ پایانِ اشتراک را اجرا می‌کند.
 *
 * ⚠️ این تنها مسیرِ سروا است که **نه کاربر دارد و نه سشن**، و برای همین
 * تنها مسیری است که با یک رازِ محیطی محافظت می‌شود.
 *
 * ── چرا اصلاً یک مسیرِ HTTP، وقتی اسکریپتش هست ─────────────────────────────
 *
 * `npm run notify:expiring` روی هاستی کار می‌کند که کرونِ سیستمی دارد. روی
 * هاستِ اشتراکی و روی استقرارهای بی‌سرور، چنین چیزی نیست و تنها راه، یک
 * سرویسِ کرونِ اینترنتی است که یک URL را صدا بزند. هر دو به همان
 * `runExpirySweep` می‌رسند، پس رفتارشان نمی‌تواند از هم فاصله بگیرد.
 *
 * ── محافظت ────────────────────────────────────────────────────────────────
 *
 * ⚠️ بدونِ `CRON_SECRET` این مسیر **بسته** است و نه باز. پیش‌فرضِ امن یعنی
 * یک استقرارِ نیمه‌کاره، آدرسی به دنیا ندهد که هر کسی بتواند با فشار دادنش
 * اعتبارِ پیامک را خرج کند.
 *
 * ⚠️ و مقایسه در زمانِ ثابت است. رازی که با `===` سنجیده شود، بایت‌به‌بایت
 * قابلِ حدس زدن است — همان استدلالِ `statesMatch` در جریانِ گوگل.
 *
 * ⚠️ POST و نه GET: این مسیر کار انجام می‌دهد و پول خرج می‌کند. یک GET را
 * هر خزندهٔ اینترنتی و هر پیش‌واکشیِ مرورگر می‌تواند بی‌قصد صدا بزند.
 * (گاردِ بین‌سایتیِ `proxy.ts` روی `/api/` هم برای POST کار می‌کند و
 * درخواستِ کرون هیچ `Origin`ای ندارد، پس از آن رد می‌شود.)
 */

/** مقایسهٔ دو رشته در زمانِ ثابت — با پوششِ اختلافِ طول. */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  /* ⚠️ `timingSafeEqual` روی دو بافرِ نابرابر throw می‌کند، پس طول جدا
     بررسی می‌شود. خودِ طول نشت می‌کند و اشکالی ندارد: طولِ راز، راز نیست. */
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const POST = withRoute("/api/v1/cron/notifications", async (request: Request) => {
  try {
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected) {
      logger.warn("مسیر کرون صدا زده شد ولی CRON_SECRET تنظیم نشده", {
        event: "cron.secret_missing",
      });
      return fail("این مسیر فعال نیست.", 404);
    }

    /* دو راهِ فرستادنِ راز، چون سرویس‌های کرونِ اینترنتی در این مورد یکسان
       نیستند: بعضی هدرِ دلخواه می‌دهند و بعضی فقط `Authorization`. */
    const header =
      request.headers.get("x-cron-secret") ??
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
      "";

    if (!secretsMatch(header, expected)) {
      logger.warn("مسیر کرون با رازِ نادرست صدا زده شد", { event: "cron.unauthorized" });
      /* ⚠️ ۴۰۴ و نه ۴۰۳: کسی که راز را ندارد، حتی نباید بداند اینجا چیزی
         هست که راز می‌خواهد. */
      return fail("این مسیر فعال نیست.", 404);
    }

    const result = await runExpirySweep();
    return ok(result);
  } catch (err) {
    return handleError(err, "POST /api/v1/cron/notifications");
  }
});

export const dynamic = "force-dynamic";
