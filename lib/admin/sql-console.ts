"use server";

import { revalidatePath } from "next/cache";
import {
  SCHEMA_COLUMNS_SQL,
  SCHEMA_CONSTRAINTS_SQL,
} from "@/lib/admin/sql-introspection";
import mysql, { type Connection, type FieldPacket, type ResultSetHeader } from "mysql2/promise";
import { splitSqlStatements, hasImplicitCommit, commandOf } from "@/lib/admin/sql-split";
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
 *
 *      ⚠️ و همین‌جاست که MySQL با PostgreSQL فرق می‌کند: آنجا این تضمین
 *      برای *همه‌چیز* برقرار بود، حتی DDL. در MySQL هر
 *      CREATE/ALTER/DROP/TRUNCATE یک commit ضمنی دارد و تراکنش را پیش از
 *      خودش می‌بندد — یعنی «پیش‌نمایشِ» یک drop table جدول را واقعاً
 *      می‌انداخت و بعد می‌گفت «چیزی نوشته نشد».
 *
 *      پس آن دستورها اصلاً وارد کنسول نمی‌شوند (lib/admin/sql-guard.ts) و
 *      تغییر اسکیما جایش در migration هاست. کنسول ابزارِ SELECT و DML است.
 *
 *   ۴) **مهلتِ اجرا** — یک کوئریِ اشتباه نباید دیتابیس را قفل کند.
 *
 *      ⚠️ در MySQL معادلِ یک‌خطیِ `statement_timeout` وجود ندارد.
 *      `max_execution_time` فقط روی SELECT های فقط‌خواندنی کار می‌کند و
 *      یک UPDATE بی‌انتها را متوقف نمی‌کند. پس علاوه بر آن، یک نگهبان روی
 *      اتصالِ دوم می‌نشیند و در صورت گذشتنِ مهلت، `KILL QUERY` می‌فرستد.
 *      مهلتِ سمت کلاینت به‌تنهایی کافی نیست: درخواست برمی‌گردد ولی کوئری
 *      روی سرور همچنان اجرا می‌شود.
 *   ۵) جدول‌های محافظت‌شده: `admin_audit_log` و `schema_migrations` فقط
 *      خواندنی‌اند. اولی چون لاگی که بشود پاکش کرد لاگ نیست، دومی چون دست
 *      بردن در آن یعنی migration ها دیگر درست اجرا نمی‌شوند.
 *   ۶) الگوهای واقعاً ویرانگر (`drop database`, `load_file`, `into outfile`,
 *      `load data`, `prepare`, `set global`, …) اصلاً اجرا نمی‌شوند.
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
  /** SELECT / INSERT / UPDATE / … — از خودِ متنِ دستور خوانده می‌شود، چون
   *  MySQL بر خلاف PostgreSQL نامِ دستور را در نتیجه برنمی‌گرداند. */
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

