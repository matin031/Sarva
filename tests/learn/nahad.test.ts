import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { NAHAD } from "../../lib/learn/nahad";
import { bare, parseLine, plainLine } from "../../lib/learn/line";

type Role = { words: number[]; label: string };
type Unit = { src: string; line: string; roles: Role[] };
const GRADES: Record<string, string> = { dahom: "دهم", yazdahom: "یازدهم", davazdahom: "دوازدهم" };
const norm = (text: string) => text.normalize("NFC").replace(/[ً-ْ]/g, "").replace(/ۀ/g, "هٔ").trim();

async function textbook(): Promise<Unit[]> {
  const units: Unit[] = [];
  const dir = resolve("lib/doroos/content");
  for (const file of readdirSync(dir)) {
    const mod = await import(pathToFileURL(resolve(dir, file)).href);
    const lesson = mod.default ?? Object.values(mod).find((v: unknown) => (v as { kind?: string })?.kind);
    if (!lesson) continue;
    type Part = { lines: string[]; syntax?: (Role & { h: number })[] };
    const parts: Part[] = lesson.kind === "poem" ? lesson.beyts.map((b: { hemistichs: string[] } & Part) => ({ lines: b.hemistichs, syntax: b.syntax })) : lesson.passages;
    for (const part of parts) part.lines.forEach((line: string, h: number) => units.push({
      src: `${GRADES[lesson.grade]} · ${lesson.title}`, line,
      roles: (part.syntax ?? []).filter(role => role.h === h),
    }));
  }
  return units;
}

/** سطرهای کتاب، با ادعایی که درس دربارهٔ کلمه‌های نشان‌دارشان دارد. */
function examples() {
  const out: { where: string; line: string; src: string; yes?: boolean }[] = [];
  for (const [i, beat] of NAHAD.beats.entries()) {
    if (beat.kind === "tap" && beat.item.src) out.push({ where: `beat ${i}`, line: beat.item.line, src: beat.item.src });
    if (beat.kind === "round") for (const item of beat.items) if (item.src) out.push({ where: `beat ${i}`, line: item.line, src: item.src });
    if (beat.kind === "judge") for (const item of beat.items) if (item.src) out.push({ where: `beat ${i}`, line: item.line, src: item.src, yes: item.yes });
    if (beat.kind === "choice" && beat.src && beat.stimulus) out.push({ where: `beat ${i} stimulus`, line: beat.stimulus, src: beat.src });
  }
  return out;
}

test("every textbook line is real, and the words the lesson calls نهاد are نهاد in the textbook", async () => {
  const units = await textbook();
  const list = examples();
  assert.ok(list.length >= 10, `only ${list.length} textbook examples`);
  const failures: string[] = [];
  for (const { where, line, src, yes } of list) { try {
    const plain = plainLine(line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    assert.ok(unit, `${where}: «${plain}» is not a line in lib/doroos`);
    assert.equal(norm(src), norm(unit.src), `${where}: source`);
    const tokens = parseLine(line);
    const labels = (i: number) => unit.roles.filter(r => r.words.includes(i)).map(r => r.label).join(" + ");
    tokens.forEach((token, i) => {
      if (token.target !== undefined) assert.match(labels(i), /^نهاد/, `${where}: «${token.text}» is not نهاد in the textbook`);
      if (token.focus) {
        assert.ok(labels(i), `${where}: «${token.text}» has no role in the textbook`);
        if (yes) assert.match(labels(i), /^نهاد/, `${where}: «${token.text}» should be نهاد`);
        else assert.doesNotMatch(labels(i), /نهاد/, `${where}: «${token.text}» is نهاد in the textbook`);
      }
    });
    // هر نهادی که کتاب در یک سطرِ تپ‌کردنی می‌بیند باید جواب باشد، وگرنه تپِ درست غلط حساب می‌شود.
    if (yes === undefined && tokens.some(t => t.target !== undefined)) for (const role of unit.roles) if (/^نهاد$/.test(role.label))
      assert.ok(role.words.some(i => tokens[i]?.target !== undefined), `${where}: textbook نهاد «${role.words.map(i => tokens[i]?.text).join(" ")}» is not an answer`);
  } catch (error) { failures.push((error as Error).message.split(/\r?\n/)[0]); } }
  assert.deepEqual(failures, []);
});

test("each interactive beat is answerable, and no note sits on an answer word", () => {
  for (const beat of NAHAD.beats) {
    if (beat.kind === "choice") assert.equal(beat.options.filter(option => option.correct).length, 1, beat.prompt);
    if (beat.kind === "catch") assert.ok(beat.items.some(item => item.ok) && beat.items.some(item => !item.ok), beat.prompt);
    if (beat.kind === "judge") for (const item of beat.items)
      assert.equal(parseLine(item.line).filter(token => token.focus).length, 1, `«${item.line}» must mark exactly one word with |…|`);
    if (beat.kind === "cards") {
      assert.ok(beat.need <= beat.cards.length, `${beat.prompt}: needs more cards than it has`);
      for (const card of beat.cards) if (card.example) assert.ok(parseLine(card.example).some(t => t.target !== undefined), `card «${card.front}» marks nothing`);
    }
    const items = beat.kind === "tap" ? [beat.item] : beat.kind === "round" ? beat.items : [];
    for (const item of items) {
      const answers = new Set(parseLine(item.line).flatMap(t => t.target === undefined ? [] : [bare(t.text)]));
      assert.ok(answers.size, `«${item.line}» has no answer`);
      for (const key of Object.keys(item.notes ?? {})) assert.ok(!answers.has(key), `«${item.line}»: note on «${key}» is on an answer word`);
    }
  }
});

test("the lesson greets the reader by name, so its page must require a login", () => {
  assert.match(JSON.stringify(NAHAD), /%نام%/, "the lesson no longer uses %نام%");
  assert.equal(NAHAD.needsName, true);
  // عنوانِ فصل از `Rich` رد نمی‌شود، پس `%نام%` آنجا خام نمایش داده می‌شد.
  for (const beat of NAHAD.beats) if (beat.kind === "chapter") assert.doesNotMatch(beat.title, /%نام%/, beat.title);
});
