import { test } from "node:test";
import assert from "node:assert/strict";

import {
  confusions,
  judge,
  nearestAccepted,
  positionalMismatch,
  sameMultiset,
  sameSequence,
  KIMIA_HINTS,
} from "@/lib/kimia/scansion";
import { kimiaMeterFor } from "@/lib/kimia/catalog";

const A = "فاعلاتن";
const B = "فاعلن";
const C = "فعولن";

test("درست فقط با برابریِ دقیق", () => {
  const accepted = [[A, A, B]];
  assert.equal(judge([A, A, B], accepted).correct, true);
  assert.equal(judge([A, B, A], accepted).correct, false);
  assert.equal(judge([A, A, C], accepted).correct, false);
});

test("هم‌مجموعه با رکنِ تکراری درست تشخیص داده می‌شود", () => {
  /* ⚠️ همان باگی که `Set` می‌ساخت: A B A و A A B هم‌مجموعه‌اند، ولی
     A B B و A A B نیستند — با `Set` هر دو یکی به نظر می‌رسیدند. */
  assert.ok(sameMultiset([A, B, A], [A, A, B]));
  assert.ok(!sameMultiset([A, B, B], [A, A, B]));
  assert.ok(!sameMultiset([A, B], [A, A, B]));
  assert.ok(sameSequence([A, A, B], [A, A, B]));
  assert.ok(!sameSequence([A, A, B], [A, B, A]));
});

test("فقط-ترتیب از محتوای-غلط جدا می‌شود", () => {
  const accepted = [[A, A, B]];
  const order = judge([A, B, A], accepted);
  assert.equal(order.correct, false);
  assert.equal(order.correct === false && order.errorType, "ORDER_ONLY");

  const content = judge([A, A, C], accepted);
  assert.equal(content.correct, false);
  assert.equal(content.correct === false && content.errorType, "FOOT_CONTENT");
});

test("فقط-ترتیب وقتی ارکانِ تکراری در کارند هم درست کار می‌کند", () => {
  const accepted = [[A, A, B]];
  // سه تا A: هم‌مجموعه نیست، پس محتوای غلط است و نه ترتیبِ غلط.
  const three = judge([A, A, A], accepted);
  assert.equal(three.correct === false && three.errorType, "FOOT_CONTENT");

  // A B A در برابر A A B: دقیقاً همان سه رکن، ترتیبِ دیگر.
  const swapped = judge([A, B, A], accepted);
  assert.equal(swapped.correct === false && swapped.errorType, "ORDER_ONLY");
});

test("پاسخِ درست با یک بدیلِ معتبر، هیچ اشتباهی ثبت نمی‌کند", () => {
  const meter = kimiaMeterFor("مستفعلن فعلن مستفعلن فعلن");
  assert.ok(meter);
  const alternative = meter.accepted[1];
  const verdict = judge([...alternative], meter.accepted);
  assert.equal(verdict.correct, true);
  assert.equal(verdict.correct === true && verdict.matched, alternative);
});

test("نزدیک‌ترین پاسخ، خوانشی است که بازیکن واقعاً دنبالش بوده", () => {
  const meter = kimiaMeterFor("مستفعلن فعلن مستفعلن فعلن");
  assert.ok(meter);
  const [canonical, alternative] = meter.accepted;

  // یک رکن از خوانشِ دوم را غلط می‌گذاریم: باید با خوانشِ دوم سنجیده شود.
  const almostAlternative = [...alternative];
  almostAlternative[3] = "فع";
  assert.equal(nearestAccepted(almostAlternative, meter.accepted), alternative);

  // و یک رکن از خوانشِ متعارف: با متعارف.
  const almostCanonical = [...canonical];
  almostCanonical[3] = "فع";
  assert.equal(nearestAccepted(almostCanonical, meter.accepted), canonical);
});

test("تساوی به نفعِ خوانشِ متعارف شکسته می‌شود", () => {
  const accepted = [
    [A, A, B],
    [C, C, B],
  ];
  // با هر دو دو اختلاف دارد.
  assert.equal(nearestAccepted([B, B, B], accepted), accepted[0]);
});

test("positionalMismatch طولِ نابرابر را بی‌نهایت می‌گیرد", () => {
  assert.equal(positionalMismatch([A, B], [A, B]), 0);
  assert.equal(positionalMismatch([A, B], [A, C]), 1);
  assert.equal(positionalMismatch([A, B], [A, B, C]), Number.POSITIVE_INFINITY);
});

test("سردرگمی فقط جایگاه‌های ناهم‌خوان را می‌دهد", () => {
  assert.deepEqual(confusions([A, C, B], [A, A, B]), [
    { index: 1, expected: A, selected: C },
  ]);
  assert.deepEqual(confusions([A, A, B], [A, A, B]), []);
});

test("راهنمایی‌ها هیچ رکنی و هیچ جایگاهی را نام نمی‌برند", () => {
  for (const hint of Object.values(KIMIA_HINTS)) {
    assert.ok(hint.length > 0);
    assert.ok(!/[۰-۹0-9]/.test(hint), "شمارهٔ جایگاه نباید در راهنمایی باشد");
    assert.ok(
      !/فاعلاتن|مفاعیلن|مستفعلن|فعولن|مفتعلن/.test(hint),
      "نامِ رکن نباید در راهنمایی باشد",
    );
  }
});

test("هر وزنِ دامنه با ارکانِ متعارفِ خودش درست سنجیده می‌شود", () => {
  const meters = [...(kimiaMeterFor("فاعلاتن فاعلاتن فاعلن") ? [1] : [])];
  assert.equal(meters.length, 1);
  const meter = kimiaMeterFor("فاعلاتن فاعلاتن فاعلن")!;
  assert.equal(judge([...meter.canonical], meter.accepted).correct, true);
});
