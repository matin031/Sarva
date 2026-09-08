import "server-only";
import { createHash } from "node:crypto";
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
  type FieldPacket,
} from "mysql2/promise";
import { logger } from "@/lib/observability";

/**
 * اتصال به MySQL.
 *
 * تنها راه رسیدن به دیتابیس در کل پروژه همین فایل است. هیچ درخواستی از مرورگر
 * به دیتابیس نمی‌رسد، پس یک اتصال داریم و تصمیمِ «این کاربر اجازهٔ این کار را
 * دارد؟» بالاتر گرفته می‌شود — در lib/auth.
 *
 * ⚠️ RLS وجود ندارد و MySQL هم چیزی معادلش ندارد. هر قاعدهٔ دسترسی در کد
 * اپلیکیشن است. کوئری‌ای که `where user_id = ?` را جا بگذارد، داده لو می‌دهد و
 * دیتابیس جلویش را نمی‌گیرد.
 *
 * ---------------------------------------------------------------------------
 * قرارداد این ماژول از زمان PostgreSQL عوض نشده
 * ---------------------------------------------------------------------------
 * query<T>()    → T[]
 * queryOne<T>() → T | null
 * execute()     → تعداد ردیف‌های تحت‌تأثیر
 * transaction() → روی یک اتصال اختصاصی
 *
 * عمداً یکسان مانده تا مهاجرت فقط متنِ SQL را عوض کند و نه منطقِ پایین‌دستش.
 */

// ---------------------------------------------------------------------------
// مبدل‌های نوع
// ---------------------------------------------------------------------------
//
// کدِ این پروژه بر اساس شکلی از داده نوشته شده که روزی PostgREST می‌داد و بعد
// درایور pg با سه setTypeParser آن را بازسازی می‌کرد. mysql2 پیش‌فرض‌های
// خودش را دارد و چهار جا با آن قرارداد نمی‌خواند. هر چهار مورد بی‌صدا خراب
// می‌کنند، نه با خطا:
//
//   • DECIMAL  → mysql2 رشته می‌دهد ("12.50"). نمرهٔ سؤال‌ها numeric(5,2) و
//     numeric(6,2) اند؛ با رشته، جمعِ نمرات الحاقِ رشته می‌شود. بدترین حالت،
//     چون خطا نمی‌دهد و فقط نمرهٔ اشتباه می‌دهد.
//
//   • DATETIME → mysql2 شیء Date می‌دهد. دو مشکل: کد پایین‌دست رشتهٔ ISO
//     می‌خواهد (lib/panel/format.ts امضای (iso: string) دارد)، و Date فقط
//     میلی‌ثانیه دارد در حالی که ستون‌ها DATETIME(6) اند — یعنی میکروثانیه‌ها
//     همان‌جا می‌سوزند.
//
//   • TINYINT(1) → عدد ۰/۱ می‌دهد نه boolean. `if (row.is_banned)` با عدد ۰
//     درست کار می‌کند ولی `row.is_banned === false` نه، و JSON.stringify هم
//     عدد می‌فرستد به کلاینت.
//
//   • BIGINT → mysql2 وقتی مقدار از Number.MAX_SAFE_INTEGER بگذرد رشته
//     می‌دهد. count(*) هرگز آنجا نمی‌رسد ولی سکوت در برابرش خطرناک است.
//
// راه‌حل typeCast است و نه گشتن در نتیجه: typeCast موقع خواندنِ خودِ ستون
// اجرا می‌شود، پس هم ارزان است و هم به متنِ خام دسترسی دارد — که برای
// میکروثانیه لازم است.

