/**
 * الگوی جست‌وجوی کاربر — مشترک بینِ فهرستِ کاربران و خروجیِ CSV.
 *
 * ⚠️ جدا از `user-actions.ts` چون آن فایل `"use server"` است و فقط تابعِ
 * async می‌تواند صادر کند (توضیح بالای `log-constants.ts`).
 *
 * موبایل به شکلِ متعارفِ `989…` ذخیره شده؛ «۰۹۱۲…» یا «+98912…» که مدیر
 * تایپ می‌کند به همان شکل برمی‌گردد تا کاربرِ فقط-موبایلی هم پیدا شود.
 * پیش از این، حسابی که ایمیل نداشت از جست‌وجو هیچ راهی نداشت.
 */
export function userSearchClause(search: string): { sql: string; values: string[] } {
  // `%` ها اینجا اضافه می‌شوند و نه در رشتهٔ کوئری، پس ورودیِ مدیر هرگز
  // بخشی از خودِ SQL نمی‌شود.
  const pattern = `%${search.toLowerCase()}%`;
  const digits = search
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/\D/g, "")
    .replace(/^0/, "98")
    .replace(/^9(?=\d{9}$)/, "989");
  // کمتر از سه رقم یعنی تقریباً هر شماره‌ای — آن شاخه عملاً خاموش می‌شود.
  const phone = digits.length >= 3 ? `%${digits}%` : "\u0000";
  return {
    sql: "(lower(u.email) like ? or lower(u.full_name) like ? or u.phone like ?)",
    // ⚠️ سه `?`، سه مقدار — در MySQL هر `?` یکی مصرف می‌کند.
    values: [pattern, pattern, phone],
  };
}
