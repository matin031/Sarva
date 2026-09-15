/**
 * وضعیتِ یک گزارشِ **روزمحور** — نوعِ خالص، مشترکِ سرور و کلاینت.
 *
 * ⚠️ چرا جدا از `lib/analytics/timezone.ts`: آن ماژول `"server-only"` است
 * (به دیتابیس دست می‌زند) و کامپوننت‌های کلاینتِ پنل باید بتوانند همین
 * شکل‌ها را تایپ کنند.
 */

/**
 * ⚠️ سه حالت و نه دو، چون «نمودار خالی» دو معنای کاملاً متفاوت دارد و
 * قاطی کردنشان یک گزارشِ **غلط** می‌سازد که شبیهِ یک گزارشِ **درست** است:
 *
 *   • `ready`       — داده هست.
 *   • `no_data`     — کاربر واقعاً فعالیتی نداشته.
 *   • `unavailable` — سرور نمی‌تواند روزِ تهران را حساب کند. **عددی نشان نده.**
 *
 * حالتِ سوم واقعی است و نه نظری: اگر جدول‌های `mysql.time_zone` بارگذاری
 * نشده باشند — که روی هاستِ اشتراکی رایج است — `CONVERT_TZ` با نامِ منطقه
 * `NULL` برمی‌گرداند، بی‌هیچ خطایی. آن‌وقت هر ردیف روزِ `NULL` می‌گیرد و
 * «روزهای فعال» می‌شود **یک**، هرچقدر هم کاربر فعال بوده باشد. (روی
 * MariaDB 10.11 آزموده شد.)
 */
export type DailyState = "ready" | "no_data" | "unavailable";

export type DailyPoint = { day: string; total: number; correct: number };

export type DailySeries = {
  state: DailyState;
  days: DailyPoint[];
  /** جمله‌ای که وقتی `ready` نیست نمایش داده می‌شود. */
  note: string | null;
};

export const DAILY_UNAVAILABLE_NOTE =
  "گزارش روزانه روی این سرور در دسترس نیست (منطقهٔ زمانی پیکربندی نشده).";

export const DAILY_NO_DATA_NOTE = "هنوز داده‌ای برای نمودار روزانه ثبت نشده است.";

export function unavailableSeries(): DailySeries {
  return { state: "unavailable", days: [], note: DAILY_UNAVAILABLE_NOTE };
}

export function dailySeries(days: DailyPoint[]): DailySeries {
  if (days.length === 0) return { state: "no_data", days: [], note: DAILY_NO_DATA_NOTE };
  return { state: "ready", days, note: null };
}
