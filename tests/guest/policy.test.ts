import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  GUEST_POLICY,
  guestLimit,
  guestMayContinue,
  isUnlimited,
  freeVocabLessons,
  vocabLessonOpen,
  firstHalfLessons,
  pairsLessonOpen,
  guestLimitMessage,
  guestContinueLabel,
  type GuestSection,
} from "@/lib/guest/policy";

/**
 * سیاستِ مهمان.
 *
 * ⚠️ این تست‌ها اعداد را قفل می‌کنند. پیش از این هر بخش ثابتِ خودش را داشت
 * (`GUEST_QUESTION_LIMIT = 3` داخلِ ExamRunner، و جای دیگر عددی دیگر) و
 * عوض کردنِ سیاست یعنی گشتن دنبالِ ثابت‌های پراکنده — با این ریسک که یکی جا
 * بماند و بی‌صدا با قانونِ قدیمی کار کند.
 */

describe("سقف‌های شمارشی", () => {
  test("عروض سماعی پنج سؤال", () => {
    assert.equal(guestLimit("quiz"), 5);
  });

  test("جاسوس یک دور، پلِ وزن یک دست", () => {
    assert.equal(guestLimit("jasoos"), 1);
    assert.equal(guestLimit("aruz-bridge"), 1);
  });

  test("تقطیعِ سریع سه بیت", () => {
    assert.equal(guestLimit("aruz-rapid"), 3);
  });

  test("مدار دستور یک دور", () => {
    assert.equal(guestLimit("grammar-circuit"), 1);
  });

  test("بخش‌های آزاد سقف ندارند", () => {
    for (const s of ["vazn-yab", "ninja"] as GuestSection[]) {
      assert.equal(guestLimit(s), null);
      assert.equal(isUnlimited(s), true);
    }
  });

  test("بخش‌های زیرمجموعه‌ای سقفِ شمارشی ندارند", () => {
    for (const s of ["exam", "vocab", "pairs"] as GuestSection[]) {
      assert.equal(guestLimit(s), null);
      assert.equal(isUnlimited(s), false);
    }
  });
});

describe("اجازهٔ ادامه", () => {
  test("درست روی مرز می‌ایستد", () => {
    // used تعدادِ تمام‌شده‌هاست: با ۴ تا هنوز اجازه هست، با ۵ تا نه.
    assert.equal(guestMayContinue("quiz", 4), true);
    assert.equal(guestMayContinue("quiz", 5), false);
    assert.equal(guestMayContinue("quiz", 6), false);
  });

  test("سقفِ یک یعنی فقط دورِ اول", () => {
    assert.equal(guestMayContinue("jasoos", 0), true);
    assert.equal(guestMayContinue("jasoos", 1), false);
  });

  test("بخشِ آزاد هرگز نمی‌بندد", () => {
    assert.equal(guestMayContinue("vazn-yab", 0), true);
    assert.equal(guestMayContinue("vazn-yab", 9999), true);
    assert.equal(guestMayContinue("ninja", 9999), true);
  });

  test("بخشِ زیرمجموعه‌ای با شمارش تصمیم نمی‌گیرد", () => {
    // این بخش‌ها قانونِ خودشان را دارند (کدام درس)، نه شمارش.
    assert.equal(guestMayContinue("vocab", 0), false);
  });
});

describe("واژه‌یاب: درسِ اولِ هر پایه", () => {
  const all = [
    { grade: "dahom", lesson: 1 },
    { grade: "dahom", lesson: 2 },
    { grade: "yazdahom", lesson: 1 },
    { grade: "yazdahom", lesson: 5 },
    { grade: "davazdahom", lesson: 3 },
  ];

  test("از هر پایه دقیقاً یکی باز است", () => {
    const free = freeVocabLessons(all);
    assert.equal(free.length, 3);
  });

  test("«اول» یعنی کمترین شماره، نه عددِ ثابتِ ۱", () => {
    // پایهٔ دوازدهم از درس ۳ شروع می‌شود؛ همان باید باز باشد.
    assert.equal(vocabLessonOpen({ grade: "davazdahom", lesson: 3 }, all), true);
  });

  test("درس‌های بعدی بسته‌اند", () => {
    assert.equal(vocabLessonOpen({ grade: "dahom", lesson: 2 }, all), false);
    assert.equal(vocabLessonOpen({ grade: "yazdahom", lesson: 5 }, all), false);
  });

  test("درسِ اولِ هر پایه باز است", () => {
    assert.equal(vocabLessonOpen({ grade: "dahom", lesson: 1 }, all), true);
    assert.equal(vocabLessonOpen({ grade: "yazdahom", lesson: 1 }, all), true);
  });

  test("پایهٔ ناشناخته باز نیست", () => {
    assert.equal(vocabLessonOpen({ grade: "nohom", lesson: 1 }, all), false);
  });

  test("فهرستِ خالی چیزی باز نمی‌کند", () => {
    assert.deepEqual(freeVocabLessons([]), []);
  });
});

