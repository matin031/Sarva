/**
 * بررسی‌های پیش از اجرای SQL در کنسول پنل.
 *
 * جدا از lib/admin/sql-console.ts است تا بشود مستقیم در `node --test` صدایش
 * زد — و باید هم زد: این کد تنها چیزی است که میان یک صفحهٔ وب و
 * `drop database` ایستاده، و «به نظر درست می‌آید» برای چنین چیزی کافی نیست.
 *
 * =============================================================================
 * ⚠️ در MySQL، «پیش‌نمایش» دیگر لایهٔ آخر نیست
 * =============================================================================
 *
 * نسخهٔ PostgreSQL این محافظ را «لایهٔ اول» می‌نامید و می‌گفت لایهٔ آخر
 * پیش‌نمایشِ داخل تراکنش است: کوئری اجرا می‌شود و بعد rollback. آنجا آن
 * تضمین *کامل* بود، چون PostgreSQL حتی DDL را هم برمی‌گرداند.
 *
 * در MySQL برنمی‌گرداند. هر CREATE/ALTER/DROP/TRUNCATE و چند دستور دیگر یک
 * **commit ضمنی** دارند: تراکنش همان‌جا بسته می‌شود و rollbackِ بعدی هیچ
 * کاری نمی‌کند — بی‌آنکه خطایی بدهد. یعنی «پیش‌نمایشِ» یک `drop table`
 * جدول را واقعاً می‌انداخت و بعد با خیال راحت می‌گفت «چیزی نوشته نشد».
 *
 * پس تقسیم کار عوض شده: چنین دستورهایی اصلاً از این محافظ رد نمی‌شوند.
 * کنسول به SELECT و DML محدود است و تغییرِ اسکیما جایش در migration هاست —
 * که هم بازگشت‌پذیر است و هم روی سرورِ بعدی هم اعمال می‌شود.
 */

import { PROTECTED_TABLES } from "@/lib/admin/sql-constants";

/**
 * متنِ کوئری، بدون رشته‌ها و کامنت‌ها.
 *
 * بدون این، یک `insert into notes (body) values ('drop database')` به‌عنوان
 * «drop database» تشخیص داده می‌شد و بی‌دلیل رد می‌شد — و برعکس، یک کامنت
 * می‌توانست بررسی را گمراه کند.
 *
 * ⚠️ تفاوت‌ها با نسخهٔ PostgreSQL، که هرکدام یک راهِ دور زدن بودند:
 *
 *   • **backtick**. در MySQL شناسه‌ها با ` نقل‌قول می‌شوند. نسخهٔ قبلی
 *     نمی‌شناختش، پس `` delete from `users` `` از الگوی «نوشتن روی جدول
 *     محافظت‌شده» رد می‌شد.
 *
 *   • **کامنت #**. MySQL این را هم کامنت می‌داند. نسخهٔ قبلی فقط `--` و
 *     `/* *​/` را می‌شناخت.
 *
 *   • **`-- ` باید فاصله داشته باشد**. در MySQL بر خلاف PostgreSQL،
 *     `--x` کامنت *نیست*. اگر مثل قبل هر `--` را کامنت می‌گرفتیم،
 *     `select 1--2` نیمه‌کاره بریده می‌شد.
 *
 *   • **کامنتِ اجرایی `/*! … *​/`**. محتوایش برای MySQL دستورِ واقعی است.
 *     حذفش یعنی دقیقاً همان چیزی که اجرا می‌شود از دید محافظ پنهان بماند —
 *     پس محتوایش نگه داشته و بازرسی می‌شود.
 *
 *   • **بدون رشتهٔ دلاری و بدون کامنتِ تودرتو**: هیچ‌کدام در MySQL وجود
 *     ندارند و پشتیبانی‌شان فقط سطحِ حمله اضافه می‌کرد.
 *
 *   • **گریزِ بک‌اسلش**. در MySQL (بدون NO_BACKSLASH_ESCAPES) داخل رشته،
 *     `\'` یک کوتیشنِ ادبی است. نسخهٔ قبلی این را نمی‌دانست، پس
 *     `'\''` پایانِ رشته را اشتباه پیدا می‌کرد و بقیهٔ دستور را رشته
 *     می‌پنداشت.
 */
