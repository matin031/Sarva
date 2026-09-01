import "server-only";
import { createHash } from "node:crypto";
import { Pool, types, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { logger } from "@/lib/observability";

/**
 * اتصال به PostgreSQL — جایگزین سه کلاینت Supabase.
 *
 * تنها راه رسیدن به دیتابیس در کل پروژه همین فایل است. دیگر خبری از
 * «کلاینت مرورگری / کلاینت سشن‌دار / کلاینت service-role» نیست، چون آن تفکیک
 * فقط به این دلیل وجود داشت که RLS باید می‌فهمید درخواست از طرف کیست. حالا
 * هیچ درخواستی از مرورگر به دیتابیس نمی‌رسد، پس یک اتصال داریم و تصمیمِ
 * «این کاربر اجازهٔ این کار را دارد؟» بالاتر گرفته می‌شود — در lib/auth.
 */

// ---------------------------------------------------------------------------
// مبدل‌های نوع
// ---------------------------------------------------------------------------
// این بخش باید قبل از باز شدن هر اتصالی اجرا شود، وگرنه مبدل‌ها روی
// connection هایی که زودتر ساخته شده‌اند اثر نمی‌کنند.
//
// چرا اصلاً لازم است: PostgREST (که Supabase جلوی دیتابیس گذاشته بود) همه چیز
// را به JSON تبدیل می‌کرد، و کل کد این پروژه بر اساس همان JSON نوشته شده. درایور
// خام `pg` سه نوع را متفاوت برمی‌گرداند و هر سه بی‌سروصدا خراب می‌کنند:
//
//   • int8 (خروجی count(*)) → رشتهٔ "123" می‌آید نه عدد. یعنی total + 1
//     می‌شود "1231" و هیچ خطایی هم نمی‌دهد.
//
//   • numeric (نمرهٔ سؤال‌ها: score، total_score، section_score) → رشتهٔ "12.50".
//     یعنی جمعِ نمرات به‌جای عدد، الحاق رشته می‌شود. این بدترین حالت است چون
//     خطا نمی‌دهد، فقط نمرهٔ اشتباه می‌دهد.
//
//   • timestamptz → شیء Date می‌آید نه رشتهٔ ISO. کل lib/panel/format.ts
//     امضای (iso: string) دارد و داخلش Date.parse() صدا می‌زند؛ با Date
//     میلی‌ثانیه از دست می‌رود و groupIntoSessions اشتباه گروه‌بندی می‌کند.
//
// با این سه خط، شکلِ داده‌ای که به کد می‌رسد دقیقاً همان چیزی می‌ماند که تا
// دیروز از PostgREST می‌آمد — که یعنی فاز ۵ فقط کوئری‌ها را عوض می‌کند، نه
// منطق پایین‌دستشان را.

// پارسر اصلی باید قبل از جایگزینی گرفته شود، وگرنه بازگشتِ بی‌پایان می‌شود.
//
// ولی «گرفتنِ پارسر فعلی و پیچیدنش» فقط یک بار درست است، و این ماژول تضمینی
// ندارد که یک بار اجرا شود:
//
//   • جدولِ پارسرها داخل `pg-types` است و در Next 16 هر چیزی که در node_modules
//     باشد external است — یعنی یک نمونه در کل فرایند، از require نود.
//   • همین فایل ولی bundle می‌شود، و هر entry باندلِ خودش را دارد. proxy.ts به
//     lib/auth/session و از آنجا به همین فایل می‌رسد، route ها هم مستقلاً. در
//     dev هم هر بار کامپایل مجدد یک نمونهٔ تازه است. (کش کردن Pool روی
//     globalThis پایین همین فایل، اعترافِ همین موضوع است.)
//
// پس بارِ دوم، `getTypeParser` پارسر *اصلی* را برنمی‌گرداند؛ wrapper بارِ اول را
// برمی‌گرداند که رشته می‌دهد نه Date — و رشته `toISOString` ندارد:
//
//     TypeError: parseTimestamptz(...).toISOString is not a function
//
// این خطا در لاگین دیده شد (findUserByEmail، ستون created_at). ربطی به نسخهٔ
// پستگرس ندارد: اگر فرمتِ خروجی ناآشنا بود، postgres-date مقدار null می‌داد و
// پیام خطا «reading 'toISOString' of null» می‌شد، نه «is not a function».
//
// راه‌حل: wrapper خودمان را علامت‌دار می‌کنیم و اگر از قبل نشسته باشد دست
// نمی‌زنیم. برچسب یک رشتهٔ ثابت است نه Symbol، چون باید بین نمونه‌های مختلفِ
// این ماژول هم شناسایی شود.
const ISO_PARSER_BRAND = "__sarvaIsoTimestampParser";

type MaybeBrandedParser = ((raw: string) => unknown) & { [ISO_PARSER_BRAND]?: true };

function installIsoTimestampParser(oid: number): void {
  const current = types.getTypeParser(oid) as MaybeBrandedParser;
  if (current[ISO_PARSER_BRAND]) return; // قبلاً نصب شده

  const wrapper: MaybeBrandedParser = (raw: string) => {
    const parsed = current(raw);
    if (parsed instanceof Date) return parsed.toISOString();

    // 'infinity' و '-infinity' — پستگرس اجازه‌شان می‌دهد و postgres-date عددِ
    // Infinity برمی‌گرداند که ISO ندارد. متن خام رد می‌شود تا به‌جای ۵۰۰ گرفتن،
    // کدِ پایین‌دست چیزی ببیند که Date.parse رویش NaN می‌دهد و قابل تشخیص است.
    if (typeof parsed === "number") return raw;

    // رشته: یعنی برچسب را از دست داده‌ایم ولی زنجیره سالم است — دوباره نپیچ.
    if (typeof parsed === "string") return parsed;

    // null: تاریخی که parser نشناخته. همان null می‌ماند (مقدارِ SQL NULL هم
    // اصلاً به اینجا نمی‌رسد؛ pg خودش قبل از صدا زدن parser جدایش می‌کند).
    return parsed;
  };
  wrapper[ISO_PARSER_BRAND] = true;

  types.setTypeParser(oid, wrapper);
}

installIsoTimestampParser(types.builtins.TIMESTAMPTZ);
installIsoTimestampParser(types.builtins.TIMESTAMP);

// Number و نه parseFloat: parseFloat روی "12abc" مقدار ۱۲ می‌دهد و خرابی را
// پنهان می‌کند؛ Number در همان حالت NaN می‌دهد که دیده می‌شود.
//
// دقت: numeric در Postgres دلخواه‌دقت است و double نیست. اینجا بی‌خطر است چون
// تنها numeric های ما نمره‌اند — numeric(5,2) و numeric(6,2)، یعنی حداکثر
// ۹۹۹۹.۹۹ که خیلی زیر مرز دقت double است. اگر روزی ستون پولی یا شناسهٔ بزرگ
// اضافه شد، آن ستون باید مبدل خودش را داشته باشد.
types.setTypeParser(types.builtins.NUMERIC, (v) => Number(v));
types.setTypeParser(types.builtins.INT8, (v) => Number(v));

// ---------------------------------------------------------------------------
// Pool
// ---------------------------------------------------------------------------

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL تنظیم نشده است. در داکر از docker-compose می‌آید؛ " +
        "برای اجرای محلی آن را در .env.local بگذارید.",
    );
  }
  return url;
}

