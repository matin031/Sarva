/**
 * لاگر مرکزی سروا.
 *
 * ---------------------------------------------------------------------------
 * چرا pino نصب نشد
 * ---------------------------------------------------------------------------
 * pino انتخاب پیش‌فرضِ درستی است و برای اپ‌های پرترافیک بی‌رقیب. برای این
 * پروژه سه دلیل مشخص خلافش بود:
 *
 *   ۱) خروجیِ خواناشده در حالت توسعه با `pino-pretty` از راه «transport»
 *      می‌آید، و transport یعنی یک worker thread و `thread-stream`. همان
 *      چیزی است که در build های standalone و در Turbopack مرتب می‌شکند —
 *      و صورتِ مسئله همین بود: «بدون transport شکننده‌ای که standalone build
 *      را خراب کند».
 *
 *   ۲) pino برای درست کار کردن باید در `serverExternalPackages` بنشیند، وگرنه
 *      require های پویایش را باندلر Next خراب می‌کند. یعنی یک وابستگی که
 *      پیکربندی build را هم به خودش گره می‌زند.
 *
 *   ۳) کاری که واقعاً لازم داریم «یک خط JSON در stdout» است. سرعتِ pino از
 *      کجا می‌آید؟ از sonic-boom و بافرِ غیرهمگام — مسئله‌ای که یک سایت
 *      آموزشیِ تک‌کانتینری هرگز به آن نمی‌خورد.
 *
 * پس اینجا یک لاگر بدونِ وابستگی نوشته شده که همان قرارداد را دارد: سطح،
 * child logger، خروجی JSON. هزینهٔ نگهداری‌اش همین یک فایل است.
 *
 * ---------------------------------------------------------------------------
 * نقطهٔ اتصال به آینده
 * ---------------------------------------------------------------------------
 * `addSink()` پایین همان جایی است که روزی OpenTelemetry، Loki یا Sentry
 * وصل می‌شوند: هر رکورد بعد از پاک‌سازی به همهٔ sink ها هم داده می‌شود. یعنی
 * افزودن یک مقصد تازه، *صفر* تغییر در کدِ فراخوان‌ها لازم دارد.
 *
 * ---------------------------------------------------------------------------
 * قاعدهٔ سرسختانه
 * ---------------------------------------------------------------------------
 * هیچ خطایی در این فایل نباید به بیرون درز کند. لاگری که درخواست را بشکند از
 * نبودنِ لاگ بدتر است — همان قاعده‌ای که lib/admin/audit.ts از قبل داشت.
 */

import { redactDeep } from "./redact";
import { serializeError, type SerializedError } from "./serialize";
import { currentRequestContext } from "./context";

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

const LEVEL_VALUE: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const LEVEL_NAMES = Object.keys(LEVEL_VALUE) as LogLevel[];

/** «silent» یک سطح واقعی نیست؛ یعنی هیچ‌چیز چاپ نشود. */
const SILENT = Number.POSITIVE_INFINITY;

export type LogFields = {
  /** شناسهٔ ماشینیِ رخداد، مثل `http.request.completed`. کلیدِ اصلیِ جست‌وجو
   *  در لاگ همین است، نه متن پیام. */
  event?: string;
  /** خطا. خودش سریال و پاک‌سازی می‌شود؛ خام ندهید. */
  err?: unknown;
  route?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  /** فقط uuid. هرگز ایمیل یا نام. */
  user_id?: string;
  request_id?: string;
  [key: string]: unknown;
};

export type LogRecord = {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: "sarva";
  environment: string;
  release?: string;
  event?: string;
  request_id?: string;
  route?: string;
  method?: string;
  status_code?: number;
  duration_ms?: number;
  user_id?: string;
  err?: SerializedError;
  [key: string]: unknown;
};

