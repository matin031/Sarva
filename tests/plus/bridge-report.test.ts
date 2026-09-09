import test from "node:test";
import assert from "node:assert/strict";
import { initialMachineState, type MachineState } from "@/lib/aruz-bridge/machine";
import { runOutcomes } from "@/lib/aruz-bridge/report";
import type { PreparedStep } from "@/lib/aruz-bridge/types";

/**
 * استخراجِ نتیجهٔ یک دورِ «پلِ وزن» برای تاریخچهٔ آموزشی.
 *
 * ⚠️ منطقش ظریف است و اشتباهش بی‌صدا: اگر مرحلهٔ شکست‌خورده «درست» ثبت شود،
 * تحلیلِ وزن دقیقاً همان وزنی را که دانش‌آموز در آن ضعیف است، قوی نشان
 * می‌دهد.
 */

const ID = (n: number) => `0000000${n}-0000-4000-8000-000000000000`.slice(-36);

function step(index: number, correctSide: "left" | "right"): PreparedStep {
  return {
    uid: `${index}:${ID(index)}`,
    question: {
      id: ID(index),
      promptText: `عبارت ${index}`,
      correctPattern: `درست${index}`,
      wrongPattern: `غلط${index}`,
    },
    correctSide,
    leftPattern: correctSide === "left" ? `درست${index}` : `غلط${index}`,
    rightPattern: correctSide === "right" ? `درست${index}` : `غلط${index}`,
  };
}

function machine(patch: Partial<MachineState>): MachineState {
  return { ...initialMachineState(), ...patch };
}

test("دورِ در جریان چیزی ثبت نمی‌کند", () => {
  const state = machine({ state: "waitingForAnswer", steps: [step(1, "left")], stepIndex: 0 });
  assert.deepEqual(runOutcomes(state), []);
});

test("دورِ کامل‌شده: همهٔ مرحله‌ها با وزنِ درست ثبت می‌شوند", () => {
  const steps = [step(1, "left"), step(2, "right"), step(3, "left")];
  const state = machine({ state: "finished", steps, stepIndex: 2 });

  const outcomes = runOutcomes(state);
  assert.equal(outcomes.length, 3);
  assert.deepEqual(
    outcomes.map((o) => o.chosenPattern),
    ["درست1", "درست2", "درست3"],
  );
});

test("پاسخِ غلط: وزنی که واقعاً انتخاب شده ثبت می‌شود، نه وزنِ درست", () => {
  const steps = [step(1, "left"), step(2, "right")];
  // مرحلهٔ اول درست بوده و بازی جلو رفته؛ مرحلهٔ دوم غلط زده شده.
  const state = machine({
    state: "gameOver",
    steps,
    stepIndex: 1,
    failure: "wrong",
    chosen: "left", // پاسخِ درستِ مرحلهٔ دوم «right» بود
  });

  const outcomes = runOutcomes(state);
  assert.equal(outcomes.length, 2);
  assert.equal(outcomes[0].chosenPattern, "درست1");
  // ⚠️ این خط قلبِ تست است: اگر اینجا «درست2» ثبت شود، سرور آن را پاسخِ
  // درست حساب می‌کند و تحلیل وارونه می‌شود.
  assert.equal(outcomes[1].chosenPattern, "غلط2");
});

test("وقت تمام‌شده: بدون انتخاب ثبت می‌شود و با پاسخِ غلط یکی شمرده نمی‌شود", () => {
  const steps = [step(1, "left")];
  const state = machine({ state: "gameOver", steps, stepIndex: 0, failure: "timeout" });

  const outcomes = runOutcomes(state);
  assert.equal(outcomes.length, 1);
  // null یعنی «هیچ انتخابی نشد» — سرور از همین، outcome = timeout می‌سازد.
  // بی‌پاسخی لزوماً یعنی ندانستن نیست و نباید مثل پاسخِ غلط شمرده شود.
  assert.equal(outcomes[0].chosenPattern, null);
});

test("پرسشِ نمایشیِ درونِ باندل ثبت نمی‌شود", () => {
  // دادهٔ نمایشی شناسهٔ uuid ندارد و به هیچ ردیفِ واقعی‌ای اشاره نمی‌کند.
  const demo: PreparedStep = {
    ...step(1, "left"),
    question: { ...step(1, "left").question, id: "demo-1" },
  };
  const state = machine({ state: "finished", steps: [demo], stepIndex: 0 });
  assert.deepEqual(runOutcomes(state), []);
});