/**
 * فیلدی که به typeCast می‌رسد.
 *
 * ⚠️ عمداً `string()` ندارد، با اینکه mysql2 دارد.
 *
 * دلیلش یک تلهٔ واقعی است که با آزمون پیدا شد: در پروتکل *باینری* (یعنی هر
 * چیزی که با execute و prepared statement می‌رود، که کل این ماژول همان است)،
 * `field.string()` فقط برای بعضی نوع‌ها درست جواب می‌دهد. برای LONGLONG و
 * SHORT و VARCHAR بایت‌های خام را به‌عنوان متن می‌خواند و آشغال می‌دهد:
 *
 *     count(*)        → "\u0000"        (به‌جای "1")
 *     subject VARCHAR → "\u0000\u0000\b�"  (به‌جای "فارسی")
 *
 * بدتر اینکه هر دوِ `string()` و `next()` مکان‌نمای بستهٔ داده را جلو می‌برند،
 * پس صدا زدنِ هر دو روی یک فیلد، *فیلدهای بعدی* را هم خراب می‌کند — یعنی یک
 * اشتباه در یک ستون، ستون‌های دیگر را بی‌صدا به‌هم می‌ریزد.
 *
 * پس قاعده: همیشه `next()`، دقیقاً یک بار، و بعد رویش کار کن.
 */
type CastField = {
  type: string;
  length: number;
  name: string;
};

/**
 * 'YYYY-MM-DD HH:MM:SS[.ffffff]' → 'YYYY-MM-DDTHH:MM:SS.fff[fff]Z'
 *
 * ستون‌ها DATETIME(6) اند و قرارداد این است که همیشه UTC در آن‌ها نوشته شده
 * (createPool زیر timezone را روی 'Z' می‌گذارد و هر نوشتنی هم UTC است). پس
 * چسباندنِ 'Z' یک فرض نیست، نتیجهٔ همان قرارداد است.
 *
 * ⚠️ از new Date() رد نمی‌شویم. اگر می‌شدیم — که رفتار پیش‌فرض mysql2 است —
 * '…07.123456' می‌شد '…07.123Z' و سه رقم میکروثانیه بی‌صدا می‌سوخت. با
 * dateStrings متنِ خام می‌رسد و اینجا فقط بازچینی می‌شود، پس هر چه در ستون
 * هست بیرون می‌آید.
 *
 * حداقل سه رقم اعشار تولید می‌شود تا شکلِ خروجی با toISOString() قبلی یکی
 * بماند و چیزی که رشته‌ها را مقایسه می‌کند غافلگیر نشود.
 */
function datetimeToIso(raw: string): string {
  // '0000-00-00 …' — با sql_mode سخت‌گیرانه نوشتنش ممکن نیست، ولی دادهٔ
  // قدیمیِ واردشده می‌تواند داشته باشدش. به Date تبدیل نمی‌شود (که Invalid
  // Date می‌داد و بی‌صدا می‌شکست)؛ خام رد می‌شود تا Date.parse رویش NaN بدهد
  // و قابل تشخیص باشد.
  if (raw.startsWith("0000-")) return raw;

  const [datePart, timePart = "00:00:00"] = raw.split(" ");
  const [clock, fraction] = timePart.split(".");
  const frac = (fraction ?? "").padEnd(3, "0");
  return `${datePart}T${clock}.${frac}Z`;
}

/**
 * typeCast — تنها جایی که شکلِ داده تصمیم گرفته می‌شود.
 *
 * ⚠️ boolean فقط برای ستون‌های واقعیِ TINYINT(1) اعمال می‌شود.
 *
 * عبارت‌های محاسباتی (`exists(…)`، `x > 0`) در MySQL نوع LONGLONG می‌گیرند و
 * از عددِ ثابتِ `select 5` قابل تشخیص نیستند — هر دو LONGLONG با طول ۱ اند.
 * پس تبدیلشان اینجا ممکن نیست بدون اینکه `select 5` هم boolean شود.
 *
 * آن‌ها با toBool() (پایین همین فایل) در محلِ استفاده تبدیل می‌شوند — صریح،
 * قابل grep، و قابل تست.
 */
