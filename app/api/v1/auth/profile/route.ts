import { z } from "zod";
import { execute } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { findUserById } from "@/lib/auth/session";
import { handleError, ok, readJson } from "@/lib/api/http";

// همان قوانینی که AccountSettings.tsx امروز اعمال می‌کند — حداکثر ۱۲ نویسه،
// که سخت‌گیرانه‌تر از nameField در schemas.ts است (آنجا ۶۰ برای ثبت‌نام).
// عمداً یکسان‌سازی نشد: تغییرش یعنی تغییر رفتاری که کاربر می‌بیند، و این
// مهاجرت قرار نبود تصمیم‌های محصولی را عوض کند.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "حداقل 3 کاراکتر وارد نمایید")
    .max(12, "حداکثر 12 کاراکتر وارد نمایید")
    .regex(/^[؀-ۿ\s]+$/, "نام باید فقط به فارسی وارد شود"),
});

/**
 * PATCH /api/v1/auth/profile — تغییر نام نمایشی.
 *
 * قبلاً این کار با supabase.auth.updateUser({ data: { full_name } }) انجام
 * می‌شد، یعنی نام در user_metadata ذخیره می‌شد — جایی که خودِ کاربر می‌توانست
 * هر چیزی در آن بنویسد، از جمله کلیدهای دیگر. حالا فقط یک ستون است و فقط
 * همین یک فیلد قابل نوشتن.
 *
 * نکته: نامِ روی سروده‌ها و دیدگاه‌های گذشته عوض نمی‌شود. آن‌ها author_name را
 * در لحظهٔ ارسال عکس‌برداری می‌کنند — عمدی، تا تغییر نام، اثرِ قدیمی را به کس
 * دیگری نسبت ندهد.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();

    const body = await readJson(request, schema);
    if (!body.ok) return body.response;

    await execute("update users set full_name = $1 where id = $2", [body.data.name, user.id]);

    const updated = await findUserById(user.id);
    return ok({ user: updated });
  } catch (err) {
    return handleError(err);
  }
}
