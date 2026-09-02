/**
 * بررسی‌های پیش از اجرای SQL در کنسول پنل.
 *
 * جدا از lib/admin/sql-console.ts است تا بشود مستقیم در `node --test` صدایش
 * زد — و باید هم زد: این کد تنها چیزی است که میان یک صفحهٔ وب و
 * `drop database` ایستاده، و «به نظر درست می‌آید» برای چنین چیزی کافی نیست.
 *
 * ⚠️ این لایهٔ *اول* است، نه آخر. لایهٔ آخر پیش‌نمایشِ داخل تراکنش است
 * (کوئری اجرا و بعد rollback می‌شود). هیچ‌کدام از این الگوها ادعا نمی‌کنند
 * تحلیل‌گر کاملِ SQL اند.
 */

import { PROTECTED_TABLES } from "@/lib/admin/sql-constants";

/**
 * متنِ کوئری، بدون رشته‌ها و کامنت‌ها.
 *
 * بدون این، یک `insert into notes (body) values ('drop database')` به‌عنوان
 * «drop database» تشخیص داده می‌شد و بی‌دلیل رد می‌شد — و برعکس، یک کامنت
 * می‌توانست بررسی را گمراه کند:
 *
 *     -- بی‌خطر است
 *     /* update *​/ delete from users
 *
 * هر رشته با `''` جایگزین می‌شود (نه با فاصله) تا شکلِ دستور دست‌نخورده
 * بماند، و شناسهٔ داخل گیومه بدون گیومه نگه داشته می‌شود تا
 * `delete from "users"` هم دیده شود.
 */
export function stripLiterals(sql: string): string {
  let out = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    // رشتهٔ تک‌کوتیشنی، با '' به‌عنوان کوتیشنِ فرار
    if (ch === "'") {
      i++;
      while (i < sql.length) {
        if (sql[i] === "'" && sql[i + 1] === "'") i += 2;
        else if (sql[i] === "'") {
          i++;
          break;
        } else i++;
      }
      out += " '' ";
      continue;
    }

    // شناسهٔ داخل گیومه
    if (ch === '"') {
      i++;
      let name = "";
      while (i < sql.length && sql[i] !== '"') name += sql[i++];
      i++;
      out += ` ${name} `;
      continue;
    }

    // رشتهٔ دلاری: $$…$$ یا $tag$…$tag$
    if (ch === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (tag) {
        const end = sql.indexOf(tag[0], i + tag[0].length);
        i = end === -1 ? sql.length : end + tag[0].length;
        out += " '' ";
        continue;
      }
    }

    // کامنت خطی
    if (ch === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      out += " ";
      continue;
    }

    // کامنت بلوکی (تودرتو، همان‌طور که پستگرس اجازه می‌دهد)
    if (ch === "/" && sql[i + 1] === "*") {
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql[i] === "/" && sql[i + 1] === "*") {
          depth++;
          i += 2;
        } else if (sql[i] === "*" && sql[i + 1] === "/") {
          depth--;
          i += 2;
        } else i++;
      }
      out += " ";
      continue;
    }

    out += ch;
    i++;
  }

  return out.replace(/\s+/g, " ").trim().toLowerCase();
}

/** الگوهایی که هیچ کارِ مشروعی در این پنل ندارند و می‌توانند سرور را از بین
 *  ببرند یا فایل‌های آن را بخوانند. */
const FORBIDDEN: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bdrop\s+database\b/, reason: "حذف کل دیتابیس" },
  { pattern: /\bdrop\s+schema\b/, reason: "حذف اسکیما" },
  { pattern: /\bcreate\s+database\b/, reason: "ساخت دیتابیس" },
  { pattern: /\balter\s+system\b/, reason: "تغییر پیکربندی خودِ پستگرس" },
  { pattern: /\bcopy\b[^;]*\bfrom\s+program\b/, reason: "اجرای دستور روی سیستم‌عامل" },
  { pattern: /\bcopy\b[^;]*\bto\s+program\b/, reason: "اجرای دستور روی سیستم‌عامل" },
  {
    pattern: /\bpg_read_file\b|\bpg_read_binary_file\b|\bpg_ls_dir\b/,
    reason: "خواندن فایل‌های سرور",
  },
  {
    pattern: /\bpg_terminate_backend\b|\bpg_cancel_backend\b/,
    reason: "قطع اتصال‌های دیگر",
  },
  {
    pattern: /\bcreate\s+(or\s+replace\s+)?(extension|language)\b/,
    reason: "نصب افزونه یا زبان",
  },
  {
    pattern: /\bgrant\b|\brevoke\b|\bcreate\s+role\b|\balter\s+role\b|\bdrop\s+role\b|\bcreate\s+user\b|\balter\s+user\b/,
    reason: "تغییر دسترسی‌های دیتابیس",
  },
];

/** نوشتن روی جدول‌های محافظت‌شده. */
function protectedWrite(normalized: string): string | null {
  for (const table of PROTECTED_TABLES) {
    const write = new RegExp(
      `\\b(insert\\s+into|update|delete\\s+from|truncate(\\s+table)?|drop\\s+table(\\s+if\\s+exists)?|alter\\s+table)\\s+(only\\s+)?(public\\.)?${table}\\b`,
    );
    if (write.test(normalized)) return table;
  }
  return null;
}

/** چیزهایی که مجازند ولی باید *قبل* از اجرا دیده شوند. */
function collectWarnings(normalized: string): string[] {
  const warnings: string[] = [];

  // delete/update بدون where — بی‌سروصداترین راهِ از دست دادنِ یک جدول.
  if (/\bdelete\s+from\s+[\w."]+\s*(;|$)/.test(normalized)) {
    warnings.push("یک «delete» بدون شرط where دارید: تمام ردیف‌های آن جدول پاک می‌شوند.");
  }
  if (/\bupdate\s+[\w."]+\s+set\b(?![^;]*\bwhere\b)/.test(normalized)) {
    warnings.push("یک «update» بدون شرط where دارید: تمام ردیف‌های آن جدول تغییر می‌کنند.");
  }
  if (/\btruncate\b/.test(normalized)) {
    warnings.push("«truncate» کل جدول را خالی می‌کند و شمارنده‌های identity را هم صفر می‌کند.");
  }
  if (/\bdrop\s+table\b/.test(normalized)) {
    warnings.push("«drop table» جدول و همهٔ داده‌هایش را برای همیشه می‌برد.");
  }
  if (/\balter\s+table\b/.test(normalized)) {
    warnings.push(
      "«alter table» اسکیما را عوض می‌کند. تغییر ماندگارِ اسکیما باید در یک فایل migration باشد، وگرنه سرور بعدی این تغییر را ندارد.",
    );
  }
  if (/\b(update|insert\s+into|delete\s+from)\s+(public\.)?users\b/.test(normalized)) {
    warnings.push(
      "دارید جدول کاربران را تغییر می‌دهید. رمز عبور با argon2 هش می‌شود و در SQL ساختنی نیست؛ نوشتن متن ساده در password_hash یعنی آن کاربر هرگز نمی‌تواند وارد شود.",
    );
  }

  return warnings;
}

export type SqlInspection = {
  /** اگر پر باشد، کوئری اصلاً اجرا نمی‌شود. */
  blocked: { reason: string; kind: "forbidden" | "protected-table" } | null;
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
