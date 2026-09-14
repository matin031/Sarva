import { requireUser } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/auth/session";
import { fail, handleError, ok, readJson } from "@/lib/api/http";
import { rateLimit } from "@/lib/api/rate-limit";
import { withRoute } from "@/lib/api/route";
import { profileSchema } from "@/lib/profile/schemas";
import { updateProfile } from "@/lib/profile/queries";

/**
 * PATCH /api/v1/auth/profile — تکمیل یا ویرایشِ پروفایل (بندهای ۱ تا ۳).
 *
 * =============================================================================
 * ⚠️ این endpoint نقش نمی‌دهد
 * =============================================================================
 *
 * تنها فیلدِ مرتبط با نقشی که می‌پذیرد `desiredRole` است، و آن فقط در ستونِ
 * `desired_role` می‌نشیند: یک *خواسته*، نه یک دسترسی. اثرِ عملی‌اش دقیقاً
 * یک چیز است — دیده شدنِ بخشِ «فعال‌سازی حساب دبیر» در پنل.
 *
 * دبیر شدن از این مسیر نمی‌گذرد: یک ردیفِ `teacher_requests` لازم دارد و
 * تأییدِ یک مدیر (`lib/admin/teacher-actions.ts`). بند ۹ همین را می‌خواهد و
 * جدا بودنِ این دو ستون تنها چیزی است که واقعاً تضمینش می‌کند.
 *
 * ── تاریخچه ────────────────────────────────────────────────────────────────
 * تا دیروز این مسیر فقط `{ name }` می‌گرفت و یک ستون می‌نوشت. با جدا شدنِ
 * «ثبت‌نام» از «پروفایل» (بند ۱)، همان مسیر حالا کلِ فرمِ پروفایل را
 * می‌گیرد. `full_name` دیگر نوشته نمی‌شود — یک تریگر از نام و نام خانوادگی
 * می‌سازدش؛ توضیحش در `lib/profile/queries.ts`.
 *
 * نکتهٔ قدیمی که هنوز درست است: نامِ روی سروده‌ها و دیدگاه‌های گذشته عوض
 * نمی‌شود. آن‌ها `author_name` را در لحظهٔ ارسال عکس‌برداری می‌کنند — عمدی،
 * تا تغییر نام، اثرِ قدیمی را به کسِ دیگری نسبت ندهد.
 */
export const PATCH = withRoute("/api/v1/auth/profile", async (request: Request) => {
  try {
    const user = await requireUser();

    // سقفِ نوشتن. عدد سخاوتمندانه است: تکمیلِ پروفایل کاری است که کسی در
    // ربع ساعت بیست بار انجام نمی‌دهد، ولی بدونِ سقف یک اسکریپت می‌تواند
    // این UPDATE را در حلقه بزند.
    const limit = rateLimit(`profile:${user.id}`, 20, 15 * 60);
    if (!limit.allowed) {
      return fail(`درخواست‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`, 429);
    }

    const body = await readJson(request, profileSchema);
    if (!body.ok) return body.response;

    await updateProfile(user.id, body.data);

    // ⚠️ کاربر دوباره از دیتابیس خوانده می‌شود و از روی ورودی ساخته نمی‌شود.
    // نامِ نمایشی را تریگر ساخته و `profile_completed_at` ممکن است همین حالا
    // پر شده باشد؛ هیچ‌کدام در بدنهٔ درخواست نبودند.
    const updated = await findUserById(user.id);
    return ok({ user: updated });
  } catch (err) {
    return handleError(err, "PATCH /api/v1/auth/profile");
  }
});

export const dynamic = "force-dynamic";
