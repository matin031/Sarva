import { test } from "node:test";
import assert from "node:assert/strict";
import { MAFOOL } from "../../lib/learn/mafool";
import { parseLine, plainLine } from "../../lib/learn/line";
import { fromDoroos, labelsAt, norm, textbook } from "./textbook";

/** سطرهای کتاب، با ادعایی که درس دربارهٔ کلمه‌های نشان‌دارشان دارد. */
function examples() {
  const out: { where: string; line: string; src: string; yes?: boolean }[] = [];
  for (const [i, beat] of MAFOOL.beats.entries()) {
    if (beat.kind === "tap" && fromDoroos(beat.item.src)) out.push({ where: `beat ${i}`, line: beat.item.line, src: beat.item.src! });
    if (beat.kind === "round") for (const item of beat.items) if (fromDoroos(item.src)) out.push({ where: `beat ${i}`, line: item.line, src: item.src! });
    if (beat.kind === "judge") for (const item of beat.items) if (fromDoroos(item.src)) out.push({ where: `beat ${i}`, line: item.line, src: item.src!, yes: item.yes });
    if (beat.kind === "choice" && beat.stimulus && fromDoroos(beat.src)) out.push({ where: `beat ${i} stimulus`, line: beat.stimulus, src: beat.src! });
  }
  return out;
}

test("every textbook line is real, and the words the lesson calls مفعول are مفعول in the textbook", async () => {
  const units = await textbook();
  const list = examples();
  assert.ok(list.length >= 12, `only ${list.length} textbook examples`);
  const failures: string[] = [];
  for (const { where, line, src, yes } of list) { try {
    const plain = plainLine(line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    assert.ok(unit, `${where}: «${plain}» is not a line in lib/doroos`);
    assert.equal(norm(src), norm(unit.src), `${where}: source`);
    const tokens = parseLine(line);
    tokens.forEach((token, i) => {
      const labels = labelsAt(unit.syntax, i);
      if (token.target !== undefined) assert.match(labels, /^مفعول/, `${where}: «${token.text}» is not مفعول in the textbook`);
      if (token.focus) {
        assert.ok(labels, `${where}: «${token.text}» has no role in the textbook`);
        if (yes) assert.match(labels, /^مفعول/, `${where}: «${token.text}» should be مفعول`);
        else assert.doesNotMatch(labels, /مفعول/, `${where}: «${token.text}» is مفعول in the textbook`);
      }
    });
    // هر مفعولی که کتاب در یک سطرِ تپ‌کردنی می‌بیند باید جواب باشد، وگرنه تپِ درست غلط حساب می‌شود.
    if (yes === undefined && tokens.some(t => t.target !== undefined)) for (const role of unit.syntax) if (/^مفعول/.test(role.label))
      assert.ok(role.words.some(i => tokens[i]?.target !== undefined), `${where}: textbook مفعول «${role.words.map(i => tokens[i]?.text).join(" ")}» is not an answer`);
  } catch (error) { failures.push((error as Error).message.split(/\r?\n/)[0]); } }
  assert.deepEqual(failures, []);
});
