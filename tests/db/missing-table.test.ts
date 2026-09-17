import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isMissingColumn, isMissingTable, missingTableName } from "@/lib/db/errors";

/**
 * ⚠️ چرا این آزمون هست.
 *
 * `components/admin/AdminGate.tsx` سال‌ها این را داشت:
 *
 *     (error as { code?: unknown }).code === "42P01"
 *
 * `42P01` یک SQLSTATEِ **پستگرس** است و این پروژه روی MySQL/MariaDB اجرا
 * می‌شود. پس آن شاخه هرگز اجرا نمی‌شد و هیچ‌چیز هم نشانش نمی‌داد — تا روزی
 * که `mysql-migrations/008_aruz_rapid.sql` روی هاست اجرا نشد و صفحهٔ
 * `/admin/games` به‌جای پیامِ «migration را اجرا کنید»، ۵۰۰ داد.
 *
 * یک بررسی که *همیشه* false برمی‌گرداند، آزمون‌پذیر است و آزمونش ارزان.
 */
describe("isMissingTable", () => {
  it("خطای ER_NO_SUCH_TABLE را می‌شناسد", () => {
    const err = Object.assign(new Error("Table 'x.y' doesn't exist"), {
      errno: 1146,
      code: "ER_NO_SUCH_TABLE",
      sqlState: "42S02",
    });
    assert.equal(isMissingTable(err), true);
  });

  it("SQLSTATEِ پستگرس دیگر معیار نیست", () => {
    // ⚠️ همان چیزی که کدِ قبلی دنبالش می‌گشت. اگر روزی کسی آن را برگرداند،
    //    این مورد نمی‌گذارد بی‌صدا رد شود.
    const err = Object.assign(new Error("relation does not exist"), { code: "42P01" });
    assert.equal(isMissingTable(err), false);
  });

  it("خطاهای دیگرِ دیتابیس را جدول‌گمشده حساب نمی‌کند", () => {
    for (const errno of [1062, 1451, 1452, 3819, 1644]) {
      assert.equal(isMissingTable({ errno }), false, `errno ${errno}`);
    }
  });

  it("با ورودیِ غیرخطا نمی‌شکند", () => {
    assert.equal(isMissingTable(null), false);
    assert.equal(isMissingTable(undefined), false);
    assert.equal(isMissingTable("boom"), false);
  });
});

describe("missingTableName", () => {
  it("نام را از پیامِ موتور بیرون می‌کشد — همان شکلی که هاست داد", () => {
    const err = Object.assign(new Error("x"), {
      errno: 1146,
      sqlMessage: "Table 'wybtjehi_sarva.aruz_rapid_questions' doesn't exist",
    });
    assert.equal(missingTableName(err), "aruz_rapid_questions");
  });

  it("وقتی نامِ دیتابیس در پیام نیست هم کار می‌کند", () => {
    const err = Object.assign(new Error("x"), {
      errno: 1146,
      sqlMessage: "Table 'aruz_rapid_questions' doesn't exist",
    });
    assert.equal(missingTableName(err), "aruz_rapid_questions");
  });

  it("برای خطای دیگر null می‌دهد", () => {
    assert.equal(missingTableName({ errno: 1062, sqlMessage: "Duplicate entry" }), null);
  });

  it("پیامِ ناشناخته null می‌دهد و throw نمی‌کند", () => {
    assert.equal(missingTableName({ errno: 1146, sqlMessage: "something else" }), null);
    assert.equal(missingTableName({ errno: 1146 }), null);
  });
});

describe("isMissingColumn", () => {
  it("خطای ER_BAD_FIELD_ERROR را می‌شناسد", () => {
    const err = Object.assign(new Error("Unknown column 'duration_ms' in 'field list'"), {
      errno: 1054,
      code: "ER_BAD_FIELD_ERROR",
    });
    assert.equal(isMissingColumn(err), true);
  });

  it("خطای اتصال را ستونِ گمشده حساب نمی‌کند", () => {
    /* ⚠️ همین یک مورد دلیلِ وجودِ این تابع است.

       `scripts/sms-diagnose.ts` برای فهمیدنِ اینکه migration ۰۱۶ اجرا شده
       یا نه، یک `select duration_ms …` می‌زند و خطایش را می‌گیرد. نسخهٔ
       اولش *هر* خطایی را «ستون نیست» می‌فهمید — و وقتی دیتابیس اصلاً در
       دسترس نبود، با اطمینان گزارش می‌داد که migration اجرا نشده. */
    const err = Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
    assert.equal(isMissingColumn(err), false);
  });

  it("«جدول نیست» را با «ستون نیست» قاطی نمی‌کند", () => {
    assert.equal(isMissingColumn({ errno: 1146 }), false);
    assert.equal(isMissingTable({ errno: 1054 }), false);
  });

  it("با ورودیِ غیرخطا نمی‌شکند", () => {
    assert.equal(isMissingColumn(null), false);
    assert.equal(isMissingColumn("boom"), false);
  });
});
