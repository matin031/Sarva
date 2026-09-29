import "server-only";
import { revalidatePath } from "next/cache";
import { invalidate } from "./memo";

/**
 * کلیدها و TTL های محتوای عمومی، در یک جا.
 *
 * هر ناحیه دو لایهٔ کش دارد که باید *با هم* تازه شوند:
 *
 *   • `memo` (lib/cache/memo.ts) — نتیجهٔ کوئری در حافظهٔ پروسه.
 *   • ISR — HTMLِ آمادهٔ صفحه، برای صفحه‌هایی که `revalidate` دارند.
 *
 * ⚠️ اگر فقط `revalidatePath` صدا زده شود، صفحه دوباره ساخته می‌شود ولی
 * loader همان نتیجهٔ کش‌شده در حافظه را می‌دهد — یعنی ذخیرهٔ مدیر تا پایانِ
 * TTL دیده نمی‌شود. برای همین اقدام‌های مدیر `refreshPublicContent` را صدا
 * می‌زنند که هر دو را با هم انجام می‌دهد.
 */

export const PUBLIC_TTL_MS = {
  /** بازی‌ها و بانک‌های سؤال: مدیر به‌ندرت عوضشان می‌کند. */
  content: 60_000,
  /** اعلانِ بالای سایت و حامیان: کوتاه‌تر، چون اعلان حساسِ زمان است. */
  site: 30_000,
  /** فید و آمارِ کلاب برای مهمان: کوتاه، چون تأییدِ یک سروده باید زود دیده شود. */
  club: 15_000,
} as const;

export type PublicArea =
  | "site"
  | "jasoos"
  | "pairs"
  | "ninja"
  | "rang-ara"
  | "aruz-rapid"
  | "quiz"
  | "exams"
  | "club";

/** پیشوندِ کلیدهای memo هر ناحیه. */
export function publicKey(area: PublicArea, suffix = ""): string {
  return `public:${area}:${suffix}`;
}

/**
 * صفحه‌های ISR ای که دادهٔ هر ناحیه را نشان می‌دهند.
 *
 * ⚠️ رفتارشان وقتی دیتابیس قطع است (آزموده شد): loader خطا را با
 * `recordError` ثبت می‌کند، آن `headers()` را می‌خواند و Next بازسازی را با
 * «Page changed from static to dynamic at runtime … reason: headers» رد
 * می‌کند. نتیجه همان چیزی است که می‌خواهیم: بازدیدکننده همچنان *آخرین نسخهٔ
 * سالم* را با ۲۰۰ می‌گیرد، نه دادهٔ ثابتِ جایگزین و نه خطا. با برگشتنِ
 * دیتابیس، بازسازیِ بعدی بی‌خطا انجام می‌شود. پس آن خطا در لاگ یعنی «دیتابیس
 * در دسترس نبود»، نه باگِ صفحه.
 */
const ISR_PATHS: Partial<Record<PublicArea, string[]>> = {
  jasoos: ["/game/jasoos"],
  pairs: ["/game/pairs"],
  ninja: ["/game/ninja"],
  "rang-ara": ["/game/rang-ara"],
};

/** پس از هر تغییرِ مدیر در یک ناحیه صدا زده می‌شود. */
export function refreshPublicContent(area: PublicArea): void {
  invalidate(publicKey(area));
  for (const path of ISR_PATHS[area] ?? []) revalidatePath(path);
}

/** کنسولِ SQL مدیر هر جدولی را می‌تواند عوض کند؛ همه‌چیز پاک می‌شود. */
export function refreshAllPublicContent(): void {
  invalidate("public:");
  for (const paths of Object.values(ISR_PATHS)) for (const path of paths) revalidatePath(path);
}
