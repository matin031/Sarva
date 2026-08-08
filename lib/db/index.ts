import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

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
const parseTimestamptz = types.getTypeParser(types.builtins.TIMESTAMPTZ) as (v: string) => Date;
const parseTimestamp = types.getTypeParser(types.builtins.TIMESTAMP) as (v: string) => Date;

types.setTypeParser(types.builtins.TIMESTAMPTZ, (v) => parseTimestamptz(v).toISOString());
types.setTypeParser(types.builtins.TIMESTAMP, (v) => parseTimestamp(v).toISOString());

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
    console.error("[db] خطای اتصالِ بی‌کار:", err.message);
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

const SLOW_QUERY_MS = Number(process.env.DB_SLOW_QUERY_MS ?? 500);

async function run<T extends QueryResultRow>(
  on: Queryable,
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const startedAt = performance.now();
  try {
    const result = await on.query<T>(text, params as never);
    const ms = performance.now() - startedAt;
    if (ms > SLOW_QUERY_MS) {
      // کوئری کند در لاگ می‌آید ولی جلویش گرفته نمی‌شود — هشدار است نه خطا.
      // متن کوتاه می‌شود تا لاگ با کوئری‌های چندصدخطی پر نشود.
      console.warn(`[db] کوئری کند (${ms.toFixed(0)}ms): ${text.replace(/\s+/g, " ").slice(0, 120)}`);
    }
    return result.rows;
  } catch (err) {
    // پیام خام پستگرس معمولاً می‌گوید چه شد ولی نمی‌گوید کجا. متن کوئری را
    // به لاگ اضافه می‌کنیم — ولی به خطای بالادست نه، چون آن پیام ممکن است به
    // کاربر نشان داده شود و ساختار دیتابیس چیزی نیست که کاربر باید ببیند.
    console.error(
      `[db] کوئری شکست خورد: ${text.replace(/\s+/g, " ").slice(0, 200)}`,
      params?.length ? `\n     پارامترها: ${JSON.stringify(params).slice(0, 200)}` : "",
      `\n     ${(err as Error).message}`,
    );
    throw err;
  }
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
  const result = await getPool().query(text, params as never);
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
      return run<T>(client, text, params);
    },
    async queryOne<T extends QueryResultRow>(text: string, params?: unknown[]): Promise<T | null> {
      const rows = await run<T>(client, text, params);
      return rows[0] ?? null;
    },
    async execute(text: string, params?: unknown[]): Promise<number> {
      const result = await client.query(text, params as never);
      return result.rowCount ?? 0;
    },
  };

  try {
    await client.query("begin");
    const out = await fn(tx);
    await client.query("commit");
    return out;
  } catch (err) {
    // اگر خودِ rollback هم شکست بخورد (اتصال مرده)، خطای اصلی مهم‌تر است و
    // نباید با خطای rollback جایگزین شود.
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    // بدون این، اتصال هرگز به pool برنمی‌گردد و بعد از چند خطا pool خالی
    // می‌شود و کل اپ معلق می‌ماند.
    client.release();
  }
}
