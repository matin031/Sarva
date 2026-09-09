import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_CURRENCY,
  formatRials,
  rialsToTomans,
  tomansToRials,
} from "@/lib/plus/money";

/**
 * تبدیل ریال/تومان.
 *
 * ⚠️ چرا این تست‌ها ارزش دارند: خطای تبدیلِ پول بی‌صدا است. اگر جایی
 * ضربدر ده جا بیفتد، هیچ خطایی نمی‌بینید — فقط فاکتورِ ده‌برابر و کاربری که
 * شکایت می‌کند. اینجاست که آن ضرب یک بار نوشته شده و همین‌جا هم تست می‌شود.
 */

test("واحد متعارف دیتابیس ریال است", () => {
  assert.equal(CANONICAL_CURRENCY, "IRR");
});

test("تومان به ریال: ضربدر ده", () => {
  assert.equal(tomansToRials(0), 0);
  assert.equal(tomansToRials(1), 10);
  assert.equal(tomansToRials(199_000), 1_990_000);
});

test("ریال به تومان: تقسیم بر ده", () => {
  assert.equal(rialsToTomans(1_990_000), 199_000);
  assert.equal(rialsToTomans(0), 0);
});

test("رفت و برگشت، مقدار را عوض نمی‌کند", () => {
  for (const tomans of [1, 999, 49_500, 199_000, 1_200_000]) {
    assert.equal(rialsToTomans(tomansToRials(tomans)), tomans);
  }
});

test("مبلغ اعشاری یا منفی رد می‌شود و بی‌صدا گرد نمی‌شود", () => {
  // ⚠️ گردکردنِ بی‌صدا همان چیزی است که یک محاسبهٔ اشتباه را تا فاکتور
  // می‌برد. اینجا باید سروصدا کند.
  assert.throws(() => tomansToRials(1.5), RangeError);
  assert.throws(() => tomansToRials(-1), RangeError);
  assert.throws(() => tomansToRials(Number.NaN), RangeError);
});

test("ریالی که مضرب ده نیست، به تومان تبدیل نمی‌شود", () => {
  assert.throws(() => rialsToTomans(1_990_005), RangeError);
});

test("نمایش همیشه واحد دارد", () => {
  const shown = formatRials(1_990_000);
  assert.ok(shown.includes("تومان"), "واحد باید در متن باشد");
  // عددِ بی‌واحد («۱۹۹۰۰۰») هرگز نباید تنها چیزی باشد که کاربر می‌بیند.
  assert.notEqual(shown.trim(), "199000");
});

test("مبلغ صفر «رایگان» نوشته می‌شود نه «۰ تومان»", () => {
  assert.equal(formatRials(0), "رایگان");
});
