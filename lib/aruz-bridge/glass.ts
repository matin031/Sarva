import type { FailureReason, GameState, GlassState, Side } from "./types";

/**
 * حالتِ دیداریِ کاشی‌ها — منطقِ خالص، جدا از صحنه.
 *
 * ⚠️ چرا از `GameScene` بیرون کشیده شد: این منطق یک باگِ خاموش داشت که هیچ
 * تستی نمی‌توانست بگیردش، چون داخلِ یک closure در دلِ یک کامپوننتِ
 * react-three-fiber زندگی می‌کرد و برای صدا زدنش باید کلِ صحنهٔ سه‌بعدی را
 * بالا می‌آوردی. حالا یک تابعِ ساده است و تستِ کنارش هم‌همان‌جاست.
 */

/** کدام کاشی زیرِ پای بازیکن است، پیش از مرحلهٔ `index`. */
export function standSide(
  steps: readonly { readonly correctSide: Side }[],
  index: number,
): Side | null {
  if (index <= 0) return null;
  return steps[index - 1]?.correctSide ?? null;
}

export interface BreakingTile {
  /** شمارهٔ مرحله؛ `-1` یعنی سکوی آغاز. */
  index: number;
  /** `null` یعنی سکوی آغاز، که سمت ندارد. */
  side: Side | null;
}

/**
 * کدام کاشی دارد می‌شکند — یا هنوز فقط هشدار می‌دهد.
 *
 * دو سناریوی مرگ، دو کاشیِ متفاوت:
 *   • پاسخِ غلط  → کاشیِ *انتخاب‌شده* می‌شکند.
 *   • پایانِ زمان → کاشیِ *زیرِ پا* می‌شکند؛ بی‌عملی هم سقوط دارد.
 */
export function breakingTile({
  state,
  failure,
  stepIndex,
  chosen,
  steps,
}: {
  state: GameState;
  failure: FailureReason | null;
  stepIndex: number;
  chosen: Side | null;
  steps: readonly { readonly correctSide: Side }[];
}): BreakingTile | null {
  /* ⚠️ `timeout` عمداً در این فهرست است.

     ماشین ۵۲۰ میلی‌ثانیه در حالتِ `timeout` می‌ماند و توضیحِ خودش می‌گوید
     «لرزشِ کاشیِ زیرِ پا، پیش از ترک‌خوردن» — ولی این حالت در فهرست نبود، پس
     نتیجه `null` می‌شد، همهٔ کاشی‌ها `intact` می‌ماندند و آن نیم‌ثانیه هیچ
     اتفاقی نمی‌افتاد: بازیکن بی‌هیچ هشداری خودش را در حالِ سقوط می‌دید.
     `GlassTile` لرزش را از همان اول بلد بود (حالتِ `impact`)؛ فقط هیچ‌کس آن
     حالت را نمی‌ساخت.

     `machine.failure` در همان گذارِ به `timeout` نوشته می‌شود، پس شاخهٔ زیر
     همان لحظه هم درست جواب می‌دهد و شرطِ تازه‌ای نمی‌خواهد. */
  const failing =
    state === "timeout" ||
    state === "cracking" ||
    state === "shattering" ||
    state === "falling" ||
    state === "gameOver";
  if (!failing) return null;

  if (failure === "timeout") {
    const side = standSide(steps, stepIndex);
    return { index: side === null ? -1 : stepIndex - 1, side };
  }
  return chosen ? { index: stepIndex, side: chosen } : null;
}

/** حالتِ دیداریِ یک کاشیِ مشخص. */
export function glassStateFor(
  state: GameState,
  breaking: BreakingTile | null,
  index: number,
  side: Side | null,
): GlassState {
  if (!breaking || breaking.index !== index || breaking.side !== side) return "intact";
  switch (state) {
    /* هشدارِ آرام: کاشی می‌لرزد ولی هنوز سالم است — تنها حالتی که راهِ برگشت
       ندارد و هنوز نشکسته، و تنها جایی که `impact` معنا دارد. */
    case "timeout":
      return "impact";
    case "cracking":
      return "cracking";
    case "shattering":
      return "shattering";
    default:
      return "broken";
  }
}
