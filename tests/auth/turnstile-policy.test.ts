import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { missingKeyPolicy } from "@/lib/auth/turnstile-policy";

/**
 * سیاستِ «کلید نیست، چه کنم؟».
 *
 * ⚠️ تا دیروز نبودِ `TURNSTILE_SECRET_KEY` در *هر* محیطی یعنی «همه چیز را
 * قبول کن» — از جمله production. یک متغیرِ محیطیِ جاافتاده کپچا را بی‌صدا
 * خاموش می‌کرد: نه خطایی، نه تفاوتی در رفتار. بدترین شکلِ fail-open، چون
 * غیبتِ محافظ شبیه سلامت به نظر می‌رسد.
 *
 * حالا خاموشی باید *اعلام* شود.
 */
describe("سیاستِ نبودِ کلیدِ کپچا", () => {
  test("در توسعه باز است — سایت بدون حساب Cloudflare باید بالا بیاید", () => {
    assert.equal(missingKeyPolicy({ NODE_ENV: "development" }), "allow");
  });

  test("در تست هم باز است", () => {
    assert.equal(missingKeyPolicy({ NODE_ENV: "test" }), "allow");
  });

  test("در production بسته است", () => {
    assert.equal(missingKeyPolicy({ NODE_ENV: "production" }), "deny");
  });

  test("در production فقط با اعلامِ صریح باز می‌شود", () => {
    assert.equal(
      missingKeyPolicy({ NODE_ENV: "production", TURNSTILE_OPTIONAL: "true" }),
      "allow",
    );
  });

  test("مقدارهای شبیهِ true کافی نیستند", () => {
    // فقط رشتهٔ دقیقِ "true". «۱» یا «yes» یا «TRUE» یعنی کسی حدس زده،
    // و حدس نباید محافظ را بردارد.
    for (const v of ["1", "yes", "TRUE", "on", ""]) {
      assert.equal(
        missingKeyPolicy({ NODE_ENV: "production", TURNSTILE_OPTIONAL: v }),
        "deny",
        `TURNSTILE_OPTIONAL=${JSON.stringify(v)} نباید کپچا را خاموش کند`,
      );
    }
  });

  test("نبودِ NODE_ENV مثل production سخت‌گیرانه نیست", () => {
    // اجرای محلی بدون NODE_ENV نباید ورود را بشکند.
    assert.equal(missingKeyPolicy({}), "allow");
  });
});
