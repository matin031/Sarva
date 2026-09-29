import { test } from "node:test";
import assert from "node:assert/strict";
import { MOZAF_ELAYH } from "../../lib/learn/mozafElayh";
import { SEFAT } from "../../lib/learn/sefat";
import type { Beat, Lesson } from "../../lib/learn/types";
import { checkDevices } from "./textbook";

/** درس‌های گروهِ اسمی (مضاف‌الیه و صفت): هر سطرِ کتاب واقعی است و نقشی که
 *  درس به کلمه‌اش می‌دهد با تحلیلِ دستوریِ (`syntax`) همان درس در lib/doroos
 *  یکی است. */

const isJudge = (beat: Beat) => beat.kind === "judge";
/** «وابستهٔ وابسته» در `judge`ِ هر دو درس. */
const nested = /وابستهٔ وابسته|صفتِ مضاف‌الیه/;
const roles = {
  "هسته": () => true,
  "مضاف‌الیه": (labels: string) => /(^|\+ )مضاف‌الیه/.test(labels),
  "صفتِ مضاف‌الیه": (labels: string) => /صفت/.test(labels),
  "صفتِ مضاف‌الیه (پیشین)": (labels: string) => /صفت/.test(labels),
  "صفتِ مضاف‌الیه (پسین)": (labels: string) => /صفت/.test(labels),
};

async function check(lesson: Lesson, target: RegExp, min: number) {
  const rest = await checkDevices(lesson.beats.filter(beat => !isJudge(beat)), target, {}, { layer: "syntax", roles });
  const judged = await checkDevices(lesson.beats.filter(isJudge), nested, {}, { layer: "syntax" });
  assert.ok(rest.count + judged.count >= min, `only ${rest.count + judged.count} textbook claims`);
  assert.deepEqual([...rest.failures, ...judged.failures], []);
}

test("مضاف‌الیه: every textbook claim matches the textbook", () => check(MOZAF_ELAYH, /مضاف‌الیه/, 10));
test("صفت: every textbook claim matches the textbook", () => check(SEFAT, /صفت/, 10));

/** «وابسته‌های وابسته» مالِ فارسیِ دوازدهم است؛ پیش از دوراهیِ پایه نباید
 *  درس داده شود. فقط حرفِ درست پیش از دوراهی، که دوازدهم را معرفی می‌کند،
 *  اسمش را می‌آورد. */
const twelfth = /وابستهٔ وابسته|وابسته‌های وابسته|صفتِ مضاف‌الیه|مضاف‌الیهِ مضاف‌الیه|صفتِ صفت|قیدِ صفت|ممیّز|ممیز/;
for (const lesson of [MOZAF_ELAYH, SEFAT]) test(`${lesson.title}: grade-12 topics wait for the fork`, () => {
  const fork = lesson.beats.findIndex(beat => beat.kind === "fork");
  assert.ok(fork > 0, "no fork");
  assert.match((lesson.beats[fork] as { text: string }).text, /دوازدهم/);
  const intro = lesson.beats[fork - 1];
  assert.ok(intro.kind === "say" && /دوازدهم/.test(intro.text), "the fork must be introduced as a grade-12 question");
  lesson.beats.slice(0, fork - 1).forEach((beat, i) =>
    assert.doesNotMatch(JSON.stringify(beat), twelfth, `beat ${i} ${beat.kind} teaches a grade-12 topic before the fork`));
});
