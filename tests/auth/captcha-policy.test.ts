import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  captchaMode,
  captchaPreflight,
  captchaOnUnreachable,
} from "@/lib/auth/captcha-policy";
import { smsBudget } from "@/lib/sms/budget";

/**
 * =============================================================================
 * ⚠️ چرا این آزمون عوض شد — و چه چیزی را حالا نگه می‌دارد
 * =============================================================================
 *
 * نسخهٔ قبلیِ همین فایل یک قاعده را نگه می‌داشت: «در production، نبودِ کلیدِ
 * کپچا یعنی همه چیز رد شود.» آن قاعده از یک نگرانیِ درست می‌آمد (fail-open ِ
 * بی‌صدا) ولی برای سروا نتیجه‌اش این بود که سایت با پیکربندیِ واقعیِ امروزش
 * — بدونِ کلید — در لحظهٔ بالا آمدن برای **همه** قفل می‌شد.
 *
 * و حتی *با* کلید هم مشکل حل نمی‌شد: ویجت از `challenges.cloudflare.com`
 * بار می‌شود و کاربرِ ایرانی‌ای که به آن دامنه دسترسی ندارد هیچ توکنی
 * نمی‌سازد — یعنی همان کاربرِ واقعی بیرونِ در می‌ماند.
 *
 * پس قاعده عوض شد و این آزمون دو چیز را نگه می‌دارد که هر دو رفتارِ
 * تصمیم‌گرفته‌شده‌اند و نه جزئیاتِ پیاده‌سازی:
 *
 *   ۱. **هیچ پیکربندی‌ای نباید به قفلِ سراسری برسد.** بدونِ تنظیمِ صریح،
 *      خروجی هرگز `required` نیست.
 *   ۲. **`TURNSTILE_OPTIONAL=true` ِ قدیمی همان معنیِ قبلی را می‌دهد.** هر
 *      نصبی که امروز آن را دارد نباید با یک deploy رفتارش عوض شود.
 */
describe("حالتِ کپچا", () => {
  test("بدونِ هیچ تنظیمی خاموش است — نه اجباری", () => {
    /* ⚠️ مهم‌ترین ادعای این فایل. پیش از این، همین ورودی در production به
       «رد کن» می‌رسید و یعنی هیچ‌کس نمی‌توانست وارد شود یا ثبت‌نام کند. */
    assert.equal(captchaMode({}), "off");
    assert.equal(captchaMode({ CAPTCHA_MODE: undefined }), "off");
  });

  test("با کلید، اختیاری می‌شود و نه اجباری", () => {
    // توکنِ جعلی رد می‌شود، ولی نبودِ توکن کسی را بیرون نمی‌گذارد.
    assert.equal(captchaMode({ TURNSTILE_SECRET_KEY: "0x4AAA" }), "optional");
  });

  test("اجباری فقط با نوشتنِ صریح", () => {
    assert.equal(captchaMode({ CAPTCHA_MODE: "required" }), "required");
    assert.equal(
      captchaMode({ CAPTCHA_MODE: "required", TURNSTILE_SECRET_KEY: "0x4AAA" }),
      "required",
    );
  });

  test("تنظیمِ صریح بر حدس از روی کلید مقدم است", () => {
    assert.equal(captchaMode({ CAPTCHA_MODE: "off", TURNSTILE_SECRET_KEY: "0x4AAA" }), "off");
  });

  test("فاصله و حروفِ بزرگ پذیرفته می‌شوند", () => {
    // یک `.env` که با کپی/پیست پر شده نباید بی‌صدا به حالتِ دیگری بیفتد.
    assert.equal(captchaMode({ CAPTCHA_MODE: " Required " }), "required");
    assert.equal(captchaMode({ CAPTCHA_MODE: "OFF" }), "off");
  });

  test("مقدارِ ناشناخته به پیش‌فرض برمی‌گردد و نه به اجباری", () => {
    // ⚠️ `CAPTCHA_MODE=yes` یک اشتباهِ تایپی است، نه یک درخواستِ سخت‌گیری.
    for (const v of ["yes", "true", "1", "on", ""]) {
      assert.equal(captchaMode({ CAPTCHA_MODE: v }), "off", `مقدار: ${v}`);
      assert.equal(
        captchaMode({ CAPTCHA_MODE: v, TURNSTILE_SECRET_KEY: "0x4AAA" }),
        "optional",
        `مقدار: ${v}`,
      );
    }
  });

  test("تنظیمِ قدیمیِ TURNSTILE_OPTIONAL همان «خاموش» می‌ماند", () => {
    assert.equal(captchaMode({ TURNSTILE_OPTIONAL: "true" }), "off");
    assert.equal(
      captchaMode({ TURNSTILE_OPTIONAL: "true", TURNSTILE_SECRET_KEY: "0x4AAA" }),
      "off",
    );
    // فقط رشتهٔ دقیقِ "true" — همان سخت‌گیریِ نسخهٔ قبلی.
    assert.equal(captchaMode({ TURNSTILE_OPTIONAL: "1" }), "off");
    assert.equal(
      captchaMode({ TURNSTILE_OPTIONAL: "1", TURNSTILE_SECRET_KEY: "0x4AAA" }),
      "optional",
    );
  });
});

