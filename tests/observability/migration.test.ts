import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS = join(process.cwd(), "migrations");
const NEW_MIGRATION = "007_observability.sql";

function read(name: string): string {
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

describe("migration رصدپذیری", () => {
  test("شماره‌گذاری پیوسته است و فایل منتشرشده‌ای را جایگزین نکرده", () => {
    const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
    assert.ok(files.includes(NEW_MIGRATION), "فایل migration پیدا نشد");

    // ⚠️ عمداً «آخرین فایل» بررسی نمی‌شود: هر migration بعدی این تست را
    // می‌شکست بی‌آنکه چیزی خراب شده باشد. آنچه واقعاً اهمیت دارد این است که
    // شماره‌ها پیوسته و بدون تکرار باشند — اجراکننده به ترتیبِ نام اجرا
    // می‌کند و یک شمارهٔ تکراری یعنی ترتیبِ نامعلوم.
    const numbers = files.map((f) => Number(f.slice(0, 3)));
    assert.deepEqual(
      numbers,
      numbers.map((_, i) => i + 1),
      `شماره‌گذاری migration ها پیوسته نیست: ${files.join(", ")}`,
    );

    // ⚠️ migration منتشرشده هرگز ویرایش نمی‌شود؛ اجراکننده فایل‌های اعمال‌شده
    // را دوباره اجرا نمی‌کند، پس ویرایششان روی سرورهای موجود بی‌اثر است و
    // فقط نصب‌های تازه را متفاوت می‌کند.
    const old = read("002_admin_logs.sql");
    assert.ok(
      !old.includes("request_id"),
      "002_admin_logs.sql ویرایش شده — ستون تازه باید در migration جدید بیاید",
    );
  });

  test("همهٔ ستون‌های لازم اضافه می‌شوند", () => {
    const sql = read(NEW_MIGRATION);
    const expected = [
      "request_id", // روی admin_audit_log
      "error_name",
      "error_code",
      "digest",
      "environment",
      "release",
      "first_request_id",
      "last_request_id",
      "metadata",
    ];
    for (const column of expected) {
      assert.ok(sql.includes(column), `ستون ${column} در migration نیست`);
    }
  });

  test("قابل اجرای دوباره است (if not exists) و چیزی را حذف نمی‌کند", () => {
    const sql = read(NEW_MIGRATION);

    const addColumns = sql.match(/add column/gi) ?? [];
    const guarded = sql.match(/add column if not exists/gi) ?? [];
    assert.equal(addColumns.length, guarded.length, "همهٔ add column ها باید if not exists باشند");

    const indexes = sql.match(/create index/gi) ?? [];
    const guardedIndexes = sql.match(/create index if not exists/gi) ?? [];
    assert.equal(indexes.length, guardedIndexes.length);

    // هیچ داده‌ای از دست نمی‌رود.
    assert.ok(!/\bdrop\s+(table|column|index)\b/i.test(sql), "migration چیزی را drop می‌کند");
    assert.ok(!/\bdelete\s+from\b/i.test(sql), "migration ردیفی را حذف می‌کند");
    assert.ok(!/\btruncate\b/i.test(sql));
  });

  test("ستون‌های تازه ردیف‌های قدیمی را نمی‌شکنند", () => {
    const sql = read(NEW_MIGRATION);
    // یک ستون `not null` بدون `default` روی جدولی که داده دارد، خودِ
    // migration را شکست می‌دهد.
    const notNullNoDefault = /add column if not exists\s+\w+\s+[^,;]*not null(?![^,;]*default)/i;
    assert.ok(!notNullNoDefault.test(sql), "ستون not null بدون default اضافه شده");
  });

  /**
   * تجزیه با تجزیه‌گر واقعی پستگرس.
   *
   * `tsc` هیچ‌چیزی از SQL داخل رشته نمی‌فهمد، پس تنها راهِ مطمئن شدن از درست
   * بودنِ نحو، دادنش به همان تجزیه‌گری است که خودِ پستگرس دارد. اگر
   * `libpg-query` نصب نباشد این تست رد می‌شود (تعمداً وابستگیِ اجباریِ پروژه
   * نشده — یک ماژول نیتیو است و مرحلهٔ build داکر را سنگین می‌کند):
   *
   *     npm i --no-save libpg-query && npm test
   */
  test("نحو SQL با تجزیه‌گر واقعی پستگرس درست است", async (t) => {
    let pg: { loadModule: () => Promise<unknown>; parseSync: (sql: string) => unknown };
    try {
      pg = (await import("libpg-query")) as never;
    } catch {
      t.skip("libpg-query نصب نیست — «npm i --no-save libpg-query» و دوباره اجرا کنید");
      return;
    }

    await pg.loadModule();
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql"))) {
      assert.doesNotThrow(() => pg.parseSync(read(file)), `${file} تجزیه نشد`);
    }
  });
});
