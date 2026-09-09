import type { MachineState } from "./machine";

/**
 * ثبتِ نتیجهٔ یک دورِ «پلِ وزن» در تاریخچهٔ آموزشی.
 *
 * ⚠️ چرا این فایل وجود دارد: تا امروز این بازی هیچ ردی از خودش نمی‌گذاشت،
 * پس تحلیلِ «در کدام وزن ضعیفی» — که هستهٔ ارزشِ سروا پلاس است — نصفِ شواهد
 * را نمی‌دید. جزئیاتِ کامل بالای `migrations/016_practice_signals.sql`.
 *
 * ⚠️ و چرا در پایانِ دور و نه بعدِ هر پاسخ: بازی یک صحنهٔ سه‌بعدی با تایمرِ
 * فشرده است. یک درخواستِ شبکه وسطِ هر پرش، هم لگِ محسوس می‌سازد و هم در دورِ
 * ده‌مرحله‌ای ده رفت‌وبرگشت است.
 */

export type BridgeOutcome = {
  questionId: string;
  /** null یعنی وقت تمام شد و بازیکن اصلاً انتخابی نکرد. */
  chosenPattern: string | null;
};

/** آیا شناسه، شناسهٔ یک ردیفِ واقعیِ دیتابیس است؟
 *
 *  دادهٔ نمایشیِ درونِ باندل شناسه‌های خودش را دارد که uuid نیستند. ثبتشان
 *  بی‌معنی است (به هیچ پرسشِ واقعی‌ای اشاره نمی‌کنند) و فقط یک خطای ۴۰۰ در
 *  کنسول می‌سازد. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * نتیجهٔ هر مرحله را از حالتِ پایانیِ ماشین بیرون می‌کشد.
 *
 * ⚠️ تابعِ خالص و بدونِ وابستگی به React یا شبکه، تا بشود مستقیم تستش کرد —
 * چون منطقش ظریف است:
 *
 *   • مرحله‌های پیش از `stepIndex` همه درست بوده‌اند؛ بازی فقط با پاسخِ درست
 *     جلو می‌رود.
 *   • خودِ `stepIndex` در حالتِ `finished` درست بوده (آخرین مرحله) و در
 *     `gameOver` شکست خورده.
 *   • شکست دو گونه است: `wrong` (وزنِ اشتباه انتخاب شد) و `timeout` (هیچ
 *     انتخابی نشد). این دو نباید یکی شمرده شوند: بی‌پاسخی لزوماً یعنی
 *     ندانستن نیست.
 */
export function runOutcomes(state: MachineState): BridgeOutcome[] {
  if (state.state !== "finished" && state.state !== "gameOver") return [];

  const outcomes: BridgeOutcome[] = [];

  const patternOf = (index: number, side: "left" | "right"): string => {
    const step = state.steps[index];
    return side === "left" ? step.leftPattern : step.rightPattern;
  };

  for (let i = 0; i < state.stepIndex; i++) {
    const step = state.steps[i];
    if (!step) continue;
    outcomes.push({
      questionId: step.question.id,
      chosenPattern: patternOf(i, step.correctSide),
    });
  }

  const last = state.steps[state.stepIndex];
  if (last) {
    if (state.state === "finished") {
      outcomes.push({
        questionId: last.question.id,
        chosenPattern: patternOf(state.stepIndex, last.correctSide),
      });
    } else if (state.failure === "timeout") {
      outcomes.push({ questionId: last.question.id, chosenPattern: null });
    } else if (state.chosen) {
      outcomes.push({
        questionId: last.question.id,
        chosenPattern: patternOf(state.stepIndex, state.chosen),
      });
    }
  }

  return outcomes.filter((outcome) => UUID.test(outcome.questionId));
}

/**
 * ارسال به سرور.
 *
 * ⚠️ هرگز throw نمی‌کند و هیچ‌چیز را بلاک نمی‌کند. اگر ثبت نشود، بازیکن
 * نباید صفحهٔ پایانِ بازی را از دست بدهد یا خطایی ببیند — این یک کارِ جانبی
 * است، نه بخشی از بازی.
 *
 * سرور خودش درستی را می‌سنجد؛ اینجا فقط «چه چیزی انتخاب شد» فرستاده می‌شود.
 */
export async function reportBridgeRun(outcomes: BridgeOutcome[]): Promise<void> {
  if (outcomes.length === 0) return;

  try {
    await fetch("/api/v1/aruz-bridge/answers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ answers: outcomes }),
      // اگر بازیکن همان لحظه صفحه را ببندد، درخواست نباید صفحه را نگه دارد.
      keepalive: true,
    });
  } catch {
    /* شبکه قطع است. تاریخچه یک دور کم‌تر دارد؛ بازی دست‌نخورده می‌ماند. */
  }
}
