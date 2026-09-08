#!/usr/bin/env node
// اجراکنندهٔ migration های MySQL.
//
// عمداً یک فایل ساده است و نه یک ابزار آماده، و عمداً .mjs است نه .ts، چون
// داخل کانتینر اجرا می‌شود و آنجا هیچ tsc/tsx ای وجود ندارد.
//
// در entrypoint اپ قبل از بالا آمدن سرور صدا زده می‌شود، پس روی یک سرور خالی
// فقط `docker compose up` کافی است.
//
// =============================================================================
// ⚠️ تفاوت بنیادی با نسخهٔ PostgreSQL: DDL برنمی‌گردد
// =============================================================================
//
// نسخهٔ قبلی هر فایل را داخل یک تراکنش می‌گذاشت و می‌نوشت:
//
//     «یک فایلِ نیمه‌اجراشده بدترین حالت ممکن است»
//
// و در PostgreSQL آن تضمین واقعی بود، چون آنجا CREATE TABLE هم rollback
// می‌شود. در MySQL نمی‌شود: هر DDL یک **commit ضمنی** دارد. یعنی اگر
// migration ای پنج جدول بسازد و روی ششمی بشکند، آن پنج‌تا مانده‌اند و هیچ
// rollback ای برشان نمی‌گرداند.
//
// پس این اجراکننده وانمود نمی‌کند اتمیک است. به‌جایش:
//
//   ۱) پیش از اجرا «شروع شد» را ثبت می‌کند و پس از پایان «تمام شد».
//   ۲) اگر اجرای بعدی یک migration را «شروع‌شده ولی تمام‌نشده» ببیند، جلوی
//      خودش را می‌گیرد و دقیقاً می‌گوید کجا مانده — به‌جای اینکه از اول
//      اجرایش کند و با «table already exists» بمیرد.
//   ۳) checksum هر فایل ثبت می‌شود، پس فایلی که بعد از اعمال عوض شده باشد
//      دیده می‌شود.
//
// این یعنی migration های MySQL باید طوری نوشته شوند که *دوباره‌اجرا‌پذیر*
// باشند (create table if not exists و مانندش) یا دستی جمع شوند. جایگزینی
// برای این وجود ندارد؛ محدودیتِ خودِ موتور است.

import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import mysql from "mysql2/promise";
import { splitSqlStatements, hasImplicitCommit } from "./mysql/split-sql.mjs";

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "mysql-migrations",
);

// نامِ دلخواه ولی ثابت. اگر دو کانتینر همزمان بالا بیایند، دومی پشت این قفل
// منتظر می‌ماند تا اولی تمام کند — به‌جای اینکه هر دو یک migration را اجرا
// کنند و یکی با «table already exists» بمیرد.
//
// ⚠️ GET_LOCK به *اتصال* بسته است و نه به تراکنش. پس اتصال باید تا پایانِ کار
// باز بماند، و اگر فرایند بمیرد قفل خودبه‌خود آزاد می‌شود — که همان چیزی است
// که می‌خواهیم.
const LOCK_NAME = "sarva_migrate";
const LOCK_TIMEOUT_SECONDS = 120;

