import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join as joinPath } from "node:path";
import {
  MEMBERSHIP_STATUSES,
  NO_SUCH_CODE,
  exitStatus,
  joinGate,
  type JoinGateInput,
} from "@/lib/teacher/membership";

/**
 * قاعده‌های عضویت در کلاس.
 *
 * ⚠️ این قاعده در **دو جا** اجرا می‌شود — پیش‌نمایش و خودِ عضویت — و همین
 * اهمیتش را دوبرابر می‌کند: یک اشتباه اینجا یا دکمه‌ای می‌سازد که «تأیید و
 * عضویت» می‌گوید و بعد خطا می‌دهد، یا بدتر، پیش‌نمایشی که «نمی‌شود»
 * می‌گوید ولی عضویت را می‌پذیرد.
 */

const OPEN: JoinGateInput = {
  isActive: true,
  joinEnabled: true,
  isOwnClass: false,
  membership: null,
};

describe("فهرستِ وضعیت‌ها با CHECK دیتابیس یکی است", () => {
  /**
   * ⚠️ همان تستی که در `tests/activity/schema.test.ts` هم هست، و به همان
   * دلیل: تایپ‌اسکریپت در زمانِ اجرا وجود ندارد. اگر این دو فهرست از هم
   * جدا بیفتند، یا نوشتنِ یک وضعیت روی هاست خطا می‌دهد، یا وضعیتی در
   * CHECK می‌ماند که هیچ‌وقت نوشته نمی‌شود.
   */
  test("۰۱۴", () => {
    const sql = readFileSync(
      joinPath(process.cwd(), "mysql-migrations", "014_class_membership_controls.sql"),
      "utf8",
    );
    const start = sql.indexOf("class_members_status_check");
    const open = sql.indexOf("IN (", start);
    const close = sql.indexOf("))", open);
    const values = [...sql.slice(open + 4, close).matchAll(/'([^']+)'/g)].map((m) => m[1]);

    assert.deepEqual([...MEMBERSHIP_STATUSES].sort(), values.sort());
  });
});

describe("دروازهٔ عضویت", () => {
  test("کلاسِ باز، عضوِ تازه → مجاز", () => {
    const gate = joinGate(OPEN);
    assert.ok(gate.ok);
    assert.equal(gate.alreadyActive, false);
  });

  /** ⚠️ «از قبل عضوی» یک **موفقیت** است و نه خطا. */
  test("از قبل عضوِ فعال → موفقیتِ بی‌اثر", () => {
    const gate = joinGate({ ...OPEN, membership: "active" });
    assert.ok(gate.ok);
    assert.equal(gate.alreadyActive, true);
  });

  /* ── تفاوتی که کلِ مهاجرت ۰۱۴ برایش نوشته شد ──────────────────────── */

  test("خروجِ خودخواسته → می‌تواند برگردد", () => {
    assert.ok(joinGate({ ...OPEN, membership: "removed" }).ok);
  });

  /**
   * ⚠️ مهم‌ترین تستِ این فایل.
   *
   * پیش از مهاجرت ۰۱۴ هر دو حالت `removed` بودند و دانش‌آموزی که دبیر
   * همین الان بیرونش گذاشته بود، **با همان کد بلافاصله برمی‌گشت**. تنها
   * چارهٔ دبیر، چرخاندنِ کدِ کلِ کلاس بود.
   */
  test("اخراج‌شده → نمی‌تواند برگردد", () => {
    const gate = joinGate({ ...OPEN, membership: "blocked" });
    assert.equal(gate.ok, false);
  });

  /**
   * ⚠️ بلاک باید **پیش از** وضعیتِ کلاس سنجیده شود.
   *
   * اگر برعکس بود، اخراج‌شده پیامِ «فعلاً عضو نمی‌پذیرم» می‌گرفت — یعنی
   * فکر می‌کرد مشکل موقتی است و فردا دوباره امتحان می‌کرد.
   */
  test("بلاک بر وضعیتِ کلاس مقدم است", () => {
    for (const extra of [
      { isActive: false },
      { joinEnabled: false },
      { isActive: false, joinEnabled: false },
    ]) {
      const gate = joinGate({ ...OPEN, ...extra, membership: "blocked" });
      assert.equal(gate.ok, false);
      if (!gate.ok) {
        assert.match(gate.error, /پایان یافته/, "باید پیامِ اخراج باشد، نه پیامِ کلاس");
      }
    }
  });

  /* ── وضعیتِ کلاس ───────────────────────────────────────────────────── */

  test("کلاسِ بایگانی‌شده عضو نمی‌پذیرد", () => {
    assert.equal(joinGate({ ...OPEN, isActive: false }).ok, false);
  });

  test("عضوگیریِ بسته عضو نمی‌پذیرد", () => {
    const gate = joinGate({ ...OPEN, joinEnabled: false });
    assert.equal(gate.ok, false);
    if (!gate.ok) assert.match(gate.error, /عضو تازه نمی‌پذیرد/);
  });

  /**
   * ⚠️ دو مفهومِ جدا، و تستشان جدا: کلاسی که بایگانی نشده ولی عضوگیری‌اش
   * بسته است، باید پیامِ *متفاوتی* بدهد. تا مهاجرت ۰۱۴ یک ستون بودند.
   */
  test("بایگانی و عضوگیری دو پیامِ متفاوت دارند", () => {
    const archived = joinGate({ ...OPEN, isActive: false });
    const closed = joinGate({ ...OPEN, joinEnabled: false });
    assert.equal(archived.ok, false);
    assert.equal(closed.ok, false);
    if (!archived.ok && !closed.ok) assert.notEqual(archived.error, closed.error);
  });

  test("عضوِ فعال با عضوگیریِ بسته هم عضو می‌ماند", () => {
    // ⚠️ بستنِ عضوگیری نباید عضوِ فعلی را بیرون کند.
    const gate = joinGate({ ...OPEN, joinEnabled: false, membership: "active" });
    assert.ok(gate.ok);
    assert.equal(gate.alreadyActive, true);
  });

  test("دبیر عضوِ کلاسِ خودش نمی‌شود", () => {
    assert.equal(joinGate({ ...OPEN, isOwnClass: true }).ok, false);
  });
});

describe("وضعیتِ خروج", () => {
  /** کلِ تفاوتِ «خودش رفت» و «بیرونش کردند» در همین یک تابع است. */
  test("دبیر → blocked، دانش‌آموز → removed", () => {
    assert.equal(exitStatus("teacher"), "blocked");
    assert.equal(exitStatus("student"), "removed");
  });

  test("و هر دو در فهرستِ مجاز هستند", () => {
    for (const by of ["teacher", "student"] as const) {
      assert.ok((MEMBERSHIP_STATUSES as readonly string[]).includes(exitStatus(by)));
    }
  });
});

describe("پیامِ «پیدا نشد»", () => {
  /**
   * ⚠️ یک ثابت، چون باید در همهٔ مسیرها دقیقاً یکی باشد: کدِ ناموجود، کدِ
   * بدشکل، و کدِ کلاسی که حذف شده. تفاوتشان به کسی که کد حدس می‌زند
   * می‌گفت کدام الگوها واقعی‌اند.
   */
  test("هیچ جزئیاتی لو نمی‌دهد", () => {
    assert.ok(NO_SUCH_CODE.length > 0);
    assert.ok(!/فرمت|format|طول|نامعتبر/.test(NO_SUCH_CODE));
  });
});
