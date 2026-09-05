import type { ClubFeedSort } from "./types";

/**
 * آدرسِ فهرستِ کلاب، و سیاستِ ایندکسِ هر شکلش.
 *
 * ⚠️ چرا این فایل ساخته شد: تا امروز صفحهٔ دومِ فهرست *آدرسی نداشت*. دکمهٔ
 * «سروده‌های بیشتر» یک Server Action صدا می‌زد و نتیجه را به state اضافه
 * می‌کرد. سه پیامد داشت:
 *
 *   • هیچ سروده‌ای جز دوازده‌تای اول خزیده نمی‌شد. بقیه در HTMLِ هیچ صفحه‌ای
 *     نبودند و هیچ لینکی به آن‌ها نمی‌رسید.
 *   • کاربر نمی‌توانست صفحهٔ دوم را بوکمارک کند یا برای کسی بفرستد.
 *   • با بازگشت از صفحهٔ یک سروده، همه‌چیز به دوازده‌تای اول برمی‌گشت.
 *
 * ── سیاستِ آدرس‌ها ─────────────────────────────────────────────────────────
 *
 * | شکل                        | ایندکس | canonical              |
 * |----------------------------|--------|------------------------|
 * | `/sarvaclub`               | بله    | خودش                   |
 * | `/sarvaclub?page=2`        | بله    | **خودش**، نه صفحهٔ یک   |
 * | `/sarvaclub?sort=popular`  | خیر    | `/sarvaclub`           |
 * | `/sarvaclub?form=ghazal`   | خیر    | خودش                   |
 * | `/sarvaclub?tag=...`       | خیر    | خودش                   |
 *
 * چرا صفحهٔ دوم canonicalِ خودش را دارد: محتوایش با صفحهٔ یک *فرق* دارد.
 * فرستادنش به صفحهٔ یک یعنی گفتن «این سروده‌ها تکراری‌اند» — و نتیجه‌اش این
 * است که هیچ‌وقت ایندکس نشوند.
 *
 * چرا مرتب‌سازی نه: `?sort=popular` دقیقاً همان سروده‌هاست با ترتیبِ دیگر.
 * این تعریفِ محتوای تکراری است.
 *
 * چرا فیلترها `noindex` اند ولی canonicalِ خودشان را دارند: هر ترکیبِ
 * قالب×برچسب×صفحه یک آدرسِ تازه می‌سازد و شمارشان ضرب می‌شود. `noindex,
 * follow` یعنی خزنده از آن‌ها *رد می‌شود و لینک‌ها را دنبال می‌کند* ولی
 * خودشان در نتایج نمی‌نشینند. سروده‌ها از دست نمی‌روند چون فهرستِ بدونِ
 * فیلتر با صفحه‌بندی به همه‌شان می‌رسد.
 */

export type FeedQuery = {
  /** یک‌مبنا، همان چیزی که در آدرس دیده می‌شود. صفحهٔ یک پارامتر نمی‌گیرد. */
  page: number;
  sort: ClubFeedSort;
  form?: string;
  tag?: string;
};

/** سقفِ صفحه — جلوی `offset` نجومی روی دیتابیس. */
export const MAX_FEED_PAGE = 500;

/** آدرسِ نسبیِ یک حالتِ فهرست. پارامترهای پیش‌فرض نوشته نمی‌شوند. */
export function feedPath(q: Partial<FeedQuery>): string {
  const params = new URLSearchParams();
  // ترتیبِ ثابت، تا یک حالت همیشه یک رشته بدهد و آدرسِ تکراری نسازد.
  if (q.sort && q.sort !== "recent") params.set("sort", q.sort);
  if (q.form) params.set("form", q.form);
  if (q.tag) params.set("tag", q.tag);
  if (q.page && q.page > 1) params.set("page", String(q.page));

  const qs = params.toString();
  return qs ? `/sarvaclub?${qs}` : "/sarvaclub";
}

/**
 * این حالت باید ایندکس شود؟
 *
 * فقط فهرستِ بدونِ فیلتر و بدونِ مرتب‌سازیِ سفارشی — در هر صفحه‌ای.
 */
export function feedIsIndexable(q: FeedQuery): boolean {
  return !q.form && !q.tag && q.sort === "recent";
}

/** canonicalِ این حالت. */
export function feedCanonicalPath(q: FeedQuery): string {
  // مرتب‌سازی محتوای تازه‌ای نمی‌سازد، پس به همان فهرست در همان صفحه می‌رسد.
  return feedPath({ ...q, sort: "recent" });
}

/**
 * شمارهٔ صفحه از آدرس؛ هر چیزِ نامعتبر یعنی صفحهٔ یک.
 *
 * ⚠️ فقط رقمِ ساده پذیرفته می‌شود، نه هر چیزی که `Number()` قبولش کند.
 * آزمون این را گرفت: `?page=1e5` از نظر `Number.isInteger` عددِ صحیح است
 * (۱۰۰۰۰۰) و بی‌سروصدا به سقف می‌رسید، یعنی یک آدرسِ عجیب صفحهٔ ۵۰۰ را
 * نشان می‌داد. `0x10`، `1.0` و ` 2 ` هم همین‌طور بودند.
 *
 * همان قاعده‌ای که `parseLessonNumber` در lib/doroos دارد: اول شکل، بعد
 * مقدار.
 */
export function parseFeedPage(raw: string | undefined): number {
  if (!raw || !/^\d+$/.test(raw)) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return Math.min(n, MAX_FEED_PAGE);
}
