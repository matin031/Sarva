/**
 * ثابت‌های لاگ — جدا از lib/admin/log-actions.ts.
 *
 * دلیل جدا بودنشان قاعده‌ای در Next است که فقط موقع build خودش را نشان می‌دهد
 * (نه در tsc): یک فایل `"use server"` **فقط** می‌تواند تابع async صادر کند.
 * هر ثابت یا شیئی که از چنین فایلی export شود، build را با
 * «Only async functions are allowed to be exported in a "use server" file»
 * می‌شکند.
 *
 * منطقش هم روشن است: هر export آن فایل به یک endpoint شبکه تبدیل می‌شود، و
 * یک عدد ثابت که endpoint شده باشد بی‌معنی است.
 *
 * همان الگویی که lib/quiz/constants.ts از قبل داشت.
 */

/** تعداد ردیف در هر صفحهٔ لاگ فعالیت. */
export const AUDIT_PAGE_SIZE = 40;

/** تعداد ردیف در هر صفحهٔ لاگ خطا. */
export const ERROR_PAGE_SIZE = 30;

/** متن فارسیِ هر منبع خطا — تا «mail» در پنل «ارسال ایمیل» دیده شود. */
export const ERROR_SOURCE_LABELS: Record<string, string> = {
  api: "درخواست‌های سایت",
  action: "عملیات پنل",
  mail: "ارسال ایمیل",
  sms: "ارسال پیامک",
  db: "دیتابیس",
  upload: "آپلود فایل",
  other: "سایر",
};

/** تعداد کاربر در هر صفحهٔ فهرست کاربران. */
export const USER_PAGE_SIZE = 30;
