/**
 * آدرسی که مدیر وارد کرده، آمادهٔ نشستن در href.
 *
 * ⚠️ بدون این، یک مدیر (یا کسی که به حساب مدیر رسیده) می‌توانست
 * `javascript:…` در لینک اعلان بگذارد — و آن لینک بالای *همهٔ* صفحه‌های سایت
 * برای *همهٔ* بازدیدکننده‌ها دیده می‌شود. یعنی یک XSS با بیشترین دامنهٔ ممکن.
 *
 * سه چیز پذیرفته می‌شود و بس:
 *
 *   • https://…  و  http://…
 *   • مسیر داخلی که با `/` شروع شود
 *
 * `//evil.example` عمداً رد می‌شود: شبیه مسیر داخلی است ولی مرورگر آن را
 * آدرسِ دامنهٔ دیگری می‌فهمد.
 *
 * ⚠️ عمداً بدون "server-only": هم لایهٔ عمومی و هم اکشن‌های پنل از آن استفاده
 * می‌کنند و باید بشود مستقیم در `node --test` صدایش زد. اینجا هیچ چیز
 * محرمانه‌ای نیست.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;

  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