export function stripLiterals(sql: string): string {
  let out = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // رشتهٔ تک‌کوتیشنی یا دوکوتیشنی.
    //
    // ⚠️ در MySQL، " هم رشته است (نه شناسه، مگر با ANSI_QUOTES). هر دو
    // یکسان با '' / "" و \ گریز می‌خورند.
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      while (i < sql.length) {
        if (sql[i] === "\\") i += 2;
        else if (sql[i] === quote && sql[i + 1] === quote) i += 2;
        else if (sql[i] === quote) {
          i++;
          break;
        } else i++;
      }
      out += " '' ";
      continue;
    }

    // شناسهٔ داخل backtick — بدون backtick نگه داشته می‌شود تا
    // `delete from `users`` هم دیده شود.
    if (ch === "`") {
      i++;
      let name = "";
      while (i < sql.length) {
        if (sql[i] === "`" && sql[i + 1] === "`") {
          name += "`";
          i += 2;
        } else if (sql[i] === "`") {
          i++;
          break;
        } else name += sql[i++];
      }
      out += ` ${name} `;
      continue;
    }

    // کامنت خطی: `-- ` (با فاصلهٔ اجباری) یا `#`
    if (ch === "-" && sql[i + 1] === "-" && /[\s\0]|^$/.test(sql[i + 2] ?? "")) {
      while (i < sql.length && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }
    if (ch === "#") {
      while (i < sql.length && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }

    // کامنت بلوکی
    if (ch === "/" && sql[i + 1] === "*") {
      // ⚠️ کامنتِ اجرایی: `/*!40101 …*/` و `/*+ …*/`.
      //
      // اولی را MySQL اجرا می‌کند و دومی راهنمای بهینه‌ساز است. محتوای
      // اجرایی باید *بماند* تا بازرسی شود؛ اگر مثل کامنتِ معمولی حذف
      // می‌شد، `/*!  drop table users */` از دید محافظ نامرئی بود و از
      // دید سرور یک دستورِ کامل.
      const executable = sql[i + 2] === "!" || sql[i + 2] === "+";
      const close = sql.indexOf("*/", i + 2);
      const end = close === -1 ? sql.length : close + 2;
      if (executable) {
        // شمارهٔ نسخه (`!40101`) خودش دستور نیست و کنار گذاشته می‌شود.
        out += " " + sql.slice(i + 3, close === -1 ? sql.length : close).replace(/^\d+/, "") + " ";
      } else {
        out += " ";
      }
      i = end;
      continue;
    }

    out += ch;
    i++;
  }

  return out.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * الگوهایی که هیچ کارِ مشروعی در این پنل ندارند و می‌توانند سرور را از بین
 * ببرند یا فایل‌های آن را بخوانند.
 *
 * ⚠️ کلِ این فهرست از PostgreSQL به MySQL ترجمه شده و نه فقط ترجمه: توانایی‌ها
 * در دو موتور از درهای متفاوتی می‌آیند. `pg_read_file` معادل MySQL ندارد، ولی
 * `LOAD_FILE()` دقیقاً همان کار را می‌کند.
 */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bdrop\s+database\b/, reason: "حذف کل دیتابیس" },
  { pattern: /\bdrop\s+schema\b/, reason: "حذف اسکیما" },
  { pattern: /\bcreate\s+(database|schema)\b/, reason: "ساخت دیتابیس" },

  {
    // ⚠️ خواندنِ فایل‌های سرور — معادلِ pg_read_file.
    //
    // LOAD_FILE هر فایلی را که کاربرِ سرویس بتواند بخواند برمی‌گرداند.
    // secure_file_priv معمولاً محدودش می‌کند، ولی تکیه بر یک تنظیمِ سرور
    // برای چیزی که از یک صفحهٔ وب می‌آید کافی نیست.
    pattern: /\bload_file\s*\(/,
    reason: "خواندن فایل‌های سرور",
  },
  {
    // نوشتنِ فایل روی سرور — معادلِ lo_export و COPY TO PROGRAM.
    // یک `select … into outfile '/var/www/x.php'` یعنی اجرای کد.
    pattern: /\binto\s+(outfile|dumpfile)\b/,
    reason: "نوشتن فایل روی سرور",
  },
  {
    // خواندنِ فایل از سمتِ کلاینت یا سرور. LOCAL INFILE حتی می‌تواند
    // فایلِ *فرایندِ اپ* را بخواند.
    pattern: /\bload\s+(data|xml)\b/,
    reason: "بارگذاری فایل در جدول",
  },

  {
    // ⚠️ کورکنندهٔ خودِ این گارد — همان نقشی که در PostgreSQL بلوکِ DO داشت.
    //
    // این محافظ متن را می‌خواند. PREPARE دستورِ واقعی را داخل یک رشته
    // پنهان می‌کند و stripLiterals — که وظیفه‌اش حذف رشته‌هاست — دقیقاً
    // همان رشته را برمی‌دارد:
    //
    //     prepare s from 'delete from admin_audit_log'; execute s;
    //
    // نه اخطار می‌گرفت، نه به سدِ جدول‌های محافظت‌شده: گارد هیچ دستوری
    // نمی‌دید.
    //
    // CALL هم اینجاست چون یک رویه می‌تواند خودش COMMIT کند و از rollbackِ
    // حالت پیش‌نمایش بیرون بزند.
    pattern: /(^|;)\s*(prepare\s|execute\s|deallocate\s|call\s)/,
    reason: "اجرای دستورِ ساخته‌شده در لحظه، که از دید این محافظ پنهان می‌ماند",
  },

  {
    // تغییر پیکربندی سرور یا نشست، از جمله چیزهایی که خودِ محافظ را
    // بی‌اثر می‌کنند: sql_mode، foreign_key_checks، autocommit،
    // unique_checks. خاموش کردنِ foreign_key_checks یعنی می‌شود ردیف‌های
    // یتیم ساخت که هیچ FK ای جلویشان را نمی‌گیرد.
    pattern: /(^|;)\s*set\s+(global|session|persist|persist_only|@@)/,
    reason: "تغییر پیکربندی سرور یا نشست",
  },
  {
    pattern:
      /(^|;)\s*set\s+(sql_mode|foreign_key_checks|unique_checks|autocommit|sql_log_bin|sql_safe_updates)\b/,
    reason: "تغییر تنظیماتی که خودِ محافظ‌ها را بی‌اثر می‌کند",
  },

  {
    // نقشِ اجراکننده — معادلِ set role / set session authorization.
    pattern: /(^|;)\s*set\s+(role|password)\b/,
    reason: "تغییر نقش یا رمزِ اجراکنندهٔ کوئری",
  },
  {
    pattern: /\bkill\s+(query|connection)?\s*\d*/,
    reason: "قطع اتصال‌های دیگر",
  },
  {
    pattern: /\bcreate\s+(function|procedure|trigger|event)\b|\bdrop\s+(function|procedure|trigger|event)\b/,
    reason: "ساخت یا حذف روتین و تریگر — اسکیما فقط در migration عوض می‌شود",
  },
  {
    pattern:
      /\bgrant\b|\brevoke\b|\bcreate\s+user\b|\balter\s+user\b|\bdrop\s+user\b|\brename\s+user\b|\bcreate\s+role\b|\bdrop\s+role\b/,
    reason: "تغییر دسترسی‌های دیتابیس",
  },
  {
    pattern: /\b(install|uninstall)\s+(plugin|component)\b/,
    reason: "نصب افزونه",
  },
  {
    // خواندنِ جدول‌های خودِ MySQL — از جمله mysql.user که هشِ رمزِ حساب‌های
    // دیتابیس در آن است.
    pattern: /\bmysql\s*\.\s*\w+/,
    reason: "دسترسی به جدول‌های داخلی MySQL",
  },
];

