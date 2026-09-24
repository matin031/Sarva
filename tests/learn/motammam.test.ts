import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { MOTAMMAM } from "../../lib/learn/motammam";
import { parseLine, plainLine } from "../../lib/learn/line";
import type { Example } from "../../lib/learn/types";

type Unit = { src: string; line: string; roles: { words: number[]; label: string }[] };
const GRADES: Record<string, string> = { dahom: "دهم", yazdahom: "یازدهم", davazdahom: "دوازدهم" };
const norm = (text: string) => text.normalize("NFC").replace(/[ً-ْ]/g, "").replace(/ۀ/g, "هٔ").trim();

async function textbook(): Promise<Unit[]> {
  const units: Unit[] = [];
  const dir = resolve("lib/doroos/content");
  for (const file of readdirSync(dir)) {
    const mod = await import(pathToFileURL(resolve(dir, file)).href);
    const lesson = mod.default ?? Object.values(mod).find((v: unknown) => (v as { kind?: string })?.kind);
    if (!lesson) continue;
    const parts = lesson.kind === "poem" ? lesson.beyts.map((b: { hemistichs: string[]; syntax?: Unit["roles"] & { h: number }[] }) => ({ lines: b.hemistichs, syntax: b.syntax })) : lesson.passages;
    for (const part of parts) part.lines.forEach((line: string, h: number) => units.push({
      src: `${GRADES[lesson.grade]} · ${lesson.title}`, line,
      roles: (part.syntax ?? []).filter((r: { h: number }) => r.h === h),
    }));
  }
  return units;
}

/** Every exercise line, with what the lesson claims about it. */
function examples() {
  const out: { where: string; ex: Example; yes?: boolean }[] = [];
  for (const [i, beat] of MOTAMMAM.beats.entries()) {
    if (beat.kind === "tap") out.push({ where: `beat ${i}`, ex: beat.item });
    if (beat.kind === "round" || beat.kind === "fill") beat.items.forEach(ex => out.push({ where: `beat ${i}`, ex }));
    if (beat.kind === "judge") beat.items.forEach(ex => out.push({ where: `beat ${i}`, ex, yes: ex.yes }));
    // کارت‌هایی که پشتشان دو معنی است و نه سطرِ کتاب، چیزی برای سنجیدن با lib/doroos ندارند.
    if (beat.kind === "cards") beat.cards.forEach(card => { if (card.example) out.push({ where: `beat ${i} card ${card.front}`, ex: { line: card.example, src: card.src } }); });
  }
  return out;
}

test("every exercise line is a real textbook line, and its answers match the textbook's own analysis", async () => {
  const units = await textbook();
  const list = examples();
  assert.ok(list.length >= 40, `only ${list.length} examples`);
  const failures: string[] = [];
  for (const { where, ex, yes } of list) { try {
    const plain = plainLine(ex.line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    assert.ok(unit, `${where}: «${plain}» is not a line in lib/doroos`);
    assert.equal(norm(ex.src ?? ""), norm(unit.src), `${where}: source`);
    const labels = (i: number) => unit.roles.filter(r => r.words.includes(i)).map(r => r.label).join(" + ");
    parseLine(ex.line).forEach((token, i) => {
      if (token.target !== undefined) assert.match(labels(i), /متمم/, `${where}: «${token.text}» is not متمم in the textbook`);
      if (token.prep) assert.match(labels(i), /حرف اضافه/, `${where}: «${token.text}» is not حرف اضافه in the textbook`);
      if (token.focus) {
        assert.ok(labels(i), `${where}: «${token.text}» has no role in the textbook`);
        if (yes) assert.match(labels(i), /^متمم/, `${where}: «${token.text}» should be متمم`);
        else assert.doesNotMatch(labels(i), /متمم/, `${where}: «${token.text}» is متمم in the textbook`);
      }
    });
    // Nothing the textbook calls متمم may be left unmarked, or a right tap would count as wrong.
    const tokens = parseLine(ex.line);
    for (const role of unit.roles) if (/^متمم$/.test(role.label) && yes === undefined)
      assert.ok(role.words.some(i => tokens[i].target !== undefined), `${where}: textbook متمم «${role.words.map(i => tokens[i].text).join(" ")}» is not an answer`);
  } catch (error) { failures.push((error as Error).message.split(/\r?\n/)[0]); } }
  assert.deepEqual(failures, []);
});

test("each answer follows its preposition, and fill options include the answer once", () => {
  for (const beat of MOTAMMAM.beats) {
    const items = beat.kind === "round" || beat.kind === "fill" ? beat.items : beat.kind === "tap" ? [beat.item] : [];
    for (const ex of items) {
      const tokens = parseLine(ex.line);
      tokens.forEach((token, i) => {
        if (token.target === undefined || tokens[i - 1]?.target === token.target) return;
        const before = tokens[i - 1], twoBefore = tokens[i - 2];
        assert.ok(before?.prep || (twoBefore?.prep && ex.notes?.[before.text]), `«${ex.line}»: no preposition before «${token.text}»`);
      });
    }
    if (beat.kind === "fill") for (const item of beat.items) {
      const answer = parseLine(item.line).find(t => t.prep)!.text;
      assert.equal(item.options.filter(o => o === answer).length, 1, item.line);
    }
    if (beat.kind === "choice") assert.equal(beat.options.filter(o => o.correct).length, 1, beat.prompt);
  }
});
