import { test } from "node:test";
import assert from "node:assert/strict";

import {
  canUndo,
  clearSlot,
  completedSelection,
  emptyTank,
  filledCount,
  firstEmpty,
  isFull,
  pour,
  reset,
  selectSlot,
  targetSlot,
  undo,
} from "@/lib/kimia/selections";

const A = "فاعلاتن";
const B = "فاعلن";
const C = "فعولن";

test("مخزنِ خالی، طولِ ثابت دارد و هیچ هدفِ صریحی ندارد", () => {
  const tank = emptyTank(4);
  assert.equal(tank.slots.length, 4);
  assert.deepEqual([...tank.slots], [null, null, null, null]);
  assert.equal(tank.activeSlot, null);
  assert.equal(firstEmpty(tank), 0);
  assert.equal(targetSlot(tank), 0);
  assert.equal(isFull(tank), false);
  assert.equal(filledCount(tank), 0);
  assert.equal(completedSelection(tank), null);
});

test("ریختنِ پیاپی، جایگاه‌ها را از چپ پر می‌کند", () => {
  let tank = emptyTank(3);
  for (const foot of [A, B, C]) tank = pour(tank, foot).tank;
  assert.deepEqual([...tank.slots], [A, B, C]);
  assert.ok(isFull(tank));
  assert.deepEqual(completedSelection(tank), [A, B, C]);
});

test("تکرارِ یک ماده بی‌نهایت بار مجاز است", () => {
  let tank = emptyTank(4);
  for (let i = 0; i < 4; i++) tank = pour(tank, C).tank;
  assert.deepEqual(completedSelection(tank), [C, C, C, C]);
});

test("مخزنِ پر بدونِ هدفِ صریح، با کلیکِ ویال دست نمی‌خورد", () => {
  /* ⚠️ اینجا وسوسه‌اش بود که «خب آخرین جایگاه را عوض کن». رد شد: بازیکنی
     که فقط می‌خواست رنگِ یک ماده را دوباره ببیند، پاسخِ کاملش را از دست
     می‌داد. */
  let tank = emptyTank(2);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  assert.ok(isFull(tank));

  const result = pour(tank, C);
  assert.equal(result.mutation, null, "هیچ تغییری نباید ثبت شود");
  assert.deepEqual([...result.tank.slots], [A, B], "محتویات نباید عوض شود");
  assert.equal(result.tank.history.length, 2, "تاریخچه هم نباید رشد کند");
});

test("انتخابِ صریحِ یک جایگاهِ پر، هدفِ جایگزینی می‌شود", () => {
  let tank = emptyTank(3);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  tank = pour(tank, C).tank;

  tank = selectSlot(tank, 1);
  assert.equal(targetSlot(tank), 1);

  const replaced = pour(tank, A);
  assert.deepEqual([...replaced.tank.slots], [A, A, C]);
  assert.deepEqual(replaced.mutation, { slotIndex: 1, previousFoot: B, nextFoot: A });
  assert.equal(replaced.tank.activeSlot, null, "هدف بعد از ریختن پاک می‌شود");
});

test("زدنِ دوبارهٔ همان جایگاه، انتخاب را برمی‌دارد", () => {
  let tank = emptyTank(3);
  tank = selectSlot(tank, 2);
  assert.equal(tank.activeSlot, 2);
  tank = selectSlot(tank, 2);
  assert.equal(tank.activeSlot, null);
  assert.equal(targetSlot(tank), 0, "بدونِ هدفِ صریح، اولین خالی");
});

test("ریختنِ همان ماده در همان جایگاه، یک تغییر نیست", () => {
  let tank = emptyTank(2);
  tank = pour(tank, A).tank;
  tank = selectSlot(tank, 0);

  const again = pour(tank, A);
  assert.equal(again.mutation, null);
  assert.equal(again.tank.history.length, 1, "تاریخچه نباید یک واگردِ بی‌اثر بگیرد");
  assert.equal(again.tank.activeSlot, null, "ولی هدف مصرف می‌شود");
});

test("واگرد، آخرین تغییرِ واقعی را برمی‌گرداند و نه آخرین خانه را", () => {
  /* ⚠️ همان چیزی که یک پشتهٔ ساده نمی‌توانست: بعد از جایگزینیِ جایگاهِ
     دوم، واگرد باید همان جایگاهِ دوم را به مقدارِ قبلی‌اش برگرداند و نه
     جایگاهِ چهارم را خالی کند. */
  let tank = emptyTank(3);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  tank = pour(tank, C).tank;
  tank = selectSlot(tank, 0);
  tank = pour(tank, B).tank;
  assert.deepEqual([...tank.slots], [B, B, C]);

  tank = undo(tank);
  assert.deepEqual([...tank.slots], [A, B, C], "جایگزینی باید برگردد");
  assert.equal(tank.activeSlot, 0, "هدف روی همان جایگاه می‌ماند");
});

