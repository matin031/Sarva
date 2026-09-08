/**
 * الگوهای آمادهٔ کنسول SQL را به خودِ MySQL نشان می‌دهد.
 *
 * ⚠️ چرا جدا از db:check-sql:
 *
 * آن ابزار عمداً کنسول را رد می‌کند، چون کوئریِ کنسول را *کاربر* می‌نویسد.
 * ولی الگوهای آماده را کاربر ننوشته — ما نوشته‌ایم، و در پنل با یک کلیک در
 * ویرایشگر می‌نشینند. یک الگوی خراب یعنی مدیری که به آن اعتماد کرده،
 * خطای نحوی می‌گیرد و نمی‌داند تقصیر خودش است یا ما.
 *
 * پس هر الگو با PREPARE سنجیده می‌شود. PREPARE اجرا نمی‌کند ولی نام جدول و
 * ستون و امضای تابع و نحو را کامل تحلیل می‌کند.
 *
 * ⚠️ آنچه سنجیده *نمی‌شود*: الگوهایی که عمداً جای‌خالی دارند (مثل
 * `'<شناسه>'`) و باید پیش از اجرا پر شوند. آن‌ها با یک مقدارِ نمونه پر
 * می‌شوند تا فقط نحو و نامِ ستون‌ها بررسی شود.
 */
process.loadEnvFile(".env.local");

import mysql from "mysql2/promise";
import { SQL_SNIPPETS } from "@/lib/admin/sql-constants";
import { splitSqlStatements } from "@/lib/admin/sql-split";
import { inspectSql } from "@/lib/admin/sql-guard";
import { SCHEMA_COLUMNS_SQL, SCHEMA_CONSTRAINTS_SQL } from "@/lib/admin/sql-introspection";

/**
 * جای‌خالی‌های الگوها را با مقدارِ نمونه پر می‌کند.
 *
 * این‌ها عمداً در متن هستند تا مدیر ببیند کجا را باید عوض کند. برای PREPARE
 * باید چیزی باشند که از نظر نحوی معتبر است.
 */
function fillPlaceholders(sql: string): string {
  return sql
    .replace(/'<[^']*>'/g, "'00000000-0000-4000-8000-000000000000'")
    .replace(/<[^>\s]+>/g, "1");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL تنظیم نشده است.");
    process.exit(1);
  }

  const conn = await mysql.createConnection({ uri: url, multipleStatements: false });
  let checked = 0;
  let counter = 0;
  const failures: { group: string; title: string; error: string; sql: string }[] = [];
  const blockedByGuard: { group: string; title: string; reason: string }[] = [];

  for (const group of SQL_SNIPPETS) {
    for (const snippet of group.snippets) {
      // ⚠️ اول از خودِ گارد رد می‌شود. یک الگوی آماده که گارد مسدودش کند
      // بی‌فایده است — کاربر روی دکمه می‌زند و پیام «این دستور اجرا نمی‌شود»
      // می‌گیرد، برای متنی که خودِ ما پیشنهاد داده‌ایم.
      const inspection = inspectSql(snippet.sql);
      if (inspection.blocked) {
        blockedByGuard.push({
          group: group.title,
          title: snippet.title,
          reason: inspection.blocked.reason.split("\n")[0],
        });
        continue;
      }

      for (const statement of splitSqlStatements(fillPlaceholders(snippet.sql))) {
        checked += 1;
        const name = `snip_${counter++}`;
        try {
          await conn.query(`PREPARE \`${name}\` FROM ?`, [statement]);
          await conn.query(`DEALLOCATE PREPARE \`${name}\``);
        } catch (e) {
          const err = e as { errno?: number; sqlMessage?: string };
          failures.push({
            group: group.title,
            title: snippet.title,
            error: `${err.errno ?? "?"}: ${err.sqlMessage ?? String(e)}`,
            sql: statement.replace(/\s+/g, " ").slice(0, 140),
          });
        }
      }
    }
  }

  // ⚠️ کوئری‌های درون‌نگریِ خودِ کنسول هم اینجا سنجیده می‌شوند.
  //
  // این‌ها الگوی آماده نیستند و ما نوشته‌ایمشان، ولی در هیچ بررسی دیگری
  // نمی‌آمدند: db:check-sql عمداً کنسول را رد می‌کند. نتیجه‌اش یک باگ
  // واقعی بود — `cc.table_name` روی جدولی که چنین ستونی ندارد — که فقط با
  // باز کردنِ دستیِ صفحهٔ /admin/sql پیدا شد.
  for (const [name, sql] of [
    ["ستون‌های اسکیما", SCHEMA_COLUMNS_SQL],
    ["محدودیت‌های اسکیما", SCHEMA_CONSTRAINTS_SQL],
  ] as const) {
    checked += 1;
    const handle = `introspect_${counter++}`;
    try {
      await conn.query(`PREPARE \`${handle}\` FROM ?`, [sql]);
      await conn.query(`DEALLOCATE PREPARE \`${handle}\``);
    } catch (e) {
      const err = e as { errno?: number; sqlMessage?: string };
      failures.push({
        group: "درون‌نگریِ کنسول",
        title: name,
        error: `${err.errno ?? "?"}: ${err.sqlMessage ?? String(e)}`,
        sql: sql.replace(/\s+/g, " ").slice(0, 140),
      });
    }
  }

  await conn.end();

  console.log(`${checked} دستور از الگوهای کنسول بررسی شد.`);

  if (blockedByGuard.length) {
    console.log(`\n⚠️ ${blockedByGuard.length} الگو را خودِ گارد مسدود می‌کند:\n`);
    for (const b of blockedByGuard) {
      console.log(`  [${b.group}] ${b.title}`);
      console.log(`    ${b.reason}`);
    }
  }

  if (failures.length) {
    console.log(`\n${failures.length} الگو روی MySQL اجرا نمی‌شود:\n`);
    for (const f of failures) {
      console.log(`  [${f.group}] ${f.title}`);
      console.log(`    ${f.error}`);
      console.log(`    ${f.sql}`);
      console.log();
    }
  }

  if (!failures.length && !blockedByGuard.length) console.log("همهٔ الگوها سالم‌اند.");
  process.exit(failures.length + blockedByGuard.length === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