/**
 * دستورهایی که در MySQL **commit ضمنی** دارند.
 *
 * ⚠️ این فهرست جای یک ادعای دروغین را می‌گیرد.
 *
 * قلبِ ایمنیِ این ابزار «اجرا کن و بعد rollback» است. برای این دستورها آن
 * تضمین وجود ندارد: تراکنش پیش از اجرایشان بسته می‌شود و rollbackِ بعدی
 * بی‌اثر است. پس نمی‌شود پیش‌نمایششان کرد — و «پیش‌نمایشی» که واقعاً اجرا
 * می‌کند، از نبودنِ پیش‌نمایش بدتر است.
 *
 * فهرست از مستندات MySQL 8.4 «Statements That Cause an Implicit Commit».
 * عمداً سخت‌گیرانه است: یک موردِ اضافه فقط یعنی «این را در migration بنویس»،
 * ولی یک موردِ جامانده یعنی از دست رفتنِ داده در حالتی که کاربر فکر می‌کند
 * امن است.
 */
const IMPLICIT_COMMIT: { pattern: RegExp; what: string }[] = [
  { pattern: /(^|;)\s*create\s+(table|index|view|database|schema)\b/, what: "CREATE" },
  { pattern: /(^|;)\s*alter\s+(table|view|database|schema|instance)\b/, what: "ALTER" },
  { pattern: /(^|;)\s*drop\s+(table|index|view|database|schema)\b/, what: "DROP" },
  { pattern: /(^|;)\s*(rename\s+table|truncate)\b/, what: "RENAME/TRUNCATE" },
  { pattern: /(^|;)\s*(begin|start\s+transaction|commit|rollback|savepoint)\b/, what: "کنترل تراکنش" },
  { pattern: /(^|;)\s*(lock|unlock)\s+tables?\b/, what: "LOCK TABLES" },
  { pattern: /(^|;)\s*(analyze|check|optimize|repair)\s+table\b/, what: "نگهداری جدول" },
  { pattern: /(^|;)\s*flush\b/, what: "FLUSH" },
];

