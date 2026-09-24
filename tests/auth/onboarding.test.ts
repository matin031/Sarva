import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { needsOnboarding, ONBOARDING_PATH } from "@/lib/auth/onboarding";

/**
 * «حسابِ نیمه‌ساخته» — قاعده‌ای که سه جا به آن تکیه می‌کنند.
 *
 * =============================================================================
 * ⚠️ چرا این آزمون وجود دارد
 * =============================================================================
 *
 * این یک شرطِ سه‌خطی است، ولی خروجی‌اش در سه جای مستقل مصرف می‌شود:
 *
 *   • `lib/auth/session.ts` — ادعای `needsProfile` را داخلِ توکن می‌گذارد
 *   • `proxy.ts`            — با همان ادعا کاربر را به صفحهٔ تکمیل می‌فرستد
 *   • صفحهٔ تکمیل           — با همین تابع تصمیم می‌گیرد رد شود یا فرم بدهد
 *
 * اگر این سه با هم نخوانند، نتیجه یکی از دو حالتِ بد است: یا کاربر در یک
 * حلقهٔ ریدایرکت می‌افتد (گیت می‌گوید ناقص است، صفحه می‌گوید کامل است و
 * برش می‌گرداند)، یا گیت اصلاً کار نمی‌کند. هیچ‌کدام خطایی در لاگ
 * نمی‌گذارند.
 *
 * ⚠️ معیار عمداً `firstName`/`lastName` است و نه `fullName`. ورودِ گوگل
 * `full_name` را از نامِ گوگل پر می‌کند — یعنی اگر معیار آن بود، دقیقاً
 * همان کاربری که این گیت برایش ساخته شده از آن رد می‌شد. مورد آخرِ همین
 * فایل همان حالت است.
 */
describe("گیتِ حسابِ نیمه‌ساخته", () => {
  test("حسابِ کامل رد نمی‌شود", () => {
    assert.equal(needsOnboarding({ firstName: "سعدی", lastName: "شیرازی" }), false);
  });

  test("حسابِ ساخته‌شده با کدِ پیامکی هیچ نامی ندارد", () => {
    assert.equal(needsOnboarding({ firstName: null, lastName: null }), true);
  });

  test("نیمِ نام هم کافی نیست", () => {
    assert.equal(needsOnboarding({ firstName: "سعدی", lastName: null }), true);
    assert.equal(needsOnboarding({ firstName: null, lastName: "شیرازی" }), true);
  });

  test("فاصله نام نیست", () => {
    // ⚠️ `trim` لازم است: ستون‌ها VARCHAR اند و یک رشتهٔ فاصله برای دیتابیس
    // «مقدار دارد» است، ولی در سایدبار یک جای خالی نشان می‌دهد.
    assert.equal(needsOnboarding({ firstName: "   ", lastName: "شیرازی" }), true);
  });

  test("کاربرِ گوگل که فقط نامِ نمایشی دارد، همچنان ناقص است", () => {
    // full_name = "Matin Jafari" ولی دو ستونِ واقعی خالی‌اند.
    assert.equal(needsOnboarding({ firstName: null, lastName: null }), true);
  });

  test("کاربرِ ناشناس گیت نمی‌خورد", () => {
    // ⚠️ `false` و نه `true`: کسی که وارد نشده باید به /auth برود و نه به
    // صفحهٔ تکمیل. اگر اینجا true برمی‌گشت، proxy مهمان‌ها را هم به یک
    // صفحهٔ نیازمندِ ورود می‌فرستاد و آن صفحه دوباره به /auth — یک حلقه.
    assert.equal(needsOnboarding(null), false);
    assert.equal(needsOnboarding(undefined), false);
  });

  test("مسیرِ صفحهٔ تکمیل زیرِ /auth است", () => {
    /* ⚠️ این ادعا تزئینی نیست: `proxy.ts` برای «کاربرِ واردشده در /auth →
       بفرست به پنل» یک استثنای صریح برای همین مسیر دارد. اگر مسیر از زیرِ
       /auth بیرون برود آن استثنا بی‌اثر می‌شود و کسی متوجه نمی‌شود، چون
       چیزی نمی‌شکند — فقط گیت از کار می‌افتد. */
    assert.ok(ONBOARDING_PATH.startsWith("/auth/"));
  });
});
