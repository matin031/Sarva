import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { safeExternalUrl } from "@/lib/site/safe-url";

/**
 * لینکِ نوار اعلان بالای *همهٔ* صفحه‌های سایت برای *همهٔ* بازدیدکننده‌ها دیده
 * می‌شود. یک `javascript:` در آن ستون، بدترین XSS ممکن است.
 */

describe("آدرس امن", () => {
  test("http و https پذیرفته می‌شوند", () => {
    assert.equal(safeExternalUrl("https://example.com/a"), "https://example.com/a");
    assert.ok(safeExternalUrl("http://example.com")?.startsWith("http://"));
  });

  test("مسیر داخلی پذیرفته می‌شود", () => {
    assert.equal(safeExternalUrl("/panel/setting"), "/panel/setting");
  });

  test("javascript: و data: و vbscript: رد می‌شوند", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)  ",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      assert.equal(safeExternalUrl(bad), null, `پذیرفته شد: ${bad}`);
    }
  });

  test("آدرس بدونِ پروتکل (//evil.example) رد می‌شود", () => {
    // یک لینکِ «protocol-relative» کاربر را به دامنهٔ دیگری می‌برد در حالی که
    // شبیه مسیر داخلی به نظر می‌رسد.
    assert.equal(safeExternalUrl("//evil.example/x"), null);
  });

  test("خالی و بدشکل، null می‌دهند", () => {
    assert.equal(safeExternalUrl(""), null);
    assert.equal(safeExternalUrl("   "), null);
    assert.equal(safeExternalUrl(null), null);
    assert.equal(safeExternalUrl(undefined), null);
    assert.equal(safeExternalUrl("نه یک آدرس"), null);
  });
});