export interface Logger {
  trace(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  fatal(message: string, fields?: LogFields): void;
  /** لاگرِ فرزند: فیلدهای مشترک یک بار نوشته می‌شوند، نه در هر خط. */
  child(bindings: LogFields): Logger;
  isLevelEnabled(level: LogLevel): boolean;
}

// ---------------------------------------------------------------------------
// پیکربندی
// ---------------------------------------------------------------------------

function environment(): string {
  return process.env.APP_ENV || process.env.NODE_ENV || "development";
}

function release(): string | undefined {
  const value = process.env.APP_RELEASE?.trim();
  return value ? value.slice(0, 64) : undefined;
}

function resolveLevel(raw: string | undefined): number {
  const value = (raw ?? "").trim().toLowerCase();
  if (value === "silent" || value === "off" || value === "none") return SILENT;
  if (value in LEVEL_VALUE) return LEVEL_VALUE[value as LogLevel];
  // پیش‌فرض‌ها: در production پرحرفی هزینه دارد، در توسعه نبودنِ لاگ آزاردهنده
  // است. `test` عمداً ساکت است تا خروجی `node --test` خوانا بماند.
  if (process.env.NODE_ENV === "production") return LEVEL_VALUE.info;
  if (process.env.NODE_ENV === "test") return SILENT;
  return LEVEL_VALUE.debug;
}

let minLevel = resolveLevel(process.env.LOG_LEVEL);
let prettyOutput = process.env.NODE_ENV !== "production" && process.env.LOG_FORMAT !== "json";
let writeLine: (line: string, level: LogLevel) => void = defaultWrite;

function defaultWrite(line: string, level: LogLevel): void {
  // stderr برای error و fatal، stdout برای بقیه — همان تفکیکی که ابزارهای
  // جمع‌آوری لاگ (و خودِ `docker compose logs`) انتظارش را دارند.
  //
  // ⚠️ در production هیچ فایلی ساخته نمی‌شود. مقصد فقط stdout/stderr کانتینر
  // است تا چرخشِ لاگ کارِ داکر باشد و دیسکِ کانتینر پر نشود.
  const stream = level === "error" || level === "fatal" ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

/** فقط برای تست‌ها و اسکریپت‌ها. کد اپ به این دست نمی‌زند. */
export function configureLogger(options: {
  level?: LogLevel | "silent";
  pretty?: boolean;
  write?: (line: string, level: LogLevel) => void;
}): void {
  if (options.level !== undefined) minLevel = resolveLevel(options.level);
  if (options.pretty !== undefined) prettyOutput = options.pretty;
  if (options.write !== undefined) writeLine = options.write;
}

/** پیکربندی را به حالت خوانده‌شده از محیط برمی‌گرداند. */
export function resetLogger(): void {
  minLevel = resolveLevel(process.env.LOG_LEVEL);
  prettyOutput = process.env.NODE_ENV !== "production" && process.env.LOG_FORMAT !== "json";
  writeLine = defaultWrite;
  sinks.length = 0;
}

// ---------------------------------------------------------------------------
// مقصدهای اضافی
// ---------------------------------------------------------------------------

export type LogSink = (record: LogRecord) => void;

const sinks: LogSink[] = [];

/**
 * یک مقصد تازه اضافه می‌کند و تابعِ حذفش را برمی‌گرداند.
 *
 * رکوردی که به sink می‌رسد از قبل پاک‌سازی شده است، پس یک sink نمی‌تواند
 * تصادفاً داده‌ای را بفرستد که لاگ محلی نمی‌فرستد.
 */
export function addSink(sink: LogSink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.indexOf(sink);
    if (index >= 0) sinks.splice(index, 1);
  };
}

// ---------------------------------------------------------------------------
// ساخت خط
// ---------------------------------------------------------------------------

/** کلیدهایی که ترتیبشان در خروجی ثابت می‌ماند تا لاگ خوانا باشد. */
const LEAD_KEYS = [
  "timestamp",
  "level",
  "event",
  "message",
  "service",
  "environment",
  "release",
  "request_id",
  "route",
  "method",
  "status_code",
  "duration_ms",
  "user_id",
] as const;

const LEVEL_TAG: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: " INFO",
  warn: " WARN",
  error: "ERROR",
  fatal: "FATAL",
};

