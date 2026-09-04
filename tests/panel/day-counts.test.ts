import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  bucketsFromDayCounts,
  streakFromDayCounts,
  correctFromDayCounts,
  totalFromDayCounts,
  tehranDayKey,
  type DayCount,
} from "@/lib/panel/day-counts";

/**
 * فعالیتِ روزانه از شمارشِ دیتابیس.
 *
 * ⚠️ نسخهٔ قبلی تا ۲۰۰۰ ردیفِ خام می‌گرفت و برای هر روزِ نمودار کلِ فهرست را
 * فیلتر می‌کرد — سی روز در دو هزار ردیف یعنی شصت هزار قالب‌بندیِ تاریخ روی
 * نخِ اصلی، در هر بار باز شدنِ پنل. این تست‌ها رفتارِ جایگزین را قفل می‌کنند.
 */

// یک «الان» ثابت تا تست به روزِ اجرا وابسته نباشد.
const NOW = new Date("2026-03-15T12:00:00Z");
const dayAgo = (n: number) => {
  const d = new Date(NOW);
  d.setUTCDate(d.getUTCDate() - n);
  return tehranDayKey(d);
};

const counts = (spec: [number, number, number][]): DayCount[] =>
  spec.map(([ago, total, correct]) => ({ day: dayAgo(ago), total, correct }));

describe("سطل‌های روزانه", () => {
  test("به تعدادِ خواسته‌شده روز می‌سازد", () => {
    assert.equal(bucketsFromDayCounts([], 30, NOW).length, 30);
  });

  test("روزِ بی‌فعالیت صفر می‌گیرد، نه اینکه حذف شود", () => {
    // ⚠️ نمودار باید شکافِ روزهای خالی را نشان دهد؛ حذفشان تاریخ‌ها را
    // به هم می‌چسباند و روند را دروغ نشان می‌دهد.
    const b = bucketsFromDayCounts(counts([[0, 5, 3]]), 7, NOW);
    assert.equal(b.length, 7);
    assert.equal(b[6].total, 5);
    assert.equal(b.slice(0, 6).every((x) => x.total === 0), true);
  });

  test("ترتیب از قدیم به جدید است", () => {
    const b = bucketsFromDayCounts(counts([[0, 1, 1], [6, 9, 9]]), 7, NOW);
    assert.equal(b[0].total, 9); // شش روز پیش، اول
    assert.equal(b[6].total, 1); // امروز، آخر
  });

  test("روزهای بیرونِ بازه نادیده گرفته می‌شوند", () => {
    const b = bucketsFromDayCounts(counts([[100, 50, 50]]), 7, NOW);
    assert.equal(b.every((x) => x.total === 0), true);
  });

  test("هر روز برچسبِ فارسی دارد", () => {
    const b = bucketsFromDayCounts([], 3, NOW);
    assert.equal(b.every((x) => x.label.length > 0), true);
  });
});

describe("رشتهٔ روزهای پیاپی", () => {
  test("بدونِ فعالیت صفر است", () => {
    assert.equal(streakFromDayCounts([], NOW), 0);
  });

  test("روزهای پشتِ‌هم شمرده می‌شوند", () => {
    assert.equal(streakFromDayCounts(counts([[0, 1, 1], [1, 1, 0], [2, 3, 2]]), NOW), 3);
  });

  test("شکاف رشته را می‌بُرد", () => {
    // امروز و دیروز هست، پریروز نیست → رشته دو تاست نه چهار.
    const c = counts([[0, 1, 1], [1, 1, 1], [3, 1, 1], [4, 1, 1]]);
    assert.equal(streakFromDayCounts(c, NOW), 2);
  });

  test("اگر امروز خالی باشد، از دیروز شمرده می‌شود", () => {
    // ⚠️ وگرنه رشتهٔ کسی که شب‌ها تمرین می‌کند هر روز صبح صفر می‌شد.
    assert.equal(streakFromDayCounts(counts([[1, 1, 1], [2, 1, 1]]), NOW), 2);
  });

  test("دو روزِ خالیِ پشتِ‌هم رشته را صفر می‌کند", () => {
    assert.equal(streakFromDayCounts(counts([[2, 1, 1], [3, 1, 1]]), NOW), 0);
  });

  test("روزی که ثبت شده ولی total صفر است، فعال حساب نمی‌شود", () => {
    assert.equal(streakFromDayCounts(counts([[0, 0, 0], [1, 5, 5]]), NOW), 1);
  });
});

describe("جمع‌ها", () => {
  test("درست و کل از همان شمارش‌ها می‌آیند", () => {
    const c = counts([[0, 10, 7], [1, 4, 1]]);
    assert.equal(totalFromDayCounts(c), 14);
    assert.equal(correctFromDayCounts(c), 8);
  });

  test("فهرستِ خالی صفر می‌دهد، نه NaN", () => {
    assert.equal(totalFromDayCounts([]), 0);
    assert.equal(correctFromDayCounts([]), 0);
  });
});
