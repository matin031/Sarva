"use server";

import { revalidatePath } from "next/cache";
import type { FieldDef, QueryResult } from "pg";
import { getPool } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import { enumArg } from "@/lib/api/action-input";
import { rateLimit } from "@/lib/api/rate-limit";
import { recordAudit, recordError } from "@/lib/admin/audit";
import { logger } from "@/lib/observability";
import {
  MAX_RESULT_ROWS,
  MAX_SQL_LENGTH,
  SQL_STATEMENT_TIMEOUT_MS,
  type SqlRunMode,
} from "@/lib/admin/sql-constants";
import { inspectSql } from "@/lib/admin/sql-guard";

/**
 * کنسول SQL پنل مدیریت.
 *
 * ---------------------------------------------------------------------------
 * چرا اصلاً چنین چیزی هست
 * ---------------------------------------------------------------------------
 * پنل برای کارهای روزمره فرم دارد. ولی «۵۰۰ سؤال را یکجا وارد کن»، «همهٔ
 * سؤال‌های درس ۳ را پاک کن»، «نقشِ این ده کاربر را عوض کن» با فرم نمی‌شود —
 * و راهِ امروزی‌اش SSH زدن به سرور بود، که یعنی عملاً غیرممکن.
 *
 * ---------------------------------------------------------------------------
 * ⚠️ این خطرناک‌ترین صفحهٔ کل سایت است
 * ---------------------------------------------------------------------------
 * هر کسی که به اینجا برسد، *همه‌کارهٔ* دیتابیس است. پس هفت لایه محافظت دارد و
 * هیچ‌کدام تزئینی نیستند:
 *
 *   ۱) `requireAdmin()` — مثل هر اکشن مدیریتی دیگر.
 *   ۲) سقف نرخ، تا یک نشستِ رهاشده در مرورگرِ باز به ابزار حمله تبدیل نشود.
 *   ۳) **حالت پیش‌نمایش پیش‌فرض است**: کوئری داخل تراکنش اجرا و بعد rollback
 *      می‌شود. یعنی می‌بینید چه اتفاقی *می‌افتاد*، بدون اینکه بیفتد. ثبتِ
 *      واقعی یک دکمهٔ جداست.
 *   ۴) `statement_timeout` — یک کوئریِ اشتباه نباید دیتابیس را قفل کند.
 *   ۵) جدول‌های محافظت‌شده: `admin_audit_log` و `schema_migrations` فقط
 *      خواندنی‌اند. اولی چون لاگی که بشود پاکش کرد لاگ نیست، دومی چون دست
 *      بردن در آن یعنی migration ها دیگر درست اجرا نمی‌شوند.
 *   ۶) الگوهای واقعاً ویرانگر (`drop database`, `copy … from program`,
 *      `pg_read_file`, …) اصلاً اجرا نمی‌شوند.
 *   ۷) **هر اجرا در لاگ ممیزی ثبت می‌شود** — چه پیش‌نمایش و چه ثبتِ واقعی،
 *      با متن کوئری. این تنها راهی است که بعداً بشود فهمید چه شد.
 *
 * ---------------------------------------------------------------------------
 * آنچه محافظت *نمی‌کند*
 * ---------------------------------------------------------------------------
 * یک `select password_hash from users` کاملاً مجاز است. این ذاتیِ SQL خام
 * است و راهی برای بستنش بدون بی‌فایده کردنِ ابزار وجود ندارد. تنها دفاع،
 * همان چیزی است که همیشه بوده: نقشِ مدیر را فقط به کسی بدهید که به او
 * اعتماد دارید — و لاگ ممیزی، که می‌گوید چه کسی چه پرسید.
 */

export type SqlColumn = { name: string; dataType: string };

export type SqlStatementResult = {
  /** SELECT / INSERT / UPDATE / … — همان چیزی که خودِ پستگرس برمی‌گرداند. */
  command: string;
  /** تعداد ردیفِ برگشتی یا تحت‌تأثیر. */
  rowCount: number;
  columns: SqlColumn[];
  /** مقادیر همه به رشته تبدیل شده‌اند تا از Server Action رد شوند. */
  rows: (string | null)[][];
  /** ردیف‌ها بیشتر از سقف نمایش بودند و بریده شدند. */
  truncated: boolean;
};

