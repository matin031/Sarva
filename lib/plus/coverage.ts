import type { PlusSource } from "./types";

/**
 * «تا کِی پلاس دارد؟» — منطقِ خالص، بدونِ دیتابیس.
 *
 * ⚠️ این فایل به‌خاطر یک باگِ واقعی نوشته شد که آزمونِ `db:check-plus` پیدایش
 * کرد، و ارزش دارد که ماجرا اینجا بماند:
 *
 * نسخهٔ اول فقط «دسترسیِ فعالِ فعلی» را می‌گرفت — یعنی ردیفی که همین حالا
 * `starts_at <= now < ends_at` داشت — و تاریخِ پایانِ همان را نشان می‌داد.
 * روی کاغذ درست بود و در عمل غلط:
 *
 *     کاربر ۶۰ روز می‌خرد (دو خرید سی‌روزهٔ پشت‌سرهم).
 *     دیتابیس: [امروز → +۳۰] و [+۳۰ → +۶۰]
 *     صفحهٔ اشتراک: «۳۰ روز باقی مانده» ✗
 *
 * بدتر از عددِ اشتباه، پیامدش بود: هشدارِ «نزدیک پایان» زودتر شلیک می‌شد و
 * کاربری که همین حالا برای شصت روز پول داده، پیامِ «اشتراکت دارد تمام
 * می‌شود» می‌گرفت — و ممکن بود دوباره بخرد.
 *
 * پس پاسخِ درست، انتهای *زنجیرهٔ پیوستهٔ* دسترسی است و نه انتهای یک ردیف.
 * محاسبه‌اش خالص و تست‌پذیر است، چون منطقِ محصولی است نه کوئری.
 */

export type CoverageRow = {
  /** ISO */
  startsAt: string;
  /** ISO، یا null برای دسترسیِ دائمی. */
  endsAt: string | null;
  source: PlusSource;
};

export type Coverage =
  | { active: false }
  | {
      active: true;
      /** شروعِ زنجیرهٔ پیوسته‌ای که «حالا» داخلش است. */
      startsAt: string;
      /** پایانِ همان زنجیره؛ null یعنی دائمی. */
      endsAt: string | null;
      /** منبعِ ردیفی که همین لحظه را پوشش می‌دهد — برای برچسبِ «آزمایشی». */
      source: PlusSource;
    };

/**
 * ⚠️ مرزِ بازه نیم‌باز است: `starts_at <= t < ends_at`.
 *
 * یعنی لحظهٔ پایان دیگر دسترسی نیست، و دوره‌ای که دقیقاً از همان لحظه شروع
 * شود نه شکاف می‌سازد و نه همپوشانی. کلِ منطقِ «چسبیدن» به همین قرارداد
 * تکیه دارد.
 */
function covers(row: CoverageRow, t: number): boolean {
  const start = Date.parse(row.startsAt);
  if (!Number.isFinite(start) || start > t) return false;
  if (row.endsAt === null) return true;
  const end = Date.parse(row.endsAt);
  return Number.isFinite(end) && end > t;
}

/**
 * زنجیرهٔ پیوستهٔ دسترسی که «حالا» داخل آن است.
 *
 * ردیف‌ها باید از قبل فیلتر شده باشند (لغوشده‌ها حذف)؛ ترتیبشان مهم نیست.
 */
export function resolveCoverage(rows: CoverageRow[], now: Date): Coverage {
  const t = now.getTime();

  const current = rows.find((row) => covers(row, t));
  if (!current) return { active: false };

  // ── جلو رفتن: هر دوره‌ای که از پایانِ فعلی یا پیش از آن شروع شود و
  // دیرتر تمام شود، زنجیره را جلو می‌برد.
  let end: number | null = current.endsAt === null ? null : Date.parse(current.endsAt);
  if (end !== null) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const row of rows) {
        if (end === null) break;
        const start = Date.parse(row.startsAt);
        if (!Number.isFinite(start) || start > end) continue;

        // دسترسیِ دائمی که به زنجیره می‌چسبد، زنجیره را دائمی می‌کند.
        if (row.endsAt === null) {
          end = null;
          changed = true;
          break;
        }

        const rowEnd = Date.parse(row.endsAt);
        if (Number.isFinite(rowEnd) && rowEnd > end) {
          end = rowEnd;
          changed = true;
        }
      }
    }
  }

  // ── عقب رفتن: شروعِ زنجیره، برای نمایشِ «از چه تاریخی».
  let start = Date.parse(current.startsAt);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (row.endsAt === null) continue; // دائمی مرزِ شروع را عقب نمی‌برد
      const rowEnd = Date.parse(row.endsAt);
      const rowStart = Date.parse(row.startsAt);
      if (!Number.isFinite(rowEnd) || !Number.isFinite(rowStart)) continue;
      if (rowEnd >= start && rowStart < start) {
        start = rowStart;
        changed = true;
      }
    }
  }

  return {
    active: true,
    startsAt: new Date(start).toISOString(),
    endsAt: end === null ? null : new Date(end).toISOString(),
    // ⚠️ منبع از ردیفی می‌آید که *همین لحظه* را پوشش می‌دهد و نه از کلِ
    // زنجیره: اگر کاربر امروز روی دسترسیِ آزمایشی است، برچسبِ صادقانه
    // همان است — حتی اگر دورهٔ خریداری‌شده‌اش از فردا شروع شود.
    source: current.source,
  };
}