type MysqlError = {
  message?: string;
  sqlMessage?: string;
  code?: string;
  errno?: number;
  sqlState?: string;
};

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

  // دستورها همین‌جا و با آگاهی از نحوِ MySQL جدا می‌شوند، و یکی‌یکی
  // فرستاده می‌شوند.
  //
  // ⚠️ عمداً از multipleStatements استفاده نمی‌شود. اگر روشن بود، سرور کلِ
  // دسته را یک‌جا می‌گرفت و دیگر معلوم نبود کدام دستور شکسته — و مهم‌تر،
  // هر جای دیگری از اپ که روزی به این اتصال می‌رسید هم چنددستوری می‌شد.
  const statementsSql = splitSqlStatements(sql);
  if (statementsSql.length === 0) {
    return { ok: false, error: "کوئری خالی است.", code: null, position: null, hint: null, warnings };
  }

  // ⚠️ خطِ دفاع دوم. inspectSql روی کلِ متن کار می‌کند؛ این روی تک‌تکِ
  // دستورهای جداشده. یک دستورِ DDL که لابه‌لای چند دستورِ دیگر پنهان شده
  // باشد اینجا هم گرفته می‌شود.
  const ddl = statementsSql.find((st) => hasImplicitCommit(st));
  if (ddl) {
    await audit(admin, sql, runMode, false, [], 0, "blocked:implicit-commit");
    return {
      ok: false,
      error:
        "یکی از دستورها در MySQL «commit ضمنی» دارد، پس پیش‌نمایشش واقعاً اجرا " +
        `می‌شد:\n\n    ${ddl.replace(/\s+/g, " ").slice(0, 120)}\n\n` +
        "تغییر اسکیما جایش در یک فایل migration است.",
      code: null,
      position: null,
      hint: null,
      warnings,
    };
  }

  // ⚠️ اتصالِ اختصاصی و *بیرون از pool اپ*.
  //
  // سه دلیل: تنظیماتِ نشست (مهلت اجرا) نباید روی بقیهٔ اپ اثر بگذارد،
  // تراکنش اتصالِ خودش را می‌خواهد، و نگهبانِ مهلت باید شناسهٔ همین اتصال
  // را بداند تا بتواند کوئری‌اش را بکشد.
  const conn = await openConsoleConnection();
  let committed = false;

  try {
    const [[idRow]] = await conn.query<mysql.RowDataPacket[]>("select connection_id() as id");
    const connectionId = Number(idRow.id);

    // مهلتِ سمتِ سرور برای SELECT ها. روی DML اثر ندارد — آن را نگهبانِ
    // پایین‌تر پوشش می‌دهد.
    await conn.query(`set session max_execution_time = ${SQL_STATEMENT_TIMEOUT_MS}`);

    await conn.beginTransaction();

    const statements: SqlStatementResult[] = [];
    for (const statementSql of statementsSql) {
      statements.push(await runOneStatement(conn, connectionId, statementSql));
    }

    if (runMode === "commit") {
      await conn.commit();
      committed = true;
    } else {
      // ⚠️ قلبِ ایمنیِ این ابزار: در پیش‌نمایش، هرچه نوشته شده برمی‌گردد.
      //
      // و این ادعا فقط به این دلیل راست است که دستورهای دارای commit ضمنی
      // بالاتر مسدود شده‌اند. بدون آن گارد، این خط یک دروغ بود.
      await conn.rollback();
    }

    const durationMs = Math.round(performance.now() - startedAt);
    await audit(admin, sql, runMode, committed, statements, durationMs, null);

    return { ok: true, mode: runMode, committed, durationMs, statements, warnings };
  } catch (err) {
    await conn.rollback().catch(() => {});

    const myErr = err as MysqlError;
    const durationMs = Math.round(performance.now() - startedAt);

    await audit(admin, sql, runMode, false, [], durationMs, String(myErr.errno ?? "unknown"));

    // خطای خودِ کوئری، خرابیِ سرور نیست — پس در app_error_log نمی‌نشیند.
    // فقط وقتی ثبت می‌شود که اتصال یا خودِ دیتابیس مشکل داشته باشد.
    if (!myErr.errno) {
      await recordError("db", err, "کنسول SQL");
    }

    return {
      ok: false,
      // ⚠️ sqlMessage و نه message: mysql2 در message کلِ متنِ کوئری را هم
      // می‌چسباند، و آن متن می‌تواند مقدارِ حساس داشته باشد.
      error: myErr.sqlMessage ?? myErr.message ?? "اجرای کوئری ناموفق بود.",
      code: myErr.code ?? (myErr.errno ? String(myErr.errno) : null),
      position: null,
      hint: myErr.sqlState ?? null,
      warnings,
    };
  } finally {
    await conn.end().catch(() => {});
    if (committed) {
      // یک insert در جدولِ محتوا باید بلافاصله در صفحه‌های ادمین دیده شود.
      revalidatePath("/admin", "layout");
    }
  }
}

