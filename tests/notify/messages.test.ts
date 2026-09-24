import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  NOTIFY_EVENTS,
  NOTIFY_EVENT_SPECS,
  smsTemplateSettingKey,
} from "@/lib/notify/events";
import { smsBody, smsParameters } from "@/lib/notify/messages";

/**
 * متنِ پیام‌های بیرونی.
 *
 * ⚠️ این تست یک چیز را نگه می‌دارد که **هیچ‌جای دیگری نگهش نمی‌دارد**:
 * هم‌خوانیِ نامِ متغیرها بینِ `NOTIFY_EVENT_SPECS` و `smsParameters`.
 *
 * ناهماهنگی‌شان نه خطای کامپایل می‌دهد، نه خطای زمانِ اجرا، و نه حتی خطای
 * سرویس. SMS.ir پیامکی می‌فرستد که جای متغیر در آن **خالی** است — یعنی
 * تنها راهِ فهمیدنش این است که یک کاربرِ واقعی پیامکِ ناقص بگیرد و
 * شکایت کند.
 *
 * (`lib/notify/index.ts` عمداً پارامترها را از روی `smsVariables` می‌سازد و
 * نه از کلیدهای شیء، پس متغیرِ گم‌شده رشتهٔ خالی می‌شود و حذف نمی‌شود.)
 */

const VARS = { name: "سارا", endsAt: "2026-03-20T10:00:00.000Z", daysLeft: 3 };

describe("پیام‌های رویدادها", () => {
  test("هر رویداد دقیقاً همان متغیرهایی را می‌سازد که قالبش اعلام کرده", () => {
    for (const event of NOTIFY_EVENTS) {
      const declared = [...NOTIFY_EVENT_SPECS[event].smsVariables].sort();
      const built = Object.keys(smsParameters(event, VARS)).sort();

      assert.deepEqual(
        built,
        declared,
        `رویدادِ ${event}: قالب ${declared.join("، ")} می‌خواهد ولی ${built.join("، ")} ساخته شد`,
      );
    }
  });

  test("هیچ متغیری خالی نمی‌ماند", () => {
    for (const event of NOTIFY_EVENTS) {
      for (const [name, value] of Object.entries(smsParameters(event, VARS))) {
        assert.ok(value.trim().length > 0, `رویدادِ ${event}: متغیرِ ${name} خالی است`);
      }
    }
  });

  /* ⚠️ هر ۷۰ نویسهٔ فارسی یک «صفحه» پیامک است و هزینهٔ جداگانه دارد. این سقف
     سلیقه‌ای نیست: یک جملهٔ اضافه، قبضِ آن پیام را دو برابر می‌کند. */
  test("متنِ آزادِ هیچ رویدادی از دو صفحهٔ پیامک بیشتر نیست", () => {
    for (const event of NOTIFY_EVENTS) {
      const body = smsBody(event, VARS);
      assert.ok(body.length > 0, `رویدادِ ${event} متنی ندارد`);
      assert.ok(
        body.length <= 140,
        `رویدادِ ${event}: ${body.length} نویسه — بیش از دو صفحهٔ پیامک`,
      );
    }
  });

  test("کلیدِ تنظیماتِ هر رویداد یکتاست و شکلِ درستی دارد", () => {
    const keys = NOTIFY_EVENTS.map(smsTemplateSettingKey);
    assert.equal(new Set(keys).size, keys.length, "دو رویداد یک کلیدِ تنظیمات گرفتند");
    for (const key of keys) assert.match(key, /^sms\.template_[a-z_]+$/);
  });
});