function typeCast(field: CastField, next: () => unknown): unknown {
  const value = next();
  if (value === null || value === undefined) return null;

  switch (field.type) {
    case "DATETIME":
    case "TIMESTAMP":
      // با dateStrings رشته می‌آید. اگر روزی آن گزینه برداشته شود، Date
      // می‌آید و این شاخه جلوی خرابیِ بی‌صدا را می‌گیرد.
      return typeof value === "string"
        ? datetimeToIso(value)
        : (value as Date).toISOString();

    // DATE بدون زمان: supported_at فقط تاریخ است و نباید روزش با تبدیلِ
    // منطقه‌ای جابه‌جا شود. رشته می‌ماند، همان‌طور که در Postgres هم می‌ماند.
    case "DATE":
    case "NEWDATE":
      return value;

    case "NEWDECIMAL":
    case "DECIMAL": {
      // Number و نه parseFloat: parseFloat روی "12abc" مقدار ۱۲ می‌دهد و
      // خرابی را پنهان می‌کند؛ Number همان‌جا NaN می‌دهد که دیده می‌شود.
      //
      // دقت: تنها DECIMAL های ما نمره‌اند — (5,2) و (6,2)، یعنی حداکثر
      // ۹۹۹۹٫۹۹ که خیلی زیر مرز دقت double است. اگر روزی ستون پولی اضافه شد،
      // آن ستون باید مسیر خودش را داشته باشد.
      return typeof value === "number" ? value : Number(value);
    }

    case "LONGLONG": {
      if (typeof value === "number") return value;
      const n = Number(value);
      if (!Number.isSafeInteger(n)) {
        // از محدودهٔ امنِ عدد در JS بیرون است. رشته رد می‌شود تا به‌جای یک
        // عددِ بی‌صدا-اشتباه، جایی که استفاده می‌شود بشکند و دیده شود.
        logger.warn("عدد صحیح بزرگ‌تر از محدودهٔ امنِ JS", {
          event: "db.bigint.unsafe",
          column: field.name,
        });
        return value;
      }
      return n;
    }

    case "TINY":
      // فقط TINYINT(1) — یعنی همان چیزی که در DDL «boolean» نوشته شده.
      // TINYINT(4) و مانندش عددِ واقعی‌اند و باید عدد بمانند.
      return field.length === 1 ? value !== 0 : value;

    default:
      // JSON را خودِ mysql2 می‌خواند و شیء/آرایه/عدد/رشته/null می‌دهد —
      // دقیقاً مثل jsonb در pg. متن هم همین‌جا رد می‌شود.
      return value;
  }
}

/**
 * عبارت‌های boolean که از MySQL عدد برمی‌گردند.
 *
 * MySQL نوع boolean ندارد؛ `exists(...)` و `a = b` هر دو ۰/۱ می‌دهند و از یک
 * عددِ معمولی قابل تشخیص نیستند. پس هر جا کوئری یک boolean محاسبه می‌کند،
 * نتیجه از اینجا رد می‌شود.
 *
 * رشته هم پذیرفته می‌شود چون در حالتِ عبورِ عددِ بزرگ (بالا) ممکن است رشته
 * برسد، و "0" در JS truthy است — که دقیقاً همان باگی است که این تابع جلویش
 * را می‌گیرد.
 */
