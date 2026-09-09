import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { isUuid } from "@/lib/api/action-input";
import { settlePayment } from "@/lib/plus/orders";

/**
 * POST /api/v1/plus/orders/[orderId]/recheck — «بررسی دوبارهٔ وضعیت پرداخت».
 *
 * ⚠️ این endpoint دقیقاً همان چیزی است که سناریوی «اینترنتم بعد از پرداخت
 * قطع شد» را قابلِ ترمیم می‌کند. بدونِ آن، تنها راهِ فهمیدنِ نتیجه بازگشتِ
 * مرورگر بود — و بازگشتِ مرورگر هیچ تضمینی ندارد: کاربر ممکن است صفحهٔ بانک
 * را ببندد، اینترنتش قطع شود، یا گوشی‌اش خاموش شود.
 *
 * مسیرِ کد همان `settlePayment` است، فقط با `mode: "recheck"` که به‌جای
 * `verifyPayment` سراغِ `getPaymentStatus` می‌رود.
 */
export const POST = withRoute<{ params: Promise<{ orderId: string }> }>(
  "/api/v1/plus/orders/[orderId]/recheck",
  async (_request: NextRequest, context) => {
    try {
      const user = await requireUser();

      // هر «بررسی دوباره» یک درخواست به درگاه است. سقف، هم از درگاه محافظت
      // می‌کند و هم از خودمان در برابر حلقهٔ رفرشِ کاربرِ نگران.
      const limit = rateLimit(`plus-recheck:${user.id}`, 15, 5 * 60);
      if (!limit.allowed) {
        return fail(`کمی صبر کنید. ${limit.retryAfterSeconds} ثانیه دیگر دوباره بررسی کنید.`, 429);
      }

      const { orderId } = await context.params;
      if (!isUuid(orderId)) return fail("این سفارش پیدا نشد.", 404);

      const result = await settlePayment({
        userId: user.id,
        orderId,
        returnParams: {},
        mode: "recheck",
      });

      return ok({ result });
    } catch (err) {
      return handleError(err);
    }
  },
);

export const dynamic = "force-dynamic";
