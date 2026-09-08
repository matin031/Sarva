import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { inspectSql, stripLiterals } from "@/lib/admin/sql-guard";

/**
 * این تست‌ها قرارداد امنیتیِ کنسول SQL‌اند.
 *
 * کنسول عمداً قدرتِ کامل می‌دهد؛ چیزی که اینجا بررسی می‌شود آن مشتِ کوچکِ
 * دستورهایی است که *هیچ* کارِ مشروعی در یک صفحهٔ وب ندارند — و از مهاجرت به
 * MySQL به بعد، دستورهایی که «پیش‌نمایش» برایشان دروغ است.
 */

describe("جدا کردن رشته‌ها و کامنت‌ها", () => {
  test("محتوای رشته دیگر شبیه دستور نیست", () => {
    const out = stripLiterals("insert into notes (body) values ('drop database sarva')");
    assert.ok(!out.includes("drop database"), out);
    assert.ok(out.includes("insert into notes"), out);
  });

  test("کامنت خطی و بلوکی حذف می‌شوند", () => {
    assert.ok(!stripLiterals("select 1; -- drop database x").includes("drop database"));
    assert.ok(!stripLiterals("select 1; /* drop database x */").includes("drop database"));
  });

  test("کامنتِ # هم — که مخصوص MySQL است", () => {
    assert.ok(!stripLiterals("select 1; # drop database x").includes("drop database"));
  });

  test("رشتهٔ دوکوتیشنی هم رشته است، نه شناسه", () => {
    // ⚠️ در MySQL (بدون ANSI_QUOTES) " رشته است. اگر مثل PostgreSQL شناسه
    // فرض می‌شد، محتوایش بدون گیومه بیرون می‌آمد و «drop database» را
    // به‌عنوان دستور نشان می‌داد.
    assert.ok(!stripLiterals('select "drop database x"').includes("drop database"));
  });

  test("شناسهٔ داخل backtick بدون backtick نگه داشته می‌شود", () => {
    assert.ok(stripLiterals("delete from `admin_audit_log`").includes("admin_audit_log"));
  });

  test("کوتیشنِ دوبل‌شده رشته را زودتر نمی‌بندد", () => {
    const out = stripLiterals("select 'it''s fine; drop database x'");
    assert.ok(!out.includes("drop database"), out);
  });

  test("کوتیشنِ گریزخورده با بک‌اسلش هم", () => {
    // ⚠️ مخصوص MySQL: در PostgreSQL پیش‌فرض، \' داخل رشته گریز نیست.
    // نسخهٔ قبلیِ این تابع پایانِ رشته را اینجا اشتباه پیدا می‌کرد.
    const out = stripLiterals("select 'a\\' ; drop database x'");
    assert.ok(!out.includes("drop database"), out);
  });

  test("کامنتِ اجرایی /*! */ حذف نمی‌شود — محتوایش دستور است", () => {
    // ⚠️ اگر مثل کامنتِ معمولی حذف می‌شد، این از دید محافظ نامرئی بود و از
    // دید MySQL یک دستورِ کامل.
    const out = stripLiterals("/*!40101 drop database x */");
    assert.ok(out.includes("drop database"), out);
  });

  test("«--» بدون فاصله در MySQL کامنت نیست", () => {
    // در PostgreSQL هست، در MySQL نه. اگر کامنت فرض می‌شد، بقیهٔ دستور
    // بی‌دلیل بریده می‌شد.
    assert.ok(stripLiterals("select 1--2").includes("1--2"));
  });
});

