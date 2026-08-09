import "server-only";
import { z } from "zod";

/**
 * اعتبارسنجیِ زمانِ اجرا برای آرگومان‌های Server Action.
 *
 * ⚠️ چرا لازم است، با اینکه همه‌شان تایپ TypeScript دارند:
 *
 * یک Server Action در عمل یک endpoint شبکه است. Next یک شناسه برایش می‌سازد و
 * هر کسی می‌تواند مستقیماً به آن POST بزند — بدون اینکه از هیچ فرمی رد شود.
 * امضایی مثل:
 *
 *     adminSetUserRole(userId: string, role: "student" | "admin")
 *
 * در زمان اجرا هیچ چیزی را تضمین نمی‌کند: تایپ‌ها هنگام کامپایل پاک می‌شوند.
 * یعنی `role` می‌تواند یک شیء باشد، `userId` می‌تواند «' or 1=1» باشد.
 *
 * تا امروز دو چیز نجاتشان می‌داد: کوئری‌ها همه parameterized اند (پس تزریق SQL
 * ممکن نبود) و constraint های دیتابیس مقدار بی‌معنی را رد می‌کردند. یعنی امنیت
 * *تصادفی* بود، نه طراحی‌شده — و به محض اینکه روزی یک constraint حذف شود یا
 * ستون تازه‌ای بدون check اضافه شود، در باز می‌شد. ضمناً خروجی‌اش یک ۵۰۰ با
 * پیام خام پستگرس بود، جایی که باید یک پیام روشن فارسی باشد.
 *
 * این چند تابع همان چیزی را که تایپ *ادعا* می‌کند، واقعاً بررسی می‌کنند.
 */

/** خطای اعتبارسنجی ورودی یک اکشن — با پیام فارسیِ قابل نمایش. */
export class InvalidInputError extends Error {
  constructor(message = "ورودی نامعتبر است.") {
    super(message);
    this.name = "InvalidInputError";
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, message: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new InvalidInputError(message);
  return result.data;
}

/** شناسهٔ UUID — تقریباً هر آرگومانِ «id» در این پروژه. */
export function uuidArg(value: unknown, message = "شناسه نامعتبر است."): string {
  return parse(z.uuid(), value, message);
}

/** یکی از چند مقدار مشخص. */
export function enumArg<const T extends readonly [string, ...string[]]>(
  value: unknown,
  allowed: T,
  message = "مقدار نامعتبر است.",
): T[number] {
  return parse(z.enum(allowed), value, message);
}

/** بولی واقعی — نه "false" و نه 0. */
export function boolArg(value: unknown, message = "مقدار نامعتبر است."): boolean {
  return parse(z.boolean(), value, message);
}

/** رشتهٔ کوتاهِ اختیاری، مثل یادداشت بررسی. */
export function optionalTextArg(
  value: unknown,
  maxLength: number,
  message = "متن خیلی بلند است.",
): string | null {
  const parsed = parse(
    z.string().trim().max(maxLength).nullish(),
    value,
    message,
  );
  return parsed?.trim() || null;
}
