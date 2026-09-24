import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { IHAM } from "../../lib/learn/iham";
import { bare, parseLine, plainLine } from "../../lib/learn/line";

type Role = { words: number[]; label: string };
type Unit = { src: string; line: string; roles: Role[]; syntax: Role[]; literary: string[] };
const GRADES: Record<string, string> = { dahom: "دهم", yazdahom: "یازدهم", davazdahom: "دوازدهم" };
const norm = (text: string) => text.normalize("NFC").replace(/[ً-ْ]/g, "").replace(/ۀ/g, "هٔ").trim();

/** هر سطرِ کتاب با آرایه‌هایی که خودِ درس به کلمه‌هایش چسبانده، و یادداشت‌های
 *  ادبیِ همان بند — چون کتاب بعضی ایهام‌ها را فقط در یادداشت آورده و به کلمه
 *  نچسبانده (مثلاً «طاس» در طوطی و بقال). */
async function textbook(): Promise<Unit[]> {
  const units: Unit[] = [];
  const dir = resolve("lib/doroos/content");
  for (const file of readdirSync(dir)) {
    const mod = await import(pathToFileURL(resolve(dir, file)).href);
    const lesson = mod.default ?? Object.values(mod).find((v: unknown) => (v as { kind?: string })?.kind);
    if (!lesson) continue;
    type Marks = (Role & { h: number })[];
    type Part = { lines: string[]; devices?: Marks; syntax?: Marks; literary?: string[] };
    const parts: Part[] = lesson.kind === "poem"
      ? lesson.beyts.map((b: { hemistichs: string[] } & Part) => ({ lines: b.hemistichs, devices: b.devices, syntax: b.syntax, literary: b.literary }))
      : lesson.passages;
    for (const part of parts) part.lines.forEach((line: string, h: number) => units.push({
      src: `${GRADES[lesson.grade]} · ${lesson.title}`, line,
      roles: (part.devices ?? []).filter(role => role.h === h),
      syntax: (part.syntax ?? []).filter(role => role.h === h),
      literary: part.literary ?? [],
    }));
  }
  return units;
}

/** هر سطرِ تمرینی، با ادعایی که درس دربارهٔ کلمهٔ نشان‌دارش دارد.
 *  `yes: false` یعنی درس گفته «اینجا ایهام نیست». */
function examples() {
  const out: { where: string; line: string; src?: string; yes: boolean }[] = [];
  for (const [i, beat] of IHAM.beats.entries()) {
    if (beat.kind === "duo") out.push({ where: `beat ${i} duo`, line: beat.line, src: beat.src, yes: true });
    if (beat.kind === "tap") out.push({ where: `beat ${i} tap`, line: beat.item.line, src: beat.item.src, yes: true });
    if (beat.kind === "round") beat.items.forEach(item => out.push({ where: `beat ${i} round`, line: item.line, src: item.src, yes: true }));
    if (beat.kind === "masks") beat.items.forEach(item => out.push({ where: `beat ${i} masks`, line: item.line, src: item.src, yes: true }));
    if (beat.kind === "judge") beat.items.forEach(item => out.push({ where: `beat ${i} judge`, line: item.line, src: item.src, yes: item.yes }));
  }
  return out;
}