describe("جفت‌ها: نیمهٔ اولِ کتاب", () => {
  test("تعدادِ زوج دقیقاً نصف می‌شود", () => {
    assert.deepEqual([...firstHalfLessons([1, 2, 3, 4, 5, 6])], [1, 2, 3]);
  });

  test("تعدادِ فرد به نفعِ کاربر گرد می‌شود", () => {
    // ⚠️ با ۷ درس، ۴ تا باز است نه ۳: قفل خوردن دقیقاً وسطِ کتاب گیج‌کننده
    // است، و یک درسِ اضافه ضرری ندارد.
    assert.deepEqual([...firstHalfLessons([1, 2, 3, 4, 5, 6, 7])], [1, 2, 3, 4]);
  });

  test("ترتیبِ ورودی مهم نیست", () => {
    assert.deepEqual([...firstHalfLessons([6, 1, 4, 2, 5, 3])], [1, 2, 3]);
  });

  test("تکراری‌ها دوبار شمرده نمی‌شوند", () => {
    assert.deepEqual([...firstHalfLessons([1, 1, 2, 2, 3, 3])], [1, 2]);
  });

  test("درس‌های نیمهٔ دوم بسته‌اند", () => {
    const all = [1, 2, 3, 4, 5, 6];
    assert.equal(pairsLessonOpen(3, all), true);
    assert.equal(pairsLessonOpen(4, all), false);
  });

  test("کتابِ تک‌درسی همان یکی را باز می‌کند", () => {
    assert.equal(pairsLessonOpen(1, [1]), true);
  });
});

describe("متنِ مدال", () => {
  test("هر بخش نامِ خودش را می‌گوید", () => {
    assert.match(guestLimitMessage("jasoos"), /جاسوس/);
    assert.match(guestLimitMessage("quiz"), /عروض سماعی/);
  });

  test("واحد با جنسِ بخش می‌خواند", () => {
    // ⚠️ همان چیزی که با یک مدالِ عمومی از دست می‌رفت: «۵ سؤال» در بازی
    // بی‌معنی است.
    assert.match(guestLimitMessage("quiz"), /۵ سؤال/);
    assert.match(guestLimitMessage("aruz-bridge"), /۱ دست/);
    assert.match(guestLimitMessage("aruz-rapid"), /۳ بیت/);
  });

  test("بخشِ زیرمجموعه‌ای شرحِ خودش را دارد", () => {
    assert.match(guestLimitMessage("vocab"), /درسِ اولِ هر پایه/);
    assert.match(guestLimitMessage("pairs"), /نیمهٔ اولِ کتاب/);
    assert.match(guestLimitMessage("exam"), /آزمونِ اول/);
  });

  test("دکمهٔ ادامه هم واحدِ درست را می‌گوید", () => {
    assert.equal(guestContinueLabel("quiz"), "ادامه با ۵ سؤال");
    assert.equal(guestContinueLabel("jasoos"), "ادامه با ۱ دور");
    assert.match(guestContinueLabel("vocab"), /درسِ اولِ هر پایه/);
  });

  test("هر بخشی که در سیاست هست پیام هم دارد", () => {
    for (const section of Object.keys(GUEST_POLICY) as GuestSection[]) {
      assert.ok(guestLimitMessage(section).length > 10, `${section} پیام ندارد`);
      assert.ok(guestContinueLabel(section).length > 0, `${section} دکمه ندارد`);
    }
  });
});
