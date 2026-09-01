import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildErrorRecord, errorFingerprint } from "@/lib/observability/error-record";

/**
 * این‌ها ردیفی را می‌سنجند که واقعاً در `app_error_log` می‌نشیند — یعنی
 * چیزی که مدیر در /admin/activity می‌بیند و ممکن است روزی در یک پشتیبان
 * از دیتابیس به بیرون برود.
 */

describe("اثرانگشت خطا", () => {
  test("برای یک خطای یکسان پایدار است", () => {
    const a = errorFingerprint("api", "TypeError", null, "x is not a function", "/a");
    const b = errorFingerprint("api", "TypeError", null, "x is not a function", "/a");
    assert.equal(a, b);
  });

  test("عدد و uuid داخل پیام ادغام می‌شوند", () => {
    const a = errorFingerprint("api", "Error", null, "کاربر 42 پیدا نشد", null);
    const b = errorFingerprint("api", "Error", null, "کاربر 91 پیدا نشد", null);
    assert.equal(a, b, "دو نمونه از یک خطا باید یک ردیف باشند");

    const c = errorFingerprint(
      "api",
      "Error",
      null,
      "کاربر 8f0c1c2e-1111-4222-8333-444455556666 پیدا نشد",
      null,
    );
    const d = errorFingerprint(
      "api",
      "Error",
      null,
      "کاربر 11111111-2222-4333-8444-555566667777 پیدا نشد",
      null,
    );
    assert.equal(c, d);
  });

  test("ولی خطاهای واقعاً متفاوت را ادغام نمی‌کند", () => {
    const base = errorFingerprint("api", "TypeError", null, "خراب شد", "/a");

    assert.notEqual(base, errorFingerprint("db", "TypeError", null, "خراب شد", "/a"));
    assert.notEqual(base, errorFingerprint("api", "RangeError", null, "خراب شد", "/a"));
    assert.notEqual(base, errorFingerprint("api", "TypeError", "23505", "خراب شد", "/a"));
    assert.notEqual(base, errorFingerprint("api", "TypeError", null, "چیز دیگری", "/a"));
    assert.notEqual(base, errorFingerprint("api", "TypeError", null, "خراب شد", "/b"));
  });

  test("طولش ثابت و کوتاه است", () => {
    assert.equal(errorFingerprint("api", "E", null, "x".repeat(5000), null).length, 32);
  });
});

describe("ردیفِ ساخته‌شده", () => {
  test("ستون‌های لازم را دارد", () => {
    const row = buildErrorRecord(
      "api",
      Object.assign(new Error("چیزی خراب شد"), { code: "23505", digest: "dg1" }),
      "POST /api/v1/x",
      { requestId: "8f0c1c2e-1111-4222-8333-444455556666", metadata: { route: "/api/v1/x" } },
    );

    assert.equal(row.source, "api");
    assert.equal(row.message, "چیزی خراب شد");
    assert.equal(row.errorName, "Error");
    assert.equal(row.errorCode, "23505");
    assert.equal(row.digest, "dg1");
    assert.equal(row.context, "POST /api/v1/x");
    assert.equal(row.requestId, "8f0c1c2e-1111-4222-8333-444455556666");
    assert.equal(row.metadata.route, "/api/v1/x");
    assert.ok(row.detail && row.detail.length > 0, "stack ذخیره نشد");
    assert.ok(row.environment);
  });

  test("متن‌ها بریده می‌شوند تا ستون‌ها سرریز نکنند", () => {
    const row = buildErrorRecord("other", new Error("x".repeat(5000)), "c".repeat(1000));
    assert.ok(row.message.length <= 1000, `message: ${row.message.length}`);
    assert.ok((row.context ?? "").length <= 300);
    assert.ok((row.detail ?? "").length <= 4001);
  });

  test("⚠️ هیچ راز، توکن، ایمیل یا پارامتر SQL وارد ردیف نمی‌شود", () => {
    const row = buildErrorRecord(
      "db",
      new Error("insert failed for ali@example.com with token AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIIIJJJJ"),
      "createSession",
      {
        metadata: {
          // چیزهایی که یک فراخوانِ بی‌دقت ممکن است بفرستد:
          password: "hunter2",
          refreshTokenHash: "d".repeat(64),
          params: ["ali@example.com", "hash"],
          cookie: "sarva_access=abc",
          userEmail: "ali@example.com",
          clientIp: "1.2.3.4",
          // …و چیزی که واقعاً مفید است و باید بماند:
          db_operation: "INSERT",
        },
      },
    );

    const serialized = JSON.stringify(row);
    for (const secret of [
      "hunter2",
      "ali@example.com",
      "sarva_access=abc",
      "1.2.3.4",
      "d".repeat(64),
      "AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIIIJJJJ",
    ]) {
      assert.ok(!serialized.includes(secret), `«${secret.slice(0, 24)}» در ردیف دیده شد`);
    }

    assert.equal(row.metadata.db_operation, "INSERT");
  });

  test("چیزی که Error نیست هم ردیف می‌سازد", () => {
    const row = buildErrorRecord("other", "فقط یک رشته", null);
    assert.equal(row.errorName, "NonError");
    assert.equal(row.message, "فقط یک رشته");
    assert.equal(row.detail, null);
    assert.ok(row.fingerprint);
  });

  test("environment و release از محیط خوانده می‌شوند", () => {
    process.env.APP_RELEASE = "v9.9.9";
    const row = buildErrorRecord("other", new Error("x"), null);
    assert.equal(row.release, "v9.9.9");
    delete process.env.APP_RELEASE;
  });
});
