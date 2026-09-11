#!/usr/bin/env node
/**
 * همهٔ migration ها را در **یک فایل SQL** می‌ریزد تا در phpMyAdmin وارد شود.
 *
 * چرا لازم است: روی هاست اشتراکی خط فرمان در دسترس نیست، پس اجراکنندهٔ
 * migration نمی‌تواند اجرا شود. تنها راهِ ساختنِ جدول‌ها، وارد کردنِ یک فایل
 * SQL از phpMyAdmin است.
 *
 * ⚠️ کاری که این فایل می‌کند و یک dump ساده نمی‌کند: در پایان، همان
 * migration ها را در جدول schema_migrations **ثبت‌شده** علامت می‌زند.
 *
 * بدون آن، اگر روزی اجراکننده روی این دیتابیس اجرا شود، فکر می‌کند هیچ
 * migration ای اعمال نشده و از اول شروع می‌کند — و روی «table already
 * exists» می‌میرد، وسطِ کار، با اسکیمایی که حالا نیمه‌کاره است.
 */

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");
const MIGRATIONS = join(ROOT, "mysql-migrations");
const OUT_DIR = join(ROOT, "deploy");

// ⚠️ `--from 003` یعنی «فقط migration های تازه».
//
// چرا لازم شد: فایلِ کامل فقط روی دیتابیسِ *خالی* وارد می‌شود. دیتابیسِ سایتِ
// زنده جدول‌هایش را دارد و وارد کردنِ دوبارهٔ ۰۰۱ روی «table already exists»
// می‌میرد — آن هم وسطِ کار، چون phpMyAdmin تراکنش ندارد.
//
// پس برای به‌روزرسانیِ یک سایتِ زنده، فقط فایل‌هایی که هنوز اعمال نشده‌اند
// ساخته می‌شوند. کدام‌ها اعمال شده‌اند را در phpMyAdmin ببینید:
//   SELECT name FROM schema_migrations ORDER BY name;
const fromArg = (() => {
  const i = process.argv.indexOf("--from");
  return i !== -1 ? process.argv[i + 1] : null;
})();

const allFiles = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
const files = fromArg ? allFiles.filter((f) => f >= fromArg) : allFiles;

if (allFiles.length === 0) {
  console.error("هیچ فایل migration ای پیدا نشد.");
  process.exit(1);
}
if (files.length === 0) {
  console.error(`هیچ migration ای با نامِ «${fromArg}» یا بعد از آن نیست.`);
  console.error(`موجود: ${allFiles.join("، ")}`);
  process.exit(1);
}

const parts = [];

const OUT = join(OUT_DIR, fromArg ? `sarva-database-${fromArg}.sql` : "sarva-database.sql");

parts.push(
  fromArg
    ? `-- =============================================================================
-- سروا — به‌روزرسانیِ دیتابیسِ موجود
-- =============================================================================
--
-- ⚠️ این فایل دیتابیس را **نمی‌سازد**؛ فقط چیزهای تازه را اضافه می‌کند. برای
-- یک دیتابیسِ خالی به‌جای این، \`npm run host:sql\` (بدون --from) را بزنید.
--
-- پیش از وارد کردن، از دیتابیس یک backup بگیرید (در phpMyAdmin تب Export).
-- اگر چیزی نیمه‌کاره ماند، برگرداندنِ backup تنها راهِ مطمئن است: phpMyAdmin
-- تراکنش ندارد و MySQL هم CREATE TABLE را rollback نمی‌کند.
--
-- در phpMyAdmin روی نامِ دیتابیس کلیک کنید، بعد تب Import.
--
-- شاملِ: ${files.join("، ")}
-- =============================================================================
`
    : `-- =============================================================================
-- سروا — ساختِ کاملِ دیتابیس
-- =============================================================================
--
-- این فایل را در phpMyAdmin وارد کنید (تب Import).
--
-- پیش از وارد کردن، دیتابیس را در بخش «MySQL Databases» ساخته باشید و در
-- phpMyAdmin روی نامِ همان دیتابیس کلیک کرده باشید. این فایل عمداً دستور
-- CREATE DATABASE ندارد: روی هاست اشتراکی نامِ دیتابیس پیشوندِ حساب شما را
-- دارد و اینجا قابلِ حدس زدن نیست.
--
-- ساخته‌شده از: ${files.join("، ")}
-- =============================================================================
`,
);