function requireEnv(name) {
  /* در داکر متغیرها از compose می‌آیند و این فایل اصلاً وجود ندارد، پس
     نبودنش خطا نیست. ولی در اجرای محلی، `.env.local` همان‌جایی است که بقیهٔ
     اسکریپت‌ها DATABASE_URL را از آن می‌خوانند و README هم به همان اشاره
     می‌کند. */
  if (!process.env[name]) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      // فایل نیست؛ اشکالی ندارد.
    }
  }

  const value = process.env[name];
  if (!value) {
    console.error(
      `[migrate] ${name} تنظیم نشده است.\n` +
        "  در داکر از docker-compose می‌آید؛ برای اجرای محلی در .env.local بگذارید.",
    );
    process.exit(1);
  }
  return value;
}

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function main() {
  const conn = await mysql.createConnection({
    uri: requireEnv("DATABASE_URL"),
    // ⚠️ خاموش: دستورها یکی‌یکی و صریح فرستاده می‌شوند تا اگر یکی شکست،
    // معلوم باشد کدام. با multipleStatements، سرور کلِ دسته را یک‌جا
    // می‌گیرد و خطا نمی‌گوید سرِ کدام دستور بوده.
    multipleStatements: false,
  });

  let locked = false;
  try {
    const [[lock]] = await conn.query("select get_lock(?, ?) as ok", [
      LOCK_NAME,
      LOCK_TIMEOUT_SECONDS,
    ]);
    if (lock.ok !== 1) {
      throw new Error(
        `قفلِ migration بعد از ${LOCK_TIMEOUT_SECONDS} ثانیه آزاد نشد — ` +
          "احتمالاً نمونهٔ دیگری در حالِ اجراست.",
      );
    }
    locked = true;

    // ⚠️ ستون‌های started_at و finished_at و checksum از نسخهٔ PostgreSQL
    // بیشترند و همین‌ها جای «تراکنشِ دور هر فایل» را می‌گیرند.
    await conn.query(`
      create table if not exists schema_migrations (
        name         varchar(191) not null,
        checksum     char(64)     not null,
        started_at   datetime(6)  not null default current_timestamp(6),
        finished_at  datetime(6)  null,
        statements   int          not null default 0,
        primary key (name)
      ) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_0900_as_cs
    `);

    const [recorded] = await conn.query(
      "select name, checksum, finished_at, statements from schema_migrations",
    );
    const byName = new Map(recorded.map((r) => [r.name, r]));

    // --- اجرای نیمه‌تمام از دفعهٔ قبل ---------------------------------------
    const halfDone = recorded.filter((r) => r.finished_at === null);
    if (halfDone.length) {
      const list = halfDone
        .map((r) => `  • ${r.name} (تا دستور ${r.statements} پیش رفته بود)`)
        .join("\n");
      throw new Error(
        "این migration ها شروع شده‌اند ولی تمام نشده‌اند:\n" +
          list +
          "\n\n  در MySQL هر DDL یک commit ضمنی دارد، پس چیزی که تا آن نقطه\n" +
          "  ساخته شده هنوز سرِ جایش است و خودبه‌خود برنمی‌گردد.\n\n" +
          "  دستی بررسی کن که تا کجا اعمال شده، وضعیت را درست کن، بعد ردیفِ\n" +
          "  مربوطه را از schema_migrations پاک کن تا از نو اجرا شود.",
      );
    }

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    // --- فایلی که بعد از اعمال عوض شده -------------------------------------
    const changed = [];
    for (const file of files) {
      const row = byName.get(file);
      if (!row) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      if (row.checksum !== sha256(sql)) changed.push(file);
    }
    if (changed.length) {
      throw new Error(
        "این فایل‌ها بعد از اعمال شدن تغییر کرده‌اند:\n" +
          changed.map((f) => `  • ${f}`).join("\n") +
          "\n\n  یک migration اعمال‌شده تاریخ است و ویرایش نمی‌شود؛ تغییر را در\n" +
          "  فایل تازه‌ای بگذار. (اگر تغییر عمدی و بی‌اثر بوده — مثلاً کامنت —\n" +
          "  checksum را در schema_migrations به‌روز کن.)",
      );
    }

    const pending = files.filter((f) => !byName.has(f));

    if (!pending.length) {
      console.log(`[migrate] چیزی برای اجرا نیست (${byName.size} migration از قبل اعمال شده).`);
      return;
    }

    for (const file of pending) {
      const sql = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      const statements = splitSqlStatements(sql);

      // «شروع شد» *قبل* از اولین دستور ثبت می‌شود و در تراکنشِ خودش commit
      // می‌شود. اگر وسط کار برق برود، دفعهٔ بعد همین ردیف دیده می‌شود.
      await conn.query(
        "insert into schema_migrations (name, checksum, statements) values (?, ?, 0)",
        [file, sha256(sql)],
      );

      let done = 0;
      try {
        for (const statement of statements) {
          await conn.query(statement);
          done += 1;
          // شمارنده به‌روز می‌شود تا پیامِ «تا کجا رفته بود» واقعی باشد.
          // (خودش DML است، پس commit ضمنیِ DDL بعدی مشکلی برایش نمی‌سازد.)
          await conn.query("update schema_migrations set statements = ? where name = ?", [
            done,
            file,
          ]);
        }
        await conn.query(
          "update schema_migrations set finished_at = current_timestamp(6) where name = ?",
          [file],
        );
        console.log(`[migrate] ✓ ${file} (${statements.length} دستور)`);
      } catch (err) {
        const failed = statements[done] ?? "";
        const reversible = !hasImplicitCommit(failed);
        console.error(
          `[migrate] ✗ ${file}\n` +
            `  دستور ${done + 1} از ${statements.length} شکست خورد:\n` +
            `    ${failed.replace(/\s+/g, " ").slice(0, 160)}\n` +
            `  ${err.message}\n` +
            (reversible
              ? "  (این دستور DDL نبود، پس خودش اثری نگذاشته.)\n"
              : "  ⚠️ این یک DDL بود: تا همین‌جا commit شده و برنمی‌گردد.\n") +
            `  ${done} دستورِ قبلی هم اعمال شده‌اند.`,
        );
        throw err;
      }
    }

    console.log(`[migrate] ${pending.length} migration اعمال شد.`);
  } finally {
    if (locked) await conn.query("select release_lock(?)", [LOCK_NAME]).catch(() => {});
    await conn.end();
  }
}

main().catch((err) => {
  console.error("[migrate] شکست خورد:", err.message);
  process.exit(1);
});