export function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value !== "" && value !== "0";
  return false;
}

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
  const pool = mysql.createPool({
    uri: connectionString(),

    // سقف اتصال. پیش‌فرض ۱۰ برای این مقیاس فراوان است و از طرفی جلوی خالی
    // کردن سهمیهٔ اتصالِ سرور توسط یک نشتِ اتصال را می‌گیرد.
    connectionLimit: Number(process.env.DBPOOL_MAX ?? 10),

    // اگر پس از این مدت اتصالی آزاد نشد، به‌جای معلق ماندن خطا می‌دهیم —
    // درخواستی که برای همیشه منتظر بماند از درخواستی که شکست بخورد بدتر است.
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10_000,
    idleTimeout: 30_000,

    // ⚠️ خاموش. کنسول SQL مدیر اتصالِ جدا و محدودِ خودش را دارد؛ اگر pool
    // عمومی چنددستوری بود، هر تزریقی که یک نقطه‌ویرگول رد می‌کرد می‌توانست
    // دستور دوم اجرا کند.
    multipleStatements: false,

    // 'Z' یعنی درایور مقادیر Date را UTC تفسیر می‌کند. خواندن از typeCast رد
    // می‌شود و اصلاً به این نمی‌رسد، ولی *نوشتن* Date به این وابسته است:
    // بدون آن، درایور Date را با منطقهٔ محلیِ سرور می‌نوشت و همان ستون روی دو
    // ماشین با TZ متفاوت دو مقدار می‌گرفت.
    timezone: "Z",

    // ⚠️ بدون این، mysql2 برای DATETIME یک شیء Date می‌سازد و چون Date فقط
    // میلی‌ثانیه دارد، سه رقم میکروثانیهٔ ستون‌های DATETIME(6) همان‌جا از بین
    // می‌رود — پیش از آنکه typeCast اصلاً چیزی ببیند.
    dateStrings: true,

    typeCast: typeCast as never,

    // عددهای بزرگ به‌جای اینکه بی‌صدا گرد شوند، رشته می‌آیند؛ typeCast بالا
    // تصمیم می‌گیرد چه کند.
    supportBigNumbers: true,
    bigNumberStrings: true,

    // نام ستون‌های تکراری در JOIN روی هم نیفتند. (پیش‌فرض هم همین است؛ صریح
    // نوشته شده چون رفتارِ برعکسش داده را بی‌صدا گم می‌کند.)
    nestTables: false,
    charset: "utf8mb4_0900_ai_ci",
  });

  return pool;
}

// در dev، هر بار که Next ماژول‌ها را دوباره بار می‌کند یک Pool تازه ساخته
// می‌شد و قبلی‌ها با اتصال‌های بازشان رها می‌شدند — بعد از چند بار ذخیره،
// سرور با «too many connections» جواب می‌داد. نگه داشتن روی globalThis از
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
 */
export function getPool(): Pool {
  if (!poolInstance) {
    poolInstance = createPool();
    if (process.env.NODE_ENV !== "production") globalForDb.__sarvaPool = poolInstance;
  }
  return poolInstance;
}

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
 * operation (SELECT/INSERT/…) و fingerprint (هشِ کوتاهِ متنِ نرمال‌شده).
 *
 * در حالت توسعه (و فقط آنجا) متنِ کوتاه‌شدهٔ کوئری هم می‌آید، چون آنجا خودِ
 * توسعه‌دهنده تنها خوانندهٔ لاگ است.
 */
const fingerprintCache = new Map<string, { op: string; fp: string }>();

