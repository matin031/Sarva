/**
 * اتصالِ مشترکِ اسکریپت‌ها به MySQL.
 *
 * ⚠️ چرا lib/db مستقیم import نمی‌شود: آن ماژول با "server-only" علامت خورده
 * است و از یک اسکریپت نودِ ساده قابل بارگذاری نیست. پس همان تنظیمات اینجا
 * تکرار می‌شود — و چون تکرار است، هر تغییری در lib/db باید اینجا هم بیاید.
 * (scripts/db-check.mjs همین همسانی را می‌سنجد.)
 */

import mysql from "mysql2/promise";

function datetimeToIso(raw) {
  if (raw.startsWith("0000-")) return raw;
  const [d, t = "00:00:00"] = raw.split(" ");
  const [clock, frac] = t.split(".");
  return `${d}T${clock}.${(frac ?? "").padEnd(3, "0")}Z`;
}

/** آینهٔ typeCast در lib/db/index.ts. */
export function typeCast(field, next) {
  const value = next();
  if (value === null || value === undefined) return null;
  switch (field.type) {
    case "DATETIME":
    case "TIMESTAMP":
      return typeof value === "string" ? datetimeToIso(value) : value.toISOString();
    case "DATE":
    case "NEWDATE":
      return value;
    case "NEWDECIMAL":
    case "DECIMAL":
      return typeof value === "number" ? value : Number(value);
    case "LONGLONG": {
      if (typeof value === "number") return value;
      const n = Number(value);
      return Number.isSafeInteger(n) ? n : value;
    }
    case "TINY":
      return field.length === 1 ? value !== 0 : value;
    default:
      return value;
  }
}

export function requireEnv(name, hint = "") {
  if (!process.env[name]) {
    try {
      process.loadEnvFile(".env.local");
    } catch {
      /* فایل نیست؛ اشکالی ندارد. */
    }
  }
  const value = process.env[name];
  if (!value) {
    console.error(
      `${name} تنظیم نشده است.` +
        (hint ? `\n  ${hint}` : "\n  در داکر از compose می‌آید؛ محلی در .env.local بگذارید."),
    );
    process.exit(1);
  }
  return value;
}

/** یک اتصالِ تکی با همان قراردادهای lib/db. */
export function connect(url = requireEnv("DATABASE_URL")) {
  return mysql.createConnection({
    uri: url,
    typeCast,
    dateStrings: true,
    timezone: "Z",
    supportBigNumbers: true,
    bigNumberStrings: true,
    multipleStatements: false,
  });
}

/**
 * آیا این upsert یک درجِ تازه بود یا یک به‌روزرسانی؟
 *
 * در PostgreSQL این را با ترفندِ `returning (xmax = 0) as is_insert` می‌گرفتند.
 * MySQL چیزی مستقیم‌تر دارد: در `INSERT … ON DUPLICATE KEY UPDATE`، مقدارِ
 * affectedRows معنایی است —
 *
 *     ۱ = ردیف تازه درج شد
 *     ۲ = ردیفِ موجود به‌روز شد
 *     ۰ = ردیف بود ولی هیچ ستونی واقعاً عوض نشد
 *
 * ⚠️ حالت صفر همان چیزی است که یک شمارشِ ساده‌لوحانه را خراب می‌کند: «۰ یعنی
 * چیزی نشد» درست است ولی «۰ یعنی درج نشد» هم درست است — پس برای شمردنِ
 * «چند تا تازه بودند» فقط ۱ حساب می‌شود.
 */
export function upsertKind(affectedRows) {
  if (affectedRows === 1) return "inserted";
  if (affectedRows === 2) return "updated";
  return "unchanged";
}
