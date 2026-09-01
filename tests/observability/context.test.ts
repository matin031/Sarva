import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  attachUserId,
  currentRequestContext,
  currentRequestId,
  newRequestId,
  normalizeRequestId,
  runWithRequestContext,
} from "@/lib/observability/context";

describe("شناسهٔ درخواست", () => {
  test("ساخته‌شده همیشه uuid معتبر است", () => {
    for (let i = 0; i < 20; i++) {
      const id = newRequestId();
      assert.equal(normalizeRequestId(id), id);
    }
  });

  test("دو شناسه یکی نمی‌شوند", () => {
    assert.notEqual(newRequestId(), newRequestId());
  });

  test("مقدارِ مخرب از هدر پذیرفته نمی‌شود", () => {
    const hostile = [
      '\n{"level":"fatal","message":"سرور سوخت"}',
      "a".repeat(10_000),
      "../../etc/passwd",
      "<script>alert(1)</script>",
      "'; drop table users; --",
      "not-a-uuid",
      "8f0c1c2e-1111-4222-8333-44445555666", // یک رقم کم
      "8f0c1c2e-1111-4222-8333-4444555566667", // یک رقم زیاد
      "",
      "   ",
    ];
    for (const value of hostile) {
      assert.equal(normalizeRequestId(value), null, `پذیرفته شد: ${value.slice(0, 30)}`);
    }
    assert.equal(normalizeRequestId(null), null);
    assert.equal(normalizeRequestId(undefined), null);
  });

  test("uuid درست پذیرفته و یکدست می‌شود", () => {
    assert.equal(
      normalizeRequestId(" 8F0C1C2E-1111-4222-8333-444455556666 "),
      "8f0c1c2e-1111-4222-8333-444455556666",
    );
  });
});

describe("زمینهٔ درخواست", () => {
  test("بیرون از هر درخواستی، خالی است — و همه‌چیز باید کار کند", () => {
    assert.equal(currentRequestId(), null);
    assert.equal(currentRequestContext(), null);
    assert.doesNotThrow(() => attachUserId("u1"));
  });

  test("داخل زمینه خوانده می‌شود", () => {
    const id = newRequestId();
    runWithRequestContext({ requestId: id, route: "/x", method: "GET" }, () => {
      assert.equal(currentRequestId(), id);
      assert.equal(currentRequestContext()?.route, "/x");
    });
    assert.equal(currentRequestId(), null);
  });

  test("در کارهای async هم زنده می‌ماند", async () => {
    const id = newRequestId();
    await runWithRequestContext({ requestId: id }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(currentRequestId(), id);
      await Promise.all([
        (async () => {
          await new Promise((r) => setTimeout(r, 1));
          assert.equal(currentRequestId(), id);
        })(),
      ]);
    });
  });

  /**
   * مهم‌ترین تست این فایل.
   *
   * اگر شناسه بین دو درخواستِ همزمان نشت کند، لاگ نه‌تنها بی‌فایده که
   * گمراه‌کننده می‌شود: خطای کاربر الف به شناسهٔ کاربر ب می‌چسبد.
   */
  test("بین درخواست‌های همزمان نشت نمی‌کند", async () => {
    const ids = Array.from({ length: 40 }, () => newRequestId());

    const results = await Promise.all(
      ids.map((id, index) =>
        runWithRequestContext({ requestId: id }, async () => {
          // تأخیرهای نامساوی تا زمان‌بندی‌ها واقعاً در هم بروند.
          await new Promise((r) => setTimeout(r, (index * 7) % 13));
          const seenBefore = currentRequestId();
          await new Promise((r) => setTimeout(r, (index * 3) % 5));
          return { seenBefore, seenAfter: currentRequestId() };
        }),
      ),
    );

    results.forEach((result, index) => {
      assert.equal(result.seenBefore, ids[index]);
      assert.equal(result.seenAfter, ids[index]);
    });
  });

  test("attachUserId فقط زمینهٔ خودش را عوض می‌کند", async () => {
    const [a, b] = await Promise.all([
      runWithRequestContext({ requestId: newRequestId() }, async () => {
        attachUserId("user-a");
        await new Promise((r) => setTimeout(r, 5));
        return currentRequestContext()?.userId;
      }),
      runWithRequestContext({ requestId: newRequestId() }, async () => {
        await new Promise((r) => setTimeout(r, 2));
        attachUserId("user-b");
        return currentRequestContext()?.userId;
      }),
    ]);
    assert.equal(a, "user-a");
    assert.equal(b, "user-b");
  });

  test("زمینه از بیرون قابل دستکاری نیست", () => {
    const ctx = { requestId: newRequestId() };
    runWithRequestContext(ctx, () => {
      attachUserId("u9");
      assert.equal(currentRequestContext()?.userId, "u9");
    });
    // شیئی که فراخوان داده دست‌نخورده مانده.
    assert.equal((ctx as { userId?: string }).userId, undefined);
  });
});
