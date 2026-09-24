#!/usr/bin/env node
/**
 * فایلِ *ترمیمِ* دیتابیس برای phpMyAdmin — فقط چیزهای جاافتاده.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * ⚠️ چرا این ابزار لازم شد — ریشهٔ واقعیِ دو خطای production
 * ═══════════════════════════════════════════════════════════════════════
 *
 * روی هاست دو خطا دیده شد و در نگاهِ اول دو مشکلِ جدا به نظر می‌رسیدند:
 *
 *     ER_NO_SUCH_TABLE  …sarva.aruz_rapid_questions   (migration ۰۰۸)
 *     ER_NO_SUCH_TABLE  …sarva.kimia_rounds           (migration ۰۱۸)
 *
 * ولی یک علت دارند. `npm run host:sql --from 006` یک فایلِ واحد می‌سازد که
 * ۰۰۶ تا ۰۱۸ را پشتِ سرِ هم دارد، و **یازدهمین دستورِ آن** این است:
 *
 *     ALTER TABLE `users` ADD COLUMN `phone` …
 *
 * روی دیتابیسی که ورودِ با موبایل در آن از قبل کار می‌کند، آن ستون هست و
 * این دستور با `ER_DUP_FIELDNAME (1060)` شکست می‌خورد. phpMyAdmin تراکنش
 * ندارد و پیش‌فرضش «توقف در اولین خطا» است، پس import همان‌جا می‌ایستد —
 * یعنی پیش از بخشِ ۰۰۸ و خیلی پیش از ۰۱۸. هیچ‌کدام از آن دو جدول ساخته
 * نمی‌شود، و بلوکِ ثبت در `schema_migrations` که *انتهای* فایل است هم
 * اجرا نمی‌شود — پس دیتابیس حتی نمی‌داند چیزی جا افتاده.
 *
 * ⚠️ یعنی نه ۰۰۸ مشکل دارد و نه ۰۱۸. هر دو `CREATE TABLE IF NOT EXISTS`
 * دارند و روی MariaDB سالم‌اند؛ فقط هیچ‌وقت به آن‌ها نرسیدیم.
 *
 * ── این ابزار چه می‌کند ─────────────────────────────────────────────────
 * فقط migration هایی را که *صریحاً* نام ببری در یک فایل می‌گذارد، و پیش از
 * آن ثابت می‌کند که هر دستورِ آن‌ها دوباره‌اجراپذیر است. پس این فایل را
 * می‌شود روی هر وضعیتی از دیتابیس اجرا کرد: اگر جدول باشد رد می‌شود، اگر
 * نباشد می‌سازدش.
 *
 *     node scripts/cpanel/make-repair-sql.mjs 008_aruz_rapid.sql 018_kimia.sql
 *
 * ⚠️ هیچ DDL ای اینجا دست‌نویس نیست: متنِ هر بخش عیناً از خودِ فایلِ
 * migration خوانده می‌شود و checksum هم با همان الگوریتمِ اجراکننده حساب
 * می‌شود، تا `npm run db:migrate` بعداً نگوید «فایل بعد از اعمال عوض شده».
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { splitSqlStatements } from "../mysql/split-sql.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const MIGRATIONS = join(ROOT, "mysql-migrations");
const OUT = join(ROOT, "deploy", "sarva-database-repair.sql");

const names = process.argv.slice(2).filter((a) => a.endsWith(".sql"));
if (names.length === 0) {
  console.error("استفاده: node scripts/cpanel/make-repair-sql.mjs <migration.sql> [...]");
  console.error("مثال:   node scripts/cpanel/make-repair-sql.mjs 008_aruz_rapid.sql 018_kimia.sql");
  process.exit(1);
}

/**
 * ⚠️ نگهبانِ اصلیِ این ابزار.
 *
 * یک فایلِ ترمیم فقط وقتی بی‌خطر است که *هر* دستورش دوباره‌اجراپذیر باشد.
 * `ALTER TABLE … ADD COLUMN` نیست (همان چیزی که کلِ این ماجرا را ساخت)،
 * `CREATE TABLE` بدونِ `IF NOT EXISTS` هم نیست. اگر فایلی چنین دستوری
 * داشته باشد، اینجا رد می‌شود — به‌جای اینکه یک فایلِ ترمیمِ خطرناک
 * ساخته شود که خودش وسطِ کار می‌ایستد.
 */
