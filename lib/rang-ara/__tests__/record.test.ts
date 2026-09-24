import assert from "node:assert/strict";
import test from "node:test";

import { OUTSIDE } from "../content";
import { scoreVersePlay } from "../record";

const level = (id: string) => {
  const found = OUTSIDE.find((l) => l.id === id);
  assert.ok(found, id);
  return found;
};

test("بیتِ بی‌غلط: همهٔ گام‌ها بدونِ اشتباه", () => {
  const out = scoreVersePlay(level("bani-adam"), [
    { concept: "mushabbah", token: "0-0" },
    { concept: "mushabbahBih", token: "0-2" },
  ]);
  assert.deepEqual(out, [
    { step: 0, concept: "mushabbah", mistakes: 0 },
    { step: 1, concept: "mushabbahBih", mistakes: 0 },
  ]);
});

test("رنگِ غلط روی جوابِ گامِ دیگر، به حسابِ آن گام", () => {
  const out = scoreVersePlay(level("bani-adam"), [
    { concept: "mushabbahBih", token: "0-0" }, // «بنی‌آدم» مشبّه است
    { concept: "mushabbah", token: "0-0" },
    { concept: "mushabbahBih", token: "0-1" },
  ]);
  assert.deepEqual(out?.map((s) => s.mistakes), [1, 0]);
});

test("واژهٔ بی‌ربط، به حسابِ گامی که همان رنگ را می‌خواهد", () => {
  const out = scoreVersePlay(level("bani-adam"), [
    { concept: "mushabbah", token: "0-0" },
    { concept: "mushabbahBih", token: "1-0" }, // «که»
    { concept: "mushabbahBih", token: "0-3" },
  ]);
  assert.deepEqual(out?.map((s) => s.mistakes), [0, 1]);
});

test("بیتِ نیمه‌تمام، واژهٔ ناموجود و ضربه روی واژهٔ رنگ‌شده ثبت نمی‌شوند", () => {
  const l = level("bani-adam");
  assert.equal(scoreVersePlay(l, [{ concept: "mushabbah", token: "0-0" }]), null);
  assert.equal(scoreVersePlay(l, [{ concept: "mushabbah", token: "9-9" }]), null);
  assert.equal(scoreVersePlay(l, [{ concept: "nope", token: "0-0" }]), null);
  assert.equal(
    scoreVersePlay(l, [
      { concept: "mushabbah", token: "0-0" },
      { concept: "mushabbahBih", token: "0-0" },
      { concept: "mushabbahBih", token: "0-1" },
    ]),
    null,
  );
});