describe("دستورهای ممنوع", () => {
  const forbidden = [
    "drop database sarva",
    "DROP DATABASE sarva",
    "drop schema sarva",
    "create database x",
    // خواندن و نوشتنِ فایل‌های سرور — معادل‌های MySQL برای pg_read_file و lo_export
    "select load_file('/etc/passwd')",
    "select * from users into outfile '/tmp/dump.csv'",
    "select 1 into dumpfile '/var/www/x.php'",
    "load data infile '/etc/passwd' into table users",
    "load data local infile '/etc/passwd' into table users",
    // دسترسی و پیکربندی
    "grant all on sarva.* to 'x'@'%'",
    "create user attacker identified by 'x'",
    "alter user sarva identified by 'x'",
    "set global sql_mode = ''",
    "set session foreign_key_checks = 0",
    "set @@global.max_connections = 1",
    "install plugin x soname 'x.so'",
    "kill query 5",
    // جدول‌های داخلی
    "select * from mysql.user",
    // روتین و تریگر
    "create trigger t before insert on users for each row begin end",
    "drop procedure club_recount",
  ];

  for (const sql of forbidden) {
    test(`رد می‌شود: ${sql.slice(0, 40)}`, () => {
      const out = inspectSql(sql);
      assert.ok(out.blocked, `اجازه داده شد: ${sql}`);
    });
  }

  test("با فاصله و خط تازهٔ اضافه هم گرفته می‌شود", () => {
    assert.ok(inspectSql("drop\n\n   database   sarva").blocked);
  });

  test("کوئری‌های عادی رد نمی‌شوند", () => {
    for (const sql of [
      "select * from users limit 10",
      "insert into vocab_words (grade, lesson, word, meaning) values ('dahom', 1, 'a', 'b')",
      "update questions set difficulty = 'hard' where type = 'audio-to-poem'",
      "delete from vocab_words where grade = 'dahom' and lesson = 1",
      "select area, count(*) from content_reports group by area",
    ]) {
      assert.equal(inspectSql(sql).blocked, null, `بی‌دلیل رد شد: ${sql}`);
    }
  });
});

/**
 * ⚠️ مهم‌ترین تفاوت با نسخهٔ PostgreSQL.
 *
 * آنجا «پیش‌نمایش» یعنی اجرا داخل تراکنش و بعد rollback، و آن تضمین برای
 * *همه‌چیز* برقرار بود — حتی DDL. در MySQL نیست: هر CREATE/ALTER/DROP/
 * TRUNCATE یک commit ضمنی دارد و تراکنش را پیش از خودش می‌بندد.
 *
 * یعنی «پیش‌نمایشِ» یک `drop table` جدول را واقعاً می‌انداخت و بعد گزارش
 * می‌داد «چیزی نوشته نشد». پس این دستورها اصلاً وارد کنسول نمی‌شوند.
 */
describe("دستورهایی که در MySQL commit ضمنی دارند", () => {
  const implicit = [
    "create table t (a int)",
    "alter table users add column x int",
    "drop table scratch_table",
    "truncate vocab_words",
    "truncate table vocab_words",
    "rename table a to b",
    "create index i on users (email)",
    "drop index i on users",
    "lock tables users write",
    "optimize table users",
    "flush tables",
    "commit",
    "start transaction",
    "savepoint s1",
  ];

  for (const sql of implicit) {
    test(`مسدود: ${sql.slice(0, 40)}`, () => {
      const out = inspectSql(sql);
      assert.ok(out.blocked, `اجازه داده شد: ${sql}`);
      assert.equal(out.blocked!.kind, "implicit-commit");
    });
  }

  test("پیامش می‌گوید چرا، و کجا باید نوشت", () => {
    const out = inspectSql("alter table users add column x int");
    assert.ok(out.blocked!.reason.includes("migration"), out.blocked!.reason);
  });

  test("ولی DML معمولی همچنان آزاد است", () => {
    for (const sql of [
      "insert into vocab_words (grade, lesson, word, meaning) values ('dahom', 1, 'a', 'b')",
      "update users set full_name = 'x' where id = '1'",
      "delete from vocab_words where lesson = 99",
      "select * from users",
    ]) {
      const out = inspectSql(sql);
      assert.notEqual(out.blocked?.kind, "implicit-commit", `بی‌دلیل رد شد: ${sql}`);
    }
  });
});

