import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  OPEN_TEACHER_STATUSES,
  TEACHER_LOG_ACTION_LABEL,
  TEACHER_STATUS_LABEL,
  type TeacherRequestStatus,
} from "@/lib/teacher/types";

/**
 * قواعدِ وضعیتِ پروندهٔ دبیری.
 *
 * ⚠️ چرا این تست‌ها می‌ارزند با اینکه فقط چند ثابت را می‌سنجند:
 *
 * `OPEN_TEACHER_STATUSES` در سه جای کاملاً جدا تکرار شده — اینجا، در تریگرِ
 * `pending_user_id` در مهاجرت ۰۱۰، و در `isOpen()` در
 * `lib/admin/teacher-actions.ts`. اگر از هم بیفتند، نتیجه‌اش یکی از این دو
 * است و هیچ‌کدام خطا نمی‌دهند:
 *
 *   • کاربر بتواند دو پروندهٔ باز بسازد (ادمین دو مدرکِ متفاوت از یک نفر
 *     می‌بیند و می‌تواند یکی را تأیید و دیگری را رد کند)، یا
 *   • ادمین نتواند پرونده‌ای را که خودش برای اصلاح فرستاده تعیین تکلیف کند.
 */

describe("وضعیت‌های پروندهٔ دبیری", () => {
  const ALL: TeacherRequestStatus[] = ["pending", "approved", "rejected", "needs_revision"];

  test("هر چهار وضعیت برچسب فارسی دارند", () => {
    for (const status of ALL) {
      assert.ok(TEACHER_STATUS_LABEL[status], `${status} برچسب ندارد`);
    }
  });

  /**
   * ⚠️ مهم‌ترین تستِ این فایل.
   *
   * این دقیقاً همان فهرستی است که تریگرِ مهاجرت ۰۱۰ می‌نویسد:
   *   SET NEW.pending_user_id = IF(NEW.status IN ('pending','needs_revision'), …)
   */
  test("فقط pending و needs_revision «باز» هستند", () => {
    assert.deepEqual([...OPEN_TEACHER_STATUSES].sort(), ["needs_revision", "pending"]);
  });

  test("تأییدشده و ردشده باز نیستند", () => {
    assert.equal(OPEN_TEACHER_STATUSES.includes("approved"), false);
    assert.equal(OPEN_TEACHER_STATUSES.includes("rejected"), false);
  });

  /**
   * ⚠️ `needs_revision` باید باز باشد وگرنه کاربر نمی‌تواند اصلاحیه بفرستد:
   * `submitTeacherRequest` پروندهٔ باز را پیدا می‌کند و اگر پیدا نکند، یک
   * ردیفِ تازه می‌سازد که به ایندکسِ یکتا می‌خورد.
   */
  test("needs_revision باز است — وگرنه ارسال دوباره ممکن نیست", () => {
    assert.ok(OPEN_TEACHER_STATUSES.includes("needs_revision"));
  });

  test("هر رویدادِ تاریخچه برچسب دارد", () => {
    for (const action of [
      "submitted",
      "resubmitted",
      "approved",
      "rejected",
      "needs_revision",
    ] as const) {
      assert.ok(TEACHER_LOG_ACTION_LABEL[action], `${action} برچسب ندارد`);
    }
  });
});

/**
 * گذارهای مجاز — همان منطقی که `isOpen()` در
 * `lib/admin/teacher-actions.ts` پیاده می‌کند.
 *
 * ⚠️ اینجا بازنویسی شده و نه import: آن تابع در یک ماژولِ `"use server"`
 * است که به دیتابیس وصل می‌شود و در `node --test` بار نمی‌شود. تستْ
 * *قرارداد* را می‌سنجد؛ اگر آن تابع روزی از این قرارداد فاصله بگیرد،
 * `OPEN_TEACHER_STATUSES` که هر دو از آن می‌خوانند، تست را می‌شکند.
 */
describe("گذارِ تصمیمِ ادمین", () => {
  const canDecide = (status: TeacherRequestStatus) => OPEN_TEACHER_STATUSES.includes(status);

  test("ادمین روی پروندهٔ در-انتظار تصمیم می‌گیرد", () => {
    assert.ok(canDecide("pending"));
  });

  /** ادمینی که اصلاح خواسته باید بتواند نظرش را عوض کند. */
  test("ادمین روی پروندهٔ نیازمندِ اصلاح هم تصمیم می‌گیرد", () => {
    assert.ok(canDecide("needs_revision"));
  });

  /**
   * ⚠️ تأییدِ دوباره یعنی `grantTeacherPlus` دوباره صدا زده شود. آن تابع
   * خودش نگهبانِ دوم دارد (ردیفِ فعالِ `teacher_verified` را می‌بیند و
   * ردیفِ دوم نمی‌سازد)، ولی نگهبانِ اول همین است.
   */
  test("پروندهٔ بسته دیگر تصمیم نمی‌گیرد", () => {
    assert.equal(canDecide("approved"), false);
    assert.equal(canDecide("rejected"), false);
  });
});
