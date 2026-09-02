import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractReadableText } from "@/lib/reports/snapshot";

/**
 * `snapshot` تنها راهی است که مدیر می‌تواند یک سؤالِ گزارش‌شده را با نوشتنِ
 * یک مصراع پیدا کند. اگر این تابع متن را از دست بدهد، ستون پر می‌شود ولی
 * جست‌وجو دیگر جواب نمی‌دهد — خرابی‌ای که در پنل ساکت است.
 */

describe("متنِ خواندنیِ محتوا", () => {
  test("رشتهٔ ساده همان است", () => {
    assert.equal(extractReadableText("بشنو این نی"), "بشنو این نی");
  });

  test("متنِ درونِ شیءِ تودرتو بیرون کشیده می‌شود", () => {
    const content = {
      type: "mcq-select-line-in-poem",
      lines: ["بشنو این نی چون شکایت می‌کند", "از جدایی‌ها حکایت می‌کند"],
    };
    const out = extractReadableText(content);
    assert.ok(out.includes("بشنو این نی چون شکایت می‌کند"));
    assert.ok(out.includes("از جدایی‌ها حکایت می‌کند"));
  });

  test("هیچ‌وقت [object Object] نمی‌سازد", () => {
    const out = extractReadableText({ passage: { tokens: [{ text: "روباه" }] } });
    assert.equal(out, "روباه");
    assert.ok(!out.includes("[object"));
  });

  test("کلیدهای فنی متن نیستند", () => {
    const out = extractReadableText({ type: "true-false", id: "x1", prompt: "درست است؟" });
    assert.equal(out, "درست است؟");
  });

  test("رشتهٔ خالی و null نادیده گرفته می‌شوند", () => {
    assert.equal(extractReadableText({ a: "", b: null, c: "  ", d: "متن" }), "متن");
  });

  test("طول محدود می‌ماند", () => {
    const out = extractReadableText({ a: "الف".repeat(500) }, 40);
    assert.ok(out.length <= 40, `طول ${out.length}`);
    assert.ok(out.endsWith("…"));
  });

  test("آرایه‌ای از چند بخش، همه را می‌آورد", () => {
    const out = extractReadableText([
      "صورتِ سؤال",
      { type: "short-text-answer", prompt: "معنی واژه؟" },
    ]);
    assert.equal(out, "صورتِ سؤال / معنی واژه؟");
  });
});
