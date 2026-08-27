/**
 * وارسیِ دادهٔ «تقطیعِ سریع» با موتورِ عروضِ خودِ سروا.
 *
 * این اسکریپت در زمانِ نوشتنِ داده اجرا می‌شود، نه در بازی. بازی هرگز تقطیع
 * تولید نمی‌کند؛ ولی نویسندهٔ داده حق دارد کارِ دستی‌اش را با موتور بسنجد.
 *
 *   npx tsx scripts/verify-aruz-rapid.ts
 *
 * ⚠️ موتور روی متنِ کاملاً اعراب‌گذاری‌شده گاهی هیچ تقطیعی پیدا نمی‌کند
 * (مثلاً سکونِ صریح در «بِشْنَو» مسیرش را می‌بندد). پس اگر شکل اعراب‌دار
 * جواب نداد، همان مصراع بدونِ اعراب هم امتحان می‌شود. حذفِ اعراب فقط و فقط
 * برای همین وارسی است و هیچ‌جای بازی چنین کاری نمی‌کند.
 */
import { detect } from "@/lib/aruz/detect";
import { DEMO_RAPID_ARUZ_QUESTIONS } from "@/lib/aruz-rapid/demo-questions";

const DIACRITICS = /[\u064B-\u0652\u0670]/g;

const toPattern = (q: { units: { length: string }[] }) =>
  q.units.map((u) => (u.length === "short" ? "U" : "-")).join("");

function check(text: string, mine: string) {
  const { rows, conf, s1 } = detect(text);
  const best = rows[0];
  return {
    conf,
    best,
    inScans: [...s1.keys()].includes(mine),
    meterMatches: best.pat === mine,
  };
}

let bad = 0;
for (const q of DEMO_RAPID_ARUZ_QUESTIONS) {
  const mine = toPattern(q);
  let r = check(q.previewText, mine);
  let source = "اعراب‌دار";
  if (!r.inScans && !r.meterMatches) {
    r = check(q.previewText.replace(DIACRITICS, ""), mine);
    source = "بدونِ اعراب";
  }
  const ok = r.inScans || r.meterMatches;
  if (!ok) bad += 1;
  console.log(
    `${ok ? "OK " : "!! "} ${q.id}   (${source})\n` +
      `   متن     : ${q.previewText}\n` +
      `   دستی    : ${mine}\n` +
      `   وزنِ برتر: ${r.best.pat}  ${r.best.ark}  اطمینان: ${r.conf}\n` +
      `   در تقطیع‌های ممکن: ${r.inScans ? "بله" : "خیر"}  |  برابرِ الگوی وزن: ${r.meterMatches ? "بله" : "خیر"}`,
  );
}
console.log(bad === 0 ? "\nهمه تأیید شد." : `\n${bad} مورد تأیید نشد.`);
process.exit(bad === 0 ? 0 : 1);