describe("جدول‌های فقط‌خواندنی", () => {
  test("نوشتن روی لاگ ممیزی ممکن نیست", () => {
    for (const sql of [
      "delete from admin_audit_log",
      "update admin_audit_log set summary = 'x'",
      "insert into admin_audit_log (action) values ('x')",
      "replace into admin_audit_log (id) values ('x')",
      "delete from `admin_audit_log`",
      // ⚠️ شکل‌هایی که الگوی سادهٔ «کلمهٔ کلیدی + نامِ جدول» از کنارشان رد
      // می‌شد — همه مخصوص MySQL:
      "delete a from admin_audit_log a join users u on u.id = a.actor_id",
      "delete from admin_audit_log as a where a.id = '1'",
      "update admin_audit_log a join users u on u.id = a.actor_id set a.summary = 'x'",
      "update `admin_audit_log` set summary = 'x'",
    ]) {
      const out = inspectSql(sql);
      assert.ok(out.blocked, `اجازه داده شد: ${sql}`);
      assert.equal(out.blocked!.kind, "protected-table");
    }
  });

  test("نوشتن روی schema_migrations هم", () => {
    assert.ok(inspectSql("delete from schema_migrations").blocked);
    assert.ok(inspectSql("update schema_migrations set checksum = 'x'").blocked);
  });

  test("ولی خواندنشان آزاد است", () => {
    assert.equal(inspectSql("select * from admin_audit_log limit 5").blocked, null);
    assert.equal(inspectSql("select count(*) from schema_migrations").blocked, null);
  });

  test("جدولی با نامِ مشابه قربانی نمی‌شود", () => {
    assert.equal(inspectSql("delete from admin_audit_log_archive").blocked, null);
  });
});

describe("هشدارها", () => {
  test("delete بدون where", () => {
    const out = inspectSql("delete from vocab_words;");
    assert.equal(out.blocked, null);
    assert.ok(out.warnings.some((w) => w.includes("delete")), out.warnings.join(" | "));
  });

  test("ولی delete با where هشدار نمی‌دهد", () => {
    const out = inspectSql("delete from vocab_words where lesson = 1;");
    assert.equal(out.warnings.length, 0, out.warnings.join(" | "));
  });

  test("update بدون where", () => {
    const out = inspectSql("update questions set difficulty = 'hard'");
    assert.ok(out.warnings.some((w) => w.includes("update")));
  });

  test("دست بردن در جدول کاربران همیشه هشدار دارد", () => {
    const out = inspectSql("update users set full_name = 'x' where id = '1'");
    assert.ok(out.warnings.some((w) => w.includes("argon2")), out.warnings.join(" | "));
  });

  test("replace into هشدار می‌دهد که upsert نیست", () => {
    // ⚠️ مخصوص MySQL و به‌سادگی اشتباه گرفته می‌شود: REPLACE ردیف قدیمی را
    // *حذف* می‌کند، پس ستون‌های ننوشته به پیش‌فرض برمی‌گردند.
    const out = inspectSql("replace into vocab_words (id, word) values ('1', 'x')");
    assert.ok(out.warnings.some((w) => w.includes("حذف")), out.warnings.join(" | "));
  });

  test("دست بردن در لایک‌ها هشدار شمارنده می‌دهد", () => {
    const out = inspectSql("delete from club_likes where post_id = '1'");
    assert.ok(out.warnings.some((w) => w.includes("club_recount")), out.warnings.join(" | "));
  });

  test("یک select ساده هیچ هشداری ندارد", () => {
    assert.deepEqual(inspectSql("select 1").warnings, []);
  });
});

/**
 * ⚠️ راه‌های فرار از سیاستِ خودِ محافظ.
 *
 * در دوران PostgreSQL دو مورد بود که هر دو روی دیتابیس محلی آزموده و بسته
 * شدند: بلوکِ DO و lo_import. هر دو معادلِ MySQL دارند و همان‌جا بسته
 * شده‌اند — PREPARE/EXECUTE به‌جای DO، و LOAD_FILE به‌جای lo_import.
 */