function implicitCommit(normalized: string): string | null {
  for (const rule of IMPLICIT_COMMIT) {
    if (rule.pattern.test(normalized)) return rule.what;
  }
  return null;
}

/**
 * نوشتن روی جدول‌های محافظت‌شده.
 *
 * ⚠️ فقط `delete from t` را نمی‌سنجد. MySQL چند شکلِ دیگر هم دارد که همان
 * کار را می‌کنند و نسخهٔ ساده از کنارشان رد می‌شد:
 *
 *     delete t from t join u on …        ← حذفِ چندجدولی
 *     delete from t as x where …         ← با alias
 *     update t join u set t.c = 1        ← به‌روزرسانیِ چندجدولی
 *     replace into t …                   ← حذف و درج
 *     insert into `t` …                  ← با backtick (که stripLiterals برمی‌دارد)
 *
 * پس به‌جای الگوی «کلمهٔ کلیدی + نامِ جدول»، هر جایی که نامِ جدولِ
 * محافظت‌شده در یک دستورِ *نویسنده* ظاهر شود مسدود می‌شود. این سخت‌گیرانه‌تر
 * از لازم است — `insert into x select … from admin_audit_log` هم رد می‌شود —
 * ولی برای جدولی که کل ارزشش در دست‌نخوردگی است، سخت‌گیریِ بیشتر بهتر از
 * یک درِ باز است.
 */
function protectedWrite(normalized: string): string | null {
  const isWriter = /(^|;)\s*(insert|update|delete|replace|truncate|drop|alter|rename)\b/.test(
    normalized,
  );
  if (!isWriter) return null;

  for (const table of PROTECTED_TABLES) {
    // مرزِ کلمه، تا `admin_audit_log_archive` را به اشتباه نگیرد.
    if (new RegExp(`\\b${table}\\b`).test(normalized)) return table;
  }
  return null;
}

