import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { TASHBIH } from "../../lib/learn/tashbih";
import { bare, parseLine, plainLine, targetCount } from "../../lib/learn/line";

type Role = { words: number[]; label: string };
type Unit = { src: string; line: string; roles: Role[]; syntax: Role[]; literary: string[] };
const GRADES: Record<string, string> = { dahom: "دهم", yazdahom: "یازدهم", davazdahom: "دوازدهم" };
const norm = (text: string) => text.normalize("NFC").replace(/[ً-ْ]/g, "").replace(/ۀ/g, "هٔ").trim();

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

/** هر سطرِ تمرینی، با ادعایی که درس دربارهٔ کلمه‌های نشان‌دارش دارد. */
function examples() {
  const out: { where: string; line: string; src?: string; yes: boolean }[] = [];
  for (const [i, beat] of TASHBIH.beats.entries()) {
    if (beat.kind === "tap") out.push({ where: `beat ${i} tap`, line: beat.item.line, src: beat.item.src, yes: true });
    if (beat.kind === "round") beat.items.forEach(item => out.push({ where: `beat ${i} round`, line: item.line, src: item.src, yes: true }));
    if (beat.kind === "pillars") beat.items.forEach(item => out.push({ where: `beat ${i} pillars`, line: item.line, src: item.src, yes: true }));
    if (beat.kind === "judge") beat.items.forEach(item => out.push({ where: `beat ${i} judge`, line: item.line, src: item.src, yes: item.yes }));
  }
  return out;
}

test("every exercise line is a real textbook line, and the marked words are تشبیه exactly where the lesson says", async () => {
  const units = await textbook();
  const list = examples().filter(item => item.src);
  assert.ok(list.length >= 18, `only ${list.length} textbook examples`);
  const failures: string[] = [];
  for (const { where, line, src, yes } of list) { try {
    const plain = plainLine(line);
    const unit = units.find(u => norm(u.line) === norm(plain));
    assert.ok(unit, `${where}: «${plain}» is not a line in lib/doroos`);
    assert.equal(norm(src ?? ""), norm(unit.src), `${where}: source`);

    const tokens = parseLine(line);
    const marked = tokens.flatMap((token, i) => token.target !== undefined || token.focus ? [i] : []);
    assert.ok(marked.length, `${where}: nothing is marked in «${line}»`);
    for (const i of marked) {
      const labels = unit.roles.filter(role => role.words.includes(i)).map(role => role.label).join(" + ");
      const word = bare(tokens[i].text);
      if (!yes) {
        assert.doesNotMatch(labels, /تشبیه/, `${where}: the textbook does call «${word}» part of a تشبیه`);
        // ادعای «اینجا تشبیه نیست» فقط وقتی سنجیدنی است که کتاب دربارهٔ همان
        // کلمه حرفی زده باشد — آرایه‌ای یا دست‌کم نقشی دستوری.
        const known = labels || unit.syntax.filter(role => role.words.includes(i)).map(role => role.label).join(" + ");
        assert.ok(known, `${where}: the textbook says nothing about «${word}», so «not تشبیه» is not checkable`);
        continue;
      }
      const inNote = unit.literary.some(note => /تشبیه/.test(note));
      assert.ok(/تشبیه/.test(labels) || inNote, `${where}: the textbook never calls «${word}» part of a تشبیه`);
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
});

test("every pillars item names one role per bracket, asks for each exactly once, and is answerable", () => {
  for (const beat of TASHBIH.beats) {
    if (beat.kind !== "pillars") continue;
    for (const item of beat.items) {
      const groups = targetCount(item.line);
      assert.equal(item.roles.length, groups, `«${item.line}»: ${groups} groups but ${item.roles.length} roles`);
      const ask = item.ask ?? item.roles.map((_, i) => i);
      assert.deepEqual([...ask].sort((a, b) => a - b), item.roles.map((_, i) => i), `«${item.line}»: ask must cover every role once`);
      // یادداشتِ یک کلمهٔ جواب هیچ‌وقت دیده نمی‌شود و فقط گمراه‌کننده است.
      const answers = new Set(parseLine(item.line).flatMap(t => t.target === undefined ? [] : [bare(t.text)]));
      for (const key of Object.keys(item.notes ?? {})) assert.ok(!answers.has(key), `«${item.line}»: note on «${key}» is on an answer word`);
    }
  }
});

test("the branch for humanities students jumps to a finish that exists", () => {
  const forks = TASHBIH.beats.filter(beat => beat.kind === "fork");
  assert.equal(forks.length, 1, "exactly one fork");
  assert.ok(TASHBIH.beats.some(beat => beat.kind === "finish"), "the fork's «no» needs a finish to land on");
  // بخشِ تخصصی باید *بعد* از دوراهی باشد، وگرنه پرش چیزی را رد نمی‌کند.
  const at = TASHBIH.beats.findIndex(beat => beat.kind === "fork");
  const end = TASHBIH.beats.findIndex(beat => beat.kind === "finish");
  assert.ok(end - at > 5, `only ${end - at - 1} beats behind the fork`);
});

test("each interactive beat is answerable", () => {
  for (const beat of TASHBIH.beats) {
    if (beat.kind === "choice") assert.equal(beat.options.filter(option => option.correct).length, 1, beat.prompt);
    if (beat.kind === "catch") assert.ok(beat.items.some(item => item.ok) && beat.items.some(item => !item.ok), beat.prompt);
    if (beat.kind === "pair") {
      assert.equal(new Set(beat.rows.map(row => row.hidden)).size, beat.rows.length, `${beat.prompt}: two rows share a hidden meaning`);
      assert.equal(new Set(beat.rows.map(row => row.word)).size, beat.rows.length, `${beat.prompt}: a word repeats`);
    }
    if (beat.kind === "judge") for (const item of beat.items)
      assert.ok(parseLine(item.line).some(token => token.focus || token.target !== undefined), `«${item.line}» marks nothing`);
    if (beat.kind === "list") assert.equal(new Set(beat.rows.map(row => row.word)).size, beat.rows.length, "the glossary repeats a word");
    if (beat.kind === "cards") assert.ok(beat.need <= beat.cards.length, `${beat.prompt}: needs more cards than it has`);
  }
});
