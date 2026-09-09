import test from "node:test";
import assert from "node:assert/strict";
import { orderStatusLabel } from "@/lib/plus/labels";

/**
 * ترجمهٔ وضعیتِ سفارش برای کاربر.
 *
 * ⚠️ این «فقط چند رشتهٔ فارسی» نیست. مهم‌ترین قاعدهٔ کلِ سیستم پرداخت اینجا
 * اجرا می‌شود: **«نامعلوم» هرگز «ناموفق» نمایش داده نمی‌شود.** کاربری که
 * پولش کم شده و «پرداخت ناموفق» می‌بیند، دوباره پرداخت می‌کند.
 */

test("سفارشِ پرداخت‌شده", () => {
  assert.equal(orderStatusLabel("paid", "verified"), "پرداخت موفق");
});

test("پرداختِ نامعلوم «در حال بررسی» است، نه «ناموفق»", () => {
  assert.equal(orderStatusLabel("pending", "unknown"), "در حال بررسی");
  assert.equal(orderStatusLabel("pending", "pending"), "در حال بررسی");
  // کاربری که به درگاه رفته ولی برنگشته هم در همین دسته است: ممکن است پول
  // کم شده باشد.
  assert.equal(orderStatusLabel("pending", "redirected"), "در حال بررسی");
});

test("فقط شکستِ صریحِ درگاه «ناموفق» است", () => {
  assert.equal(orderStatusLabel("pending", "failed"), "پرداخت ناموفق");
});

test("سفارشی که هنوز پرداختی برایش شروع نشده", () => {
  assert.equal(orderStatusLabel("pending", null), "در انتظار پرداخت");
  assert.equal(orderStatusLabel("pending", "created"), "در انتظار پرداخت");
});

test("لغو، انقضا و بازپرداخت جدا از هم‌اند", () => {
  assert.equal(orderStatusLabel("cancelled", null), "لغوشده");
  assert.equal(orderStatusLabel("expired", null), "منقضی‌شده");
  assert.equal(orderStatusLabel("refunded", "verified"), "بازپرداخت‌شده");
});

test("هیچ وضعیتی، نامِ خامِ داخلی را لو نمی‌دهد", () => {
  const internal = ["pending", "unknown", "redirected", "failed", "verified"] as const;
  for (const state of internal) {
    const label = orderStatusLabel("pending", state);
    assert.ok(!/[a-z]/.test(label), `«${label}» نباید نامِ داخلی داشته باشد`);
  }
});