// همان تنظیماتِ نشستی که اجراکنندهٔ migration هم می‌گذارد؛ بدونشان یک
// import می‌تواند با collation یا منطقهٔ زمانیِ دیگری بنویسد.
parts.push(`
SET NAMES utf8mb4;
SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET SESSION time_zone = '+00:00';
`);

// --- نگهبانِ سازگاری ------------------------------------------------------
//
// ⚠️ نسخهٔ اول این بلوک وجودِ `utf8mb4_bin` را می‌سنجید و روی MariaDB
// با پیام «MySQL 8 نیست» متوقف می‌شد. آن بررسی *خودش* اشتباه بود: هاست
// این پروژه MariaDB است و اسکیما حالا طوری نوشته شده که روی هر دو کار کند.
//
// چیزی که واقعاً باید سنجیده شود، وجودِ همان دو collation ای است که اسکیما
// به آن‌ها تکیه دارد — و هر دو در MySQL 5.5+ و MariaDB 5.5+ هستند. اگر
// روزی روی موتوری وارد شود که ندارد، دستورهای اول یکی‌یکی خطا می‌دهند و
// phpMyAdmin ممکن است ادامه بدهد؛ نتیجه‌اش نیمی از جدول‌ها و سایتی است که
// به‌شکل‌های عجیب می‌شکند. این بلوک همان‌جا و پیش از ساختِ هر چیزی
// متوقفش می‌کند.
parts.push(`-- --------------------------------------------------------------------------
-- بررسی سازگاری، پیش از ساختِ هر چیزی
-- --------------------------------------------------------------------------
DELIMITER $$
DROP PROCEDURE IF EXISTS \`sarva_precheck\`$$
CREATE PROCEDURE \`sarva_precheck\`()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.collations
     WHERE collation_name IN ('utf8mb4_bin', 'utf8mb4_unicode_ci')
     GROUP BY NULL HAVING COUNT(DISTINCT collation_name) = 2
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
      'این دیتابیس utf8mb4 کامل ندارد. به پشتیبانی هاست بگویید MySQL 8 یا MariaDB 10.4 به بالا بدهند.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.engines
     WHERE engine = 'InnoDB' AND support IN ('YES', 'DEFAULT')
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
      'موتور InnoDB در دسترس نیست. بدون آن نه کلید خارجی هست نه تراکنش.';
  END IF;
END$$
DELIMITER ;
CALL \`sarva_precheck\`();
DROP PROCEDURE \`sarva_precheck\`;
`);

for (const file of files) {
  const sql = await readFile(join(MIGRATIONS, file), "utf8");
  parts.push(`
-- =============================================================================
-- ${file}
-- =============================================================================

${sql.trim()}
`);
}

// --- ثبتِ migration ها -------------------------------------------------------
const rows = [];
for (const file of files) {
  const sql = await readFile(join(MIGRATIONS, file), "utf8");
  // ⚠️ checksum باید *دقیقاً* همان‌طور حساب شود که اجراکننده حساب می‌کند،
  // وگرنه اجرای بعدی می‌گوید «فایل بعد از اعمال عوض شده» و متوقف می‌شود.
  const checksum = createHash("sha256").update(sql).digest("hex");
  const statements = sql.split(";").filter((s) => s.trim()).length;
  rows.push(`  (${JSON.stringify(file)}, '${checksum}', CURRENT_TIMESTAMP(6), ${statements})`);
}

parts.push(`
-- =============================================================================
-- ثبتِ migration های اعمال‌شده
-- =============================================================================
--
-- ⚠️ این بخش را حذف نکنید. بدون آن، اگر روزی اجراکنندهٔ migration روی این
-- دیتابیس اجرا شود، فکر می‌کند هیچ‌چیز اعمال نشده و از اول شروع می‌کند — و
-- وسطِ کار روی «table already exists» می‌میرد، با اسکیمایی که حالا نیمه‌کاره
-- است.

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
ON DUPLICATE KEY UPDATE \`checksum\` = VALUES(\`checksum\`), \`finished_at\` = VALUES(\`finished_at\`);

-- تمام. ${fromArg ? `${files.length} migration تازه اعمال شد.` : `حالا باید ${files.length} migration و همهٔ جدول‌ها ساخته شده باشند.`}
`);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, parts.join("\n"));

const size = (parts.join("\n").length / 1024).toFixed(0);
console.log(`ساخته شد: ${OUT.slice(ROOT.length + 1)}  (${size} کیلوبایت، از ${files.length} فایل)`);
