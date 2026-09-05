import test from "node:test";
import assert from "node:assert/strict";
import { breakingTile, glassStateFor, standSide } from "../../lib/aruz-bridge/glass";
import type { Side } from "../../lib/aruz-bridge/types";

/* یک پلِ ساختگی: سمتِ درستِ هر مرحله همان چیزی است که بازیکن روی آن می‌ایستد. */
const steps: readonly { readonly correctSide: Side }[] = [
  { correctSide: "left" },
  { correctSide: "right" },
  { correctSide: "left" },
];

test("standSide: سکوی آغاز سمت ندارد", () => {
  assert.equal(standSide(steps, 0), null);
  assert.equal(standSide(steps, -1), null);
});

test("standSide: پیش از هر مرحله، روی کاشیِ درستِ مرحلهٔ قبل ایستاده‌ایم", () => {
  assert.equal(standSide(steps, 1), "left");
  assert.equal(standSide(steps, 2), "right");
});

test("در حالت‌های عادی هیچ کاشی‌ای نمی‌شکند", () => {
  for (const state of ["intro", "preparing", "showingQuestion", "waitingForAnswer", "jumping", "landing", "correct"] as const) {
    assert.equal(
      breakingTile({ state, failure: null, stepIndex: 1, chosen: "left", steps }),
      null,
      `حالتِ ${state} نباید کاشی‌ای را بشکند`,
    );
  }
});

/* ⚠️ همین تست است که باگ را می‌گرفت.
   پیش از اصلاح، `timeout` جزوِ حالت‌های شکست نبود، `breakingTile` مقدارِ
   `null` می‌داد و آن ۵۲۰ میلی‌ثانیه هیچ هشداری روی صفحه نبود. */
test("پایانِ زمان: کاشیِ زیرِ پا هشدار می‌دهد، پیش از آنکه بشکند", () => {
  const breaking = breakingTile({
    state: "timeout",
    failure: "timeout",
    stepIndex: 2,
    chosen: null,
    steps,
  });
  assert.deepEqual(breaking, { index: 1, side: "right" });
  assert.equal(
    glassStateFor("timeout", breaking, 1, "right"),
    "impact",
    "کاشیِ زیرِ پا باید بلرزد، نه اینکه سالم بماند",
  );
  // بقیهٔ کاشی‌ها دست‌نخورده‌اند
  assert.equal(glassStateFor("timeout", breaking, 1, "left"), "intact");
  assert.equal(glassStateFor("timeout", breaking, 2, "right"), "intact");
});

test("پایانِ زمان روی مرحلهٔ نخست: سکوی آغاز می‌شکند", () => {
  const breaking = breakingTile({
    state: "timeout",
    failure: "timeout",
    stepIndex: 0,
    chosen: null,
    steps,
  });
  assert.deepEqual(breaking, { index: -1, side: null });
  assert.equal(glassStateFor("timeout", breaking, -1, null), "impact");
});

test("پاسخِ غلط: کاشیِ انتخاب‌شده می‌شکند، نه کاشیِ زیرِ پا", () => {
  const breaking = breakingTile({
    state: "cracking",
    failure: "wrong",
    stepIndex: 1,
    chosen: "left",
    steps,
  });
  assert.deepEqual(breaking, { index: 1, side: "left" });
  assert.equal(glassStateFor("cracking", breaking, 1, "left"), "cracking");
  // کاشیِ درست سالم می‌ماند
  assert.equal(glassStateFor("cracking", breaking, 1, "right"), "intact");
});

test("دنبالهٔ شکستن: لرزش → ترک → خردشدن → شکسته", () => {
  const args = { failure: "timeout" as const, stepIndex: 2, chosen: null, steps };
  const expected = [
    ["timeout", "impact"],
    ["cracking", "cracking"],
    ["shattering", "shattering"],
    ["falling", "broken"],
    ["gameOver", "broken"],
  ] as const;

  for (const [state, want] of expected) {
    const breaking = breakingTile({ ...args, state });
    assert.equal(
      glassStateFor(state, breaking, 1, "right"),
      want,
      `در حالتِ ${state} کاشی باید ${want} باشد`,
    );
  }
});

test("بدونِ انتخاب و بدونِ پایانِ زمان، چیزی نمی‌شکند", () => {
  assert.equal(
    breakingTile({ state: "cracking", failure: "wrong", stepIndex: 1, chosen: null, steps }),
    null,
  );
});
