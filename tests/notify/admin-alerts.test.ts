import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  ADMIN_ALERT_EVENTS,
  ADMIN_ALERT_SPECS,
  HourlyThrottle,
  adminAlertSettingKey,
  alertSettingOn,
  parseAlertRecipients,
} from "@/lib/notify/admin-alert-events";

/**
 * خبرهای ایمیلیِ مدیر — بخشِ خالص.
 *
 * ارسالِ واقعی به سرور و SMTP وابسته است؛ آنچه اینجا نگه داشته می‌شود همان
 * چیزهایی است که اگر بشکنند، بی‌صدا می‌شکنند: فهرستِ گیرنده‌ای که یک نشانیِ
 * خراب را قبول کند، یا سقفی که هرگز پر نشود.
 */
describe("خبرهای مدیر", () => {
  test("هر رویداد برچسب و سقفِ مثبت دارد", () => {
    for (const event of ADMIN_ALERT_EVENTS) {
      const spec = ADMIN_ALERT_SPECS[event];
      assert.ok(spec.label.trim(), event);
      assert.ok(spec.hourlyCap > 0, event);
      assert.equal(adminAlertSettingKey(event), `alerts.${event}`);
    }
  });

  test("گیرنده‌ها با هر جداکننده‌ای خوانده و یکتا می‌شوند", () => {
    const { valid, invalid } = parseAlertRecipients(
      "a@x.com, b@y.ir،c@z.org\nA@X.com ; not-an-email  d@w.io",
    );
    assert.deepEqual(valid, ["a@x.com", "b@y.ir", "c@z.org", "d@w.io"]);
    assert.deepEqual(invalid, ["not-an-email"]);
  });

  test("متنِ خالی یعنی هیچ گیرنده‌ای — و نه یک رشتهٔ خالی در فهرست", () => {
    assert.deepEqual(parseAlertRecipients(""), { valid: [], invalid: [] });
    assert.deepEqual(parseAlertRecipients(null), { valid: [], invalid: [] });
  });

  test("مقدارِ تنظیم: خالی یعنی پیش‌فرض", () => {
    assert.equal(alertSettingOn(null, true), true);
    assert.equal(alertSettingOn("", false), false);
    assert.equal(alertSettingOn("off", true), false);
    assert.equal(alertSettingOn("ON", false), true);
  });

  test("سقفِ ساعتی پر می‌شود و بعد از یک ساعت دوباره باز می‌شود", () => {
    const t = new HourlyThrottle();
    const start = 1_000_000;
    assert.equal(t.take("signup", 2, start), true);
    assert.equal(t.take("signup", 2, start + 1), true);
    assert.equal(t.take("signup", 2, start + 2), false);
    // رویدادِ دیگر سقفِ خودش را دارد.
    assert.equal(t.take("purchase", 2, start + 2), true);
    assert.equal(t.take("signup", 2, start + 60 * 60 * 1000 + 1), true);
  });
});
