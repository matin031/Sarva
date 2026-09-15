import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ATTENTION_LABEL,
  INACTIVE_DAYS,
  LOW_ACCURACY,
  MIN_VERIFIED_FOR_ACCURACY,
  NOT_STARTED_DAYS,
  accuracyOrNull,
  attentionReasons,
} from "@/lib/teacher/analytics-rules";

/**
 * قاعده‌های «نیازمندِ توجه».
 *
 * ⚠️ چیزی که این فایل محافظت می‌کند، جمله‌ای است که یک دبیر بر اساسش با یک
 * نوجوانِ واقعی حرف می‌زند. دو خطای ممکن هر دو بد است:
 *
 *   • علامت زدنِ کسی که مشکلی ندارد → فهرست بی‌معنی می‌شود و دبیر دیگر
 *     نگاهش نمی‌کند.
 *   • «۰٪ ضعیف» برای کسی که هنوز چیزی بازی نکرده → یک قضاوتِ ساختگی.
 */

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-15T12:00:00.000Z");
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();

describe("دقت در برابر «داده نداریم»", () => {
  /**
   * ⚠️ مهم‌ترین تستِ این فایل و کلِ تفاوتِ «صفر» با «نمی‌دانیم».
   *
   * اگر این بشکند، دانش‌آموزی که تازه عضو شده در فهرستِ دبیرش «۰٪»
   * می‌گیرد — عددی که هیچ‌کس نساخته ولی همه باور می‌کنند.
   */
  test("زیرِ حدِ شواهد، null است و نه صفر", () => {
    assert.equal(accuracyOrNull(0, 0), null);
    assert.equal(accuracyOrNull(0, MIN_VERIFIED_FOR_ACCURACY - 1), null);
    assert.equal(accuracyOrNull(3, MIN_VERIFIED_FOR_ACCURACY - 1), null);
  });

  test("با شواهدِ کافی، صفرِ واقعی صفر می‌ماند", () => {
    // ⚠️ و این طرفِ دیگرِ همان قاعده: کسی که دوازده بار تلاش کرده و همه را
    // اشتباه زده، واقعاً صفر است و پنهان کردنش هم غلط است.
    assert.equal(accuracyOrNull(0, MIN_VERIFIED_FOR_ACCURACY), 0);
  });

  test("با شواهدِ کافی، نسبت درست حساب می‌شود", () => {
    assert.equal(accuracyOrNull(6, 12), 0.5);
    assert.equal(accuracyOrNull(20, 40), 0.5);
  });
});

describe("«نیازمندِ توجه»", () => {
  const base = { verifiedTotal: 0, verifiedCorrect: 0, now: NOW };

  test("عضوِ تازه بدونِ فعالیت علامت نمی‌خورد", () => {
    const reasons = attentionReasons({
      ...base,
      joinedAt: ago(1),
      lastActivityAt: null,
    });
    assert.deepEqual(reasons, []);
  });

  test("عضوِ قدیمی که هرگز شروع نکرده علامت می‌خورد", () => {
    const reasons = attentionReasons({
      ...base,
      joinedAt: ago(NOT_STARTED_DAYS + 1),
      lastActivityAt: null,
    });
    assert.deepEqual(reasons, ["not_started"]);
  });

  test("درست روی مرز هم علامت می‌خورد", () => {
    const reasons = attentionReasons({
      ...base,
      joinedAt: ago(NOT_STARTED_DAYS),
      lastActivityAt: null,
    });
    assert.deepEqual(reasons, ["not_started"]);
  });

  test("فعالِ اخیر با دقتِ خوب علامت نمی‌خورد", () => {
    const reasons = attentionReasons({
      joinedAt: ago(90),
      lastActivityAt: ago(1),
      verifiedTotal: 40,
      verifiedCorrect: 34,
      now: NOW,
    });
    assert.deepEqual(reasons, []);
  });

  test("غیبتِ طولانی علامت می‌خورد", () => {
    const reasons = attentionReasons({
      joinedAt: ago(90),
      lastActivityAt: ago(INACTIVE_DAYS + 1),
      verifiedTotal: 40,
      verifiedCorrect: 34,
      now: NOW,
    });
    assert.deepEqual(reasons, ["inactive"]);
  });

  test("دقتِ پایین با شواهدِ کافی علامت می‌خورد", () => {
    const reasons = attentionReasons({
      joinedAt: ago(90),
      lastActivityAt: ago(1),
      verifiedTotal: MIN_VERIFIED_FOR_ACCURACY,
      verifiedCorrect: 1,
      now: NOW,
    });
    assert.deepEqual(reasons, ["low_accuracy"]);
  });

  /**
   * ⚠️ همان قاعدهٔ `MIN_EVIDENCE_TOTAL` در تحلیلِ پلاس: سه پاسخ که یکی‌اش
   * درست بوده، ۳۳٪ است — ولی دربارهٔ آن دانش‌آموز هیچ نمی‌گوید.
   */
  test("دقتِ پایین با شواهدِ کم علامت نمی‌خورد", () => {
    const reasons = attentionReasons({
      joinedAt: ago(90),
      lastActivityAt: ago(1),
      verifiedTotal: MIN_VERIFIED_FOR_ACCURACY - 1,
      verifiedCorrect: 0,
      now: NOW,
    });
    assert.deepEqual(reasons, []);
  });

  test("دقیقاً روی حدِ دقت علامت نمی‌خورد", () => {
    // ⚠️ `< LOW_ACCURACY` و نه `<=`: دانش‌آموزِ دقیقاً پنجاه‌درصدی نباید
    // در فهرست باشد.
    const reasons = attentionReasons({
      joinedAt: ago(90),
      lastActivityAt: ago(1),
      verifiedTotal: 20,
      verifiedCorrect: 20 * LOW_ACCURACY,
      now: NOW,
    });
    assert.deepEqual(reasons, []);
  });

  test("چند دلیل با هم می‌آیند", () => {
    const reasons = attentionReasons({
      joinedAt: ago(90),
      lastActivityAt: ago(INACTIVE_DAYS + 5),
      verifiedTotal: 30,
      verifiedCorrect: 3,
      now: NOW,
    });
    assert.deepEqual(reasons, ["inactive", "low_accuracy"]);
  });

  /** ⚠️ هر دلیل باید یک جملهٔ خواندنی داشته باشد — «امتیازِ ریسک» نداریم. */
  test("هر دلیل برچسبِ فارسیِ خودش را دارد", () => {
    for (const reason of ["not_started", "inactive", "low_accuracy"] as const) {
      const label = ATTENTION_LABEL[reason];
      assert.ok(label && label.length > 10, `«${reason}» توضیحِ خواندنی ندارد`);
    }
  });

  test("تاریخِ بدشکل باعثِ علامتِ الکی نمی‌شود", () => {
    const reasons = attentionReasons({
      ...base,
      joinedAt: "not-a-date",
      lastActivityAt: "also-not-a-date",
    });
    assert.deepEqual(reasons, []);
  });
});
