import "server-only";
import { rateLimitDb } from "@/lib/api/rate-limit-db";

/**
 * سقفِ نرخِ نوشتن‌های مدیریتیِ مسیرِ دبیری.
 *
 * =============================================================================
 * ⚠️ `requireAdmin()` می‌گوید *چه کسی*، این می‌گوید *چقدر*
 * =============================================================================
 *
 * تا امروز هیچ سقفی روی تأیید/رد/اصلاح/لغو نبود. سقفِ سراسریِ `proxy.ts` هم
 * کمکی نمی‌کند: آن فقط روی `/api` است و Server Action ها از آن مسیر
 * نمی‌روند.
 *
 * یعنی یک کوکیِ ادمینِ دزدیده‌شده — یا یک XSS در پنل — می‌توانست در چند
 * ثانیه هر دبیرِ سایت را لغو کند: هر کدام یک اشتراکِ سوخته، یک کلاسِ بسته و
 * یک اعلان برای کاربر. هیچ‌کدام با یک `UPDATE` برنمی‌گردند.
 *
 * سقف جلوی مدیرِ واقعی را نمی‌گیرد و قرار هم نیست بگیرد؛ کارش این است که
 * اسکریپت را از سرعتِ اسکریپت بیندازد و پنجره‌ای بدهد که کسی متوجه شود.
 *
 * ⚠️ و دیتابیسی و نه در-حافظه، به همان دلیلِ ورود و OTP: سهمیه‌ای که با
 * ری‌استارت صفر شود، برای مهاجم یک انتظارِ کوتاه است نه یک مانع.
 *
 * ⚠️ چرا این فایل از `teacher-actions.ts` جدا شد: آن فایل `"use server"` است
 * و هر صادراتش باید یک تابعِ async باشد — یعنی نه می‌شود این عددها را از
 * آنجا بیرون داد و نه آزمون می‌تواند بسنجدشان. جدا که باشند،
 * `db:check-teacher` *همین* عددها را می‌سنجد و نه رونوشتی از آن‌ها که روزی
 * با اصل فرق کند.
 */

/** رسیدگی به صف: تأیید، رد، درخواستِ اصلاح. */
export const TEACHER_REVIEW_LIMIT = 60;
export const TEACHER_REVIEW_WINDOW_SECONDS = 10 * 60;

/**
 * ⚠️ لغو سقفِ خیلی تنگ‌تری دارد.
 *
 * رسیدگی به صفِ درخواست‌ها کارِ روزمره است و می‌تواند پشتِ سر هم باشد؛ ولی
 * هیچ سناریوی سالمی وجود ندارد که یک مدیر در یک ساعت ده دبیر را لغو کند.
 */
export const TEACHER_REVOKE_LIMIT = 10;
export const TEACHER_REVOKE_WINDOW_SECONDS = 60 * 60;

export type AdminWriteBucket = "review" | "revoke";

/** کلیدِ سهمیه — به ازای هر مدیر و هر سطل، جدا. */
export function adminWriteKey(adminId: string, bucket: AdminWriteBucket): string {
  return `admin-teacher-${bucket}:${adminId}`;
}

/**
 * یک تلاش را می‌شمارد. `null` یعنی مجاز؛ رشته یعنی پیامی که باید به مدیر
 * نشان داده شود.
 */
export async function adminWriteGate(
  adminId: string,
  bucket: AdminWriteBucket,
): Promise<string | null> {
  const [limit, windowSeconds] =
    bucket === "revoke"
      ? [TEACHER_REVOKE_LIMIT, TEACHER_REVOKE_WINDOW_SECONDS]
      : [TEACHER_REVIEW_LIMIT, TEACHER_REVIEW_WINDOW_SECONDS];

  const result = await rateLimitDb(adminWriteKey(adminId, bucket), limit, windowSeconds);
  if (result.allowed) return null;

  /* ⚠️ پیام عمداً می‌گوید چه چیزی محدود شده. مدیری که فقط «درخواست‌های
     زیاد» ببیند، فکر می‌کند سایت خراب است و دوباره می‌زند. */
  return `تعداد زیادی تغییرِ پشتِ‌سرِ هم. ${result.retryAfterSeconds} ثانیه دیگر تلاش کنید.`;
}
