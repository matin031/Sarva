import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { recordActivity } from "@/lib/activity/record";
import { ACTIVITY_EVENT_TYPES } from "@/lib/activity/schema";

/**
 * POST /api/v1/activity — ثبتِ یک رویدادِ فعالیت.
 *
 * =============================================================================
 * ⚠️ چیزی که این schema **ندارد**
 * =============================================================================
 *
 * هیچ فیلدِ `userId`، `studentId`، `occurredAt`، `score` یا `isCorrect`.
 *
 * نبودنشان یک فراموشی نیست، خودِ طراحی است:
 *
 *   • **شناسهٔ کاربر** از سشن می‌آید. Zod در حالتِ پیش‌فرض فیلدِ ناشناخته را
 *     دور می‌ریزد، ولی `.strict()` آن را **رد** می‌کند — و این بهتر است:
 *     کلاینتی که `userId` می‌فرستد باید خطا بگیرد، نه یک ۲۰۰ که به او
 *     می‌گوید شاید کار کرده باشد.
 *
 *   • **زمان** را سرور می‌گذارد. زمانِ کلاینت ساعتِ دستگاهِ کاربر است و
 *     تقویمِ فعالیتِ کلاس نباید به آن تکیه کند (چه رسد به دستکاری عمدی).
 *
 *   • **نمره و درستی** اصلاً پذیرفته نمی‌شوند. این endpoint فقط می‌گوید
 *     «چه اتفاقی افتاد»، نه «چقدر خوب بود». درست/غلط فقط از جدول‌های پاسخ
 *     می‌آید که سرور خودش نوشته. توضیحِ کاملش بالای مهاجرت ۰۱۱.
 */

const schema = z
  .object({
    // ⚠️ `z.enum` روی همان ثابتی که CHECK دیتابیس از رویش نوشته شده — پس
    // فهرست در یک جا زندگی می‌کند و تست تطابقش با SQL را می‌سنجد.
    eventType: z.enum(ACTIVITY_EVENT_TYPES),
    entityId: z.string().trim().min(1).max(64).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish(),
  })
  /* ⚠️ `.strict()` — هر کلیدِ ناشناخته رد می‌شود.
     بدونِ آن، `{"eventType":"login","userId":"…"}` با ۲۰۰ برمی‌گشت و
     فرستنده هیچ‌وقت نمی‌فهمید که `userId` نادیده گرفته شده. */
  .strict();

export const POST = withRoute("/api/v1/activity", async (request: Request) => {
  try {
    /* ⚠️ مهمان ۲۰۰ می‌گیرد و نه ۴۰۱ — همان الگوی `aruz-bridge/answers`.
       بازی‌ها برای مهمان هم باز است و نبودنِ حساب یک حالتِ عادی است؛
       ۴۰۱ فقط کنسولِ بازیکن را پر از خطا می‌کند و پایانِ بازی را خراب. */
    const user = await getCurrentUser();
    if (!user) return ok({ recorded: false, reason: "guest" });

    /* سقفِ نوشتن. هر ردیف دائمی است، پس بدونِ سقف یک اسکریپت می‌تواند جدول
       — و با آن دیسکِ سرور — را پر کند.

       ⚠️ چرا نسخهٔ در-حافظه و نه `rateLimitDb`: آن یکی برای جاهایی است که
       *امنیت* به شمارش وابسته است (حدسِ رمز، OTP) و ری‌استارت نباید
       سهمیه را برگرداند. اینجا محافظِ حجمِ نوشتن است، نه محافظِ امنیتی —
       و یک نوشتن در دیتابیس به‌ازای هر رویداد، دقیقاً همان هزینه‌ای است
       که می‌خواهیم کمش کنیم. (استدلالِ کامل بالای
       `lib/api/rate-limit-db.ts`.)

       ۱۲۰ در ده دقیقه: یک دورِ بازی دو رویداد می‌سازد (شروع و پایان)، پس
       هیچ کاربرِ واقعی به این نمی‌خورد. */
    const limit = rateLimit(`activity:${user.id}`, 120, 10 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    const result = await recordActivity({
      // ⚠️ از سشن، نه از بدنه. تنها جایی که شناسهٔ کاربر تعیین می‌شود.
      userId: user.id,
      eventType: body.data.eventType,
      entityId: body.data.entityId ?? null,
      metadata: body.data.metadata ?? null,
    });

    if (!result.ok) return fail(result.error, result.status);

    return ok({ recorded: true }, 201);
  } catch (err) {
    return handleError(err);
  }
});

export const dynamic = "force-dynamic";