/** چیزهایی که مجازند ولی باید *قبل* از اجرا دیده شوند. */
function collectWarnings(normalized: string): string[] {
  const warnings: string[] = [];

  // delete/update بدون where — بی‌سروصداترین راهِ از دست دادنِ یک جدول.
  if (/\bdelete\s+from\s+[\w.]+\s*(;|$)/.test(normalized)) {
    warnings.push("یک «delete» بدون شرط where دارید: تمام ردیف‌های آن جدول پاک می‌شوند.");
  }
  if (/\bupdate\s+[\w.]+\s+set\b(?![^;]*\bwhere\b)/.test(normalized)) {
    warnings.push("یک «update» بدون شرط where دارید: تمام ردیف‌های آن جدول تغییر می‌کنند.");
  }
  if (/\breplace\s+into\b/.test(normalized)) {
    // ⚠️ در MySQL این یک upsert نیست: ردیفِ قدیمی *حذف* و ردیفِ تازه درج
    // می‌شود. یعنی ستون‌هایی که ننوشته‌اید به پیش‌فرض برمی‌گردند و
    // تریگرهای delete هم اجرا می‌شوند.
    warnings.push(
      "«replace into» ردیف قدیمی را حذف و از نو درج می‌کند — ستون‌های ننوشته به پیش‌فرض " +
        "برمی‌گردند و تریگرهای حذف اجرا می‌شوند. اگر منظورتان به‌روزرسانی است، " +
        "«on duplicate key update» را بنویسید.",
    );
  }
  if (/\b(update|insert\s+into|delete\s+from|replace\s+into)\s+(\w+\.)?users\b/.test(normalized)) {
    warnings.push(
      "دارید جدول کاربران را تغییر می‌دهید. رمز عبور با argon2 هش می‌شود و در SQL ساختنی نیست؛ نوشتن متن ساده در password_hash یعنی آن کاربر هرگز نمی‌تواند وارد شود.",
    );
  }
  if (/\bclub_(likes|comments)\b/.test(normalized) && /(^|;)\s*(insert|delete|update)/.test(normalized)) {
    // ⚠️ شمارنده‌ها را تریگر نگه می‌دارد، ولی cascade تریگر را صدا نمی‌زند.
    warnings.push(
      "دست بردن در لایک‌ها یا دیدگاه‌ها شمارنده‌های سروده را کج می‌کند اگر حذف از راه " +
        "cascade انجام شود (در MySQL آبشار تریگر را اجرا نمی‌کند). بعدش " +
        "«call club_recount(null)» را بزنید.",
    );
  }

  return warnings;
}

export type SqlInspection = {
  /** اگر پر باشد، کوئری اصلاً اجرا نمی‌شود. */
  blocked: { reason: string; kind: "forbidden" | "protected-table" | "implicit-commit" } | null;
  /** هشدارهایی که پیش از اجرا به مدیر نشان داده می‌شوند. */
  warnings: string[];
  /** متنِ نرمال‌شده — برای تست و دیباگ. */
  normalized: string;
};

export function inspectSql(sql: string): SqlInspection {
  const normalized = stripLiterals(sql);

  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(normalized)) {
      return {
        blocked: { reason: rule.reason, kind: "forbidden" },
        warnings: [],
        normalized,
      };
    }
  }

  const ddl = implicitCommit(normalized);
  if (ddl) {
    return {
      blocked: {
        reason:
          `${ddl} در MySQL یک «commit ضمنی» دارد: تراکنش پیش از اجرا بسته می‌شود و ` +
          "rollback بعدش هیچ کاری نمی‌کند. یعنی پیش‌نمایشش واقعاً اجرا می‌شد — و " +
          "پیش‌نمایشی که اجرا می‌کند از نبودنش بدتر است.\n\n" +
          "تغییر اسکیما جایش در یک فایل migration است؛ آنجا هم ثبت می‌شود و هم روی " +
          "سرور بعدی اعمال می‌شود.",
        kind: "implicit-commit",
      },
      warnings: [],
      normalized,
    };
  }

  const table = protectedWrite(normalized);
  if (table) {
    return {
      blocked: {
        reason:
          table === "admin_audit_log"
            ? "لاگ ممیزی فقط خواندنی است. لاگی که بشود ویرایشش کرد، لاگ نیست."
            : "جدول schema_migrations فقط خواندنی است. دست بردن در آن یعنی migration های بعدی درست اجرا نمی‌شوند.",
        kind: "protected-table",
      },
      warnings: [],
      normalized,
    };
  }

  return { blocked: null, warnings: collectWarnings(normalized), normalized };
}