function createPool(): Pool {
  const pool = new Pool({
    connectionString: connectionString(),
    // سقف اتصال. پیش‌فرض ۱۰ برای این مقیاس فراوان است و از طرفی جلوی
    // خالی کردن سهمیهٔ اتصال پستگرس توسط یک نشتِ اتصال را می‌گیرد.
    max: Number(process.env.PGPOOL_MAX ?? 10),
    // اتصال بی‌کار بعد از این مدت بسته می‌شود
    idleTimeoutMillis: 30_000,
    // اگر پس از این مدت اتصالی آزاد نشد، به‌جای معلق ماندن خطا می‌دهیم —
    // درخواستی که برای همیشه منتظر بماند از درخواستی که شکست بخورد بدتر است.
    connectionTimeoutMillis: 10_000,
  });

  // یک اتصالِ بی‌کار که سمت سرور قطع شود (ری‌استارت پستگرس، تایم‌اوت شبکه)
  // روی خودِ Pool رویداد error می‌دهد. بدون این شنونده، Node آن را
  // unhandled می‌بیند و کل فرایند را می‌کشد.
  pool.on("error", (err) => {
    logger.error("خطای اتصالِ بی‌کارِ دیتابیس", { event: "db.pool.error", err });
  });

  return pool;
}

// در dev، هر بار که Next ماژول‌ها را دوباره بار می‌کند یک Pool تازه ساخته
// می‌شد و قبلی‌ها با اتصال‌های بازشان رها می‌شدند — بعد از چند بار ذخیره،
// پستگرس با «too many clients» جواب می‌داد. نگه داشتن روی globalThis از
// بازبارگذاری جان سالم به در می‌برد. در production یک بار ساخته می‌شود.
const globalForDb = globalThis as unknown as { __sarvaPool?: Pool };

