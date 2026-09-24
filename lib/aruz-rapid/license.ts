import type { PoeticLicense, ScansionLength } from "./types";

export type LicenseMark = {
  /** شمارهٔ هجا در مصراع. */
  unit: number;
  display: string;
  length: ScansionLength;
  license: PoeticLicense;
  /** شمارهٔ کلمه در `splitWords(text)` (فقط خانه‌های زوج کلمه‌اند). */
  word: number;
};

/** مصراع به کلمه و فاصله: کلمه‌ها در خانه‌های زوج، کلمهٔ n در خانهٔ 2n. */
export const splitWords = (text: string) => text.split(/(\s+)/);

const MARKS = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u200C-\u200F]/g;
const letters = (s: string) => [...s.replace(MARKS, "").replace(/آ/g, "ا")];

/** حرفِ هجا حداکثر این‌قدر جلوتر از جای فعلی در متن جست‌وجو می‌شود. */
const SKIP = 2;

/**
 * هجاهای اختیاری و کلمه‌ای که هر کدام در آن است.
 *
 * هجاها «شنیده‌شده»اند و حرف‌به‌حرف با متن یکی نیستند (همزهٔ حذف‌شده،
 * «هٔ» → «یِ»، «کامروز» → «کِم»، «قَوامُ‌الدّین» → «مُد دین»). پس هر حرفِ
 * هجا در چند حرفِ پیشِ رو جست‌وجو می‌شود و اگر نبود، از رویش می‌گذریم.
 * اشتباهِ احتمالی فقط کلمهٔ نشان‌دار را جابه‌جا می‌کند، نه پاسخ را.
 */
export function licenseMarks(
  text: string,
  units: readonly { display: string; length: ScansionLength; license?: PoeticLicense }[],
): LicenseMark[] {
  const chars: string[] = [];
  const wordOf: number[] = [];
  splitWords(text).forEach((token, i) => {
    if (i % 2) return;
    for (const ch of letters(token)) {
      chars.push(ch);
      wordOf.push(i / 2);
    }
  });

  const marks: LicenseMark[] = [];
  let p = 0;
  units.forEach((u, unit) => {
    let word = -1;
    for (const ch of letters(u.display)) {
      // نیمهٔ دومِ تشدید («قَد دِ»، «جَن نَ»): همان حرفِ قبلی، نه حرفی در کلمهٔ بعد.
      if (chars[p] !== ch && chars[p - 1] === ch) {
        if (word === -1) word = wordOf[p - 1];
        continue;
      }
      const q = chars.indexOf(ch, p);
      if (q === -1 || q - p > SKIP) continue;
      if (word === -1) word = wordOf[q];
      p = q + 1;
    }
    if (!u.license) return;
    // حرفی که در متن نیست («یِ»ی پس از «هٔ»): کلمهٔ حرفِ پیشین.
    if (word === -1) word = wordOf[Math.max(0, p - 1)] ?? 0;
    marks.push({ unit, display: u.display, length: u.length, license: u.license, word });
  });
  return marks;
}
