import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  configureLogger,
  logger,
  resetLogger,
  type LogLevel,
} from "@/lib/observability/logger";
import { newRequestId, runWithRequestContext } from "@/lib/observability/context";

/** خطوطی که لاگر نوشته، به‌جای stdout. */
let lines: { line: string; level: LogLevel }[] = [];

function captured(): Record<string, unknown>[] {
  return lines.map((l) => JSON.parse(l.line) as Record<string, unknown>);
}

beforeEach(() => {
  lines = [];
  configureLogger({
    level: "trace",
    pretty: false,
    write: (line, level) => lines.push({ line, level }),
  });
});

afterEach(() => {
  resetLogger();
});

describe("فیلدهای پایه", () => {
  test("هر خط JSON معتبر با فیلدهای لازم است", () => {
    logger.info("سلام", { event: "test.hello" });

    const [record] = captured();
    assert.equal(record.level, "info");
    assert.equal(record.message, "سلام");
    assert.equal(record.event, "test.hello");
    assert.equal(record.service, "sarva");
    assert.ok(typeof record.timestamp === "string");
    assert.ok(!Number.isNaN(Date.parse(record.timestamp as string)));
    assert.ok(record.environment);
  });

  test("release فقط وقتی APP_RELEASE هست", () => {
    logger.info("بدون نسخه");
    assert.equal(captured()[0].release, undefined);

    process.env.APP_RELEASE = "v1.2.3";
    lines = [];
    logger.info("با نسخه");
    assert.equal(captured()[0].release, "v1.2.3");
    delete process.env.APP_RELEASE;
  });

  test("child logger فیلدهای مشترک را تکرار نمی‌کند", () => {
    const child = logger.child({ route: "/api/v1/x", method: "POST" });
    child.info("یک", { status_code: 200 });
    child.info("دو", { status_code: 500 });

    const records = captured();
    assert.equal(records[0].route, "/api/v1/x");
    assert.equal(records[1].route, "/api/v1/x");
    assert.equal(records[0].status_code, 200);
    assert.equal(records[1].status_code, 500);
  });

  test("خطا سریال می‌شود و به سطح رشته نمی‌ریزد", () => {
    logger.error("شکست", { err: new RangeError("خارج از بازه") });
    const record = captured()[0];
    const err = record.err as Record<string, unknown>;
    assert.equal(err.name, "RangeError");
    assert.equal(err.message, "خارج از بازه");
    assert.ok(typeof err.stack === "string");
  });
});

describe("انتخاب سطح", () => {
  test("پایین‌تر از سطح تنظیم‌شده چاپ نمی‌شود", () => {
    configureLogger({ level: "warn", pretty: false, write: (line, level) => lines.push({ line, level }) });

    logger.trace("۱");
    logger.debug("۲");
    logger.info("۳");
    logger.warn("۴");
    logger.error("۵");
    logger.fatal("۶");

    assert.deepEqual(
      captured().map((r) => r.level),
      ["warn", "error", "fatal"],
    );
  });

  test("silent یعنی هیچ", () => {
    configureLogger({ level: "silent", write: (line, level) => lines.push({ line, level }) });
    logger.fatal("حتی این هم نه");
    assert.equal(lines.length, 0);
  });

  test("error و fatal به stderr می‌روند، بقیه به stdout", () => {
    logger.info("الف");
    logger.warn("ب");
    logger.error("ج");
    logger.fatal("د");
    assert.deepEqual(
      lines.map((l) => l.level),
      ["info", "warn", "error", "fatal"],
    );
  });

  test("isLevelEnabled درست جواب می‌دهد", () => {
    configureLogger({ level: "info" });
    assert.equal(logger.isLevelEnabled("debug"), false);
    assert.equal(logger.isLevelEnabled("info"), true);
    assert.equal(logger.isLevelEnabled("error"), true);
  });
});

