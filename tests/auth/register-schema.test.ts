import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { registerSchema, phoneField } from "@/lib/auth/schemas";

/**
 * شکلِ متعارفِ شماره — و مرزِ بینِ دو تبِ ثبت‌نام.
 *
 * ⚠️ چیزی که این تست نگه می‌دارد، وجودِ فیلد نیست — شکلِ خروجی‌اش است.
 *
 * `users.phone` یک ایندکسِ یکتا دارد و یک CHECK با الگوی `^989[0-9]{9}$`.
 * اگر این فیلد روزی آنچه کاربر تایپ کرده را دست‌نخورده رد کند، دو چیز با هم
 * می‌شکند: دیتابیس ردیف را پس می‌زند (۳۸۱۹)، و بدتر، اگر CHECK هم روزی
 * برداشته شود، یک نفر با `0912…` و `+98912…` دو حساب می‌سازد و «این شماره
 * قبلاً ثبت شده؟» دیگر پاسخِ قطعی ندارد.
 *
 * پس تستِ اصلی این است: هر شکلِ ورودی، *یک* رشتهٔ خروجی.
 */

const base = {
  firstName: "سعدی",
  lastName: "شیرازی",
  email: "SAADI@Example.com",
  password: "Shiraz!2026",
};

describe("شمارهٔ موبایل", () => {
  test("هر شکلی از یک شماره، به یک رشتهٔ متعارف می‌رسد", () => {
    for (const raw of [
      "09123456789",
      "+989123456789",
      "989123456789",
      "9123456789",
      "0912 345 6789",
      "0912-345-6789",
      // ⚠️ ارقامِ فارسی: دانش‌آموزی که با کیبورد فارسی تایپ می‌کند.
      "۰۹۱۲۳۴۵۶۷۸۹",
    ]) {
      assert.equal(phoneField.parse(raw), "989123456789", `ورودی: ${raw}`);
    }
  });

  test("تلفنِ ثابت و شمارهٔ ناقص رد می‌شوند", () => {
    for (const raw of ["02112345678", "0912", "", "   ", "abcdefghijk"]) {
      assert.equal(phoneField.safeParse(raw).success, false, `ورودی: ${raw}`);
    }
  });

  test("ثبت‌نام با ایمیل اصلاً شماره نمی‌گیرد", () => {
    /* ⚠️ یک روز می‌گرفت و اشتباه بود: فرمِ ثبت‌نام دو تب دارد و تبِ
       «موبایل» دقیقاً برای همین است. اگر روزی کسی شماره را به این شِما
       برگرداند، فرمِ ایمیل دوباره پنج‌فیلدی می‌شود برای کاری که سه فیلد
       می‌خواهد. */
    const parsed = registerSchema.safeParse(base);
    assert.equal(parsed.success, true);
    assert.equal("phone" in (parsed.data ?? {}), false);
  });

  test("ثبت‌نام بدون نام خانوادگی رد می‌شود", () => {
    /* ⚠️ نام و نام خانوادگی از امروز **جدا** گرفته می‌شوند. اگر روزی کسی
       برشان گرداند به یک فیلدِ واحد، `first_name`/`last_name` خالی می‌مانند
       و گیتِ «حسابِ نیمه‌ساخته» هر کاربرِ تازه‌ای را — درست بعد از ثبت‌نامِ
       موفق — به صفحهٔ تکمیل می‌فرستد. */
    const parsed = registerSchema.safeParse({ ...base, lastName: "" });
    assert.equal(parsed.success, false);
  });

  test("ایمیل کوچک می‌شود و نیم‌فاصله در نام مجاز است", () => {
    const parsed = registerSchema.safeParse(base);
    assert.equal(parsed.success, true);
    // ایمیل هم مثل قبل کوچک می‌شود — تا `users_email_key` یک ایمیل را دو تا نبیند.
    assert.equal(parsed.data?.email, "saadi@example.com");
    // نیم‌فاصله در نام خانوادگی مجاز است — «حسین‌زاده» بدونِ آن نوشته نمی‌شود.
    assert.equal(registerSchema.safeParse({ ...base, lastName: "حسین‌زاده" }).success, true);
  });

  test("شماره‌ای که از این فیلد رد شود، CHECK دیتابیس را هم رد می‌کند", () => {
    // همان الگوی `users_phone_format_check` در مهاجرت ۰۰۶.
    const dbCheck = /^989[0-9]{9}$/;
    for (const raw of ["09123456789", "+989350001122", "۰۹۹۰۱۲۳۴۵۶۷"]) {
      assert.match(phoneField.parse(raw), dbCheck);
    }
  });
});
