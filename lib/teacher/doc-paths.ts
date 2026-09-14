import { join, normalize, sep } from "node:path";

/**
 * قواعدِ مسیرِ انبارِ خصوصیِ مدارک — منطقِ خالص، بدونِ فایل‌سیستم.
 *
 * ⚠️ چرا فایلِ جدا و نه داخلِ `lib/teacher/documents.ts`:
 *
 * آن ماژول `"server-only"` است و به `node:fs` دست می‌زند، پس هیچ تستی
 * نمی‌تواند واردش کند. و این دو تابع دقیقاً همان‌هایی‌اند که اگر بشکنند،
 * نتیجه‌اش «سندِ هویتیِ یک نفر روی اینترنت» است — یعنی از همهٔ کدِ این
 * قابلیت بیشتر به تست نیاز دارند.
 *
 * همان کاری که `lib/plus/coverage.ts` و `lib/teacher/school-name.ts` هم
 * کردند: منطقی که فایل‌سیستم لازم ندارد، پشتِ فایل‌سیستم قفل نمی‌شود.
 */

/**
 * آیا ریشهٔ خصوصی واقعاً از ریشهٔ عمومی جداست؟
 *
 * ⚠️ دو طرفه سنجیده می‌شود و این عمدی است:
 *
 *   • خصوصی زیرِ عمومی → فاجعه. هر حکمِ کارگزینی مستقیم از `/uploads`
 *     قابل دانلود می‌شد، برای هر کسی که نشانی را داشت.
 *   • عمومی زیرِ خصوصی → به‌خودیِ‌خود نشتی نیست، ولی یعنی پیکربندی به هم
 *     ریخته و بهتر است همان‌جا بشکند تا بعداً به شکلِ عجیب‌تری خودش را
 *     نشان بدهد.
 *   • برابر بودنشان → همان حالتِ اول.
 *
 * ⚠️ مقایسه با `parent + sep` انجام می‌شود و نه `startsWith(parent)` تنها.
 * بدونِ جداکننده، `/home/u/sarva-uploads-private` زیرِ
 * `/home/u/sarva-uploads` شمرده می‌شد — دو پوشهٔ کاملاً جدا که یکی‌شان
 * تصادفاً پیشوندِ دیگری است.
 */
export function isPrivateRootSafe(privateRoot: string, publicRoot: string): boolean {
  const a = normalize(privateRoot);
  const b = normalize(publicRoot);

  if (a === b) return false;
  if (a.startsWith(b + sep)) return false;
  if (b.startsWith(a + sep)) return false;
  return true;
}

/**
 * کلیدِ ذخیره‌شده → مسیرِ امنِ روی دیسک، یا `null`.
 *
 * ⚠️ کلید را خودمان ساخته‌ایم، ولی از دیتابیس می‌آید — و دیتابیس یک ورودیِ
 * بیرونی است. اگر روزی کسی از راهِ کنسول SQL یا یک اسکریپت مقداری در آن
 * ستون بنویسد، این تابع تنها چیزی است که بینِ آن مقدار و `readFile`
 * می‌ایستد.
 *
 * سه لایه، همان‌هایی که `app/uploads/[...path]/route.ts` هم دارد:
 *
 *   ۱) هر جزءِ مسیر که «..» یا «.» یا خالی باشد رد می‌شود.
 *   ۲) بایتِ صفر رد می‌شود — در بعضی لایه‌های نیتیو رشته همان‌جا بریده
 *      می‌شود و «x.pdf\0../../etc/passwd» معنای دیگری می‌گیرد.
 *   ۳) و در پایان، مسیرِ نهایی باید *واقعاً* زیرِ ریشه باشد. دو تای اول
 *      استدلال‌اند؛ این یکی اثبات.
 */
export function safeDocumentPath(root: string, key: string): string | null {
  if (!key) return null;
  if (key.includes("\0")) return null;
  // ⚠️ بک‌اسلش هم رد می‌شود و نه فقط اسلش: روی ویندوز جداکنندهٔ مسیر است و
  // یک کلیدِ «..\..\x» همان کارِ «../../x» را می‌کرد.
  if (key.includes("\\")) return null;

  const parts = key.split("/");
  if (parts.some((p) => !p || p === "." || p === "..")) return null;

  const base = normalize(root);
  const target = normalize(join(base, ...parts));
  if (!target.startsWith(base + sep)) return null;
  return target;
}
