import test from "node:test";
import assert from "node:assert/strict";
import { revealProgressAfterUnit, revealSource } from "../../lib/aruz-rapid/reveal";
import type { RapidAruzUnit } from "../../lib/aruz-rapid/types";

const withData: RapidAruzUnit[] = [
  { id: "1", display: "با", length: "long", revealProgress: 0.2222 },
  { id: "2", display: "دِ", length: "short", revealProgress: 0.5556 },
  { id: "3", display: "صَ", length: "short", revealProgress: 0.7778 },
  { id: "4", display: "با", length: "long", revealProgress: 1 },
];

const withoutData: RapidAruzUnit[] = withData.map(({ id, display, length }) => ({
  id,
  display,
  length,
}));

test("وقتی داده revealProgress دارد، همان مرجع است", () => {
  assert.equal(revealSource(withData), "data");
  assert.equal(revealProgressAfterUnit(withData, 0), 0.2222);
  assert.equal(revealProgressAfterUnit(withData, 3), 1);
});

test("بدونِ داده، تقریبِ بصریِ (شماره+۱)/تعداد", () => {
  assert.equal(revealSource(withoutData), "fallback");
  assert.equal(revealProgressAfterUnit(withoutData, 0), 0.25);
  assert.equal(revealProgressAfterUnit(withoutData, 3), 1);
});

test("داده‌های نصفه‌نیمه به تقریبِ بصری برمی‌گردند", () => {
  const mixed = [withData[0], withoutData[1], withData[2], withData[3]];
  assert.equal(revealSource(mixed), "fallback");
  assert.equal(revealProgressAfterUnit(mixed, 1), 0.5);
});

test("شمارهٔ بیرون از بازه، خارج از ۰..۱ نمی‌رود", () => {
  assert.equal(revealProgressAfterUnit(withData, -5), 0.2222);
  assert.equal(revealProgressAfterUnit(withData, 99), 1);
  assert.equal(revealProgressAfterUnit([], 0), 0);
});

test("آشکارسازی در یک دور فقط جلو می‌رود", () => {
  let previous = 0;
  for (let i = 0; i < withData.length; i++) {
    const value = revealProgressAfterUnit(withData, i);
    assert.ok(value >= previous, `از ${previous} به ${value} عقب رفت`);
    previous = value;
  }
  assert.equal(previous, 1);
});