test("every exercise line is a real textbook line, and the marked word is ایهام exactly where the lesson says", async () => {
  const units = await textbook();
  const list = examples().filter(item => item.src);
  assert.ok(list.length >= 20, `only ${list.length} textbook examples`);
  const failures: string[] = [];
  for (const { where, line, src, yes } of list) { try {
    const plain = plainLine(line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    assert.ok(unit, `${where}: «${plain}» is not a line in lib/doroos`);
    assert.equal(norm(src ?? ""), norm(unit.src), `${where}: source`);

    const tokens = parseLine(line);
    const marked = tokens.flatMap((token, i) => token.target !== undefined || token.focus ? [i] : []);
    assert.equal(marked.length > 0, true, `${where}: nothing is marked in «${line}»`);
    for (const i of marked) {
      const labels = unit.roles.filter(role => role.words.includes(i)).map(role => role.label).join(" + ");
      const word = bare(tokens[i].text);
      if (!yes) {
        assert.doesNotMatch(labels, /ایهام/, `${where}: the textbook does call «${word}» ایهام`);
        // «اینجا ایهام نیست» فقط وقتی ادعایِ سنجیدنی‌ای است که کتاب دربارهٔ همان کلمه
        // حرفی زده باشد — آرایه‌ای یا دست‌کم نقشی دستوری.
        const known = labels || unit.syntax.filter(role => role.words.includes(i)).map(role => role.label).join(" + ");
        assert.ok(known, `${where}: the textbook says nothing about «${word}», so «not ایهام» is not checkable`);
        continue;
      }
      // یا آرایه روی خودِ کلمه نشسته، یا کتاب در یادداشت‌های همان بند
      // دربارهٔ ایهام حرف زده — بیشتر از این را دادهٔ lib/doroos نمی‌دهد.
      const inNote = unit.literary.some(note => /ایهام/.test(note));
      assert.ok(/ایهام/.test(labels) || inNote, `${where}: the textbook never calls anything in this line ایهام`);
    }
  } catch (error) { failures.push((error as Error).message.split(/\r?\n/)[0]); } }
  assert.deepEqual(failures, []);
});

test("no verse is drilled twice, and the examples span all three grades", () => {
  const lines = examples().filter(item => item.src);
  const seen = new Map<string, string>();
  for (const { where, line } of lines) {
    const plain = plainLine(line);
    const first = seen.get(plain);
    assert.equal(first, undefined, `«${plain}» is used twice: ${first} and ${where}`);
    seen.set(plain, where);
  }
  const grades = new Set(lines.map(item => item.src!.split(" · ")[0]));
  assert.deepEqual([...grades].sort(), ["دهم", "دوازدهم", "یازدهم"].sort());
  // کتاب ۲۲ درسِ ایهام‌دار دارد؛ اگر درس فقط چند تایش را بیاورد، تکراری به نظر می‌رسد.
  const lessons = new Set(lines.map(item => item.src));
  assert.ok(lessons.size >= 15, `only ${lessons.size} distinct textbook lessons`);
});

test("each interactive beat is answerable: one right choice, two real masks, no duplicate pairs", () => {
  for (const beat of IHAM.beats) {
    if (beat.kind === "choice") assert.equal(beat.options.filter(option => option.correct).length, 1, beat.prompt);
    if (beat.kind === "catch") assert.ok(beat.items.some(item => item.ok) && beat.items.some(item => !item.ok), beat.prompt);
    if (beat.kind === "masks") for (const item of beat.items) {
      assert.equal(parseLine(item.line).filter(token => token.focus).length, 1, `«${item.line}» must mark exactly one word with |…|`);
      assert.equal(new Set([...item.meanings, ...item.decoys]).size, item.meanings.length + item.decoys.length, `«${item.line}»: a decoy repeats a meaning`);
    }
    if (beat.kind === "pair") {
      assert.equal(new Set(beat.rows.map(row => row.hidden)).size, beat.rows.length, `${beat.prompt}: two rows share a hidden meaning, so the game has no single answer`);
      assert.equal(new Set(beat.rows.map(row => row.word)).size, beat.rows.length, `${beat.prompt}: a word repeats`);
    }
    if (beat.kind === "judge") for (const item of beat.items)
      assert.equal(parseLine(item.line).filter(token => token.focus).length, 1, `«${item.line}» must mark exactly one word with |…|`);
    if (beat.kind === "list") assert.equal(new Set(beat.rows.map(row => row.word)).size, beat.rows.length, "the glossary repeats a word");
  }
});

test("the lesson greets the reader by name, so its page must require a login", () => {
  const texts = JSON.stringify(IHAM);
  assert.match(texts, /%نام%/, "the lesson no longer uses %نام%");
  assert.equal(IHAM.needsName, true);
});
