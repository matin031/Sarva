/**
 * شکستنِ یک فایل SQL به دستورهای جدا.
 *
 * ⚠️ چرا `sql.split(";")` جواب نمی‌دهد:
 *
 *   • نقطه‌ویرگول داخلِ رشته: `insert … values ('a;b')`
 *   • نقطه‌ویرگول داخلِ کامنت: `-- تمام؛`
 *   • و مهم‌تر از همه، بدنهٔ تریگر و رویه:
 *
 *         CREATE TRIGGER t BEFORE UPDATE ON x
 *         FOR EACH ROW BEGIN
 *           SET NEW.a = 1;      ← این نقطه‌ویرگول پایانِ دستور نیست
 *         END
 *
 * مشتری‌های MySQL این را با دستورِ `DELIMITER` حل می‌کنند — که یک دستورِ
 * *کلاینت* است و نه SQL. سرور آن را نمی‌فهمد و اگر به درایور فرستاده شود
 * خطای نحوی می‌دهد.
 *
 * پس این ماژول همان کار را می‌کند: DELIMITER را می‌فهمد و مصرف می‌کند، و
 * بقیه را با آگاهی از رشته و کامنت می‌شکند.
 *
 * حالت‌هایی که تشخیص داده می‌شوند:
 *   '…'  "…"  `…`   با گریزِ بک‌اسلش و دوبل‌کردن
 *   -- …  # …  /* … *​/
 *   /*! … *​/  — کامنتِ اجرایی MySQL: محتوایش SQL است و باید بماند
 */

/**
 * @param {string} sql
 * @returns {string[]} دستورها، بدون رشته‌های خالی
 */
export function splitSqlStatements(sql) {
  /** @type {string[]} */
  const out = [];
  let delimiter = ";";
  let buf = "";
  let i = 0;

  const isSpace = (c) => c === " " || c === "\t" || c === "\r" || c === "\n";

  while (i < sql.length) {
    // --- دستورِ کلاینتیِ DELIMITER -----------------------------------------
    // فقط در ابتدای یک خط معنا دارد.
    if (buf.trim() === "" || /\n\s*$/.test(buf)) {
      const rest = sql.slice(i);
      const m = /^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*(\r?\n|$)/i.exec(rest);
      if (m) {
        // دستورِ قبلی را ببند (اگر چیزی مانده)
        if (buf.trim()) out.push(buf.trim());
        buf = "";
        delimiter = m[1];
        i += m[0].length;
        continue;
      }
    }

    const c = sql[i];

    // --- کامنت‌ها ----------------------------------------------------------
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
      // ⚠️ کامنتِ اجرایی /*!50000 … */ عمداً دست‌نخورده منتقل می‌شود: محتوایش
      // برای سرورهای به‌قدر کافی جدید، SQL واقعی است. حذفش یعنی بی‌صدا
      // انداختنِ بخشی از migration.
      buf += sql.slice(i, end);
      i = end;
      continue;
    }

    // --- رشته‌ها و شناسه‌های نقل‌قول‌دار --------------------------------------
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      buf += c;
      while (j < sql.length) {
        const d = sql[j];
        // بک‌اسلش فقط داخل ' و " گریز می‌دهد، نه داخل `
        if (d === "\\" && quote !== "`" && j + 1 < sql.length) {
          buf += sql.slice(j, j + 2);
          j += 2;
          continue;
        }
        // دوبل‌کردنِ خودِ نقل‌قول: '' و "" و ``
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

    // --- جداکننده ----------------------------------------------------------
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
  // دستورهایی که فقط کامنت‌اند چیزی برای اجرا ندارند.
  return out.filter((s) => stripComments(s).trim().length > 0);
}

/** فقط برای تشخیصِ «این دستور خالی است» — نه برای اجرا. */
function stripComments(s) {
  return s
    .replace(/\/\*![\s\S]*?\*\//g, "x") // کامنتِ اجرایی = محتوا دارد
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    // ⚠️ `(?=\n|$)` لازم است: خطی که فقط `--` دارد هم کامنت است. بدون آن،
    // یک فایل با هدرِ کامنت‌دار «شروع نمی‌شود با CREATE» تشخیص داده می‌شد و
    // hasImplicitCommit دروغ می‌گفت.
    .replace(/--(?:[ \t][^\n]*|(?=\n|$))/g, " ")
    .replace(/#[^\n]*/g, " ");
}

/**
 * آیا این دستور در MySQL **commit ضمنی** دارد؟
 *
 * ⚠️ این تابع پایهٔ دو تصمیم مهم است:
 *
 *   ۱) اجراکنندهٔ migration نمی‌تواند وانمود کند فایل‌ها اتمیک‌اند.
 *   ۲) کنسول SQL مدیر نمی‌تواند چنین دستوری را «پیش‌نمایش و بعد rollback»
 *      کند، چون rollback دیگر کاری نمی‌کند.
 *
 * فهرست از مستندات MySQL 8.4 «Statements That Cause an Implicit Commit»
 * گرفته شده. عمداً سخت‌گیرانه است: یک تطبیقِ اضافه فقط یعنی احتیاطِ بیشتر،
 * ولی یک موردِ جامانده یعنی ادعای دروغینِ بازگشت‌پذیری.
 */
export function hasImplicitCommit(statement) {
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
