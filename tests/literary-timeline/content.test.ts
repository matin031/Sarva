import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { CARTOON_PORTRAITS, ERAS, ERA_STAGE, EXAM_FACTS, QALAMI, SOURCE, WALKER_LINES, WORKS, PORTRAITS, normalizeSearch, peopleForEra, personByName } from "../../lib/literary-timeline/data";

test("every imported chapter and featured person is reachable in the atlas", () => {
  assert.deepEqual(SOURCE.eras.map(era => era.id), ERAS.map(era => era.id));
  const ids = new Set(ERAS.map(era => era.id));
  assert.equal(new Set(SOURCE.people.map(person => person.id)).size, SOURCE.people.length);
  for (const person of SOURCE.people) {
    assert.ok(person.entries.length > 0, person.name);
    for (const entry of person.entries) {
      assert.ok(ids.has(entry.era as typeof ERAS[number]["id"]), person.name);
      assert.ok(ids.has(entry.sourceEra as typeof ERAS[number]["id"]), person.name);
      assert.ok(entry.works.trim(), person.name);
    }
  }
  for (const era of ERAS) for (const name of era.featured) {
    const person = personByName(name);
    assert.ok(person, name);
    assert.ok(peopleForEra(era.id).some(p => p.id === person.id), `${name}: ${era.id}`);
  }
});

test("source-specific ranges, calendar changes, and absent works remain explicit", () => {
  const iraqi = ERAS.find(e => e.id === "iraqi")!;
  const hindi = ERAS.find(e => e.id === "hindi")!;
  assert.match(iraqi.period, /اوایل هفتم تا اوایل دهم/);
  assert.match(iraqi.rangeNote!, /قرن ششم تا دهم/);
  assert.match(hindi.period, /اوایل یازدهم تا اواسط دوازدهم/);
  assert.match(hindi.rangeNote!, /قرن دهم تا سیزدهم/);
  assert.match(ERAS.find(e => e.id === "bidari")!.calendar, /۱۳۲۴ هجری قمری/);
  assert.match(ERAS.find(e => e.id === "modern")!.calendar, /۱۳۰۰ شمسی/);
  assert.match(personByName("حافظ")!.entries[0].works, /نام برده نشده/);
  assert.ok(personByName("مولوی")!.entries.some(e => e.works.includes("مجالس سبعه")));
  assert.equal(SOURCE.sources.length, 11);
  assert.equal(SOURCE.works.length, 150);
  assert.ok(WORKS.some(([title, author]) => title === "شاهنامه" && author === "فردوسی"));
});

test("Hindi poets retain lesson provenance while appearing in the correct style", () => {
  for (const name of ["صائب تبریزی", "کلیم کاشانی", "بیدل دهلوی"]) {
    const person = personByName(name)!;
    assert.equal(person.entries[0].era, "hindi");
    assert.equal(person.entries[0].sourceEra, "voqu");
  }
});

test("Persian search accepts Arabic letter variants, diacritics and half spaces", () => {
  assert.equal(normalizeSearch("علي‌اكبر"), normalizeSearch("علی‌اکبر"));
  assert.equal(normalizeSearch("حَافِظ"), normalizeSearch("حافظ"));
  assert.equal(normalizeSearch("  شاهنامه  "), "شاهنامه");
});

test("portraits are local, attributed and refer to existing people", () => {
  for (const [id, portrait] of Object.entries(PORTRAITS)) {
    assert.ok(SOURCE.people.some(person => person.id === id), id);
    assert.equal(new URL(portrait.source).protocol, "https:");
    if (portrait.image) {
      assert.ok(portrait.image.startsWith("/literary-timeline/portraits/"));
      assert.ok(existsSync(resolve("public", portrait.image.slice(1))), portrait.image);
    }
    if (portrait.century) assert.match(portrait.century, /قمری|شمسی|میلادی/);
  }
});

test("quizzes are well-formed and exam questions name their session", () => {
  for (const era of ERAS) {
    assert.ok(era.quizzes.length > 0, era.id);
    assert.equal(era.quizzes[0].exam, undefined, `${era.id}: first question is the chapter's own`);
    for (const quiz of era.quizzes) {
      assert.ok(quiz.options.length >= 2, quiz.question);
      assert.equal(new Set(quiz.options).size, quiz.options.length, quiz.question);
      assert.ok(quiz.correct >= 0 && quiz.correct < quiz.options.length, quiz.question);
      if (quiz.exam) assert.match(quiz.exam, /^(خرداد|شهریور|مرداد|دی)/, quiz.question);
    }
  }
});

test("stage lines are spoken by the chapter's featured people or Qalami", () => {
  for (const era of ERAS) {
    const lines = ERA_STAGE[era.id];
    if (!era.featured.length) { assert.equal(lines, undefined, era.id); continue; }
    assert.ok(lines && lines.length >= 3, era.id);
    for (const line of lines) assert.ok(line.who === QALAMI || era.featured.includes(line.who), `${era.id}: ${line.who}`);
    assert.ok(WALKER_LINES[era.id], era.id);
  }
});

test("exam facts and cartoons point at real people and files", () => {
  for (const name of Object.keys(EXAM_FACTS)) assert.ok(personByName(name), name);
  const featured = new Set(ERAS.flatMap(era => era.featured.map(name => personByName(name)!.id)));
  for (const [id, src] of Object.entries(CARTOON_PORTRAITS)) {
    assert.ok(SOURCE.people.some(person => person.id === id), id);
    assert.ok(existsSync(resolve("public", src!.slice(1))), src);
    featured.delete(id);
  }
  assert.deepEqual([...featured], [], "every featured person has a cartoon");
});

test("cartoon rigs match registered cartoons and keep the pivot on the hand box", async () => {
  const { RIGS } = await import("../../lib/literary-timeline/cartoon-rig");
  for (const [id, rig] of Object.entries(RIGS)) {
    assert.ok(CARTOON_PORTRAITS[id], id);
    if (rig.hand) {
      const [x0, y0, x1, y1, px, py] = rig.hand;
      assert.ok(0 <= x0 && x0 < x1 && x1 <= 100 && 0 <= y0 && y0 < y1 && y1 <= 100, id);
      assert.ok(px >= x0 && px <= x1 && py === y1, `${id}: pivot sits on the bottom edge`);
    }
    if (rig.moves.includes("glasses")) assert.ok(rig.eyes, id);
    if (rig.moves.includes("wave")) assert.ok(rig.hand, id);
  }
});

test("every rigged hand has its split layers and a wrist pivot", async () => {
  const { RIGS } = await import("../../lib/literary-timeline/cartoon-rig");
  const { default: pivots } = await import("../../lib/literary-timeline/cartoon-pivots.json", { with: { type: "json" } });
  for (const [id, rig] of Object.entries(RIGS)) {
    assert.ok(CARTOON_PORTRAITS[id], id);
    if (rig.moves.includes("glasses")) assert.ok(rig.eyes, `${id}: glasses need eyes`);
    if (!rig.moves.includes("wave")) continue;
    assert.ok(rig.hand, id);
    assert.ok((pivots as Record<string, number[]>)[id], `${id}: run scripts/timeline/rig-cartoons.mjs`);
    for (const part of ["body", "hand"]) assert.ok(existsSync(resolve(`public/literary-timeline/cartoons/rig/${id}-${part}.webp`)), `${id}-${part}`);
  }
});
