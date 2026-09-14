import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isValidNationalId,
  maskNationalId,
  normalizeNationalId,
} from "@/lib/profile/national-id";

/**
 * کد ملی — نرمال‌سازی و رقمِ کنترلی.
 *
 * ⚠️ چرا این تست‌ها می‌ارزند با اینکه تابع کوچک است:
 *
 * این تنها چیزی است که بینِ «کد ملیِ واقعی» و «یک عددِ ده‌رقمیِ دلخواه»
 * می‌ایستد، و درخواستِ دبیری به آن تکیه دارد. یک اشتباه در الگوریتم دو
 * شکلِ کاملاً متفاوت دارد و هر دو بد است: یا کدهای معتبر را رد می‌کند
 * (دبیری که نمی‌تواند ثبت‌نام کند و دلیلش را نمی‌فهمد)، یا هر عددی را
 * می‌پذیرد (و آن‌وقت اصلاً وجودش بی‌معناست).
 *
 * کدهای این فایل با همان الگوریتمِ رسمی ساخته شده‌اند و هیچ‌کدام مالِ کسی
 * نیستند.
 */

describe("نرمال‌سازی کد ملی", () => {
  test("ارقام فارسی به لاتین تبدیل می‌شوند", () => {
    assert.equal(normalizeNationalId("۰۰۱۲۳۴۵۶۷۸"), "0012345678");
  });

  test("ارقام عربی-هندی هم پذیرفته می‌شوند", () => {
    assert.equal(normalizeNationalId("٠٠١٢٣٤٥٦٧٨"), "0012345678");
  });

  test("خط تیره و فاصله پاک می‌شوند", () => {
    assert.equal(normalizeNationalId("001-234567-8"), "0012345678");
    assert.equal(normalizeNationalId(" 0012345678 "), "0012345678");
  });

  /**
   * ⚠️ مهم‌ترین تستِ این بخش.
   *
   * بسیاری از شناسنامه‌ها کد را بدونِ صفرهای ابتدایی چاپ کرده‌اند و کاربر
   * هم همان‌طور تایپ می‌کند. بدونِ این، هر کد ملیِ اصفهان و بعضی شهرهای
   * دیگر — که با صفر شروع می‌شوند — رد می‌شد.
   */
  test("کوتاه‌تر از ده رقم با صفر پر می‌شود", () => {
    assert.equal(normalizeNationalId("12345678"), "0012345678");
  });

  test("بیشتر از ده رقم رد می‌شود", () => {
    assert.equal(normalizeNationalId("00123456789"), null);
  });

  test("ورودیِ غیررشته‌ای null می‌دهد", () => {
    assert.equal(normalizeNationalId(12345), null);
    assert.equal(normalizeNationalId(null), null);
    assert.equal(normalizeNationalId(undefined), null);
  });

  /**
   * ⚠️ صفرهای ابتدایی باید سالم بمانند.
   *
   * اگر این مقدار روزی از یک `Number` رد شود، `0012345678` می‌شود
   * `12345678` — یعنی دو نفرِ متفاوت یک کد ملی پیدا می‌کنند.
   */
  test("صفرهای ابتدایی حفظ می‌شوند", () => {
    const id = normalizeNationalId("0012345678");
    assert.equal(id, "0012345678");
    assert.equal(id?.length, 10);
  });
});

describe("رقمِ کنترلیِ کد ملی", () => {
  /**
   * کدِ معتبر از روی نُه رقمِ اول ساخته می‌شود — همان الگوریتمِ رسمی، مستقل
   * از پیاده‌سازیِ خودمان.
   *
   * ⚠️ اگر به‌جای این، چند کدِ ثابت می‌نوشتیم، تستْ فقط همان چند حالت را
   * می‌سنجید. با ساختنِ کد، هر نُه‌رقمیِ دلخواه یک حالتِ تازه است — و هر دو
   * شاخهٔ الگوریتم (باقی‌مانده کمتر از ۲، و بیشتر یا مساویِ ۲) پوشش داده
   * می‌شوند.
   */
  function withCheckDigit(firstNine: string): string {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(firstNine[i]) * (10 - i);
    const remainder = sum % 11;
    return firstNine + String(remainder < 2 ? remainder : 11 - remainder);
  }

  test("هر کدی که با الگوریتمِ رسمی ساخته شود، معتبر است", () => {
    for (const prefix of ["001234567", "049937089", "079041990", "123456789", "000000001"]) {
      const id = withCheckDigit(prefix);
      assert.ok(isValidNationalId(id), `${id} باید معتبر باشد`);
    }
  });

  test("خرابِ کردنِ رقمِ کنترلی، کد را رد می‌کند", () => {
    for (const prefix of ["001234567", "049937089", "079041990"]) {
      const id = withCheckDigit(prefix);
      const wrong = id.slice(0, 9) + String((Number(id[9]) + 1) % 10);
      assert.equal(isValidNationalId(wrong), false, `${wrong} نباید معتبر باشد`);
    }
  });

  test("کدهای با رقمِ کنترلیِ درست پذیرفته می‌شوند", () => {
    assert.ok(isValidNationalId("0499370899"));
    assert.ok(isValidNationalId("0790419904"));
  });

  test("عوض کردنِ یک رقم، کد را نامعتبر می‌کند", () => {
    assert.ok(isValidNationalId("0499370899"));
    assert.equal(isValidNationalId("0499370898"), false);
  });

  /**
   * ⚠️ بدونِ این شرط، `1111111111` یک ورودیِ کاملاً معتبر بود — و دقیقاً
   * همان چیزی است که کسی که نمی‌خواهد کد ملیِ واقعی بدهد تایپ می‌کند.
   */
  test("کدهای همه‌یک‌رقم رد می‌شوند", () => {
    for (const d of "0123456789") {
      assert.equal(isValidNationalId(d.repeat(10)), false, `${d.repeat(10)} نباید معتبر باشد`);
    }
  });

  test("رشتهٔ خالی و غیرعددی رد می‌شوند", () => {
    assert.equal(isValidNationalId(""), false);
    assert.equal(isValidNationalId("abcdefghij"), false);
  });

  test("همان کد با ارقام فارسی هم معتبر است", () => {
    assert.ok(isValidNationalId("۰۴۹۹۳۷۰۸۹۹"));
  });
});

describe("پوشاندنِ کد ملی", () => {
  test("فقط دو رقم اول و دو رقم آخر می‌ماند", () => {
    assert.equal(maskNationalId("0012345678"), "00••••••78");
  });

  test("ورودیِ بدشکل null می‌دهد", () => {
    assert.equal(maskNationalId("123"), null);
    assert.equal(maskNationalId(null), null);
  });
});
