import { test } from "node:test";
import assert from "node:assert/strict";
import { levelOf } from "@/lib/panel/derive";

test("سطح از تعدادِ پاسخ‌ها", () => {
  assert.deepEqual(levelOf(0), { level: 1, name: "دانه", nextName: "جوانه", toNext: 30, progress: 0 });
  assert.equal(levelOf(29).level, 1);
  assert.equal(levelOf(30).level, 2);
  assert.equal(levelOf(65).progress, 0.5);
  const top = levelOf(99_999);
  assert.deepEqual([top.name, top.nextName, top.toNext, top.progress], ["سرو کهن", null, 0, 1]);
});
