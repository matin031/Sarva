/**
 * از شمارشِ روزانه به نمودار و رشتهٔ روزها.
 *
 * ⚠️ چرا جدا و خالص: پیش از این هر دو کار از روی فهرستِ خامِ پاسخ‌ها انجام
 * می‌شد — `dailyBuckets` و `streak` هرکدام برای هر ردیف یک
 * `Intl.DateTimeFormat` می‌ساختند. حالا دیتابیس روزها را شمرده و اینجا فقط
 * ردیف می‌شوند. بدونِ `server-only` تا مستقیم تست شود.
 */

const TEHRAN = "Asia/Tehran";

export type DayCount = { day: string; total: number; correct: number };

/** کلیدِ روزِ تهران برای یک تاریخ — همان قالبی که SQL برمی‌گرداند. */
export function tehranDayKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TEHRAN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * `days` روزِ گذشته را پر می‌کند — روزهای بی‌فعالیت هم صفر می‌گیرند.
 *
 * برچسبِ فارسی همان‌جایی ساخته می‌شود که قبلاً ساخته می‌شد، ولی حالا فقط
 * `days` بار (سی تا)، نه به‌ازای هر ردیفِ پاسخ.
 */
export function bucketsFromDayCounts(
  counts: DayCount[],
  days: number,
  now: Date = new Date(),
): { label: string; total: number; correct: number }[] {
  const byDay = new Map(counts.map((c) => [c.day, c]));
  const label = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    timeZone: TEHRAN,
    day: "numeric",
    month: "short",
  });

  const out: { label: string; total: number; correct: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const hit = byDay.get(tehranDayKey(d));
    out.push({
      label: label.format(d),
      total: hit?.total ?? 0,
      correct: hit?.correct ?? 0,
    });
  }
  return out;
}

/**
 * رشتهٔ روزهای پیاپی، از امروز به عقب.
 *
 * ⚠️ اگر امروز هنوز پاسخی ثبت نشده، رشته از *دیروز* شمرده می‌شود — وگرنه
 * رشتهٔ کسی که شب‌ها تمرین می‌کند هر روز صبح صفر می‌شد. همان رفتارِ نسخهٔ
 * قبلی است.
 */
export function streakFromDayCounts(counts: DayCount[], now: Date = new Date()): number {
  const active = new Set(counts.filter((c) => c.total > 0).map((c) => c.day));
  if (active.size === 0) return 0;

  const dayAt = (offset: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - offset);
    return tehranDayKey(d);
  };

  // اگر امروز خالی است ولی دیروز پر، از دیروز شروع کن.
  let start = 0;
  if (!active.has(dayAt(0))) {
    if (!active.has(dayAt(1))) return 0;
    start = 1;
  }

  let n = 0;
  for (let i = start; i < 400; i++) {
    if (!active.has(dayAt(i))) break;
    n++;
  }
  return n;
}

/** جمعِ پاسخ‌های درست در همان بازه. */
export function correctFromDayCounts(counts: DayCount[]): number {
  return counts.reduce((a, c) => a + c.correct, 0);
}

/** جمعِ کلِ پاسخ‌ها در همان بازه. */
export function totalFromDayCounts(counts: DayCount[]): number {
  return counts.reduce((a, c) => a + c.total, 0);
}
