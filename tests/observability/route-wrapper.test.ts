import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { withRoute } from "@/lib/api/route";
import { configureLogger, resetLogger, type LogLevel } from "@/lib/observability/logger";
import { REQUEST_ID_HEADER, currentRequestId, normalizeRequestId } from "@/lib/observability/context";

let lines: string[] = [];

function records(): Record<string, unknown>[] {
  return lines.map((l) => JSON.parse(l) as Record<string, unknown>);
}

beforeEach(() => {
  lines = [];
  configureLogger({
    level: "trace" as LogLevel,
    pretty: false,
    write: (line) => lines.push(line),
  });
});

afterEach(() => resetLogger());

/** یک درخواست ساختگی. `withRoute` فقط headers و method را می‌خواند. */
function req(init: { method?: string; headers?: Record<string, string> } = {}): never {
  return new Request("http://localhost/api/v1/test", {
    method: init.method ?? "GET",
    headers: init.headers,
  }) as never;
}

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

describe("پوشش Route Handler", () => {
  test("پاسخ ۲xx: سطح info، رخداد completed", async () => {
    const handler = withRoute("/api/v1/test", async () => json(200, { ok: true, data: 1 }));
    const response = await handler(req(), {});

    assert.equal(response.status, 200);
    const [record] = records();
    assert.equal(record.level, "info");
    assert.equal(record.event, "http.request.completed");
    assert.equal(record.status_code, 200);
    assert.equal(record.outcome, "success");
    assert.equal(record.route, "/api/v1/test");
    assert.equal(record.method, "GET");
    assert.equal(typeof record.duration_ms, "number");
  });

  test("پاسخ ۴xx خطا حساب نمی‌شود", async () => {
    for (const status of [400, 401, 403, 404, 409]) {
      lines = [];
      const handler = withRoute("/api/v1/test", async () =>
        json(status, { ok: false, errors: ["نه"] }),
      );
      await handler(req({ method: "POST" }), {});

      const [record] = records();
      assert.equal(record.level, "info", `وضعیت ${status} نباید error باشد`);
      assert.equal(record.event, "http.request.rejected");
      assert.equal(record.outcome, "client_error");
    }
  });

  test("پاسخ ۴۲۹: هشدار، با رخداد مخصوص خودش و بدون شناسهٔ حساس", async () => {
    const handler = withRoute("/api/v1/test", async () =>
      json(429, { ok: false, errors: ["زیاد"] }),
    );
    await handler(req({ method: "POST" }), {});

    const [record] = records();
    assert.equal(record.level, "warn");
    assert.equal(record.event, "http.request.rate_limited");
    assert.equal(record.outcome, "rate_limited");
    assert.ok(!lines[0].includes("@"), "نشانی ایمیل در لاگ سقف نرخ");
  });

  test("پاسخ ۵xx: سطح error", async () => {
    const handler = withRoute("/api/v1/test", async () =>
      json(500, { ok: false, errors: ["خطا"] }),
    );
    await handler(req(), {});

    const [record] = records();
    assert.equal(record.level, "error");
    assert.equal(record.event, "http.request.failed");
  });

  test("خطای فرارکرده: پاسخ ۵۰۰ با همان قرارداد، بدون متن فنی", async () => {
    const handler = withRoute("/api/v1/test", async () => {
      throw new Error("رمز دیتابیس اشتباه است: pg://user:hunter2@db");
    });

    const response = await handler(req(), {});
    assert.equal(response.status, 500);

    const body = (await response.json()) as { ok: boolean; errors: string[] };
    assert.equal(body.ok, false);
    assert.ok(Array.isArray(body.errors));
    assert.ok(!JSON.stringify(body).includes("hunter2"), "متن فنی به کاربر رسید");

    const record = records().find((r) => r.event === "http.request.failed");
    assert.ok(record, "خط لاگ ۵۰۰ نوشته نشد");
    assert.equal(record!.level, "error");

    // ⚠️ نکتهٔ اصلیِ این تست از دید failure-safety:
    //
    // در محیط تست، `@/lib/admin/audit` اصلاً بار نمی‌شود (به‌خاطر
    // "server-only" و وابستگیِ دیتابیس). یعنی این همان حالتی است که ثبت در
    // جدول خطا شکست می‌خورد — و همان‌طور که بالا دیدید، پاسخ کاربر و خطِ
    // لاگ هر دو سالم‌اند. خرابیِ ثبت، درخواست را نمی‌شکند.
  });

  test("خطای تودرتو در گزارش، پاسخ را نمی‌شکند", async () => {
    // خطایی که خودش هنگام خوانده شدن خطا می‌دهد — بدترین ورودیِ ممکن برای
    // مسیر گزارش.
    const nasty = new Error("اصلی");
    Object.defineProperty(nasty, "stack", {
      get() {
        throw new Error("stack هم خراب است");
      },
    });

    const handler = withRoute("/api/v1/test", async () => {
      throw nasty;
    });

    const response = await handler(req(), {});
    assert.equal(response.status, 500);
    assert.equal((await response.json() as { ok: boolean }).ok, false);
  });

  test("خطای مورد انتظار (status زیر ۵۰۰) همان وضعیت خودش را می‌گیرد", async () => {
    const handler = withRoute("/api/v1/test", async () => {
      throw Object.assign(new Error("وارد نشده‌اید."), { status: 401, name: "AuthError" });
    });

    const response = await handler(req(), {});
    assert.equal(response.status, 401);

    const body = (await response.json()) as { ok: boolean; errors: string[] };
    assert.deepEqual(body, { ok: false, errors: ["وارد نشده‌اید."] });

    const record = records().find((r) => r.status_code === 401);
    assert.equal(record!.level, "info", "۴۰۱ نباید error باشد");
  });
});