function describe(text: string): { op: string; fp: string } {
  const cached = fingerprintCache.get(text);
  if (cached) return cached;

  const normalized = text
    // ⚠️ هر سه شکلِ کامنت در MySQL: `-- ` و `#` و `/* */`. نسخهٔ PostgreSQL
    // فقط `--` را می‌شناخت؛ با `#` دو کوئریِ یکسان دو اثرانگشت می‌گرفتند.
    .replace(/--[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
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
 * قبلاً لاگِ خطای کوئری مستقیماً JSON.stringify(params) را می‌نوشت. برای
 * دیباگ عالی بود و از نظر امنیتی گران: هر خطای کوئری هشِ refresh token، هشِ
 * توکن بازنشانی رمز، هشِ کد OTP، ایمیل و IP کاربران را در لاگ می‌گذاشت. یک
 * فایل لاگِ لو رفته = دسترسی به حساب‌ها.
 */
function redactParams(params: unknown[]): string {
  const safe = params.map((value) => {
    if (value === null || value === undefined) return value;

    if (typeof value === "string") {
      if (value.length > 24) return `[رشتهٔ ${value.length} نویسه‌ای]`;
      if (value.includes("@")) return "[ایمیل]";
      return value;
    }

    if (typeof value === "number" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return `[آرایهٔ ${value.length} عضوی]`;
    return "[شیء]";
  });

  return JSON.stringify(safe).slice(0, 300);
}

function slowQueryMs(): number {
  const raw = Number(process.env.DB_SLOW_QUERY_MS ?? 500);
  return Number.isFinite(raw) && raw > 0 ? raw : 500;
}

const isProduction = () => process.env.NODE_ENV === "production";

function baseFields(text: string, durationMs: number, inTransaction: boolean) {
  const { op, fp } = describe(text);
  return {
    db_operation: op,
    db_statement_fingerprint: fp,
    duration_ms: Math.round(durationMs),
    db_in_transaction: inTransaction,
  };
}

function devFields(text: string, params?: unknown[]) {
  if (isProduction()) return {};
  return {
    db_statement: text.replace(/\s+/g, " ").slice(0, 200),
    ...(params?.length ? { db_param_shapes: redactParams(params) } : {}),
  };
}

// ---------------------------------------------------------------------------
// خطاها
// ---------------------------------------------------------------------------

/**
 * خطای نقضِ یکتایی.
 *
 * در PostgreSQL کد ۲۳۵۰۵ بود و چند جا (بانک آزمون، مدیریتِ بازی‌ها) رویش
 * شاخه می‌زدند تا به‌جای ۵۰۰، پیامِ «تکراری است» بدهند. MySQL شمارهٔ دیگری
 * می‌دهد (۱۰۶۲)، پس اگر آن مقایسه‌ها دست‌نخورده می‌ماندند، هر تکراری‌ای از
 * امروز ۵۰۰ می‌شد.
 *
 * به‌جای پخش کردنِ عدد ۱۰۶۲ در کد، یک تابع: کد فراخوان از شمارهٔ خطای موتور
 * بی‌خبر می‌ماند و مهاجرتِ بعدی هم فقط همین‌جا را عوض می‌کند.
 */
export function isUniqueViolation(err: unknown): boolean {
  const code = (err as { errno?: number })?.errno;
  // 1062 ER_DUP_ENTRY — نقض UNIQUE/PRIMARY
  // 1586 ER_DUP_ENTRY_WITH_KEY_NAME — همان، با نام کلید
  return code === 1062 || code === 1586;
}

/** نقض کلید خارجی — ردیفِ ارجاع‌شده نیست، یا هنوز ارجاع‌کننده دارد. */
export function isForeignKeyViolation(err: unknown): boolean {
  const code = (err as { errno?: number })?.errno;
  // 1452 افزودنِ ارجاع به ردیفِ ناموجود، 1451 حذفِ ردیفی که هنوز ارجاع دارد
  return code === 1451 || code === 1452;
}

/** نقض CHECK. */
export function isCheckViolation(err: unknown): boolean {
  return (err as { errno?: number })?.errno === 3819;
}

/**
 * خطایی که خودِ ما با SIGNAL از داخل تریگر بلند کرده‌ایم.
 * فعلاً فقط نگهبانِ «آخرین راه ورود» روی user_identities.
 */
export function isTriggerAssertion(err: unknown): boolean {
  return (err as { errno?: number })?.errno === 1644;
}

/** پیامِ خطای تریگر — برای نشان دادن به کاربر. */
export function triggerAssertionMessage(err: unknown): string | null {
  if (!isTriggerAssertion(err)) return null;
  return (err as { sqlMessage?: string }).sqlMessage ?? null;
}

// ---------------------------------------------------------------------------
// اجرا
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// آماده‌سازیِ پارامترها برای نوشتن
// ---------------------------------------------------------------------------

/**
 * دقیقاً همان شکلی که datetimeToIso بالا تولید می‌کند.
 * مثال: 2026-10-08T07:54:24.447506Z
 */
const ISO_UTC = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})\.(\d{3,6})Z$/;

/**
 * رشتهٔ ISO را به شکلی درمی‌آورد که MySQL در ستون DATETIME می‌پذیرد.
 *
 * ⚠️ چرا این لازم است، و چرا در PostgreSQL نبود:
 *
 * این ماژول موقع *خواندن* هر DATETIME را به رشتهٔ ISO تبدیل می‌کند
 * (`2026-10-08T07:54:24.447506Z`). PostgreSQL همان رشته را موقع *نوشتن* هم
 * قبول می‌کرد، پس خواندن و بازنوشتنِ یک زمان بی‌دردسر بود.
 *
 * MySQL قبول نمی‌کند: نه `T` را می‌پذیرد نه `Z` را، و با
 *
 *     Incorrect datetime value: '2026-10-08T07:54:24.447506Z'
 *
 * رد می‌کند. یعنی لایه‌ای که فرمتی بیرون می‌دهد که خودش پس نمی‌گیرد — و این
 * در چرخشِ سشن دیده شد، جایی که expires_at و created_at از ردیفِ قبلی خوانده
 * و در ردیفِ تازه نوشته می‌شوند.
 *
 * پس همین‌جا و برای همه حل می‌شود، نه در تک‌تک فراخوان‌ها: یک لایه باید
 * چیزی را که می‌دهد پس هم بگیرد.
 *
 * ⚠️ الگو عمداً تنگ است — تاریخ و زمانِ کامل، با سه تا شش رقم اعشار و `Z`
 * پایانی. متنی که کاربر می‌نویسد عملاً هرگز دقیقاً این شکل نیست، و اگر هم
 * باشد یک زمانِ معتبر است و معنایش عوض نمی‌شود.
 */
function toMysqlValue(value: unknown): unknown {
  if (typeof value === "string") {
    const m = ISO_UTC.exec(value);
    return m ? `${m[1]} ${m[2]}.${m[3]}` : value;
  }

  // شیء Date: به UTC نوشته می‌شود. (mysql2 با timezone:'Z' خودش هم همین کار
  // را می‌کند؛ صریح بودنش یعنی رفتار به تنظیمات اتصال گره نخورده.)
  if (value instanceof Date) {
    return value.toISOString().replace("T", " ").replace("Z", "");
  }

  return value;
}

/** همان، برای کل آرایهٔ پارامترها. */
function prepareParams(params: unknown[] | undefined): unknown[] {
  if (!params || params.length === 0) return [];
  return params.map(toMysqlValue);
}

type Runner = Pool | PoolConnection;

/**
 * تنها نقطه‌ای که یک کوئری واقعاً اجرا می‌شود.
 *
 * ⚠️ اینجا هرگز recordError صدا زده نمی‌شود.
 *
 * دلیلش یک حلقهٔ کشنده است: دیتابیس قطع می‌شود → کوئری خطا می‌دهد → اگر
 * می‌خواستیم خطا را در دیتابیس ثبت کنیم، آن insert هم خطا می‌داد → و آن خطا
 * دوباره… . خطای دیتابیس فقط به stdout می‌رود؛ ثبتِ ماندگارش کارِ لایهٔ
 * بالاتر است (handleError یا onRequestError) که یک بار انجامش می‌دهد.
 */
async function runQuery(
  on: Runner,
  text: string,
  params: unknown[] | undefined,
  inTransaction: boolean,
): Promise<[unknown, FieldPacket[]]> {
  const startedAt = performance.now();
  try {
    // ⚠️ execute و نه query: execute دستور را به‌صورت prepared به سرور
    // می‌فرستد، یعنی مقدارها هرگز داخل متنِ SQL نمی‌روند — همان تضمینی که
    // $1 در PostgreSQL می‌داد.
    //
    // (query در mysql2 مقدارها را سمتِ کلاینت escape و داخل متن درج می‌کند.
    //  امن هست، ولی «امن به‌شرط درست بودنِ escape» با «اصلاً وارد متن نشدن»
    //  یکی نیست.)
    const result = await on.execute(text, prepareParams(params) as never);
    const ms = performance.now() - startedAt;

    if (ms > slowQueryMs()) {
      const rows = result[0];
      logger.warn("کوئری کند", {
        event: "db.query.slow",
        ...baseFields(text, ms, inTransaction),
        row_count: Array.isArray(rows)
          ? rows.length
          : ((rows as ResultSetHeader)?.affectedRows ?? 0),
        ...devFields(text),
      });
    }

    return result as [unknown, FieldPacket[]];
  } catch (err) {
    const ms = performance.now() - startedAt;

    // پیام خام موتور معمولاً می‌گوید چه شد ولی نمی‌گوید کجا. اثرانگشت و
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

async function run<T>(
  on: Runner,
  text: string,
  params?: unknown[],
  inTransaction = false,
): Promise<T[]> {
  const [rows] = await runQuery(on, text, params, inTransaction);
  // INSERT/UPDATE/DELETE هم از این مسیر رد می‌شوند اگر کسی query() صدایشان
  // بزند؛ آنجا rows یک ResultSetHeader است نه آرایه. آرایهٔ خالی بهتر از
  // برگرداندنِ یک شیء با شکلِ غلط است.
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/**
 * تعدادِ ردیف‌هایی که واقعاً عوض شدند.
 *
 * ⚠️ این تابع از affectedRows استفاده می‌کند و نه changedRows، و تفاوتشان در
 * MySQL معنادار است:
 *
 *   • UPDATE ای که مقدارِ تازه‌اش با قدیمی یکی است → affectedRows = ۱ ولی
 *     changedRows = ۰.
 *   • INSERT ... ON DUPLICATE KEY UPDATE → درج = ۱، به‌روزرسانی = ۲، و
 *     «بود و عوض نشد» = ۰.
 *
 * قرارداد قبلی rowCount در PostgreSQL بود، یعنی «چند ردیف هدف قرار گرفت».
 * affectedRows همان معنا را می‌دهد و changedRows نه — پس هر جای کد که
 * `if (n === 0) return notFound` دارد با affectedRows درست می‌ماند.
 *
 * ⚠️ استثنا: در upsert نمی‌شود از عدد فهمید «درج شد یا به‌روز شد». هر جا این
 * تفکیک لازم باشد، کوئری باید خودش جواب را بدهد (مثلاً با یک SELECT بعدی در
 * همان تراکنش) و نه از روی این عدد حدس زده شود.
 */
async function runExecute(
  on: Runner,
  text: string,
  params: unknown[] | undefined,
  inTransaction: boolean,
): Promise<number> {
  const [result] = await runQuery(on, text, params, inTransaction);
  if (Array.isArray(result)) return result.length;
  return (result as ResultSetHeader)?.affectedRows ?? 0;
}

/** همهٔ ردیف‌ها. */
export function query<T extends RowDataPacket | object>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  return run<T>(getPool(), text, params);
}

/** اولین ردیف، یا null. */
export async function queryOne<T extends RowDataPacket | object>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await run<T>(getPool(), text, params);
  return rows[0] ?? null;
}

/** تعداد ردیف‌های تحت‌تأثیر — برای insert/update/delete که خروجی نمی‌خواهند. */
export function execute(text: string, params?: unknown[]): Promise<number> {
  return runExecute(getPool(), text, params, false);
}

/**
 * شناسهٔ AUTO_INCREMENT آخرین درج.
 *
 * فقط برای jasoos_levels که تنها جدولِ AUTO_INCREMENT پروژه است. بقیهٔ
 * جدول‌ها UUID دارند و شناسه‌شان را اپ قبل از INSERT می‌سازد
 * (crypto.randomUUID)، پس چیزی برای خواندن ندارند.
 *
 * ⚠️ حتماً روی همان اتصالِ درج. LAST_INSERT_ID در MySQL مقدارِ هر اتصال را
 * جدا نگه می‌دارد، پس اگر INSERT روی یک اتصال از pool برود و این روی اتصالِ
 * دیگری، شناسهٔ کسِ دیگری برمی‌گردد. برای همین بیرون از transaction() در
 * دسترس نیست.
 */
export type Tx = {
  query<T extends RowDataPacket | object>(text: string, params?: unknown[]): Promise<T[]>;
  queryOne<T extends RowDataPacket | object>(
    text: string,
    params?: unknown[],
  ): Promise<T | null>;
  execute(text: string, params?: unknown[]): Promise<number>;
  /** شناسهٔ AUTO_INCREMENT آخرین درجِ همین تراکنش. */
  insertId(text: string, params?: unknown[]): Promise<number>;
};

/**
 * چند دستور در یک تراکنش. اگر callback خطا بدهد rollback می‌شود.
 *
 * نکتهٔ مهم: از `tx` استفاده کنید نه از query سراسری. اگر داخل callback از
 * query سراسری استفاده کنید، آن دستور روی اتصالِ دیگری از pool اجرا می‌شود،
 * یعنی بیرونِ تراکنش — و با rollback برنمی‌گردد.
 *
 * ⚠️⚠️ در MySQL بعضی دستورها **commit ضمنی** دارند: هر DDL (CREATE/ALTER/
 * DROP)، TRUNCATE، و چند تای دیگر. اجرای آن‌ها داخل این تابع تراکنش را
 * همان‌جا می‌بندد و rollback بعدی هیچ کاری نمی‌کند — بی‌آنکه خطایی بدهد.
 * در PostgreSQL این‌طور نبود و DDL هم برمی‌گشت. پس اینجا فقط DML.
 * (کنسول SQL مدیر همین را جداگانه گارد می‌کند.)
 */
export async function transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection();

  const tx: Tx = {
    query<R extends RowDataPacket | object>(text: string, params?: unknown[]): Promise<R[]> {
      return run<R>(conn, text, params, true);
    },
    async queryOne<R extends RowDataPacket | object>(
      text: string,
      params?: unknown[],
    ): Promise<R | null> {
      const rows = await run<R>(conn, text, params, true);
      return rows[0] ?? null;
    },
    execute(text: string, params?: unknown[]): Promise<number> {
      return runExecute(conn, text, params, true);
    },
    async insertId(text: string, params?: unknown[]): Promise<number> {
      const [result] = await runQuery(conn, text, params, true);
      return (result as ResultSetHeader)?.insertId ?? 0;
    },
  };

  try {
    await conn.beginTransaction();
    const out = await fn(tx);
    await conn.commit();
    return out;
  } catch (err) {
    // اگر خودِ rollback هم شکست بخورد (اتصال مرده)، خطای اصلی مهم‌تر است و
    // نباید با خطای rollback جایگزین شود.
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    // بدون این، اتصال هرگز به pool برنمی‌گردد و بعد از چند خطا pool خالی
    // می‌شود و کل اپ معلق می‌ماند.
    conn.release();
  }
}

// ---------------------------------------------------------------------------
// کمک‌کارهای SQL
// ---------------------------------------------------------------------------

/**
 * فهرست جای‌نگهدار برای IN.
 *
 * در PostgreSQL این کار با `= any($1::uuid[])` انجام می‌شد و یک پارامتر
 * می‌گرفت. MySQL آرایه به‌عنوان پارامتر ندارد، پس به ازای هر عضو یک `?`.
 *
 * ⚠️ آرایهٔ خالی: `IN ()` در MySQL خطای نحوی است. اینجا به‌جایش یک عبارتِ
 * همیشه-نادرست تولید می‌شود، که همان معنای «هیچ‌کدام» را می‌دهد —
 * `x IN (any([]))` در PostgreSQL هم همین بود.
 */
export function placeholders(count: number): string {
  if (count <= 0) return "NULL";
  return Array.from({ length: count }, () => "?").join(", ");
}

/**
 * الگوی LIKE با گریزِ کاراکترهای ویژه.
 *
 * ⚠️ بدون این، جست‌وجوی کاربر برای «۱۰۰%» یا «a_b» به الگوی wildcard تبدیل
 * می‌شود و نتیجهٔ اشتباه می‌دهد. backslash اول می‌آید وگرنه گریزِ خودش دوباره
 * گریز می‌خورد.
 */
export function likePattern(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
