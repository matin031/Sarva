import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { recordBoundsError, boundedRecord, DEFAULT_RECORD_BOUNDS } from "@/lib/api/bounded-record";

/**
 * مرزهای بدنهٔ درخواست.
 *
 * ⚠️ دو حفره که بسته شد:
 *
 * ۱) `readJson` بدنه را با `request.json()` بی‌قید در حافظه می‌ریخت. یک POST
 *    با بدنهٔ چندصد مگابایتی — یک خط curl — پیش از هر اعتبارسنجی همان‌قدر RAM
 *    می‌گرفت.
 *
 * ۲) `user_bookmarks.payload` و `content_reports.target_ref` با
 *    `z.record(z.string(), z.unknown())` اعتبارسنجی می‌شدند: نه سقفِ کلید، نه
 *    عمق، نه اندازه.
 *
 * تستِ خودِ خواندنِ سقف‌دار در tests/api/capped-read.test.ts است (به یک
 * Request واقعی نیاز دارد). این فایل مرزهای شیء را می‌سنجد.
 */

describe("مرزهای شیءِ آزاد", () => {
  test("شیءِ معمولی می‌گذرد", () => {
    assert.equal(recordBoundsError({ grade: "dahom", lesson: 4 }), null);
  });

  test("شیءِ خالی می‌گذرد", () => {
    assert.equal(recordBoundsError({}), null);
  });

  test("کلیدهای بیش از حد رد می‌شوند", () => {
    const big = Object.fromEntries(
      Array.from({ length: DEFAULT_RECORD_BOUNDS.maxKeys + 1 }, (_, i) => [`k${i}`, i]),
    );
    assert.match(recordBoundsError(big) ?? "", /کلیدهای بیش از حد/);
  });

  test("دقیقاً روی مرزِ تعداد کلید می‌گذرد", () => {
    const atLimit = Object.fromEntries(
      Array.from({ length: DEFAULT_RECORD_BOUNDS.maxKeys }, (_, i) => [`k${i}`, i]),
    );
    assert.equal(recordBoundsError(atLimit), null);
  });

  test("تودرتوییِ عمیق رد می‌شود", () => {
    let deep: unknown = "ته";
    for (let i = 0; i < DEFAULT_RECORD_BOUNDS.maxDepth + 3; i++) deep = { next: deep };
    assert.match(recordBoundsError(deep) ?? "", /تودرتو/);
  });

  test("دادهٔ بزرگ رد می‌شود", () => {
    const huge = { blob: "الف".repeat(DEFAULT_RECORD_BOUNDS.maxBytes) };
    assert.match(recordBoundsError(huge) ?? "", /بزرگ/);
  });

  test("آرایهٔ بلندِ تودرتو هم شمرده می‌شود", () => {
    const wide = { list: Array.from({ length: DEFAULT_RECORD_BOUNDS.maxKeys + 5 }, (_, i) => i) };
    assert.match(recordBoundsError(wide) ?? "", /کلیدهای بیش از حد/);
  });

  test("شیءِ حلقه‌دار رد می‌شود، نه اینکه محافظ را آویزان کند", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    assert.ok(recordBoundsError(cyclic) !== null);
  });

  test("محافظ روی ورودیِ خیلی عمیق پشته را سرریز نمی‌کند", () => {
    // پیمایش صریح است نه بازگشتی؛ ۱۰۰٬۰۰۰ سطح نباید RangeError بدهد.
    let deep: unknown = 1;
    for (let i = 0; i < 100_000; i++) deep = { n: deep };
    assert.doesNotThrow(() => recordBoundsError(deep));
  });

  test("شِمای زاد همان مرزها را اعمال می‌کند", () => {
    const schema = boundedRecord();
    assert.equal(schema.safeParse({ ok: true }).success, true);
    const big = Object.fromEntries(
      Array.from({ length: DEFAULT_RECORD_BOUNDS.maxKeys + 1 }, (_, i) => [`k${i}`, i]),
    );
    assert.equal(schema.safeParse(big).success, false);
  });
});
