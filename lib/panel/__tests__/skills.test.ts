import assert from "node:assert/strict";
import test from "node:test";

import { masteryOf, toSkillTiles } from "../skills";

test("سطحِ تسلط: زیرِ کمینهٔ شواهد قضاوتی نیست", () => {
  assert.equal(masteryOf(3, 3), "none");
  assert.equal(masteryOf(4, 1), "weak");
  assert.equal(masteryOf(4, 2), "learning");
  assert.equal(masteryOf(10, 8), "good");
  assert.equal(masteryOf(10, 9), "mastered");
});

test("کاشی‌ها: ضعیف اول، تمرین‌نشده آخر، پاسخ‌های اخیر به ترتیبِ زمان", () => {
  const at = (d: number) => new Date(Date.UTC(2026, 0, d)).toISOString();
  const tiles = toSkillTiles(
    [
      { key: "a", label: "الف", correct: true, source: "x", at: at(3) },
      { key: "a", label: "الف", correct: false, source: "y", at: at(1) },
      { key: "a", label: "الف", correct: true, source: "x", at: at(2) },
      { key: "a", label: "الف", correct: true, source: "x", at: at(4) },
      ...[1, 2, 3, 4].map((d) => ({ key: "b", label: "ب", correct: d === 4, at: at(d) })),
    ],
    [{ key: "c", label: "ج" }],
  );
  assert.deepEqual(tiles.map((t) => t.key), ["b", "a", "c"]);
  assert.deepEqual(tiles[1].recent, [false, true, true, true]);
  assert.deepEqual(tiles[1].sources, [
    { source: "x", total: 3, correct: 3 },
    { source: "y", total: 1, correct: 0 },
  ]);
  assert.equal(tiles[2].total, 0);
});