let poolInstance: Pool | null = globalForDb.__sarvaPool ?? null;

/**
 * Pool، که در اولین استفاده ساخته می‌شود.
 *
 * تنبل بودنش اختیاری نیست: اگر در زمان import ساخته می‌شد، `next build` روی
 * ماشینی که DATABASE_URL ندارد شکست می‌خورد — و مرحلهٔ build داکر دقیقاً همان
 * ماشین است. Next برای جمع‌آوری اطلاعات صفحه‌ها هر route را import می‌کند، پس
 * هر کاری که در سطح ماژول انجام شود در زمان build هم اجرا می‌شود.
 *
 * (این دقیقاً همان چیزی بود که در اولین build این فاز شکست:
 *  «Failed to collect page data for /api/v1/auth/logout».)
 */
export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = createPool();
    if (process.env.NODE_ENV !== "production") globalForDb.__sarvaPool = poolInstance;
  }
  return poolInstance;
}

// ---------------------------------------------------------------------------
// کوئری
// ---------------------------------------------------------------------------

/** هر چیزی که می‌شود به کوئری داد: pool یا کلاینتِ داخل تراکنش. */
type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

/** آستانهٔ «این کوئری کند بود». در زمان اجرا خوانده می‌شود و نه در زمان import،
 *  چون مرحلهٔ build داکر هیچ .env ای ندارد و مقدارِ آنجا روی سرور بی‌معناست. */
function slowQueryMs(): number {
  const raw = Number(process.env.DB_SLOW_QUERY_MS ?? 500);
  return Number.isFinite(raw) && raw > 0 ? raw : 500;
}

const isProduction = () => process.env.NODE_ENV === "production";

// ---------------------------------------------------------------------------
// شناسایی کوئری در لاگ، بدون لو دادن خودِ کوئری
// ---------------------------------------------------------------------------

/**
 * ⚠️ متنِ کامل SQL در لاگ نمی‌نشیند.
 *
 * چرا، وقتی SQL ما ثابت است و راز نیست؟ چون «ثابت» یک فرض است نه تضمین: کافی
 * است یک روز کسی مقداری را داخل رشته درج کند (`where email = '${email}'`) تا
 * همان لحظه هر خطای آن کوئری، ایمیل کاربر را در لاگ بگذارد — بی‌آنکه کسی
 * متوجه شود.
 *
 * پس دو چیز لاگ می‌شود که برای پیدا کردن کوئری کافی‌اند و هیچ داده‌ای ندارند:
 *
 *   • **operation** — `SELECT` / `INSERT` / … . برای فهمیدنِ «چه نوع کاری کند
 *     است» کافی است.
 *   • **fingerprint** — هشِ کوتاهِ متنِ نرمال‌شده. دو خطِ لاگ با اثرانگشت
 *     یکسان قطعاً یک کوئری‌اند، و با `rg` در کد پیدا می‌شود.
 *
 * در حالت توسعه (و فقط آنجا) متنِ کوتاه‌شدهٔ کوئری هم می‌آید، چون آنجا خودِ
 * توسعه‌دهنده تنها خوانندهٔ لاگ است.
 */
const fingerprintCache = new Map<string, { op: string; fp: string }>();

