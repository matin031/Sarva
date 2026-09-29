import test from "node:test";
import assert from "node:assert/strict";
import { meterLabel } from "../../lib/aruz-bridge/meter-label";

test("meterLabel: نامِ رکن دست‌نخورده می‌ماند", () => {
  assert.equal(meterLabel("فاعلاتن"), "فاعلاتن");
  assert.equal(meterLabel("  فع‌لن "), "فع‌لن");
  assert.equal(meterLabel("فاعلاتن   فاعلاتن فاعلن"), "فاعلاتن فاعلاتن فاعلن");
});

test("meterLabel: نشانه‌گذاریِ هجاییِ یک رکن به نامش ترجمه می‌شود", () => {
  assert.equal(meterLabel("- U - -"), "فاعلاتن");
  assert.equal(meterLabel("U - U -"), "مفاعلن");
  assert.equal(meterLabel("ـ ∪ ـ"), "فاعلن");
  assert.equal(meterLabel("U---"), "مفاعیلن");
  assert.equal(meterLabel("– – ∪"), "مفعول");
  assert.equal(meterLabel("UU-"), "فعلن");
});

test("meterLabel: یک بحرِ کامل به همان ارکانِ شناخته‌شده‌اش", () => {
  assert.equal(meterLabel("-U-- -U-- -U-"), "فاعلاتن فاعلاتن فاعلن");
  assert.equal(meterLabel("U-U-UU--U-U-UU-"), "مفاعلن فعلاتن مفاعلن فعلن");
});

test("meterLabel: جداکنندهٔ صریح مرزِ رکن را تعیین می‌کند", () => {
  assert.equal(meterLabel("- - U / U - U -"), "مفعول مفاعلن");
});

test("meterLabel: دادهٔ ناشناخته دست‌نخورده برمی‌گردد", () => {
  assert.equal(meterLabel("x-U"), "x-U");
  assert.equal(meterLabel(""), "");
});