function pretty(record: LogRecord): string {
  const bits: string[] = [
    record.timestamp.slice(11, 23),
    LEVEL_TAG[record.level],
    record.event ? `[${record.event}]` : "",
    record.message,
  ].filter(Boolean);

  const extras: string[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (
      key === "timestamp" ||
      key === "level" ||
      key === "message" ||
      key === "event" ||
      key === "service" ||
      key === "environment" ||
      key === "err"
    ) {
      continue;
    }
    if (value === undefined) continue;
    extras.push(`${key}=${typeof value === "object" ? JSON.stringify(value) : String(value)}`);
  }

  const head = `${bits.join(" ")}${extras.length ? `  ${extras.join(" ")}` : ""}`;
  if (!record.err) return head;

  // در حالت توسعه stack کامل کنار خط می‌آید — همان چیزی که قبلاً console.error
  // می‌داد و نباید از دست برود.
  const err = record.err;
  return `${head}\n  ↳ ${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`;
}

function orderRecord(record: LogRecord): LogRecord {
  const out: Record<string, unknown> = {};
  for (const key of LEAD_KEYS) {
    if (record[key] !== undefined) out[key] = record[key];
  }
  for (const [key, value] of Object.entries(record)) {
    if (!(key in out) && value !== undefined) out[key] = value;
  }
  return out as LogRecord;
}

function emit(level: LogLevel, message: string, bindings: LogFields, fields?: LogFields): void {
  try {
    if (LEVEL_VALUE[level] < minLevel) return;

    const merged: LogFields = { ...bindings, ...fields };
    const { err, ...rest } = merged;

    // زمینهٔ درخواست فقط وقتی خوانده می‌شود که فراخوان خودش ننوشته باشد.
    const context = currentRequestContext();

    // ⚠️ ترتیب مهم است: rest از فیلترِ حریم خصوصی رد می‌شود، ولی خطا از
    // serializeError. اگر خطا هم داخل redactDeep می‌رفت، `err.name` را کلید
    // `name` می‌دید و stack به سیصد نویسه بریده می‌شد.
    const safeRest = redactDeep(rest, { profile: "operational" }) as Record<string, unknown>;

    const record: LogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message: typeof message === "string" ? message.slice(0, 500) : String(message),
      service: "sarva",
      environment: environment(),
      ...safeRest,
    };

    const rel = release();
    if (rel) record.release = rel;

    if (record.request_id === undefined && context?.requestId) record.request_id = context.requestId;
    if (record.route === undefined && context?.route) record.route = context.route;
    if (record.method === undefined && context?.method) record.method = context.method;
    if (record.user_id === undefined && context?.userId) record.user_id = context.userId;

    if (err !== undefined && err !== null) record.err = serializeError(err);

    const ordered = orderRecord(record);

    let line: string;
    try {
      line = prettyOutput ? pretty(ordered) : JSON.stringify(ordered);
    } catch {
      // چیزی در رکورد قابل سریال نبود. یک خط حداقلی بهتر از هیچ خط است.
      line = JSON.stringify({
        timestamp: ordered.timestamp,
        level,
        message: ordered.message,
        service: "sarva",
        event: ordered.event,
        log_error: "serialize_failed",
      });
    }

    writeLine(line, level);

    for (const sink of sinks) {
      try {
        sink(ordered);
      } catch {
        /* یک مقصدِ خراب نباید بقیه را بشکند */
      }
    }
  } catch {
    /* قاعدهٔ سرسختانه: لاگر هرگز throw نمی‌کند. */
  }
}

function build(bindings: LogFields): Logger {
  const make = (level: LogLevel) => (message: string, fields?: LogFields) =>
    emit(level, message, bindings, fields);

  return {
    trace: make("trace"),
    debug: make("debug"),
    info: make("info"),
    warn: make("warn"),
    error: make("error"),
    fatal: make("fatal"),
    child: (extra: LogFields) => build({ ...bindings, ...extra }),
    isLevelEnabled: (level: LogLevel) => LEVEL_VALUE[level] >= minLevel,
  };
}

/** لاگرِ ریشه. در بیشتر جاها همین کافی است؛ برای فیلدهای تکراری `child` بگیرید. */
export const logger: Logger = build({});

export { LEVEL_NAMES };