/**
 * اتصالِ کنسول.
 *
 * ⚠️ عمداً از pool اپ نمی‌آید و typeCast هم ندارد: اینجا هدف *نمایشِ خام*
 * است، نه شکل دادن به داده برای منطق برنامه. اگر typeCast اپ اعمال می‌شد،
 * مدیر مقدارِ تبدیل‌شده را می‌دید نه آنچه واقعاً در ستون است — و کنسولی که
 * واقعیت را نشان ندهد به چه درد می‌خورد.
 */
async function openConsoleConnection(): Promise<Connection> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL تنظیم نشده است.");
  return mysql.createConnection({
    uri: url,
    multipleStatements: false,
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

/**
 * یک دستور، با نگهبانِ مهلت.
 *
 * ⚠️ چرا نگهبان لازم است و `max_execution_time` کافی نیست:
 *
 * آن تنظیم فقط روی SELECT های فقط‌خواندنی اثر دارد. یک
 * `update … where <شرطی که هیچ index ای ندارد>` روی جدولِ بزرگ می‌تواند
 * دقیقه‌ها قفل نگه دارد و آن تنظیم اصلاً نمی‌بیندش.
 *
 * و مهلتِ سمتِ کلاینت (رها کردنِ انتظار) هم کافی نیست: درخواستِ وب برمی‌گردد
 * ولی کوئری روی سرور همچنان اجرا می‌شود و قفل‌هایش را نگه می‌دارد.
 *
 * پس نگهبان از اتصالِ *دوم* یک `KILL QUERY` می‌فرستد. این فقط همان دستور را
 * می‌کشد و نه کلِ اتصال را، پس تراکنش زنده می‌ماند و rollbackِ بعدی کارش را
 * می‌کند.
 */
async function runOneStatement(
  conn: Connection,
  connectionId: number,
  statementSql: string,
): Promise<SqlStatementResult> {
  let killer: NodeJS.Timeout | undefined;
  let killed = false;

  const armed = new Promise<void>((resolve) => {
    killer = setTimeout(() => {
      killed = true;
      // اتصالِ جدا، چون اتصالِ اصلی همین حالا مشغولِ همان کوئری است.
      openConsoleConnection()
        .then(async (k) => {
          await k.query(`kill query ${connectionId}`).catch(() => {});
          await k.end().catch(() => {});
        })
        .catch(() => {})
        .finally(resolve);
    }, SQL_STATEMENT_TIMEOUT_MS);
  });
  void armed;

  try {
    const [result, fields] = await conn.query(statementSql);

    // ⚠️ کشته شدن همیشه خطا نمی‌دهد.
    //
    // بیشتر کوئری‌ها با KILL QUERY خطای ۱۳۱۷ می‌دهند، ولی نه همه: مثلاً
    // `select sleep(10)` فقط زودتر برمی‌گردد و مقدار ۱ می‌دهد. اگر فقط به
    // شاخهٔ catch تکیه می‌کردیم، چنین کوئری‌ای «موفق» گزارش می‌شد در حالی
    // که نصفه‌کاره رها شده بود.
    if (killed) {
      throw new Error(
        `این دستور از مهلتِ ${Math.round(SQL_STATEMENT_TIMEOUT_MS / 1000)} ثانیه گذشت و متوقف شد. ` +
          "شرطِ where را محدودتر کنید یا با limit کارش را بشکنید.",
      );
    }

    if (Array.isArray(result)) {
      const rows = result as Record<string, unknown>[];
      const capped = rows.slice(0, MAX_RESULT_ROWS);
      const cols = (fields ?? []) as FieldPacket[];
      return {
        command: commandOf(statementSql),
        rowCount: rows.length,
        columns: cols.map((f) => ({ name: f.name, dataType: String(f.type ?? "") })),
        rows: capped.map((row) => cols.map((f) => cellToString(row[f.name]))),
        truncated: rows.length > MAX_RESULT_ROWS,
      };
    }

    const header = result as ResultSetHeader;
    return {
      command: commandOf(statementSql),
      rowCount: header.affectedRows ?? 0,
      columns: [],
      rows: [],
      truncated: false,
    };
  } catch (err) {
    if (killed) {
      throw new Error(
        `این دستور از مهلتِ ${Math.round(SQL_STATEMENT_TIMEOUT_MS / 1000)} ثانیه گذشت و متوقف شد. ` +
          "شرطِ where را محدودتر کنید یا با limit کارش را بشکنید.",
      );
    }
    throw err;
  } finally {
    if (killer) clearTimeout(killer);
  }
}


// ---------------------------------------------------------------------------
// لاگ ممیزی
// ---------------------------------------------------------------------------

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

  const conn = await openConsoleConnection();
  try {
    // ⚠️ کلِ این بخش از pg_catalog به information_schema رفت.
    //
    // چند چیز در MySQL جای دیگری است یا اصلاً نیست:
    //
    //   • تخمین تعداد ردیف: به‌جای reltuples، ستون table_rows در
    //     information_schema.tables. برای InnoDB این هم تخمین است و نه
    //     شمارشِ دقیق — همان‌طور که reltuples بود. برای «این جدول خالی است
    //     یا نه» کافی است و ارزان.
    //
    //   • تعریفِ CHECK: در MySQL 8 جدولِ check_constraints دارد، ولی بر
    //     خلاف pg_get_constraintdef، مقدارهای مجاز را به شکلی می‌نویسد که
    //     خواندنش سخت‌تر است. همان متن نمایش داده می‌شود؛ مهم این است که
    //     مدیر بداند ستون grade فقط سه مقدار می‌پذیرد.
    //
    //   • ENUM: در PostgreSQL یک نوعِ جدا بود و اینجا داخلِ خودِ
    //     column_type می‌آید. پس column_type خوانده می‌شود و نه data_type —
    //     اولی `enum('a','b')` و `varchar(191)` می‌دهد، دومی فقط `enum` و
    //     `varchar` که برای مدیر بی‌فایده است.
    const [rows] = await conn.query<mysql.RowDataPacket[]>(
      SCHEMA_COLUMNS_SQL,
    );

    // محدودیت‌ها جدا خوانده می‌شوند: چسباندنشان به کوئری بالا هر ستون را به
    // تعداد محدودیت‌های جدول تکرار می‌کرد.
    const [constraintRows] = await conn.query<mysql.RowDataPacket[]>(
      // ⚠️ information_schema.check_constraints ستون table_name **ندارد**.
      //
      // ستون‌هایش فقط این چهارتاست: CONSTRAINT_CATALOG، CONSTRAINT_SCHEMA،
      // CONSTRAINT_NAME و CHECK_CLAUSE. یعنی خودش نمی‌داند قید مالِ کدام
      // جدول است؛ آن را باید از table_constraints گرفت.
      //
      // این باگ از هیچ‌کدام از بررسی‌های خودکار رد نمی‌شد: db:check-sql
      // عمداً کنسول را رد می‌کند (کوئریِ کنسول را کاربر می‌نویسد) و
      // db:check-snippets فقط الگوهای آماده را می‌سنجد، نه کوئریِ
      // درون‌نگریِ خودِ کنسول. فقط با باز کردن صفحهٔ /admin/sql پیدا شد.
      SCHEMA_CONSTRAINTS_SQL,
    );

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
        // ⚠️ مقایسه در SQL انجام شده و نتیجه‌اش ۰/۱ است، نه boolean —
        // اتصالِ کنسول عمداً typeCast ندارد. پس اینجا صریح تبدیل می‌شود.
        nullable: Number(row.is_nullable) === 1,
        default: row.column_default,
        isPrimaryKey: Number(row.is_pk) === 1,
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
    await conn.end().catch(() => {});
  }
}
