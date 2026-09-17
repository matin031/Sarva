import type { RapidAruzUnit, ScansionLength } from "./types";

/**
 * نوشتنِ واحدهای عروضی در یک خط — و خواندنش.
 *
 * ⚠️ چرا اصلاً چنین قالبی لازم است: بازی نمی‌تواند مصراع را خودش هجا کند
 * (قاعدهٔ اولِ types.ts)، و *نباید* هم بتواند. پس متنِ هر هجا و کوتاه/بلند
 * بودنش باید از داده بیاید. ولی وارد کردنِ یازده هجا با یازده فیلد، برای
 * صد مصراع، کارِ یک بعدازظهر است. این قالب همان یازده هجا را در یک خط
 * می‌گذارد:
 *
 *     تَ=U وا=- نا=- بُ=U وَد=-
 *
 * ⚠️ و ادغامِ عروضی دقیقاً همان چیزی است که این قالب را ناگزیر می‌کند:
 * «بِشْنَو اَز» به «بِشْ» + «نَ» + «وَز» تقطیع می‌شود. متنِ هجا زیررشتهٔ
 * متنِ مصراع نیست، پس هیچ الگوریتمی نمی‌تواند از روی مصراع بسازدش.
 */

/** نمادهای کوتاه — هرچه یک معلم ممکن است تایپ کند. */
const SHORT_MARKS = new Set(["U", "u", "V", "v", "∪", "ᴗ", "ᵕ"]);
/** نمادهای بلند. کشیدهٔ فارسی (ـ) عمداً هست: روی صفحه‌کلید فارسی همان است. */
const LONG_MARKS = new Set(["-", "–", "—", "_", "ـ", "−"]);

/** جداکنندهٔ متنِ هجا از نمادش. هیچ‌کدام در متنِ فارسی نمی‌آیند. */
const UNIT_SPLIT = /\s*[=:]\s*/;

export type ParsedUnit = { display: string; length: ScansionLength };

export type UnitParseResult =
  | { ok: true; units: ParsedUnit[] }
  | { ok: false; error: string };

/** یک خطِ «متن=نماد متن=نماد …» را به واحدها تبدیل می‌کند. */
export function parseUnitSpec(spec: string): UnitParseResult {
  const chunks = spec.trim().split(/\s+/).filter(Boolean);
  if (chunks.length === 0) return { ok: false, error: "هیچ واحدی نوشته نشده." };

  const units: ParsedUnit[] = [];
  for (const chunk of chunks) {
    const parts = chunk.split(UNIT_SPLIT);
    if (parts.length !== 2) {
      return {
        ok: false,
        error: `واحدِ «${chunk}» قالبِ درستی ندارد؛ باید مثلِ «تَ=U» یا «وا=-» باشد.`,
      };
    }

    // ⚠️ متنِ هجا trim نمی‌شود مگر از دو سرِ همان تکه — اعراب و نیم‌فاصله
    // بخشی از متن‌اند و دست خوردنشان یعنی نمایشِ غلط.
    const [display, mark] = parts;
    if (!display) return { ok: false, error: `واحدِ «${chunk}» متن ندارد.` };

    if (SHORT_MARKS.has(mark)) units.push({ display, length: "short" });
    else if (LONG_MARKS.has(mark)) units.push({ display, length: "long" });
    else {
      return {
        ok: false,
        error: `نمادِ «${mark}» شناخته نشد؛ برای کوتاه U و برای بلند - بنویسید.`,
      };
    }
  }

  return { ok: true, units };
}

/** برعکسِ parseUnitSpec — برای پر کردنِ فرمِ ویرایش. */
export function formatUnitSpec(units: readonly ParsedUnit[]): string {
  return units.map((u) => `${u.display}=${u.length === "short" ? "U" : "-"}`).join(" ");
}

/** فقط الگو، بدون متن: «U--U-». همان چیزی که با موتورِ عروض سنجیده می‌شود. */
export function unitPattern(units: readonly ParsedUnit[]): string {
  return units.map((u) => (u.length === "short" ? "U" : "-")).join("");
}

/**
 * جای آشکارسازیِ متن پس از هر واحد.
 *
 * ⚠️ این عددها در دادهٔ نمایشی دستی حساب شده بودند — نسبتِ تجمعیِ نویسه‌های
 * previewText که تا پایانِ هر هجا پوشیده می‌شود. هیچ مدیری قرار نیست چنین
 * چیزی را با ماشین‌حساب دربیاورد، پس اینجا تقریبش زده می‌شود: سهمِ تجمعیِ
 * *طولِ خودِ هجاها*.
 *
 * تقریب است و نه اندازه‌گیری، چون فاصله‌های مصراع در هجاها نیستند؛ ولی دو
 * چیزی که بازی و اعتبارسنج واقعاً لازم دارند را تضمین می‌کند: صعودی است، و
 * آخرینش دقیقاً ۱ است.
 */
export function withRevealProgress(
  units: readonly ParsedUnit[],
  idPrefix: string,
): RapidAruzUnit[] {
  const total = units.reduce((sum, u) => sum + u.display.length, 0) || 1;
  let seen = 0;

  return units.map((u, i) => {
    seen += u.display.length;
    const last = i === units.length - 1;
    return {
      id: `${idPrefix}-${i + 1}`,
      display: u.display,
      length: u.length,
      revealProgress: last ? 1 : Math.round((seen / total) * 10000) / 10000,
    };
  });
}
