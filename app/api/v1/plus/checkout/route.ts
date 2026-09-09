import { z } from "zod";
import { requireUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { isPlusEnabled } from "@/lib/plus/config";
import { createOrGetPendingOrder } from "@/lib/plus/orders";

/**
 * POST /api/v1/plus/checkout — ساختِ سفارش (یا برگرداندنِ سفارشِ باز).
 *
 * ⚠️ ورودی عمداً فقط دو چیز است. آنچه اینجا **نیست** به‌اندازهٔ آنچه هست
 * اهمیت دارد:
 *
 *   ✗ amount   — از `plus_plan_versions` خوانده می‌شود. اگر از اینجا می‌آمد،
 *                `{"amount": 1000}` یعنی اشتراکِ هزار ریالی.
 *   ✗ duration — همان.
 *   ✗ userId   — از سشن. اگر از اینجا می‌آمد، هر کسی برای هر کسی سفارش
 *                می‌ساخت.
 *
 * `idempotencyKey` را کلاینت هنگام *رندرِ* دکمه می‌سازد و نه هنگام کلیک؛ پس
 * دو کلیکِ پشت‌سرهم یک کلید دارند و یک سفارش می‌سازند. محافظتِ اصلی اما در
 * دیتابیس است (`plus_orders_one_open_idx`) و نه در این کلید — کلاینتِ بدخواه
 * می‌تواند کلید نفرستد.
 */
const schema = z.object({
  planCode: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{2,40}$/, "پلن انتخاب‌شده معتبر نیست."),
  idempotencyKey: z.string().trim().min(8).max(80).optional(),
});

export const POST = withRoute("/api/v1/plus/checkout", async (request: Request) => {
  try {
    const user = await requireUser();

    if (!(await isPlusEnabled())) {
      // پلاس خاموش است: سایت رایگان است و چیزی برای فروش نیست.
      return fail("سروا پلاس در حال حاضر فعال نیست.", 404);
    }

    // سقفِ ساختِ سفارش. سخاوتمندانه است (کاربر ممکن است بین دو پلن مردد
    // باشد) ولی جلوی ساختنِ صدها سفارش با اسکریپت را می‌گیرد.
    const limit = rateLimit(`plus-checkout:${user.id}`, 20, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const order = await createOrGetPendingOrder({
      userId: user.id,
      planCode: body.data.planCode,
      idempotencyKey: body.data.idempotencyKey ?? null,
    });

    return ok({ order });
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
