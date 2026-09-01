import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  REDACTED,
  redactDeep,
  redactRecord,
  sanitizeRoutePath,
  sanitizeUrl,
  scrubText,
} from "@/lib/observability/redact";

/**
 * این تست‌ها قرارداد امنیتیِ لاگ‌اند.
 *
 * اگر روزی یکی از این‌ها شکست، یعنی یک راز دارد به `docker compose logs`
 * می‌رود. هیچ‌کدامشان را با تغییر انتظارِ تست «سبز» نکنید.
 */

describe("پنهان کردن کلیدهای حساس", () => {
  test("در سطح اول", () => {
    const out = redactDeep({ password: "hunter2", ok: 1 }) as Record<string, unknown>;
    assert.equal(out.password, REDACTED);
    assert.equal(out.ok, 1);
  });

  test("در عمقِ چند لایه — همان چیزی که نسخهٔ قبلی از دست می‌داد", () => {
    const out = redactDeep({
      settings: { smtp: { host: "mail.example.com", password: "s3cret" } },
    }) as { settings: { smtp: Record<string, unknown> } };

    assert.equal(out.settings.smtp.password, REDACTED);
    assert.equal(out.settings.smtp.host, "mail.example.com");
  });

  test("داخل آرایه‌ها", () => {
    const out = redactDeep({
      users: [{ id: "u1", apiKey: "abc" }, { id: "u2", api_key: "def" }],
    }) as { users: Record<string, unknown>[] };

    assert.equal(out.users[0].apiKey, REDACTED);
    assert.equal(out.users[1].api_key, REDACTED);
    assert.equal(out.users[0].id, "u1");
  });

  test("بدون توجه به بزرگی و کوچکی حروف و جداکننده", () => {
    const out = redactDeep({
      PASSWORD: "a",
      "Api-Key": "b",
      refresh_token: "c",
      SetCookie: "d",
      authorization: "e",
      otpHash: "f",
      turnstileToken: "g",
      OTP_PEPPER: "h",
    }) as Record<string, unknown>;

    for (const key of Object.keys(out)) {
      assert.equal(out[key], REDACTED, `کلید ${key} پنهان نشد`);
    }
  });

  test("ایمیل، شماره و IP در لاگ عملیاتی پنهان می‌شوند", () => {
    const out = redactDeep({
      actorEmail: "a@b.com",
      clientIp: "1.2.3.4",
      userAgent: "Mozilla",
      fullName: "علی",
      toPhone: "09120000000",
    }) as Record<string, unknown>;

    for (const key of Object.keys(out)) {
      assert.equal(out[key], REDACTED, `کلید ${key} پنهان نشد`);
    }
  });

  test("ولی در نمایهٔ ممیزی، ایمیل و IP می‌مانند و فقط راز می‌رود", () => {
    const out = redactDeep(
      { actorEmail: "a@b.com", ip: "1.2.3.4", apiKey: "x" },
      { profile: "audit" },
    ) as Record<string, unknown>;

    assert.equal(out.actorEmail, "a@b.com");
    assert.equal(out.ip, "1.2.3.4");
    assert.equal(out.apiKey, REDACTED);
  });

  test("کلیدهای بی‌گناهی که شبیه کلیدهای حساس‌اند، پنهان نمی‌شوند", () => {
    const out = redactDeep({
      skip: 10,
      mailDriver: "smtp",
      hasChanges: true,
      authorName: "حافظ",
      emailVerified: true,
    }) as Record<string, unknown>;

    assert.equal(out.skip, 10);
    assert.equal(out.mailDriver, "smtp");
    assert.equal(out.hasChanges, true);
    assert.equal(out.emailVerified, true);
  });

  test("متن کاربر بریده می‌شود و لاگ را منفجر نمی‌کند", () => {
    const poem = "الا یا ایها الساقی ادر کاسا و ناولها ".repeat(50);
    const out = redactDeep({ note: poem }) as { note: string };
    assert.ok(out.note.length <= 301, `طول ${out.note.length}`);
  });

  test("شیء حلقه‌دار باعث خطا نمی‌شود", () => {
    const a: Record<string, unknown> = { name: "a" };
    a.self = a;
    const out = redactDeep(a) as Record<string, unknown>;
    assert.equal(out.self, "«ارجاع حلقوی»");
    assert.doesNotThrow(() => JSON.stringify(out));
  });

  test("redactRecord همیشه یک شیء ساده می‌دهد", () => {
    assert.deepEqual(redactRecord(undefined), {});
    assert.deepEqual(redactRecord(null), {});
    assert.deepEqual(redactRecord({ a: 1 }), { a: 1 });
  });
});

describe("پاک‌سازی متن آزاد", () => {
  test("ایمیلِ داخل پیام خطا", () => {
    const out = scrubText("duplicate key: ali@example.com already exists");
    assert.ok(!out.includes("ali@example.com"), out);
    assert.ok(out.includes("«ایمیل»"));
  });

  test("شمارهٔ موبایل", () => {
    assert.ok(!scrubText("کد به 09121234567 رفت").includes("09121234567"));
  });

  test("رشتهٔ بلندی که شبیه توکن است", () => {
    const token = "a".repeat(64);
    assert.ok(!scrubText(`token=${token}`).includes(token));
  });
});

describe("پاک‌سازی آدرس", () => {
  test("توکنِ داخل query string به لاگ نمی‌رسد", () => {
    const out = sanitizeUrl("/reset-password?token=abc123&x=1");
    assert.ok(!out.includes("abc123"), out);
    assert.ok(out.includes("x=1"), out);
    assert.ok(out.startsWith("/reset-password"), out);
  });

  test("code، key و email هم", () => {
    const out = sanitizeUrl("https://sarva.ir/a?code=1&key=2&email=a@b.com&page=3");
    assert.ok(!out.includes("a@b.com"), out);
    assert.ok(out.includes("page=3"), out);
    assert.ok(out.includes("https://sarva.ir/a"), out);
  });

  test("fragment کلاً حذف می‌شود", () => {
    assert.ok(!sanitizeUrl("/a?b=1#access_token=zzz").includes("zzz"));
  });

  test("آدرس بدشکل باعث خطا نمی‌شود", () => {
    assert.doesNotThrow(() => sanitizeUrl("::::"));
    assert.equal(sanitizeUrl(""), "");
  });
});

describe("قالبِ مسیر", () => {
  test("uuid و عدد یکسان‌سازی می‌شوند", () => {
    assert.equal(
      sanitizeRoutePath("/panel/8f0c1c2e-1111-4222-8333-444455556666/edit"),
      "/panel/:id/edit",
    );
    assert.equal(sanitizeRoutePath("/exam/12345"), "/exam/:n");
  });
});

describe("stack trace خوانا می‌ماند", () => {
  test("مسیر فایل‌ها پنهان نمی‌شود", () => {
    const stack =
      "Error: x\n    at l (/app/.next/server/chunks/[root-of-the-server]__1o05ozh._.js:1:6974)";
    const out = scrubText(stack, 4000);
    assert.ok(out.includes("/app/.next/server/chunks/"), out);
  });

  test("ولی توکنِ داخل همان متن همچنان می‌رود", () => {
    const jwt = `eyJhbGciOiJIUzI1NiJ9.${"x".repeat(60)}.${"y".repeat(43)}`;
    const out = scrubText(`Error: bad token ${jwt}`, 4000);
    assert.ok(!out.includes("x".repeat(60)), out);
    assert.ok(!out.includes("y".repeat(43)), out);
  });
});
