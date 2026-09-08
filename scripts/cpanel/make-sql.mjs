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
const OUT = join(ROOT, "deploy", "sarva-database.sql");

const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
if (files.length === 0) {
  console.error("هیچ فایل migration ای پیدا نشد.");
  process.exit(1);
}

const parts = [];

parts.push(`-- =============================================================================
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

SET NAMES utf8mb4;
SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
SET SESSION time_zone = '+00:00';
`);

// --- نگهبانِ نسخه ------------------------------------------------------------
//
// ⚠️ اگر این فایل روی موتوری وارد شود که collation های utf8mb4_0900_* را
// ندارد، دستورهای اول یکی‌یکی خطا می‌دهند و phpMyAdmin ممکن است ادامه بدهد —
// نتیجه‌اش نیمی از جدول‌ها و یک سایتِ خراب است.
//
// این بلوک همان‌جا با یک پیام روشن متوقفش می‌کند، پیش از آنکه چیزی ساخته شود.
parts.push(`-- --------------------------------------------------------------------------
-- بررسی سازگاری، پیش از ساختِ هر چیزی
-- --------------------------------------------------------------------------
DELIMITER $$
DROP PROCEDURE IF EXISTS \`sarva_precheck\`$$
CREATE PROCEDURE \`sarva_precheck\`()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.collations
     WHERE collation_name = 'utf8mb4_0900_as_cs'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT =
      'این دیتابیس MySQL 8 نیست. به پشتیبانی هاست بگویید دیتابیس MySQL 8 بدهند.';
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_cs;

INSERT INTO \`schema_migrations\` (\`name\`, \`checksum\`, \`finished_at\`, \`statements\`) VALUES
${rows.join(",\n")}
ON DUPLICATE KEY UPDATE \`checksum\` = VALUES(\`checksum\`), \`finished_at\` = VALUES(\`finished_at\`);

-- تمام. حالا باید ${files.length} migration و همهٔ جدول‌ها ساخته شده باشند.
`);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, parts.join("\n"));

const size = (parts.join("\n").length / 1024).toFixed(0);
console.log(`ساخته شد: deploy/sarva-database.sql  (${size} کیلوبایت، از ${files.length} فایل)`);