describe("شناسهٔ درخواست خودکار می‌آید", () => {
  test("از زمینه، بدون اینکه فراخوان بنویسدش", () => {
    const id = newRequestId();
    runWithRequestContext({ requestId: id, route: "/r", method: "GET" }, () => {
      logger.info("داخل درخواست");
    });

    const record = captured()[0];
    assert.equal(record.request_id, id);
    assert.equal(record.route, "/r");
    assert.equal(record.method, "GET");
  });

  test("بیرون از زمینه هم درست کار می‌کند", () => {
    logger.info("بدون زمینه");
    assert.equal(captured()[0].request_id, undefined);
  });

  test("مقدار صریحِ فراخوان بر زمینه ارجح است", () => {
    runWithRequestContext({ requestId: newRequestId(), route: "/a" }, () => {
      logger.info("x", { route: "/b" });
    });
    assert.equal(captured()[0].route, "/b");
  });
});

describe("هیچ رازی به لاگ نمی‌رسد", () => {
  test("کلیدهای حساس، حتی در عمق", () => {
    logger.info("ورود", {
      event: "auth.login",
      password: "hunter2",
      body: { email: "ali@example.com", refreshToken: "t".repeat(64) },
      cookie: "sid=abc",
      db_params: ["hash-value", "ali@example.com"],
    });

    const raw = lines[0].line;
    for (const secret of ["hunter2", "ali@example.com", "t".repeat(64), "sid=abc"]) {
      assert.ok(!raw.includes(secret), `«${secret.slice(0, 20)}» در لاگ دیده شد`);
    }
  });

  test("توکنِ داخل یک رشتهٔ آزاد هم", () => {
    logger.info("x", { note: `Authorization: Bearer ${"a".repeat(80)}` });
    assert.ok(!lines[0].line.includes("a".repeat(80)));
  });
});

describe("لاگر هرگز throw نمی‌کند", () => {
  test("وقتی نوشتن روی خروجی خطا می‌دهد", () => {
    configureLogger({
      level: "trace",
      write: () => {
        throw new Error("stdout خراب است");
      },
    });
    assert.doesNotThrow(() => logger.error("چیزی"));
  });

  test("وقتی مقدارِ داده‌شده قابل سریال نیست", () => {
    const bad = { toJSON() { throw new Error("نه"); } };
    assert.doesNotThrow(() => logger.info("x", { bad }));
    assert.equal(lines.length, 1);
  });

  test("وقتی getter یک فیلد خطا می‌دهد", () => {
    const bad = {};
    Object.defineProperty(bad, "boom", {
      enumerable: true,
      get() {
        throw new Error("نه");
      },
    });
    assert.doesNotThrow(() => logger.info("x", { bad }));
  });
});

describe("لاگ دیتابیس", () => {
  test("پارامترهای خام SQL هرگز به لاگ نمی‌رسند", () => {
    // شبیه‌سازیِ یک فراخوانِ بی‌دقت: پارامترهای واقعی مستقیم داده شده‌اند.
    logger.error("کوئری شکست خورد", {
      event: "db.query.failed",
      db_operation: "INSERT",
      db_statement_fingerprint: "a1b2c3d4e5f6",
      db_params: ["ali@example.com", "argon2-hash-value-here", "1.2.3.4"],
      params: ["ali@example.com"],
    });

    const raw = lines[0].line;
    assert.ok(!raw.includes("ali@example.com"), raw);
    assert.ok(!raw.includes("argon2-hash-value-here"), raw);

    // ولی آنچه برای پیدا کردن کوئری لازم است می‌ماند.
    const record = JSON.parse(raw) as Record<string, unknown>;
    assert.equal(record.db_operation, "INSERT");
    assert.equal(record.db_statement_fingerprint, "a1b2c3d4e5f6");
    assert.equal(record.event, "db.query.failed");
  });

  test("«شکلِ» پارامترها در حالت توسعه می‌ماند، چون خودش داده ندارد", () => {
    logger.debug("x", { db_param_shapes: '["[رشتهٔ 64 نویسه‌ای]","[ایمیل]",7]' });
    const record = JSON.parse(lines[0].line) as Record<string, unknown>;
    assert.ok(String(record.db_param_shapes).includes("[ایمیل]"));
  });
});
