import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { regradeAttempt, finiteOr } from "@/lib/exam/regrade";
import type { SeedExam } from "@/lib/exam/seed-data/seed-types";

/**
 * تصحیحِ دوبارهٔ کارنامه روی سرور.
 *
 * ⚠️ این تست‌ها یک آسیب‌پذیریِ واقعی را نگه می‌دارند که بسته شد:
 *
 * `submitExamAttempt` یک Server Action است — یعنی یک endpoint شبکه که هر
 * دانش‌آموزِ واردشده می‌تواند مستقیم صدایش بزند. تا دیروز نمره را از همان
 * `questionResults`ی که کلاینت می‌فرستاد جمع می‌زد، پس فرستادن
 * `{ parts: [{ score: 20, maxScore: 20 }] }` یک کارنامهٔ بیست می‌ساخت بدون
 * اینکه حتی یک سؤال باز شده باشد.
 *
 * حالا `questionResults` فقط می‌گوید کدام سؤال‌ها پاسخ داده شده‌اند و نمره از
 * روی برگهٔ واقعی از نو حساب می‌شود.
 */

/** یک برگهٔ کوچک: یک سؤال با یک بخشِ خودکار و یک بخشِ خودارزیابی. */
const paper = {
  title: "آزمون آزمایشی",
  sections: [
    {
      title: "قلمرو زبانی",
      questions: [
        {
          number: 1,
          prompt: "معنی واژه را بنویسید.",
          parts: [
            {
              label: "الف",
              score: 2,
              gradingMode: "exact_match",
              // «درست/نادرست» ساده‌ترین نوعِ قطعی است: پاسخِ درست دقیقاً یک
              // مقدار است، پس تست به جزئیاتِ نرمال‌سازیِ متن وابسته نمی‌شود.
              content: { type: "true-false", text: "این جمله درست است؟" },
              correctAnswer: { value: true },
            },
            {
              label: "ب",
              score: 3,
              gradingMode: "conceptual",
              content: { type: "open-response", text: "توضیح دهید." },
              correctAnswer: { text: "هر توضیح درستی" },
            },
          ],
        },
      ],
    },
  ],
} as unknown as SeedExam;

/** آنچه یک مهاجم می‌فرستد: نمرهٔ دلخواه روی هر دو بخش. */
const forged = {
  1: {
    number: 1,
    parts: [
      { score: 999, maxScore: 999, status: "correct", correctAnswerText: "" },
      { score: 999, maxScore: 999, status: "correct", correctAnswerText: "" },
    ],
  },
} as never;

describe("تصحیح دوبارهٔ آزمون روی سرور", () => {
  test("نمرهٔ جعلیِ کلاینت روی بخشِ خودکار نادیده گرفته می‌شود", () => {
    // پاسخِ خام غلط است، پس بخشِ الف باید صفر بگیرد — هرچه کلاینت ادعا کند.
    const r = regradeAttempt(paper, forged, { "1:0": false });
    assert.equal(r.results[1].parts[0].score, 0);
  });

  test("maxScore از برگه می‌آید، نه از کلاینت", () => {
    const r = regradeAttempt(paper, forged, {});
    assert.equal(r.maxScore, 5); // ۲ + ۳، نه ۹۹۹+۹۹۹
  });

  test("نمرهٔ خودارزیابی به سقفِ همان بخش بریده می‌شود", () => {
    const r = regradeAttempt(paper, forged, {});
    assert.equal(r.results[1].parts[1].score, 3); // نه ۹۹۹
    assert.ok(r.totalScore <= r.maxScore);
  });

  test("پاسخِ درست روی بخشِ خودکار نمرهٔ کامل می‌گیرد", () => {
    const r = regradeAttempt(paper, { 1: { number: 1, parts: [] } } as never, { "1:0": true });
    assert.equal(r.results[1].parts[0].score, 2);
  });

  test("سؤالی که روی برگه نیست نه نمره می‌گیرد نه شمرده می‌شود", () => {
    const ghost = {
      404: {
        number: 404,
        parts: [{ score: 50, maxScore: 50, status: "correct", correctAnswerText: "" }],
      },
    } as never;
    const r = regradeAttempt(paper, ghost, {});
    assert.equal(r.answeredQuestions, 0);
    assert.equal(r.totalScore, 0);
    assert.equal(r.maxScore, 0);
  });

  test("NaN و Infinity در نمرهٔ خودارزیابی به صفر می‌افتند", () => {
    for (const bad of [NaN, Infinity, -Infinity, "20", null, undefined, {}]) {
      const payload = {
        1: { number: 1, parts: [{}, { score: bad }] },
      } as never;
      const r = regradeAttempt(paper, payload, {});
      assert.ok(
        Number.isFinite(r.totalScore) && r.totalScore >= 0 && r.totalScore <= r.maxScore,
        `نمره با ورودیِ ${String(bad)} از بازه بیرون زد: ${r.totalScore}`,
      );
    }
  });

  test("نمرهٔ منفیِ خودارزیابی به صفر بریده می‌شود", () => {
    const payload = { 1: { number: 1, parts: [{}, { score: -100 }] } } as never;
    const r = regradeAttempt(paper, payload, {});
    assert.equal(r.results[1].parts[1].score, 0);
  });

  test("جمعِ کل هرگز از سقف بیشتر نمی‌شود", () => {
    const r = regradeAttempt(paper, forged, { "1:0": true });
    assert.ok(r.totalScore <= r.maxScore, `${r.totalScore} > ${r.maxScore}`);
  });

  test("finiteOr فقط عددِ متناهی را می‌پذیرد", () => {
    assert.equal(finiteOr(3.5, 0), 3.5);
    assert.equal(finiteOr(NaN, 0), 0);
    assert.equal(finiteOr(Infinity, 0), 0);
    assert.equal(finiteOr("5", 0), 0);
  });
});