const SAFE = [
  /^create\s+table\s+if\s+not\s+exists\b/i,
  /^create\s+(or\s+replace\s+)?(algorithm\s*=\s*\w+\s+)?(definer\s*=\s*\S+\s+)?(sql\s+security\s+\w+\s+)?view\b/i,
  /^drop\s+trigger\s+if\s+exists\b/i,
  /^drop\s+procedure\s+if\s+exists\b/i,
  /^create\s+trigger\b/i,
  /^create\s+procedure\b/i,
  /^create\s+index\s+if\s+not\s+exists\b/i,
  /^insert\s+ignore\b/i,
  /^set\b/i,
];

const unsafe = [];
const sections = [];

for (const name of names) {
  let sql;
  try {
    sql = await readFile(join(MIGRATIONS, name), "utf8");
  } catch {
    console.error(`فایل پیدا نشد: mysql-migrations/${name}`);
    process.exit(1);
  }
  for (const raw of splitSqlStatements(sql)) {
    const stmt = raw
      .replace(/--[^\n]*/g, " ")
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .trim();
    if (!stmt) continue;
    if (!SAFE.some((re) => re.test(stmt))) {
      unsafe.push({ name, stmt: stmt.replace(/\s+/g, " ").slice(0, 120) });
    }
  }
  sections.push({ name, sql, checksum: createHash("sha256").update(sql).digest("hex") });
}

if (unsafe.length) {
  console.error("این migration ها دوباره‌اجراپذیر نیستند و در فایلِ ترمیم نمی‌آیند:\n");
  for (const u of unsafe) console.error(`  ${u.name}\n    ${u.stmt}\n`);
  console.error("برای این‌ها باید دستی بررسی شود که چه بخشی از قبل اعمال شده.");
  process.exit(1);
}

const parts = [];

parts.push(`-- =============================================================================
-- سروا — ترمیمِ جدول‌های جاافتاده
-- =============================================================================
--
-- شامل: ${names.join("، ")}
--
-- ⚠️ این فایل با \`sarva-database-update.sql\` فرق دارد. آن یکی یک زنجیرهٔ
-- کامل است و اگر وسطش به دستوری برسد که از قبل اعمال شده (مثلاً
-- \`ALTER TABLE users ADD COLUMN phone\`) همان‌جا متوقف می‌شود و بقیه‌اش
-- اصلاً اجرا نمی‌شود. دقیقاً همین اتفاق افتاد و به همین دلیل دو جدول
-- ساخته نشدند.
--
-- این فایل فقط دستورهای *دوباره‌اجراپذیر* دارد: هر جدول \`IF NOT EXISTS\`
-- است. پس روی هر وضعیتی از دیتابیس بی‌خطر است — اگر جدول باشد رد می‌شود
-- و اگر نباشد ساخته می‌شود. اجرای دوباره‌اش هم بی‌ضرر است.
--
-- ⚠️ با این حال، پیش از وارد کردن از دیتابیس **backup** بگیرید
-- (phpMyAdmin ← تب Export). این قاعدهٔ همیشگیِ کار روی دادهٔ زنده است.
--
-- ── قدم‌ها ────────────────────────────────────────────────────────────────
--   ۱) در «Setup Node.js App» سایت را STOP کنید
--   ۲) در phpMyAdmin روی نامِ دیتابیس کلیک کنید
--   ۳) تب Import ← Choose File ← همین فایل ← Go
--   ۴) گزارشِ پایانِ فایل را ببینید (جدولِ «وضعیت»)
--   ۵) RESTART بزنید
-- =============================================================================

SET NAMES utf8mb4;
SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET SESSION time_zone = '+00:00';
`);

