import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_AFTER_LOGIN, safeReturnTo } from "@/lib/auth/return-to";

/**
 * محافظت در برابر Open Redirect.
 *
 * ⚠️ سناریوی واقعی: مهاجم لینکِ `…/auth?returnTo=https://sarva-login.example`
 * را می‌فرستد. دانش‌آموز دامنهٔ سروا را می‌بیند، وارد می‌شود، و بلافاصله به
 * صفحه‌ای می‌رود که شبیه سرواست و رمزش را دوباره می‌پرسد.
 */

test("مسیر داخلیِ مجاز حفظ می‌شود", () => {
  assert.equal(safeReturnTo("/checkout?plan=plus_1m"), "/checkout?plan=plus_1m");
  assert.equal(safeReturnTo("/panel/subscription"), "/panel/subscription");
  assert.equal(safeReturnTo("/panel/billing/abc"), "/panel/billing/abc");
});

test("آدرس بیرونی رد می‌شود", () => {
  for (const evil of [
    "https://evil.example",
    "http://evil.example/x",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "data:text/html,x",
  ]) {
    assert.equal(safeReturnTo(evil), DEFAULT_AFTER_LOGIN, `باید رد شود: ${evil}`);
  }
});

test("مسیر داخلیِ خارج از فهرست سفید رد می‌شود", () => {
  // فهرست باز («هر چیزی که با / شروع شود») یعنی هر صفحهٔ آینده خودبه‌خود
  // مقصدِ مجاز می‌شد — از جمله صفحه‌های مدیریتی.
  assert.equal(safeReturnTo("/admin/users"), DEFAULT_AFTER_LOGIN);
  assert.equal(safeReturnTo("/api/v1/auth/logout"), DEFAULT_AFTER_LOGIN);
});

test("پیشوندِ مشابه ولی متفاوت پذیرفته نمی‌شود", () => {
  // «/plus-evil» با «/plus» شروع می‌شود ولی مسیرِ دیگری است.
  assert.equal(safeReturnTo("/plus-evil"), DEFAULT_AFTER_LOGIN);
  assert.equal(safeReturnTo("/plus"), "/plus");
  assert.equal(safeReturnTo("/plus/x"), "/plus/x");
});

test("ورودیِ نامعتبر به مقصد پیش‌فرض می‌رسد", () => {
  assert.equal(safeReturnTo(undefined), DEFAULT_AFTER_LOGIN);
  assert.equal(safeReturnTo(null), DEFAULT_AFTER_LOGIN);
  assert.equal(safeReturnTo(42), DEFAULT_AFTER_LOGIN);
  assert.equal(safeReturnTo(""), DEFAULT_AFTER_LOGIN);
});

test("hash کنار گذاشته می‌شود", () => {
  assert.equal(safeReturnTo("/panel/analysis#mistakes"), "/panel/analysis");
});