describe("راه‌های فرار از خودِ محافظ", () => {
  const blocked = (sql: string) => inspectSql(sql).blocked !== null;

  test("PREPARE/EXECUTE مسدود می‌شود — همان نقشِ بلوکِ DO", () => {
    // این محافظ متن را می‌خواند؛ PREPARE دستور را داخل یک رشته پنهان
    // می‌کند و stripLiterals دقیقاً همان رشته را برمی‌دارد.
    assert.ok(blocked("prepare s from 'delete from admin_audit_log'"));
    assert.ok(blocked("execute s"));
    assert.ok(blocked("select 1; prepare s from 'drop table users'"));
  });

  test("CALL مسدود می‌شود — یک رویه می‌تواند خودش commit کند", () => {
    assert.ok(blocked("call club_recount(null)"));
  });

  test("خاموش کردنِ foreign_key_checks مسدود می‌شود", () => {
    // ⚠️ با آن می‌شود ردیفِ یتیم ساخت که هیچ FK ای جلویش را نمی‌گیرد.
    assert.ok(blocked("set foreign_key_checks = 0"));
    assert.ok(blocked("set session foreign_key_checks = 0"));
  });

  test("خاموش کردنِ sql_mode مسدود می‌شود", () => {
    // بدون STRICT_TRANS_TABLES، دادهٔ بلند بی‌صدا بریده می‌شود.
    assert.ok(blocked("set sql_mode = ''"));
  });

  test("LOAD_FILE مسدود می‌شود", () => {
    assert.ok(blocked("select load_file('/etc/passwd')"));
  });

  test("INTO OUTFILE هم — قرینه‌اش، نوشتن روی سرور", () => {
    assert.ok(blocked("select * from users into outfile '/tmp/x'"));
  });

  test("خواندن mysql.user مسدود می‌شود", () => {
    assert.ok(blocked("select user, authentication_string from mysql.user"));
  });

  test("دستورِ پنهان در کامنتِ اجرایی مسدود می‌شود", () => {
    // ⚠️ /*!…*/ برای MySQL دستور است. اگر stripLiterals مثل کامنتِ معمولی
    // حذفش می‌کرد، این کاملاً نامرئی بود.
    assert.ok(blocked("/*!40101 drop database sarva */"));
  });
});

/**
 * نیمهٔ دومِ کار: الگوهای تازه نباید کوئریِ سالم را بگیرند. این کنسول ابزارِ
 * کارِ روزمره است و یک مسدودسازیِ بی‌جا آن را بی‌مصرف می‌کند.
 */
describe("کوئری‌های سالم که نباید قربانیِ الگوهای تازه شوند", () => {
  test("update ... set role = ... مسدود نمی‌شود", () => {
    // ⚠️ مهم‌ترین تستِ اینجا. الگوی `set role` اگر به ابتدای دستور مقید
    // نباشد این را می‌گیرد — و خودِ محافظ در متنِ اخطارهایش این را کارِ
    // مجاز و متعارف می‌داند.
    assert.equal(inspectSql("update users set role = 'admin' where id = '1'").blocked, null);
  });

  test("ستونی به نامِ call یا prepare مسدود نمی‌شود", () => {
    assert.equal(inspectSql("select call_count, prepare_time from stats").blocked, null);
  });

  test("متنی که کلمهٔ prepare داخلش است مسدود نمی‌شود", () => {
    assert.equal(
      inspectSql("select * from club_posts where body = 'prepare for the exam'").blocked,
      null,
    );
  });

  test("insert معمولی مسدود نمی‌شود — کارِ اصلیِ این کنسول", () => {
    assert.equal(
      inspectSql("insert into questions (id, type) values ('1', 'audio-to-poem')").blocked,
      null,
    );
  });

  test("ستونی به نامِ mysql_version مسدود نمی‌شود", () => {
    // الگوی جدول‌های داخلی به `mysql . چیزی` مقید است، نه هر جا کلمهٔ mysql.
    assert.equal(inspectSql("select mysql_version from settings").blocked, null);
  });

  test("خواندن از information_schema آزاد است", () => {
    assert.equal(
      inspectSql("select table_name from information_schema.tables").blocked,
      null,
    );
  });
});
