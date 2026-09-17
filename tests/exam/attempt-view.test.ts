import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  answerKey,
  answerText,
  num,
  readAttemptQuestions,
  readJsonObject,
} from "@/lib/exam/attempt-view";

/**
 * خواندنِ کارنامهٔ ذخیره‌شده.
 *
 * =============================================================================
 * ⚠️ چرا این آزمون وجود دارد
 * =============================================================================
 *
 * این منطق تا امروز داخلِ `ExamPanel.tsx` بود و هیچ آزمونی نداشت. حالا
 * *دو* مصرف‌کننده دارد — پنلِ دانش‌آموز و صفحهٔ کارنامه در پنلِ دبیر — و
 * واگراییِ آن دو دقیقاً همان چیزی است که این فایل برایش ساخته شد: اگر
 * دانش‌آموز «۱۴ از ۲۰» ببیند و دبیرش «۱۳٫۵ از ۲۰»، هیچ‌کدام نمی‌فهمند کدام
 * درست است.
 *
 * سه چیزِ ظریف اینجا آزموده می‌شود و هر سه یک بار واقعاً می‌توانستند بشکنند:
 *
 *   ۱. **دو شکلِ ذخیره‌سازی.** ردیف‌های قدیمی `{score, max}` دارند و
 *      ردیف‌های امروزی `{number, parts}`. خواندنِ `raw.score` روی شکلِ
 *      امروزی همیشه صفر می‌دهد — یعنی کارنامه‌ای پر از «۰ از ۰».
 *
 *   ۲. **رشته بودنِ ستونِ JSON در MariaDB.** میزبانِ production مارییادی‌بی
 *      است و آنجا `JSON` یک نامِ مستعار برای LONGTEXT است؛ `mysql2` رشته
 *      می‌دهد و نه شیء. کدی که فقط روی MySQL امتحان شده باشد، آنجا بی‌صدا
 *      کارنامهٔ خالی نشان می‌دهد.
 *
 *   ۳. **مرتب‌سازیِ عددی.** با مرتب‌سازیِ رشته‌ای «۱۰» پیش از «۲» می‌آید.
 */

describe("readJsonObject", () => {
  it("شیء را همان‌طور می‌پذیرد", () => {
    assert.deepEqual(readJsonObject({ a: 1 }), { a: 1 });
  });

  it("رشتهٔ JSON را پارس می‌کند — همان چیزی که MariaDB برمی‌گرداند", () => {
    assert.deepEqual(readJsonObject('{"a":1}'), { a: 1 });
  });

  it("هر چیزِ دیگری شیءِ خالی می‌شود و throw نمی‌کند", () => {
    for (const bad of [null, undefined, 42, "نه‌جیسون", "[1,2]", [1, 2], ""]) {
      assert.deepEqual(readJsonObject(bad), {}, String(bad));
    }
  });
});

describe("num", () => {
  it("رشتهٔ DECIMAL را عدد می‌کند", () => {
    // ⚠️ `mysql2` برای DECIMAL گاهی رشته می‌دهد.
    assert.equal(num("1.50"), 1.5);
    assert.equal(num(2), 2);
  });

  it("ورودیِ بی‌معنا صفر می‌شود و NaN بیرون نمی‌دهد", () => {
    for (const bad of [null, undefined, "abc", {}, []]) {
      assert.equal(num(bad), 0, String(bad));
    }
  });
});

describe("readAttemptQuestions", () => {
  it("شکلِ امروزی: نمره از جمعِ بخش‌ها درمی‌آید", () => {
    /* ⚠️ اینجا هیچ `score` یا `max`ی در سطحِ سؤال نیست. اگر کد سراغِ
       آن‌ها برود، این سؤال «۰ از ۰» می‌شود. */
    const stored = {
      "3": {
        number: 3,
        parts: [
          { score: 1, maxScore: 1, status: "correct" },
          { score: 0.5, maxScore: 1, status: "partial" },
        ],
      },
    };

    const [q] = readAttemptQuestions(stored);
    assert.equal(q.number, 3);
    assert.equal(q.score, 1.5);
    assert.equal(q.max, 2);
    assert.equal(q.parts.length, 2);
  });

  it("شکلِ قدیمی: نمره از خودِ سؤال خوانده می‌شود", () => {
    /* ⚠️ این ردیف‌ها در دیتابیس **هستند** و پاک نمی‌شوند — کارنامهٔ کسی
       که پارسال آزمون داده نباید ناپدید شود. */
    const [q] = readAttemptQuestions({ "5": { score: 1.5, max: 2 } });
    assert.equal(q.number, 5, "شماره از کلید حدس زده می‌شود");
    assert.equal(q.score, 1.5);
    assert.equal(q.max, 2);
    assert.deepEqual(q.parts, []);
  });

  it("رشتهٔ JSON هم درست خوانده می‌شود — مسیرِ MariaDB", () => {
    const questions = readAttemptQuestions(
      '{"1":{"number":1,"parts":[{"score":2,"maxScore":2}]}}',
    );
    assert.equal(questions.length, 1);
    assert.equal(questions[0].score, 2);
  });

  it("به ترتیبِ عددیِ برگه مرتب می‌شود و نه الفبایی", () => {
    const stored = {
      "10": { number: 10, parts: [] },
      "2": { number: 2, parts: [] },
      "1": { number: 1, parts: [] },
    };
    assert.deepEqual(
      readAttemptQuestions(stored).map((q) => q.number),
      [1, 2, 10],
      "مرتب‌سازیِ رشته‌ای «۱۰» را پیش از «۲» می‌آورد",
    );
  });

  it("کلیدِ خام نگه داشته می‌شود — پاسخ‌ها با همان ایندکس می‌شوند", () => {
    const [q] = readAttemptQuestions({ "7": { number: 7, parts: [{ score: 1, maxScore: 1 }] } });
    assert.equal(q.key, "7");
    assert.equal(answerKey(q.key, 0), "7:0");
  });

  it("ورودیِ خالی یا خراب فهرستِ خالی می‌دهد", () => {
    assert.deepEqual(readAttemptQuestions(null), []);
    assert.deepEqual(readAttemptQuestions("{}"), []);
    assert.deepEqual(readAttemptQuestions("خراب"), []);
  });
});

describe("answerText", () => {
  it("رشته، عدد و بولین را می‌نویسد", () => {
    assert.equal(answerText("  پاسخ  "), "پاسخ");
    assert.equal(answerText(3), "3");
    assert.equal(answerText(true), "true");
  });

  it("آرایه را با ویرگولِ فارسی به هم می‌چسباند", () => {
    assert.equal(answerText(["الف", "ب"]), "الف، ب");
    assert.equal(answerText(["الف", "", "ب"]), "الف، ب", "خالی‌ها حذف می‌شوند");
  });

  it("شیء رشتهٔ خالی می‌شود و نه [object Object]", () => {
    /* ⚠️ این ستون اسکیما ندارد. نوشتنِ `[object Object]` کنارِ نامِ یک
       دانش‌آموز بدتر از ننوشتن است. */
    assert.equal(answerText({ a: 1 }), "");
    assert.equal(answerText(null), "");
    assert.equal(answerText(undefined), "");
  });
});
