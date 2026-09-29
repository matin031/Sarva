import { test } from "node:test";
import assert from "node:assert/strict";
import { ESTEARE } from "../../lib/learn/esteare";
import { HOSN_TALIL } from "../../lib/learn/hosnTalil";
import { PARADOX } from "../../lib/learn/paradox";
import { checkDevices } from "./textbook";

/** درس‌های آرایه‌ای: هر سطرِ کتاب واقعی است و برچسبی که درس به کلمه‌اش
 *  می‌زند با آرایه‌های همان درس در lib/doroos یکی است. */

const explicit = (labels: string) => /استعاره/.test(labels) && !/مکنیه|تشخیص/.test(labels);
const hidden = (labels: string) => /مکنیه|تشخیص/.test(labels);

test("استعاره: every textbook claim matches the textbook", async () => {
  const { failures, count } = await checkDevices(ESTEARE.beats, /استعاره|تشخیص/, {
    "استعارهٔ آشکار": explicit,
    "آشکار (مصرّحه)": explicit,
    "پنهان / تشخیص": hidden,
    "اضافهٔ تشبیهی": labels => /اضاف.{1,2}\s*تشبیهی/.test(labels),
    "اضافهٔ استعاری": labels => /اضاف.{1,2}\s*استعاری|مکنیه/.test(labels),
    // کتاب هیچ اضافهٔ اقترانی‌ای را برچسب نزده؛ این سبد فقط مثال‌های ساختهٔ درس را می‌گیرد.
    "اضافهٔ اقترانی": () => false,
  });
  assert.ok(count >= 25, `only ${count} textbook claims`);
  assert.deepEqual(failures, []);
});

test("حسن تعلیل: every textbook claim matches the textbook", async () => {
  const { failures, count } = await checkDevices(HOSN_TALIL.beats, /حسن تعلیل/);
  assert.ok(count >= 4, `only ${count} textbook claims`);
  assert.deepEqual(failures, []);
});

test("متناقض‌نما: every textbook claim matches the textbook", async () => {
  const { failures, count } = await checkDevices(PARADOX.beats, /تناقض|متناقض/, {
    "متناقض‌نما": labels => /تناقض|متناقض/.test(labels),
    "فقط تضاد": labels => /تضاد/.test(labels) && !/تناقض|متناقض/.test(labels),
  });
  assert.ok(count >= 4, `only ${count} textbook claims`);
  assert.deepEqual(failures, []);
});

for (const lesson of [ESTEARE, HOSN_TALIL, PARADOX]) test(`${lesson.slug}: the humanities section sits behind a fork that lands on the finish`, () => {
  const at = lesson.beats.findIndex(beat => beat.kind === "fork");
  const end = lesson.beats.findIndex(beat => beat.kind === "finish");
  assert.ok(at > 0 && end - at > 5, "the fork must hide a real humanities section");
  assert.equal(end, lesson.beats.length - 1);
});
