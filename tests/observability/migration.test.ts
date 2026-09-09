import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * بهداشتِ فایل‌های migration و بودنِ ستون‌های رصدپذیری.
 *
 * ⚠️ این فایل بازنویسی شد و دلیلش مهم است.
 *
 * نسخهٔ قبلی پوشهٔ `migrations/` (پستگرس) را می‌خواند و روی یک فایلِ
 * افزایشیِ مشخص (`007_observability.sql`) تکیه داشت. آن دنیا دیگر وجود
 * ندارد: پروژه روی MySQL/MariaDB است، اسکیما از نو تولید شده، و همان
 * ستون‌های رصدپذیری از همان اول در `001_init.sql` هستند.
 *
 * پس چیزی که سنجیده می‌شود عوض نشده — فقط جایی که سنجیده می‌شود:
 *
 *   • شماره‌گذاریِ پیوسته (اجراکننده به ترتیبِ نام اجرا می‌کند؛ شمارهٔ
 *     تکراری یعنی ترتیبِ نامعلوم)
 *   • بودنِ ستون‌هایی که لاگ خطا و ممیزی به آن‌ها تکیه دارند
 *   • اینکه هیچ migration ای داده را حذف نکند
 */

const MIGRATIONS = join(process.cwd(), "mysql-migrations");

function files(): string[] {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

function read(name: string): string {
  return readFileSync(join(MIGRATIONS, name), "utf8");
}

function allSql(): string {
  return files().map(read).join("\n");
}

describe("بهداشت migration ها", () => {
  test("شماره‌گذاری پیوسته و بدون تکرار است", () => {
    const names = files();
    assert.ok(names.length > 0, "هیچ فایل migration ای پیدا نشد");

    const numbers = names.map((f) => Number(f.slice(0, 3)));
    assert.ok(
      numbers.every(Number.isInteger),
      `نامِ همهٔ migration ها باید با سه رقم شروع شود: ${names.join("، ")}`,
    );
    assert.deepEqual(
      numbers,
      numbers.map((_, i) => i + 1),
      `شماره‌گذاری migration ها پیوسته نیست: ${names.join("، ")}`,
    );
  });

  test("ستون‌های رصدپذیری در اسکیما هستند", () => {
    const sql = allSql();
    // این‌ها را lib/observability و lib/admin/audit می‌نویسند؛ نبودنِ هرکدام
    // یعنی یک INSERT که در زمان اجرا می‌شکند.
    const expected = [
      "request_id",
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
      assert.ok(sql.includes(column), `ستون ${column} در اسکیما نیست`);
    }
  });

  test("هیچ migration ای داده را حذف نمی‌کند", () => {
    for (const name of files()) {
      const sql = read(name);

      // ⚠️ `drop ... if exists` مجاز است: اجراکنندهٔ MySQL اتمیک نیست و
      // migration ها باید دوباره‌اجرا‌پذیر باشند، پس ساختنِ دوبارهٔ یک
      // تریگر یا view با drop قبلش الگوی درستی است. آنچه ممنوع است، حذفِ
      // چیزی است که *داده* دارد.
      assert.ok(
        !/\bdrop\s+table\b(?!\s+if\s+exists\s+`?_)/i.test(sql.replace(/drop\s+table\s+if\s+exists\s+`?tmp/gi, "")),
        `${name} یک جدول را drop می‌کند`,
      );
      assert.ok(!/\bdrop\s+column\b/i.test(sql), `${name} یک ستون را drop می‌کند`);
      assert.ok(!/\bdelete\s+from\b/i.test(sql), `${name} ردیفی را حذف می‌کند`);
      assert.ok(!/\btruncate\b/i.test(sql), `${name} جدولی را truncate می‌کند`);
    }
  });

  test("ستون‌های not null بدون default روی جدولِ موجود اضافه نمی‌شوند", () => {
    // یک `add column ... not null` بدون `default` روی جدولی که داده دارد،
    // خودِ migration را شکست می‌دهد. (در 001_init جدول‌ها تازه ساخته
    // می‌شوند، پس آنجا موضوعیت ندارد و فقط ALTER ها سنجیده می‌شوند.)
    for (const name of files()) {
      const sql = read(name);
      const bad = /alter\s+table[^;]*?add\s+column\s+`?\w+`?[^,;]*\bnot\s+null\b(?![^,;]*\bdefault\b)/i;
      assert.ok(!bad.test(sql), `${name}: ستون not null بدون default اضافه می‌شود`);
    }
  });
});
