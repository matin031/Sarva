import { test } from "node:test";
import assert from "node:assert/strict";
import { MAJAZ } from "../../lib/learn/majaz";
import { parseLine, plainLine } from "../../lib/learn/line";
import { fromDoroos, labelsAt, norm, textbook } from "./textbook";

/** سطرهای کتاب، با ادعایی که درس دربارهٔ کلمه‌های نشان‌دارشان دارد:
 *  `yes` یعنی «این کلمه مجاز است». */
function examples() {
  const out: { where: string; line: string; src: string; yes: boolean }[] = [];
  for (const [i, beat] of MAJAZ.beats.entries()) {
    if (beat.kind === "round") for (const item of beat.items) if (fromDoroos(item.src)) out.push({ where: `beat ${i} round`, line: item.line, src: item.src!, yes: true });
    if (beat.kind === "judge") for (const item of beat.items) if (fromDoroos(item.src)) out.push({ where: `beat ${i} judge`, line: item.line, src: item.src!, yes: item.yes });
    if (beat.kind === "morph" && fromDoroos(beat.src)) out.push({ where: `beat ${i} morph`, line: beat.line, src: beat.src!, yes: true });
    // هر سبدِ «علاقه» ادعا می‌کند کلمه مجاز است؛ خودِ اسمِ علاقه در lib/doroos نیست.
    if (beat.kind === "sort") for (const item of beat.items) if (fromDoroos(item.src)) out.push({ where: `beat ${i} sort`, line: item.line, src: item.src!, yes: true });
  }
  return out;
}

test("every textbook line is real, and the lesson calls a word مجاز exactly where the textbook does", async () => {
  const units = await textbook();
  const list = examples();
  assert.ok(list.length >= 15, `only ${list.length} textbook examples`);
  const failures: string[] = [];
  for (const { where, line, src, yes } of list) { try {
    const plain = plainLine(line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    assert.ok(unit, `${where}: «${plain}» is not a line in lib/doroos`);
    assert.equal(norm(src), norm(unit.src), `${where}: source`);
    const tokens = parseLine(line);
    const marked = tokens.flatMap((token, i) => token.target !== undefined || token.focus ? [i] : []);
    assert.ok(marked.length, `${where}: nothing is marked`);
    for (const i of marked) {
      const devices = labelsAt(unit.devices, i);
      if (yes) { assert.match(devices, /مجاز/, `${where}: the textbook never calls «${tokens[i].text}» مجاز`); continue; }
      assert.doesNotMatch(devices, /مجاز/, `${where}: the textbook does call «${tokens[i].text}» مجاز`);
      assert.ok(devices || labelsAt(unit.syntax, i), `${where}: the textbook says nothing about «${tokens[i].text}»`);
    }
    // در سطرِ تپ‌کردنی، هر مجازی که کتاب می‌بیند باید جواب باشد.
    if (where.endsWith("round")) for (const role of unit.devices) if (/مجاز/.test(role.label))
      assert.ok(role.words.some(i => tokens[i]?.target !== undefined), `${where}: textbook مجاز «${role.words.map(i => tokens[i]?.text).join(" ")}» is not an answer`);
  } catch (error) { failures.push((error as Error).message.split(/\r?\n/)[0]); } }
  assert.deepEqual(failures, []);
});

test("the humanities branch sits behind a fork that lands on a finish", () => {
  const at = MAJAZ.beats.findIndex(beat => beat.kind === "fork");
  const end = MAJAZ.beats.findIndex(beat => beat.kind === "finish");
  assert.ok(at > 0 && end - at > 5, "the fork must hide a real humanities section");
  assert.equal(end, MAJAZ.beats.length - 1, "the finish must be the last beat");
});