for (const { name, sql } of sections) {
  parts.push(`
-- =============================================================================
-- ${name}
-- =============================================================================

${sql.trim()}
`);
}

/* ── ثبت در دفترِ migration ها ───────────────────────────────────────────
   ⚠️ `ON DUPLICATE KEY UPDATE` و نه `INSERT` خالی: ممکن است ردیف از قبل
   باشد (import قبلی تا آنجا رسیده بوده) و آن‌وقت یک INSERT ساده کلِ فایل
   را با خطای کلید تکراری متوقف می‌کرد — یعنی همان دامی که اول ما را به
   اینجا رساند.

   ⚠️ checksum دقیقاً با همان الگوریتمِ `scripts/migrate.mjs` حساب شده، تا
   اگر روزی اجراکننده روی این دیتابیس اجرا شود نگوید «فایل بعد از اعمال
   عوض شده». */
const rows = sections.map(
  ({ name, sql, checksum }) =>
    `  ('${name}', '${checksum}', CURRENT_TIMESTAMP(6), ${splitSqlStatements(sql).length})`,
);

parts.push(`
-- =============================================================================
-- ثبتِ migration ها در دفتر
-- =============================================================================

CREATE TABLE IF NOT EXISTS \`schema_migrations\` (
  \`name\`        VARCHAR(191) NOT NULL,
  \`checksum\`    CHAR(64)     NOT NULL,
  \`started_at\`  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  \`finished_at\` DATETIME(6)  NULL,
  \`statements\`  INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (\`name\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

INSERT INTO \`schema_migrations\` (\`name\`, \`checksum\`, \`finished_at\`, \`statements\`) VALUES
${rows.join(",\n")}
ON DUPLICATE KEY UPDATE
  \`checksum\`    = VALUES(\`checksum\`),
  \`finished_at\` = VALUES(\`finished_at\`),
  \`statements\`  = VALUES(\`statements\`);
`);

/* ── گزارشِ پایانی ───────────────────────────────────────────────────────
   ⚠️ بدونِ این، تنها بازخوردِ هاست یک «Go» سبز است — و همان سبز را وقتی
   هم می‌گیری که هیچ‌کدام از جدول‌ها ساخته نشده باشند. این SELECT صریح
   می‌گوید هر جدول هست یا نه. */
const tables = [];
for (const { sql } of sections) {
  for (const m of sql.matchAll(/create\s+table\s+if\s+not\s+exists\s+`([^`]+)`/gi)) {
    tables.push(m[1]);
  }
}

parts.push(`
-- =============================================================================
-- وضعیت — این جدول باید بعد از اجرا نمایش داده شود
-- =============================================================================

SELECT
  t.\`نام جدول\`,
  CASE WHEN i.TABLE_NAME IS NULL THEN 'ساخته نشد ✗' ELSE 'موجود ✓' END AS \`وضعیت\`
FROM (
${tables.map((t) => `  SELECT '${t}' AS \`نام جدول\``).join("\n  UNION ALL\n")}
) AS t
LEFT JOIN information_schema.TABLES i
  ON i.TABLE_SCHEMA = DATABASE() AND i.TABLE_NAME = t.\`نام جدول\`;
`);

await mkdir(dirname(OUT), { recursive: true });
const body = parts.join("\n");
await writeFile(OUT, body);

console.log(`ساخته شد: ${OUT.slice(ROOT.length + 1)}  (${(body.length / 1024).toFixed(0)} کیلوبایت)`);
console.log(`migration ها: ${names.join("، ")}`);
console.log(`جدول‌ها: ${tables.join("، ")}`);