/**
 * تصمیمِ واقعی — همان چیزی که سرنوشتِ یک درخواست را تعیین می‌کند.
 *
 * ⚠️ این جدول دو ادعا را نگه می‌دارد که کلِ این بازنویسی برایشان بود:
 *
 *   • **در هیچ حالتی به‌جز `required`، نبودِ توکن به رد کردن نمی‌رسد.**
 *     یعنی کاربری که مرورگرش به کلودفلر نرسیده، بیرون نمی‌ماند.
 *   • **`required` همان سخت‌گیریِ قبلی را دارد**، تا اگر روزی کپچایی داشتند
 *     که از ایران کار می‌کند، این مسیر دست‌نخورده منتظرشان باشد.
 */
describe("تصمیمِ کپچا", () => {
  const cases: Array<[Parameters<typeof captchaPreflight>[0], boolean, boolean, string]> = [
    // حالت، کلید هست؟، توکن هست؟، انتظار
    ["off", false, false, "allow"],
    ["off", true, true, "allow"], // حتی با توکنِ موجود هم چیزی پرسیده نمی‌شود
    ["optional", false, false, "allow"], // پیکربندیِ ناتمام، ولی کاربر قربانی نمی‌شود
    ["optional", true, false, "allow"], // ⬅ کاربرِ ایرانی که ویجت برایش بار نشد
    ["optional", true, true, "verify"], // توکن هست، پس جعلی بودنش سنجیده می‌شود
    ["required", false, false, "deny"], // «اجباری» نوشته‌ای ولی کلید نگذاشته‌ای
    ["required", true, false, "deny"],
    ["required", true, true, "verify"],
  ];

  for (const [mode, hasKey, hasToken, expected] of cases) {
    test(`${mode} · کلید=${hasKey} · توکن=${hasToken} → ${expected}`, () => {
      assert.equal(captchaPreflight(mode, { hasKey, hasToken }), expected);
    });
  }

  test("توکنِ موجود همیشه سنجیده می‌شود — اختیاری یعنی «نبودنش مانع نیست»، نه «قبولش کن»", () => {
    /* ⚠️ تفاوتِ ظریفی که اگر گم شود، `optional` به `off` تبدیل می‌شود:
       توکنِ جعلی باید همچنان رد شود. */
    assert.equal(captchaPreflight("optional", { hasKey: true, hasToken: true }), "verify");
  });

  test("در دسترس نبودنِ کلودفلر فقط در حالتِ اجباری رد می‌شود", () => {
    assert.equal(captchaOnUnreachable("off"), "allow");
    assert.equal(captchaOnUnreachable("optional"), "allow");
    assert.equal(captchaOnUnreachable("required"), "deny");
  });
});

/**
 * سقفِ سراسریِ پیامک — محافظی که جای کپچا را گرفت.
 *
 * ⚠️ این تنها عددی در سروا است که به سؤالِ «بدترین حالت، امشب چقدر پول از
 * پنلِ پیامک می‌رود؟» جواب می‌دهد. سقف‌های شماره و IP همه نسبی‌اند و جوابشان
 * به آن سؤال بی‌نهایت است.
 */
describe("سقفِ سراسریِ پیامک", () => {
  test("پیش‌فرض‌ها معقول و محدودند", () => {
    const b = smsBudget({});
    assert.equal(b.perHour, 200);
    assert.equal(b.perDay, 1000);
  });

  test("عدد از محیط خوانده می‌شود", () => {
    const b = smsBudget({ SMS_MAX_PER_HOUR: "50", SMS_MAX_PER_DAY: "400" });
    assert.deepEqual(b, { perHour: 50, perDay: 400 });
  });

  test("عددِ بد به پیش‌فرض برمی‌گردد و سایت را نمی‌شکند", () => {
    for (const v of ["", "abc", "12.5", "-5", "۲۰۰"]) {
      assert.equal(smsBudget({ SMS_MAX_PER_HOUR: v }).perHour, 200, `مقدار: ${v}`);
    }
    // ⚠️ `1e3` عمداً *پذیرفته* می‌شود و ۱۰۰۰ خوانده می‌شود: یک عددِ کاملاً
    // معتبر است و سخت‌گیری روی شکلِ نوشتنش چیزی را امن‌تر نمی‌کرد.
    assert.equal(smsBudget({ SMS_MAX_PER_HOUR: "1e3" }).perHour, 1000);
  });

  test("صفر پذیرفته نمی‌شود", () => {
    /* ⚠️ اگر صفر قابل قبول بود، یک اشتباهِ تایپی کلِ ورودِ پیامکیِ سایت را
       بی‌صدا می‌بست — دقیقاً همان خرابی‌ای که این ماژول باید جلویش را
       بگیرد. */
    assert.equal(smsBudget({ SMS_MAX_PER_HOUR: "0" }).perHour, 200);
    assert.equal(smsBudget({ SMS_MAX_PER_DAY: "0" }).perDay, 1000);
  });

  test("سقفِ روزانه هرگز از ساعتی کمتر نمی‌شود", () => {
    // وگرنه سقفِ ساعتی از ساعتِ دوم به بعد بی‌معنی بود.
    const b = smsBudget({ SMS_MAX_PER_HOUR: "500", SMS_MAX_PER_DAY: "100" });
    assert.equal(b.perHour, 500);
    assert.equal(b.perDay, 500);
  });
});