test("واگردِ یک افزودن، جایگاه را خالی می‌کند", () => {
  let tank = emptyTank(3);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  tank = undo(tank);
  assert.deepEqual([...tank.slots], [A, null, null]);
  assert.equal(tank.activeSlot, null, "جایگاهِ خالی هدفِ صریح نمی‌شود");
  assert.equal(targetSlot(tank), 1);
});

test("واگرد تا ته و بعد از آن بی‌اثر", () => {
  let tank = emptyTank(2);
  assert.equal(canUndo(tank), false);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  assert.ok(canUndo(tank));
  tank = undo(undo(tank));
  assert.equal(canUndo(tank), false);
  const same = undo(tank);
  assert.deepEqual([...same.slots], [null, null]);
});

test("بازنشانی همه‌چیزِ مخزن را پاک می‌کند ولی طولش را نگه می‌دارد", () => {
  let tank = emptyTank(4);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  tank = selectSlot(tank, 3);
  const cleared = reset(tank);
  assert.deepEqual([...cleared.slots], [null, null, null, null]);
  assert.equal(cleared.activeSlot, null);
  assert.equal(cleared.history.length, 0);
  assert.equal(canUndo(cleared), false);
});

test("انتخابِ جایگاهِ بیرون از محدوده نادیده گرفته می‌شود", () => {
  const tank = emptyTank(3);
  assert.equal(selectSlot(tank, -1).activeSlot, null);
  assert.equal(selectSlot(tank, 3).activeSlot, null);
  assert.equal(selectSlot(tank, 99).activeSlot, null);
});

test("مخزنِ ناقص هیچ‌وقت چیزی برای فرستادن نمی‌دهد", () => {
  let tank = emptyTank(3);
  tank = pour(tank, A).tank;
  tank = pour(tank, B).tank;
  assert.equal(completedSelection(tank), null);
  tank = pour(tank, C).tank;
  assert.deepEqual(completedSelection(tank), [A, B, C]);
});


/* ═══════════════════════════════════════════════════════════════════════
   برداشتن با کلیک روی جایگاهِ پر
   ═══════════════════════════════════════════════════════════════════════ */

const four = () =>
  pour(pour(pour(pour(emptyTank(4), C).tank, A).tank, B).tank, C).tank;

test("برداشتن، جای بقیهٔ ارکان را تکان نمی‌دهد", () => {
  const tank = four();
  assert.deepEqual([...tank.slots], [C, A, B, C]);
  /* ⚠️ همان خانه خالی می‌شود — نه اینکه بقیه یک‌خانه بلغزند. */
  assert.deepEqual([...clearSlot(tank, 1).tank.slots], [C, null, B, C]);
});

test("بعد از برداشتن، همان جایگاه هدفِ ریختنِ بعدی است", () => {
  const { tank } = clearSlot(four(), 1);
  assert.equal(tank.activeSlot, 1);
  assert.deepEqual([...pour(tank, B).tank.slots], [C, B, B, C]);
});

test("واگرد، رکنِ برداشته‌شده را به همان جایگاه برمی‌گرداند", () => {
  const before = four();
  const { tank } = clearSlot(before, 2);
  assert.equal(canUndo(tank), true);
  assert.deepEqual([...undo(tank).slots], [...before.slots]);
});

test("برداشتن از جایگاهِ خالی بی‌اثر است و تاریخچه نمی‌سازد", () => {
  const base = pour(emptyTank(4), C).tank;
  const { tank, mutation } = clearSlot(base, 3);
  assert.equal(mutation, null);
  assert.equal(tank.history.length, base.history.length);
  assert.deepEqual([...tank.slots], [...base.slots]);
});

test("نمایهٔ بیرون از بازه بی‌صدا رد می‌شود", () => {
  const base = four();
  for (const i of [-1, 4, 99]) {
    const { tank, mutation } = clearSlot(base, i);
    assert.equal(mutation, null);
    assert.deepEqual([...tank.slots], [...base.slots]);
  }
});

test("مخزن بعد از برداشتن دیگر کامل نیست", () => {
  assert.equal(completedSelection(four()) !== null, true);
  assert.equal(completedSelection(clearSlot(four(), 0).tank), null);
});

test("برداشتنِ پشتِ‌هم و واگردِ پشتِ‌هم قرینهٔ هم‌اند", () => {
  const before = four();
  let t = clearSlot(before, 0).tank;
  t = clearSlot(t, 3).tank;
  assert.deepEqual([...t.slots], [null, A, B, null]);
  t = undo(t);
  t = undo(t);
  assert.deepEqual([...t.slots], [...before.slots]);
});
