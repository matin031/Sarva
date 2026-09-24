import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { isUuid } from "@/lib/api/action-input";
import { isPlusEnabled } from "@/lib/plus/config";
import { startPayment } from "@/lib/plus/orders";
import { siteOrigin } from "@/lib/seo/site";

/**
 * POST /api/v1/plus/orders/[orderId]/pay — شروعِ پرداخت.
 *
 * ⚠️ آدرسِ بازگشت اینجا از `siteOrigin()` ساخته می‌شود و نه از
 * ورودیِ کاربر. اگر کلاینت آن را می‌فرستاد، یک open-redirect بود: کاربر بعد
 * از پرداخت به دامنهٔ مهاجم برمی‌گشت و آنجا یک صفحهٔ «سروا» ی جعلی می‌دید که
 * رمزش را می‌پرسد.
 */
export const POST = withRoute<{ params: Promise<{ orderId: string }> }>(
  "/api/v1/plus/orders/[orderId]/pay",
  async (_request: NextRequest, context) => {
    try {
      const user = await requireUser();

      if (!(await isPlusEnabled())) return fail("سروا پلاس در حال حاضر فعال نیست.", 404);

      // ⚠️ محافظتِ واقعی در برابر دوبار کلیک، idempotency سمتِ سرور است
      // (سفارشِ باز دوباره ساخته نمی‌شود). این سقف فقط جلوی ساختنِ ده‌ها
      // تلاشِ پرداخت را می‌گیرد که هرکدام یک ردیف و یک درخواست به درگاه‌اند.
      const limit = rateLimit(`plus-pay:${user.id}`, 10, 5 * 60);
      if (!limit.allowed) {
        return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
      }

      const { orderId } = await context.params;
      if (!isUuid(orderId)) return fail("این سفارش پیدا نشد.", 404);

      const result = await startPayment({
        userId: user.id,
        role: user.role,
        orderId,
        // ⚠️ دامنهٔ کانونی و نه `request.nextUrl.origin`: پشتِ Caddy میزبانِ
        // درخواست می‌تواند داخلی باشد، و آقای پرداخت callbackی را که با دامنهٔ
        // تأییدشدهٔ درگاه نخواند رد می‌کند (کد ‎-15‎).
        origin: siteOrigin(),
      });

      return ok({ redirectUrl: result.redirectUrl });
    } catch (err) {
      return handleError(err);
    }
  },
);

export const dynamic = "force-dynamic";
