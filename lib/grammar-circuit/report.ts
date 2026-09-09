/**
 * ثبتِ نتیجهٔ یک پرسشِ «مدارِ دستور» در تاریخچهٔ آموزشی.
 *
 * ⚠️ چرا: تحلیلِ «در کدام نقشِ دستوری ضعیفی» تا امروز فقط از «جاسوس» تغذیه
 * می‌شد. این بازی دقیقاً همان مهارت را می‌سنجد و هیچ ردی از خودش نمی‌گذاشت —
 * یعنی دو بازیِ هم‌مهارت، یکی دیده می‌شد و یکی نه.
 *
 * ⚠️ **فقط تلاشِ اول ثبت می‌شود.** بعد از دیدنِ نتیجهٔ اعتبارسنجی، بازیکن
 * می‌داند کدام سوکت غلط بوده و تلاشِ دوم دیگر سنجشِ دانش نیست. ثبتِ همهٔ
 * تلاش‌ها، دقتِ همه را به‌طور مصنوعی بالا می‌برد و تحلیل را بی‌معنی می‌کند.
 *
 * ⚠️ و هیچ ادعایی دربارهٔ درست/غلط فرستاده نمی‌شود: سرور خودش payload پرسش
 * را می‌خواند و مقایسه می‌کند.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CircuitPlacement = { tokenId: string; roleKey: string };

export async function reportCircuitAttempt(
  questionId: string,
  placements: CircuitPlacement[],
): Promise<void> {
  // دادهٔ نمایشیِ درونِ باندل شناسهٔ uuid ندارد و به هیچ ردیفی اشاره نمی‌کند.
  if (!UUID.test(questionId) || placements.length === 0) return;

  try {
    await fetch("/api/v1/grammar-circuit/answers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ questionId, placements }),
      keepalive: true,
    });
  } catch {
    /* کارِ جانبی است؛ شکستش نباید بازی را لمس کند. */
  }
}
