import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  markReported,
  serializeError,
  wasReported,
} from "@/lib/observability/serialize";

describe("سریال کردن خطا", () => {
  test("Error معمولی", () => {
    const out = serializeError(new TypeError("چیزی تعریف نشده"));
    assert.equal(out.name, "TypeError");
    assert.equal(out.message, "چیزی تعریف نشده");
    assert.ok(out.stack && out.stack.length > 0);
  });

  test("code و digest و status خوانده می‌شوند", () => {
    const err = Object.assign(new Error("boom"), {
      code: "23505",
      digest: "abc123",
      status: 403,
    });
    const out = serializeError(err);
    assert.equal(out.code, "23505");
    assert.equal(out.digest, "abc123");
    assert.equal(out.status, 403);
  });

  test("پیام خطا هم پاک‌سازی می‌شود — یک پیام پستگرس می‌تواند ایمیل داشته باشد", () => {
    const out = serializeError(new Error("Key (email)=(ali@example.com) already exists"));
    assert.ok(!out.message.includes("ali@example.com"), out.message);
  });

  test("چیزی که Error نیست", () => {
    assert.equal(serializeError("خراب شد").name, "NonError");
    assert.equal(serializeError("خراب شد").message, "خراب شد");
    assert.equal(serializeError(null).name, "NonError");
    assert.equal(serializeError(undefined).name, "NonError");
    assert.equal(serializeError(42).message, "42");
  });

  test("شیئی که throw شده، پاک‌سازی می‌شود", () => {
    const out = serializeError({ password: "hunter2", code: 500 });
    assert.ok(!out.message.includes("hunter2"), out.message);
  });

  test("stack بریده می‌شود ولی نه به اندازهٔ یک رشتهٔ معمولی", () => {
    const err = new Error("x");
    err.stack = `Error: x\n${"    at foo (/app/a.js:1:1)\n".repeat(500)}`;
    const out = serializeError(err);
    assert.ok(out.stack!.length > 300, "stack نباید مثل یک رشتهٔ عادی بریده شود");
    assert.ok(out.stack!.length <= 4001, `طول ${out.stack!.length}`);
  });

  test("cause یک سطح دنبال می‌شود", () => {
    const out = serializeError(new Error("بیرونی", { cause: new Error("درونی") }));
    assert.equal(out.cause?.message, "درونی");
  });

  test("خطای frozen هم بی‌مشکل سریال می‌شود", () => {
    const err = Object.freeze(new Error("قفل‌شده"));
    assert.doesNotThrow(() => serializeError(err));
  });
});

describe("جلوگیری از ثبت تکراری", () => {
  test("نشان‌گذاری و خواندنش", () => {
    const err = new Error("یک بار");
    assert.equal(wasReported(err), false);
    markReported(err);
    assert.equal(wasReported(err), true);
  });

  test("روی مقدارِ غیرشیء خطا نمی‌دهد", () => {
    assert.doesNotThrow(() => markReported("رشته"));
    assert.equal(wasReported("رشته"), false);
    assert.equal(wasReported(null), false);
  });

  test("روی خطای frozen هم throw نمی‌کند", () => {
    const err = Object.freeze(new Error("قفل‌شده"));
    assert.doesNotThrow(() => markReported(err));
  });
});
