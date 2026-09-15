import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { NOTIFY_WINDOW_HOURS, shouldNotify } from "@/lib/teacher/view-window";

/**
 * پنجرهٔ خاموشیِ اعلانِ «دبیر عملکردت را دید».
 *
 * ⚠️ چیزی که این قاعده از آن محافظت می‌کند، خودِ سیستمِ اعلان است.
 *
 * دبیری که صفحه را چند بار تازه می‌کند — کاری که هر کسی موقعِ کار با یک
 * جدول می‌کند — بدونِ این پنجره ده اعلان برای دانش‌آموزش می‌ساخت. و
 * دانش‌آموزی که ده اعلانِ تکراری بگیرد، اعلان‌ها را خاموش می‌کند و اعلانِ
 * *واقعیِ* بعدی را هم نمی‌بیند.
 */

const HOUR = 60 * 60 * 1000;

/* ⚠️ عددها از خودِ ماژول می‌آیند و نه هاردکد: اگر روزی پنجره عوض شود،
   تست باید همان قاعدهٔ تازه را بسنجد و نه قاعدهٔ دیروز را. */
const WINDOW = NOTIFY_WINDOW_HOURS;
const NOW = new Date("2026-09-15T12:00:00.000Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * HOUR).toISOString();

describe("پنجرهٔ اعلانِ بازدید", () => {
  test("بارِ اول همیشه اعلان می‌دهد", () => {
    assert.equal(shouldNotify(null, NOW), true);
  });

  /** ⚠️ خودِ حالتی که این قاعده برایش نوشته شد: refreshِ پیاپی. */
  test("تازه‌سازیِ پیاپی اعلانِ تازه نمی‌سازد", () => {
    for (const minutes of [0, 1, 5, 30, 120]) {
      assert.equal(
        shouldNotify(hoursAgo(minutes / 60), NOW),
        false,
        `${minutes} دقیقه بعد نباید اعلان بسازد`,
      );
    }
  });

  test("بعد از پنجره دوباره اعلان می‌دهد", () => {
    assert.equal(shouldNotify(hoursAgo(WINDOW), NOW), true);
    assert.equal(shouldNotify(hoursAgo(WINDOW * 4), NOW), true);
  });

  test("درست زیرِ مرز، هنوز نه", () => {
    assert.equal(shouldNotify(hoursAgo(WINDOW - 0.01), NOW), false);
  });

  /**
   * ⚠️ در تردید، به نفعِ **شفافیت برای دانش‌آموز** تصمیم گرفته می‌شود.
   *
   * یک تاریخِ خراب در دیتابیس نباید باعث شود دانش‌آموز *هرگز* نفهمد کسی
   * عملکردش را دیده. اعلانِ اضافه آزاردهنده است؛ اعلانِ نبوده، پنهان‌کاری.
   */
  test("تاریخِ بدشکل اعلان را خاموش نمی‌کند", () => {
    assert.equal(shouldNotify("not-a-date", NOW), true);
    assert.equal(shouldNotify("", NOW), true);
  });

  /** ساعتِ سرور که عقب برود، نباید اعلان را برای همیشه خاموش کند. */
  test("بازدیدِ «آینده» اعلانِ بعدی را نمی‌بلعد", () => {
    const future = new Date(NOW.getTime() + (WINDOW / 2) * HOUR).toISOString();
    assert.equal(shouldNotify(future, NOW), false);
    // ولی شش ساعت بعدِ آن، دوباره باز می‌شود.
    assert.equal(
      shouldNotify(future, new Date(NOW.getTime() + WINDOW * 1.5 * HOUR)),
      true,
    );
  });
});
