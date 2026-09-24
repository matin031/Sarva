import "server-only";
import { execute } from "@/lib/db";
import { logger } from "@/lib/observability";
import type { ProfileInput } from "./schemas";

/**
 * نوشتنِ پروفایل — **تنها** جایی که ستون‌های پروفایلِ `users` عوض می‌شوند.
 *
 * =============================================================================
 * ⚠️ فهرستِ ستون‌ها اینجا ثابت و بسته است، و این یک تصمیمِ امنیتی است
 * =============================================================================
 *
 * وسوسه‌ای که باید مقاومت شود، ساختنِ `UPDATE` از روی کلیدهای شیءِ ورودی
 * است — چیزی شبیهِ `Object.keys(input).map(k => ...)`. آن‌وقت کافی بود کسی
 * `{"role":"admin"}` بفرستد و شِمای زاد یک کلیدِ ناشناخته را دور بیندازد
 * *ولی* سازندهٔ کوئری آن را ببیند، یا شِما روزی با `.passthrough()` شل شود.
 *
 * با یک `UPDATE` که ستون‌هایش دستی نوشته شده‌اند، چنین چیزی اصلاً ممکن
 * نیست: `role` در این فایل وجود ندارد.
 */

/**
 * ذخیرهٔ پروفایلِ عمومی (بندهای ۲ و ۳).
 *
 * ⚠️ `full_name` در این UPDATE نیست و نباید باشد: از مهاجرت ۰۰۹ یک تریگر
 * آن را از `first_name` و `last_name` می‌سازد. نوشتنش از اینجا فقط یک
 * مقدارِ موقتی بود که همان لحظه بازنویسی می‌شد.
 *
 * ⚠️ `profile_completed_at` فقط **یک بار** نوشته می‌شود
 * (`coalesce(profile_completed_at, now(6))`). اگر هر بار به‌روز می‌شد،
 * معنایش از «کِی پروفایلش را کامل کرد» به «آخرین ویرایش» تغییر می‌کرد — و
 * آن یکی از `updated_at` خوانده می‌شود.
 */
export async function updateProfile(userId: string, input: ProfileInput): Promise<void> {
  const affected = await execute(
    `update users
        set first_name  = ?,
            last_name   = ?,
            province_id = ?,
            city_id     = ?,
            school      = ?,
            grade       = ?,
            desired_role = ?,
            profile_completed_at = coalesce(profile_completed_at, now(6)),
            updated_at  = now(6)
      where id = ?`,
    [
      input.firstName,
      input.lastName,
      input.provinceId,
      // ⚠️ شهر فقط وقتی ذخیره می‌شود که استان هم آمده باشد.
      //
      // شِما این را با `isValidLocation` می‌سنجد، ولی تکیه کردن به آن کافی
      // نیست: `users_city_under_province_check` در دیتابیس یک ردیفِ
      // «شهرِ بدونِ استان» را رد می‌کند و نتیجه‌اش یک خطای ۵۰۰ می‌شد که
      // هیچ‌چیز دربارهٔ علتش نمی‌گفت. اینجا همان حالت بی‌صدا به null
      // تبدیل می‌شود.
      input.provinceId ? input.cityId : null,
      input.school,
      input.grade,
      /* ⚠️ `desired_role` و نه `role`.
         تنها ستونی از خانوادهٔ «نقش» که کاربر می‌تواند بنویسد، و هیچ دری
         را باز نمی‌کند. توضیحِ کامل بالای migration ۰۰۹. */
      input.desiredRole,
      userId,
    ],
  );

  // صفر ردیف یعنی کاربر بینِ احراز هویت و همین UPDATE حذف شده. نادر، ولی
  // بی‌صدا رد شدنش یعنی کاربر «ذخیره شد» می‌بیند و هیچ‌چیز ذخیره نشده.
  if (affected === 0) throw new Error("پروفایل به‌روز نشد: کاربر پیدا نشد.");
}

/**
 * نوشتنِ فقط نام و نام خانوادگی — مسیرِ «تکمیلِ حسابِ نیمه‌ساخته».
 *
 * ⚠️ چرا جدا از `updateProfile` و نه یک فراخوانیِ آن با فیلدهای خالی:
 *
 * آن تابع `profile_completed_at` را می‌نویسد، و «پروفایلِ کامل» در سروا
 * معنیِ مشخصی دارد که `lib/teacher/requests.ts` به آن تکیه می‌کند — استان،
 * شهر، مدرسه و پایه هم باید باشند. کسی که فقط اسمش را نوشته پروفایلِ کاملی
 * ندارد، و علامت زدنش یعنی دکمهٔ «درخواستِ دبیری» برای حسابی باز شود که
 * هیچ‌کدام از آن اطلاعات را ندارد.
 *
 * ⚠️ `full_name` اینجا هم نوشته نمی‌شود: تریگرِ `users_full_name_bu`
 * می‌سازدش. (همان دلیلی که بالای `updateProfile` نوشته شده.)
 */
export async function updateDisplayName(
  userId: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const affected = await execute(
    `update users
        set first_name = ?, last_name = ?, updated_at = now(6)
      where id = ?`,
    [firstName, lastName, userId],
  );
  if (affected === 0) throw new Error("نام به‌روز نشد: کاربر پیدا نشد.");

  logger.info("نام حساب تکمیل شد", {
    event: "profile.display_name.completed",
    // ⚠️ خودِ نام لاگ نمی‌شود.
    user_id: userId,
  });
}

/**
 * ذخیرهٔ نشانیِ تصویرِ پروفایل.
 *
 * ⚠️ جدا از `updateProfile` چون مسیرش جداست: تصویر با
 * `multipart/form-data` می‌آید و فرمِ متنی با JSON. یکی کردنشان یعنی فرمِ
 * متنی هم باید multipart شود، و هر بار ذخیرهٔ نام، کلِ تصویر دوباره آپلود
 * شود.
 *
 * `null` پاکش می‌کند.
 */
export async function updateAvatar(userId: string, url: string | null): Promise<void> {
  await execute("update users set avatar_url = ?, updated_at = now(6) where id = ?", [url, userId]);
  logger.info("تصویر پروفایل به‌روز شد", {
    event: "profile.avatar.updated",
    user_id: userId,
    // ⚠️ خودِ نشانی لاگ نمی‌شود؛ فقط اینکه تصویری هست یا پاک شده.
    cleared: url === null,
  });
}