function describe(text: string): { op: string; fp: string } {
  const cached = fingerprintCache.get(text);
  if (cached) return cached;

  const normalized = text
    .replace(/--[^\n]*/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const op = (/^[a-z]+/.exec(normalized)?.[0] ?? "other").toUpperCase();
  const fp = createHash("sha256").update(normalized).digest("hex").slice(0, 12);

  const value = { op, fp };
  // نقشه بی‌کران نمی‌شود: تعداد کوئری‌های ثابتِ یک اپ محدود است، ولی اگر روزی
  // کوئری‌ای پویا ساخته شد، این سقف جلوی نشتِ حافظه را می‌گیرد.
  if (fingerprintCache.size > 500) fingerprintCache.clear();
  fingerprintCache.set(text, value);
  return value;
}

/**
 * پارامترهای کوئری، آمادهٔ لاگ شدن.
 *
 * ⚠️ در production **اصلاً** لاگ نمی‌شوند. این تابع فقط در حالت توسعه صدا
 * زده می‌شود.
 *
 * قبلاً لاگِ خطای کوئری مستقیماً `JSON.stringify(params)` را می‌نوشت. برای
 * دیباگ عالی بود و از نظر امنیتی گران: هر خطای کوئری این‌ها را در
 * `docker compose logs` می‌گذاشت —
 *
 *   • هشِ refresh token (در createSession و refreshSession). دیتابیس دقیقاً
 *     همین هش را ذخیره می‌کند، پس داشتنش یعنی داشتنِ سشن.
 *   • هشِ توکن بازنشانی رمز، یعنی امکان تصاحب حساب.
 *   • هشِ کد OTP، هشِ رمز عبور، ایمیل و IP کاربران.
 *
 * رمز عبورِ متن‌ساده هرگز به این لایه نمی‌رسد (همیشه قبلش argon2 می‌شود)، ولی
 * بقیه کافی بودند: یک فایل لاگِ لو رفته = دسترسی به حساب‌ها.
 *
 * حالا هر رشتهٔ بلندی که شبیه راز است با طول و نوعش جایگزین می‌شود. چیزی که
 * برای دیباگ لازم است — «پارامتر سوم null بود» یا «چهارم عدد ۷ بود» — سر جایش
 * می‌ماند.
 */
function redactParams(params: unknown[]): string {
  const safe = params.map((value) => {
    if (value === null || value === undefined) return value;

    if (typeof value === "string") {
      // hex/base64url بلند = هش یا توکن. هر رشتهٔ بلند دیگری هم می‌تواند
      // محتوای کاربر باشد (متن سروده، دیدگاه) که آن هم در لاگ جایی ندارد.
      if (value.length > 24) return `[رشتهٔ ${value.length} نویسه‌ای]`;
      // ایمیل حتی وقتی کوتاه است شناسایی‌کننده است.
      if (value.includes("@")) return "[ایمیل]";
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return `[آرایهٔ ${value.length} عضوی]`;
    return "[شیء]";
  });

  return JSON.stringify(safe).slice(0, 300);
}

/** فیلدهای مشترکِ هر خطِ لاگِ دیتابیس. در production فقط همین‌ها. */
function baseFields(text: string, durationMs: number, inTransaction: boolean) {
  const { op, fp } = describe(text);
  return {
    db_operation: op,
    db_statement_fingerprint: fp,
    duration_ms: Math.round(durationMs),
    db_in_transaction: inTransaction,
  };
}

/** آنچه فقط در حالت توسعه اضافه می‌شود. */
function devFields(text: string, params?: unknown[]) {
  if (isProduction()) return {};
  return {
    db_statement: text.replace(/\s+/g, " ").slice(0, 200),
    // نام عمدی: «شکلِ» پارامترها، نه خودشان. redactDeep در لاگر هر کلیدی را
    // که به `params` ختم شود کامل پنهان می‌کند، و این فیلد باید در حالت
    // توسعه دیده شود — چیزی که داخلش است هم از قبل بی‌خطر شده.
    ...(params?.length ? { db_param_shapes: redactParams(params) } : {}),
  };
}

/**
 * تنها نقطه‌ای که یک کوئری واقعاً اجرا می‌شود.
 *
 * ⚠️ قبلاً `execute` و `tx.execute` مستقیم `pool.query` را صدا می‌زدند و از
 * این مسیر رد نمی‌شدند — یعنی یک insert کند یا یک delete شکست‌خورده هیچ ردی
 * در لاگ نمی‌گذاشت. حالا هر چهار تابع (query، queryOne، execute و همتاهای
 * داخل تراکنش) از همین‌جا می‌گذرند.
 *
 * ⚠️ اینجا هرگز `recordError` صدا زده نمی‌شود.
 *
 * دلیلش یک حلقهٔ کشنده است: دیتابیس قطع می‌شود → کوئری خطا می‌دهد → اگر
 * می‌خواستیم خطا را در دیتابیس ثبت کنیم، آن insert هم خطا می‌داد → و آن خطا
 * دوباره… . خطای دیتابیس فقط به stdout می‌رود؛ ثبتِ ماندگارش کارِ لایهٔ
 * بالاتر است (handleError یا onRequestError) که یک بار انجامش می‌دهد.
 */
async function runQuery<T extends QueryResultRow>(
  on: Queryable,
  text: string,
  params: unknown[] | undefined,
  inTransaction: boolean,
): Promise<QueryResult<T>> {
  const startedAt = performance.now();
  try {
    const result = (await on.query<T>(text, params as never)) as QueryResult<T>;
    const ms = performance.now() - startedAt;

    if (ms > slowQueryMs()) {
      // کوئری کند در لاگ می‌آید ولی جلویش گرفته نمی‌شود — هشدار است نه خطا.
      logger.warn("کوئری کند", {
        event: "db.query.slow",
        ...baseFields(text, ms, inTransaction),
        row_count: result.rowCount ?? result.rows?.length ?? 0,
        ...devFields(text),
      });
    }

    return result;
  } catch (err) {
    const ms = performance.now() - startedAt;

    // پیام خام پستگرس معمولاً می‌گوید چه شد ولی نمی‌گوید کجا. اثرانگشت و
    // operation این را جبران می‌کنند — بدون اینکه متن کوئری یا مقادیر به لاگ
    // برسند. (به خطای بالادست هم چیزی اضافه نمی‌شود، چون آن پیام ممکن است به
    // کاربر نشان داده شود و ساختار دیتابیس چیزی نیست که کاربر باید ببیند.)
    logger.error("کوئری دیتابیس شکست خورد", {
      event: "db.query.failed",
      err,
      ...baseFields(text, ms, inTransaction),
      ...devFields(text, params),
    });

    throw err;
  }
}

/** همان runQuery، ولی فقط ردیف‌ها. */
async function run<T extends QueryResultRow>(
  on: Queryable,
  text: string,
  params?: unknown[],
  inTransaction = false,
): Promise<T[]> {
  const result = await runQuery<T>(on, text, params, inTransaction);
  return result.rows;
}

/** همهٔ ردیف‌ها. */
export function query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> {
  return run<T>(getPool(), text, params);
}

/** اولین ردیف، یا null. جایگزین maybeSingle() در Supabase. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await run<T>(getPool(), text, params);
  return rows[0] ?? null;
}

/** تعداد ردیف‌های تحت‌تأثیر — برای insert/update/delete که خروجی نمی‌خواهند. */
export async function execute(text: string, params?: unknown[]): Promise<number> {
  const result = await runQuery(getPool(), text, params, false);
  return result.rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// تراکنش
// ---------------------------------------------------------------------------

/** همان چند تابع بالا، ولی روی کلاینتِ اختصاصیِ یک تراکنش. */
export type Tx = {
  query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T | null>;
  execute(text: string, params?: unknown[]): Promise<number>;
};

/**
 * چند دستور در یک تراکنش. اگر callback خطا بدهد rollback می‌شود.
 *
 * چرا لازم است: در Supabase هر فراخوانی یک درخواست HTTP جدا بود و تراکنش عملاً
 * وجود نداشت — به همین دلیل جاهایی مثل adminUpsertQuestion که سؤال و بخش‌ها و
 * گزینه‌ها را پشت سر هم می‌نویسد، اگر وسط کار خطا می‌خورد نیمه‌کاره رها می‌شد.
 * حالا آن دسته کارها اتمیک می‌شوند.
 *
 * نکتهٔ مهم: از `tx` استفاده کنید نه از query سراسری. اگر داخل callback از
 * query سراسری استفاده کنید، آن دستور روی اتصالِ دیگری از pool اجرا می‌شود،
 * یعنی بیرونِ تراکنش — و با rollback برنمی‌گردد.
 */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await getPool().connect();

  // جنریک‌ها صریح نوشته شده‌اند: در یک object literal، TypeScript پارامتر نوعِ
  // متد را از امضای Tx برنمی‌دارد و T را به QueryResultRow فرو می‌کاهد.
  const tx: Tx = {
    query<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T[]> {
      return run<T>(client, text, params, true);
    },
    async queryOne<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T | null> {
      const rows = await run<T>(client, text, params, true);
      return rows[0] ?? null;
    },
    async execute(text: string, params?: unknown[]): Promise<number> {
      // ⚠️ قبلاً این یکی مستقیم client.query را صدا می‌زد و از instrumentation
      // بیرون بود — یعنی یک update کندِ داخل تراکنش نامرئی می‌ماند.
      const result = await runQuery(client, text, params, true);
      return result.rowCount ?? 0;
    },
  };

  try {
    await runQuery(client, "begin", undefined, true);
    const out = await fn(tx);
    await runQuery(client, "commit", undefined, true);
    return out;
  } catch (err) {
    // اگر خودِ rollback هم شکست بخورد (اتصال مرده)، خطای اصلی مهم‌تر است و
    // نباید با خطای rollback جایگزین شود. (semantics دست‌نخورده است؛ فقط
    // شکستِ rollback حالا در لاگ دیده می‌شود.)
    await runQuery(client, "rollback", undefined, true).catch(() => {});
    throw err;
  } finally {
    // بدون این، اتصال هرگز به pool برنمی‌گردد و بعد از چند خطا pool خالی
    // می‌شود و کل اپ معلق می‌ماند.
    client.release();
  }
}