describe("شناسهٔ درخواست", () => {
  test("روی پاسخ می‌نشیند", async () => {
    const handler = withRoute("/api/v1/test", async () => json(200, { ok: true, data: null }));
    const response = await handler(req(), {});

    const id = response.headers.get(REQUEST_ID_HEADER);
    assert.ok(id, "هدر شناسه روی پاسخ نبود");
    assert.equal(normalizeRequestId(id), id);
  });

  test("شناسهٔ معتبرِ آمده از proxy استفاده می‌شود", async () => {
    const incoming = "8f0c1c2e-1111-4222-8333-444455556666";
    let seen: string | null = null;

    const handler = withRoute("/api/v1/test", async () => {
      seen = currentRequestId();
      return json(200, { ok: true, data: null });
    });

    const response = await handler(req({ headers: { [REQUEST_ID_HEADER]: incoming } }), {});
    assert.equal(seen, incoming);
    assert.equal(response.headers.get(REQUEST_ID_HEADER), incoming);
    assert.equal(records()[0].request_id, incoming);
  });

  test("مقدار مخرب دور ریخته و شناسهٔ تازه ساخته می‌شود", async () => {
    // هدر HTTP فقط ASCII می‌پذیرد، پس مقدار مخرب هم ASCII است.
    const hostile = '"}{"level":"fatal","message":"FORGED_LOG_LINE"';
    const handler = withRoute("/api/v1/test", async () => json(200, { ok: true, data: null }));

    const response = await handler(req({ headers: { [REQUEST_ID_HEADER]: hostile } }), {});
    const id = response.headers.get(REQUEST_ID_HEADER);

    assert.notEqual(id, hostile);
    assert.equal(normalizeRequestId(id), id);
    assert.ok(!lines.join("\n").includes("FORGED_LOG_LINE"), "مقدار مخرب وارد لاگ شد");
  });

  test("درخواست‌های همزمان شناسه‌شان قاطی نمی‌شود", async () => {
    const handler = withRoute("/api/v1/test", async () => {
      const before = currentRequestId();
      await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 10)));
      assert.equal(currentRequestId(), before);
      return json(200, { ok: true, data: before });
    });

    const responses = await Promise.all(
      Array.from({ length: 25 }, () => handler(req(), {})),
    );

    const ids = await Promise.all(
      responses.map(async (r) => {
        const body = (await r.json()) as { data: string };
        assert.equal(r.headers.get(REQUEST_ID_HEADER), body.data);
        return body.data;
      }),
    );

    assert.equal(new Set(ids).size, ids.length, "شناسه‌ها یکتا نبودند");
  });
});

describe("بدنه و کوکی هرگز لاگ نمی‌شوند", () => {
  test("نه بدنهٔ درخواست، نه کوکی، نه Authorization", async () => {
    const request = new Request("http://localhost/api/v1/test?token=SECRET_TOKEN_VALUE", {
      method: "POST",
      headers: {
        cookie: "sarva_access=SECRET_COOKIE_VALUE",
        authorization: "Bearer SECRET_BEARER_VALUE",
      },
      body: JSON.stringify({ password: "SECRET_PASSWORD_VALUE" }),
    }) as never;

    const handler = withRoute("/api/v1/test", async () => json(200, { ok: true, data: null }));
    await handler(request, {});

    const raw = lines.join("\n");
    for (const secret of [
      "SECRET_TOKEN_VALUE",
      "SECRET_COOKIE_VALUE",
      "SECRET_BEARER_VALUE",
      "SECRET_PASSWORD_VALUE",
    ]) {
      assert.ok(!raw.includes(secret), `${secret} در لاگ دیده شد`);
    }
  });
});
