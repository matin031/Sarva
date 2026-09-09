/**
 * مقصدِ بازگشت پس از ورود.
 *
 * ⚠️ این فایل کوچک است ولی یکی از خطرناک‌ترین جاهای هر سایت را می‌بندد:
 * **Open Redirect**.
 *
 * سناریو: مهاجم لینکِ زیر را برای دانش‌آموز می‌فرستد.
 *
 *     https://sarva.example/auth?returnTo=https://sarva-login.example/
 *
 * دانش‌آموز دامنهٔ سروا را می‌بیند، با خیال راحت وارد می‌شود، و بلافاصله به
 * سایتی می‌رود که *دقیقاً* شبیه سروا است و رمزش را دوباره می‌پرسد. تنها
 * چیزی که جلوی این را می‌گیرد، همین بررسی است.
 *
 * ── قاعده ───────────────────────────────────────────────────────────────────
 * فقط مسیرِ داخلی، و فقط از فهرستِ سفید. یعنی:
 *
 *   ✓ /checkout?plan=plus_1m
 *   ✓ /panel/subscription
 *   ✗ https://…                (دامنهٔ بیرونی)
 *   ✗ //evil.example           (پروتکل‌نسبی — مرورگر این را دامنهٔ بیرونی
 *                               می‌فهمد، حتی با اینکه با «/» شروع می‌شود)
 *   ✗ /\evil.example           (بعضی مرورگرها بک‌اسلش را اسلش می‌خوانند)
 *   ✗ javascript:…             (اصلاً مسیر نیست)
 *   ✗ /admin/…                 (در فهرست سفید نیست)
 *
 * ⚠️ فهرستِ سفید و نه «هر چیزی که با / شروع شود»: با یک فهرستِ باز، هر
 * صفحه‌ای که فردا اضافه شود خودبه‌خود مقصدِ مجاز می‌شد — از جمله صفحه‌هایی که
 * با پارامترِ دلخواه کارِ خطرناکی می‌کنند.
 */

/** پیشوندهایی که پس از ورود می‌شود به آن‌ها برگشت. */
const ALLOWED_PREFIXES = [
  "/checkout",
  "/plus",
  "/panel/subscription",
  "/panel/billing",
  "/panel/support",
  "/panel/analysis",
  "/panel/home",
  "/panel/bookmarks",
  "/payment/result",
] as const;

/** مقصدِ پیش‌فرض وقتی چیزی داده نشده یا داده‌شده نامعتبر است. */
export const DEFAULT_AFTER_LOGIN = "/panel/home";

/**
 * مسیرِ امنِ بازگشت، یا مقدارِ پیش‌فرض.
 *
 * هرگز `null` برنمی‌گرداند: کدِ فراخوان نباید مجبور باشد یادش بماند که
 * برای حالتِ نامعتبر هم چاره‌ای بگذارد.
 */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_AFTER_LOGIN;

  const raw = value.trim();
  if (!raw.startsWith("/")) return DEFAULT_AFTER_LOGIN;

  // «//host» و «/\host»: مرورگر هر دو را آدرسِ بیرونی می‌فهمد.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_AFTER_LOGIN;

  // نویسه‌های کنترلی و فاصله می‌توانند بررسی‌های ساده را دور بزنند.
  if (/[\u0000-\u001F\u007F\s]/.test(raw)) return DEFAULT_AFTER_LOGIN;

  // بدونِ hash: قطعهٔ hash هیچ‌وقت لازم نیست و فقط سطحِ حمله اضافه می‌کند.
  const withoutHash = raw.split("#")[0];
  const path = withoutHash.split("?")[0];

  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  if (!allowed) return DEFAULT_AFTER_LOGIN;

  return withoutHash;
}
