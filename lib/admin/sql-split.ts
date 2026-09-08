/**
 * شکستنِ متنِ کنسول به دستورهای جدا، با آگاهی از نحوِ MySQL.
 *
 * ⚠️ چرا `sql.split(";")` جواب نمی‌دهد: نقطه‌ویرگول داخل رشته، داخل کامنت،
 * و داخل بدنهٔ تریگر/رویه. جزئیاتش در scripts/mysql/split-sql.mjs توضیح
 * داده شده — این فایل همان منطق است، به‌شکلی که از کدِ اپ (که TypeScript
 * است و به scripts/ دسترسی ندارد) قابل استفاده باشد.
 *
 * هر تغییری در یکی باید در دیگری هم بیاید؛ تست‌های
 * tests/admin/sql-split.test.ts هر دو را می‌سنجند.
 */

export function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let delimiter = ";";
  let buf = "";
  let i = 0;

  const isSpace = (c: string | undefined) =>
    c === " " || c === "\t" || c === "\r" || c === "\n";

  while (i < sql.length) {
    if (buf.trim() === "" || /\n\s*$/.test(buf)) {
      const m = /^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(\r?\n|$)/i.exec(sql.slice(i));
      if (m) {
        if (buf.trim()) out.push(buf.trim());
        buf = "";
        delimiter = m[1];
        i += m[0].length;
        continue;
      }
    }

    const c = sql[i];

    if (c === "-" && sql[i + 1] === "-" && (isSpace(sql[i + 2]) || sql[i + 2] === undefined)) {
      const nl = sql.indexOf("\n", i);
      const end = nl === -1 ? sql.length : nl;
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (c === "#") {
      const nl = sql.indexOf("\n", i);
      const end = nl === -1 ? sql.length : nl;
      buf += sql.slice(i, end);
      i = end;
      continue;
    }
    if (c === "/" && sql[i + 1] === "*") {
      const close = sql.indexOf("*/", i + 2);
      const end = close === -1 ? sql.length : close + 2;
      buf += sql.slice(i, end);
      i = end;
      continue;
    }

    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      buf += c;
      while (j < sql.length) {
        const d = sql[j];
        if (d === "\\" && quote !== "`" && j + 1 < sql.length) {
          buf += sql.slice(j, j + 2);
          j += 2;
          continue;
        }
        if (d === quote && sql[j + 1] === quote) {
          buf += d + d;
          j += 2;
          continue;
        }
        buf += d;
        j += 1;
        if (d === quote) break;
      }
      i = j;
      continue;
    }

    if (sql.startsWith(delimiter, i)) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      i += delimiter.length;
      continue;
    }

    buf += c;
    i += 1;
  }

  if (buf.trim()) out.push(buf.trim());
  return out.filter((s) => stripComments(s).trim().length > 0);
}

function stripComments(s: string): string {
  return s
    .replace(/\/\*![\s\S]*?\*\//g, "x")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--(?:[ \t][^\n]*|(?=\n|$))/g, " ")
    .replace(/#[^\n]*/g, " ");
}

/**
 * آیا این دستور در MySQL commit ضمنی دارد؟
 *
 * دومین خطِ دفاع بعد از inspectSql: آن روی کلِ متن کار می‌کند و این روی
 * تک‌تکِ دستورهای جداشده، تا چیزی از لابه‌لای چند دستور رد نشود.
 */
export function hasImplicitCommit(statement: string): boolean {
  const s = stripComments(statement).trim().toLowerCase().replace(/\s+/g, " ");
  return (
    /^(create|alter|drop|rename|truncate)\b/.test(s) ||
    /^(begin|start transaction|commit|rollback|savepoint|release savepoint|set autocommit)\b/.test(s) ||
    /^(grant|revoke|set password|create user|drop user|alter user|rename user|flush)\b/.test(s) ||
    /^(lock tables|unlock tables|analyze|check|optimize|repair)\b/.test(s) ||
    /^(install|uninstall)\b/.test(s) ||
    /^load (data|xml)\b/.test(s)
  );
}

/** نامِ دستور (SELECT/INSERT/…)، چون MySQL آن را در نتیجه برنمی‌گرداند. */
export function commandOf(statement: string): string {
  const s = stripComments(statement).trim();
  return (/^[a-z]+/i.exec(s)?.[0] ?? "").toUpperCase();
}
