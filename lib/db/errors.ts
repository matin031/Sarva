/**
 * خطاهای دیتابیس که **بدونِ** اتصال به دیتابیس تشخیص داده می‌شوند.
 *
 * ⚠️ عمداً بدونِ `"server-only"` و بدونِ هیچ importی از `mysql2`.
 *
 * `lib/db/index.ts` خودش `server-only` است و آزمون‌های `node --test` — که
 * شرطِ `react-server` ندارند — موقعِ import کردنش استثنا می‌گیرند. توابعِ
 * اینجا فقط یک عدد و یک رشته را از شیءِ خطا می‌خوانند؛ نگه داشتنشان در آن
 * فایل یعنی هیچ‌وقت آزمون نداشتند.
 *
 * و «آزمون نداشتن» اینجا انتزاعی نیست: بررسیِ قبلی (`code === "42P01"`،
 * SQLSTATEِ پستگرس) روی MySQL **همیشه** false برمی‌گرداند و سال‌ها کسی
 * نفهمید. یک آزمونِ چهارخطی همان روزِ اول می‌گرفتش.
 *
 * (همان استدلالِ بالای `lib/sms/smsir.ts`.)
 */

/**
 * جدول روی این پایگاه‌داده وجود ندارد.
 *
 * ⚠️ چرا این یکی لازم شد و چرا با بقیه فرق دارد:
 *
 * آن چهار تای بالا خطاهای *داده*اند — چیزی که کاربر با یک ورودیِ دیگر رفعش
 * می‌کند. این یکی خطای **استقرار** است: کد جدولی را می‌خواهد که migration اش
 * روی آن محیط اجرا نشده.
 *
 * روی هاست دقیقاً همین افتاد. `mysql-migrations/008_aruz_rapid.sql` هرگز
 * اجرا نشده بود و لاگِ production این را داشت:
 *
 *     Error: Table 'wybtjehi_sarva.aruz_rapid_questions' doesn't exist
 *     route: /admin/games   ER_NO_SUCH_TABLE
 *
 * یعنی صفحهٔ «بازی‌ها»ی پنلِ مدیریت ۵۰۰ می‌داد — و ۵۰۰ به مدیر نمی‌گوید چه
 * کاری باید بکند. با این تابع، صفحه بالا می‌آید و صریح می‌نویسد کدام
 * migration جا مانده است.
 *
 * ⚠️ این را برای «پنهان کردنِ خطا» به کار نبرید. تنها استفادهٔ درستش،
 * تبدیلِ یک کرش به یک پیامِ *اقدام‌پذیر* است؛ هر جا که خواندنِ خالی با
 * «جدول نیست» فرقی نداشته باشد، سکوت غلط است.
 */
export function isMissingTable(err: unknown): boolean {
  // 1146 ER_NO_SUCH_TABLE — در MySQL و MariaDB یکی است.
  return (err as { errno?: number })?.errno === 1146;
}

/**
 * ستون روی این جدول وجود ندارد.
 *
 * ⚠️ هم‌خانوادهٔ `isMissingTable` و به همان دلیل: یک migrationِ اجرانشده، نه
 * یک خطای داده.
 *
 * ⚠️ و چرا جدا از «جدول نیست» لازم شد: `scripts/sms-diagnose.ts` برای
 * فهمیدنِ اینکه migration ۰۱۶ اجرا شده یا نه، یک `select duration_ms …`
 * می‌زند و خطایش را می‌گیرد. نسخهٔ اولِ آن اسکریپت *هر* خطایی را «ستون
 * نیست» می‌فهمید — و وقتی دیتابیس اصلاً در دسترس نبود (`ETIMEDOUT`)، با
 * اطمینان گزارش می‌داد که migration اجرا نشده. یعنی یک تشخیصِ کاملاً غلط،
 * از ابزاری که کارش تشخیص است.
 */
export function isMissingColumn(err: unknown): boolean {
  // 1054 ER_BAD_FIELD_ERROR — در MySQL و MariaDB یکی است.
  return (err as { errno?: number })?.errno === 1054;
}

/** نامِ جدولِ گمشده، از پیامِ موتور — برای نوشتن در همان هشدار. */
export function missingTableName(err: unknown): string | null {
  if (!isMissingTable(err)) return null;
  const message = (err as { sqlMessage?: string }).sqlMessage ?? "";
  // «Table 'db.name' doesn't exist» — فقط بخشِ پس از نقطه لازم است.
  const match = /Table '(?:[^'.]+\.)?([^']+)' doesn't exist/.exec(message);
  return match?.[1] ?? null;
}