export type SqlRunResult =
  | {
      ok: true;
      mode: SqlRunMode;
      /** در حالت پیش‌نمایش همیشه false — یعنی چیزی واقعاً نوشته نشد. */
      committed: boolean;
      durationMs: number;
      statements: SqlStatementResult[];
      /** هشدارهایی که پیش از اجرا تشخیص داده شدند (مثلاً delete بدون where). */
      warnings: string[];
    }
  | {
      ok: false;
      /** پیام خطای پستگرس. اینجا — و فقط اینجا — عمداً خام نشان داده می‌شود:
       *  مخاطبش مدیری است که دارد SQL می‌نویسد و بدون «column x does not
       *  exist» هیچ‌کاری نمی‌تواند بکند. */
      error: string;
      /** SQLSTATE، وقتی خطا از خودِ پستگرس آمده باشد. */
      code: string | null;
      /** جای خطا در متن کوئری، اگر پستگرس گفته باشد. */
      position: number | null;
      hint: string | null;
      warnings: string[];
    };

// ---------------------------------------------------------------------------
// اجرا
// ---------------------------------------------------------------------------

/** مقدارِ هر خانه، آمادهٔ رفتن به مرورگر. */
function cellToString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return `\\x${value.toString("hex").slice(0, 200)}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type PgError = { message?: string; code?: string; position?: string; hint?: string; detail?: string };

export async function adminRunSql(sql: string, mode: string): Promise<SqlRunResult> {
  const admin = await requireAdmin();
  const runMode: SqlRunMode = enumArg(mode, ["preview", "commit"], "حالت اجرا نامعتبر است.");

  if (typeof sql !== "string" || !sql.trim()) {
    return { ok: false, error: "کوئری خالی است.", code: null, position: null, hint: null, warnings: [] };
  }
  if (sql.length > MAX_SQL_LENGTH) {
    return {
      ok: false,
      error: `متن کوئری از ${MAX_SQL_LENGTH.toLocaleString("fa-IR")} نویسه بلندتر است. آن را به چند تکه بشکنید.`,
      code: null,
      position: null,
      hint: null,
      warnings: [],
    };
  }

  // سقفِ نرخ، به‌ازای هر مدیر. سخاوتمندانه برای کارِ واقعی، بی‌فایده برای
  // اسکریپتی که با نشستِ دزدیده‌شده کار می‌کند.
  const limit = rateLimit(`sql-console:${admin.id}`, 60, 5 * 60);
  if (!limit.allowed) {
    return {
      ok: false,
      error: `اجراهای زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`,
      code: null,
      position: null,
      hint: null,
      warnings: [],
    };
  }

  const inspection = inspectSql(sql);

  if (inspection.blocked) {
    // ⚠️ تلاشِ رد‌شده هم ثبت می‌شود — و مهم‌تر از اجراهای موفق است. «کسی
    // سعی کرد دیتابیس را drop کند» دقیقاً همان چیزی است که باید در لاگ
    // ممیزی بماند.
    await audit(admin, sql, runMode, false, [], 0, `blocked:${inspection.blocked.kind}`);

    return {
      ok: false,
      error:
        inspection.blocked.kind === "forbidden"
          ? `این دستور اجرا نمی‌شود (${inspection.blocked.reason}). چنین کاری اگر واقعاً لازم است باید روی خودِ سرور و با آگاهی کامل انجام شود، نه از یک صفحهٔ وب.`
          : inspection.blocked.reason,
      code: null,
      position: null,
      hint: null,
      warnings: [],
    };
  }

  const warnings = inspection.warnings;
  const startedAt = performance.now();

  // اتصالِ اختصاصی: هم برای تراکنش لازم است و هم تا `statement_timeout` روی
  // بقیهٔ اپ اثر نگذارد.
  const client = await getPool().connect();
  let committed = false;

  try {
    await client.query("begin");
    // `set local` یعنی با پایانِ تراکنش خودش برمی‌گردد.
    await client.query(`set local statement_timeout = ${SQL_STATEMENT_TIMEOUT_MS}`);

    // pg وقتی هیچ پارامتری ندهیم از پروتکل سادهٔ کوئری استفاده می‌کند، پس
    // چند دستور با ; هم اجرا می‌شوند و آرایه‌ای از نتیجه‌ها برمی‌گردد —
    // دقیقاً همان چیزی که «۵۰۰ سؤال را یکجا وارد کن» لازم دارد.
    const raw = (await client.query(sql)) as unknown;
    const results = (Array.isArray(raw) ? raw : [raw]) as QueryResult<Record<string, unknown>>[];

    const statements: SqlStatementResult[] = results.map((result) => {
      const rows = (result.rows ?? []) as Record<string, unknown>[];
      const capped = rows.slice(0, MAX_RESULT_ROWS);

      return {
        command: result.command ?? "",
        rowCount: result.rowCount ?? rows.length,
        columns: (result.fields ?? []).map((f: FieldDef) => ({
          name: f.name,
          dataType: String(f.dataTypeID),
        })),
        rows: capped.map((row) =>
          (result.fields ?? []).map((f: FieldDef) => cellToString(row[f.name])),
        ),
        truncated: rows.length > MAX_RESULT_ROWS,
      };
    });

    if (runMode === "commit") {
      await client.query("commit");
      committed = true;
    } else {
      // ⚠️ قلبِ ایمنیِ این ابزار: در پیش‌نمایش، هرچه نوشته شده برمی‌گردد.
      await client.query("rollback");
    }

    const durationMs = Math.round(performance.now() - startedAt);

    await audit(admin, sql, runMode, committed, statements, durationMs, null);

    return { ok: true, mode: runMode, committed, durationMs, statements, warnings };
  } catch (err) {
    await client.query("rollback").catch(() => {});

    const pgErr = err as PgError;
    const durationMs = Math.round(performance.now() - startedAt);

    await audit(admin, sql, runMode, false, [], durationMs, pgErr.code ?? "unknown");

    // خطای خودِ کوئری، خرابیِ سرور نیست — پس در app_error_log نمی‌نشیند.
    // فقط وقتی ثبت می‌شود که اتصال یا خودِ دیتابیس مشکل داشته باشد.
    if (!pgErr.code) {
      await recordError("db", err, "کنسول SQL");
    }

    return {
      ok: false,
      error: pgErr.message ?? "اجرای کوئری ناموفق بود.",
      code: pgErr.code ?? null,
      position: pgErr.position ? Number(pgErr.position) : null,
      hint: pgErr.hint ?? pgErr.detail ?? null,
      warnings,
    };
  } finally {
    client.release();
    if (committed) {
      // یک insert در جدولِ محتوا باید بلافاصله در صفحه‌های ادمین دیده شود.
      revalidatePath("/admin", "layout");
    }
  }
}

/** ثبت در لاگ ممیزی — بدون استثنا، حتی برای پیش‌نمایش. */
async function audit(
  admin: { id: string; email: string; fullName: string | null; role: "student" | "admin"; emailVerified: boolean; isBanned: boolean; createdAt: string },
  sql: string,
  mode: SqlRunMode,
  committed: boolean,
  statements: SqlStatementResult[],
  durationMs: number,
  errorCode: string | null,
): Promise<void> {
  const affected = statements.reduce((sum, s) => sum + s.rowCount, 0);
  const commands = [...new Set(statements.map((s) => s.command).filter(Boolean))];

  await recordAudit({
    actor: admin,
    action: "sql.execute",
    targetType: "database",
    targetId: mode,
    summary: errorCode?.startsWith("blocked:")
      ? "اجرای SQL رد شد (دستور ممنوع)"
      : errorCode
      ? `اجرای SQL شکست خورد (${errorCode})`
      : committed
        ? `اجرای SQL — ${commands.join("، ") || "بدون دستور"}، ${affected} ردیف`
        : `پیش‌نمایش SQL — ${commands.join("، ") || "بدون دستور"}، ${affected} ردیف (ثبت نشد)`,
    metadata: {
      // ⚠️ متن کوئری عمداً ذخیره می‌شود: بدون آن، این ردیف فقط می‌گوید «کاری
      // شد» و نمی‌گوید چه کاری. redact مقادیرِ رازمانند را قبل از ذخیره
      // می‌پوشاند.
      statement: sql.slice(0, 4000),
      mode,
      committed,
      duration_ms: durationMs,
      rows_affected: affected,
      error_code: errorCode,
    },
  });

  logger.info(committed ? "کوئری SQL از پنل اجرا شد" : "پیش‌نمایش SQL از پنل", {
    event: committed ? "admin.sql.committed" : "admin.sql.previewed",
    user_id: admin.id,
    duration_ms: durationMs,
    rows_affected: affected,
    sql_commands: commands,
    error_code: errorCode ?? undefined,
  });
}

// ---------------------------------------------------------------------------
// راهنمای اسکیما
// ---------------------------------------------------------------------------

export type SchemaColumn = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
  /** «جدول.ستون»ی که به آن اشاره می‌کند، اگر کلید خارجی باشد. */
  references: string | null;
};

export type SchemaTable = {
  name: string;
  /** تخمینِ تعداد ردیف از آمار پستگرس — ارزان، و برای «این جدول خالی است یا
   *  نه» کافی. */
  approxRows: number;
  columns: SchemaColumn[];
  /**
   * محدودیت‌های check و unique، به همان شکلی که خودِ پستگرس می‌نویسد.
   *
   * ⚠️ این مهم‌ترین بخشِ راهنماست و نه تزئین: ستون `grade` از نوع text است،
   * ولی فقط سه مقدار می‌پذیرد (`dahom`, `yazdahom`, `davazdahom`). بدون این
   * فهرست، «text» به کاربر می‌گوید «هرچه خواستی بنویس» و اولین insert با
   * خطای check برمی‌گردد.
   */
  constraints: { name: string; definition: string }[];
};

/**
 * ساختار واقعیِ دیتابیس، همان لحظه.
 *
 * از خودِ دیتابیس خوانده می‌شود و نه از یک فهرستِ دستی در کد — وگرنه اولین
 * migration ای که یادتان برود اینجا هم اضافه کنید، این راهنما را به دروغ
 * تبدیل می‌کند.
 */
export async function adminSchemaOverview(): Promise<SchemaTable[]> {
  await requireAdmin();

  const client = await getPool().connect();
  try {
    const { rows } = await client.query<{
      table_name: string;
      approx_rows: string;
      column_name: string;
      data_type: string;
      is_nullable: boolean;
      column_default: string | null;
      is_pk: boolean;
      referenced: string | null;
    }>(`
      select
        c.relname                                        as table_name,
        greatest(c.reltuples, 0)::bigint::text           as approx_rows,
        a.attname                                        as column_name,
        format_type(a.atttypid, a.atttypmod)             as data_type,
        not a.attnotnull                                 as is_nullable,
        pg_get_expr(d.adbin, d.adrelid)                  as column_default,
        coalesce(pk.is_pk, false)                        as is_pk,
        fk.referenced                                    as referenced
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
      left join lateral (
        select true as is_pk
          from pg_constraint pc
         where pc.conrelid = c.oid and pc.contype = 'p' and a.attnum = any (pc.conkey)
         limit 1
      ) pk on true
      left join lateral (
        select cl.relname || '.' || fa.attname as referenced
          from pg_constraint fc
          join pg_class cl on cl.oid = fc.confrelid
          join pg_attribute fa on fa.attrelid = fc.confrelid and fa.attnum = fc.confkey[1]
         where fc.conrelid = c.oid and fc.contype = 'f' and a.attnum = fc.conkey[1]
         limit 1
      ) fk on true
      where c.relkind = 'r'
      order by c.relname, a.attnum
    `);

    // محدودیت‌ها جدا خوانده می‌شوند: چسباندنشان به کوئری بالا هر ستون را به
    // تعداد محدودیت‌های جدول تکرار می‌کرد.
    const { rows: constraintRows } = await client.query<{
      table_name: string;
      name: string;
      definition: string;
    }>(`
      select c.relname                as table_name,
             con.conname              as name,
             pg_get_constraintdef(con.oid) as definition
        from pg_constraint con
        join pg_class c on c.oid = con.conrelid
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
       where con.contype in ('c', 'u')
       order by c.relname, con.conname
    `);

    const tables = new Map<string, SchemaTable>();
    for (const row of rows) {
      let table = tables.get(row.table_name);
      if (!table) {
        table = {
          name: row.table_name,
          approxRows: Number(row.approx_rows),
          columns: [],
          constraints: [],
        };
        tables.set(row.table_name, table);
      }
      table.columns.push({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default,
        isPrimaryKey: row.is_pk,
        references: row.referenced,
      });
    }

    for (const row of constraintRows) {
      tables.get(row.table_name)?.constraints.push({
        name: row.name,
        definition: row.definition,
      });
    }

    return [...tables.values()];
  } finally {
    client.release();
  }
}
