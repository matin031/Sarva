import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { activityRequestSchema } from "@/lib/activity/schema";

/**
 * بدنهٔ `POST /api/v1/activity`.
 *
 * ⚠️ این مهم‌ترین گاردِ کلِ مسیرِ ثبتِ فعالیت است: تنها چیزی که جلوی
 * «کلاینت شناسهٔ کاربرِ دیگری بفرستد» می‌ایستد.
 *
 * و ظریف‌ترین بخشش `.strict()` است. Zod در حالتِ پیش‌فرض فیلدِ ناشناخته را
 * **بی‌صدا دور می‌ریزد** — یعنی بدونِ `.strict()` کد باز هم امن بود (چون
 * `userId` هیچ‌وقت خوانده نمی‌شود) ولی فرستنده یک ۲۰۰ می‌گرفت و فکر
 * می‌کرد شاید کار کرده باشد. یک گاردِ صامت، نیمی از گارد است.
 */

describe("schemaِ درخواستِ فعالیت", () => {
  test("بدنهٔ کمینه پذیرفته می‌شود", () => {
    const result = activityRequestSchema.safeParse({ eventType: "login" });
    assert.ok(result.success);
  });

  /** ⚠️ خودِ قاعده. */
  test("userIdِ جعلی رد می‌شود و بی‌صدا دور ریخته نمی‌شود", () => {
    const result = activityRequestSchema.safeParse({
      eventType: "login",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    assert.equal(result.success, false, "باید رد شود، نه اینکه نادیده گرفته شود");
  });

  test("هر کلیدِ ناشناختهٔ دیگری هم رد می‌شود", () => {
    for (const extra of ["studentId", "occurredAt", "score", "isCorrect", "teacherId"]) {
      const result = activityRequestSchema.safeParse({ eventType: "login", [extra]: "x" });
      assert.equal(result.success, false, `«${extra}» نباید پذیرفته شود`);
    }
  });

  test("نوعِ رویدادِ خارج از فهرست رد می‌شود", () => {
    assert.equal(
      activityRequestSchema.safeParse({ eventType: "mouse_moved" }).success,
      false,
    );
    assert.equal(activityRequestSchema.safeParse({}).success, false);
  });

  test("شناسهٔ بلند رد می‌شود", () => {
    assert.equal(
      activityRequestSchema.safeParse({
        eventType: "game_started",
        entityId: "x".repeat(65),
      }).success,
      false,
    );
  });

  /** خودِ محتوای metadata را `validateMetadata` می‌سنجد؛ اینجا فقط شکلش. */
  test("metadataِ غیرِشیء رد می‌شود", () => {
    assert.equal(
      activityRequestSchema.safeParse({ eventType: "game_started", metadata: "x" }).success,
      false,
    );
    assert.equal(
      activityRequestSchema.safeParse({ eventType: "game_started", metadata: [1, 2] }).success,
      false,
    );
  });
});
