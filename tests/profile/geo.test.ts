import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PROVINCES,
  citiesOf,
  findCity,
  findProvince,
  isValidLocation,
  locationLabel,
} from "@/lib/geo";
import { usableCityId } from "@/lib/profile/schemas";

/**
 * قواعدِ دادهٔ تقسیماتِ کشوری.
 *
 * =============================================================================
 * ⚠️ چرا این آزمون وجود دارد
 * =============================================================================
 *
 * `lib/geo/iran-divisions.json` یک فایلِ داده است و نه کد، پس `tsc` هیچ
 * حرفی دربارهٔ محتوایش ندارد. ولی سه چیز در آن فایل *قرارداد* است و شکستنِ
 * هرکدام بی‌صدا اتفاق می‌افتد:
 *
 *  ۱. **پیشوندِ شناسه.** دیتابیس قیدِ `LEFT(city_id, 5) = province_id` دارد
 *     (`users_city_under_province_check` در migration ۰۰۹). یک شناسهٔ
 *     بدپیشوند در این فایل یعنی ذخیرهٔ پروفایل برای آن شهر روی دیتابیس
 *     خطا می‌دهد — و فقط برای همان یک شهر، پس در آزمونِ دستی دیده نمی‌شود.
 *
 *  ۲. **یکتاییِ شناسه.** دو شهر با یک شناسه یعنی `findCity` یکی‌شان را
 *     هیچ‌وقت پیدا نمی‌کند.
 *
 *  ۳. **یکتاییِ نام در هر استان.** دو گزینهٔ هم‌نام در یک فهرست، برای
 *     کاربر قابلِ تفکیک نیست.
 *
 * =============================================================================
 * ⚠️ و یک قاعدهٔ چهارم که با یک تغییرِ واقعی اضافه شد
 * =============================================================================
 *
 * فهرست از «شهرستان» (۴۲۹ ردیف) به «شهر» (۱۱۱۹ ردیف) رفت. شناسه‌ها در
 * دیتابیسِ کاربران ذخیره‌اند، پس `scripts/geo/build-divisions.mjs` تضمین
 * می‌کند شناسهٔ قدیمی هرگز به شهرِ دیگری نرسد. نتیجه‌اش ۸۶ شناسهٔ «یتیم»
 * است، و آزمونِ آخرِ این فایل می‌گوید آن حالت باید چطور رفتار کند.
 */

describe("دادهٔ تقسیمات کشوری", () => {
  it("۳۱ استان دارد و هیچ‌کدام خالی نیست", () => {
    assert.equal(PROVINCES.length, 31);
    for (const province of PROVINCES) {
      assert.ok(province.cities.length > 0, `استان «${province.name}» هیچ شهری ندارد`);
    }
  });

  it("شناسهٔ هر شهر با شناسهٔ استانش شروع می‌شود", () => {
    /* ⚠️ همان چیزی که `users_city_under_province_check` در دیتابیس
       می‌گوید. اگر این بشکند، ذخیرهٔ پروفایل برای آن شهر خطای قید
       می‌گیرد — و فقط برای همان یکی. */
    const broken: string[] = [];
    for (const province of PROVINCES) {
      for (const city of province.cities) {
        if (city.id.slice(0, 5) !== province.id) {
          broken.push(`${province.name}/${city.name} (${city.id} ≠ ${province.id}…)`);
        }
      }
    }
    assert.deepEqual(broken, []);
  });

  it("شناسه‌ها در کلِ کشور یکتا هستند و شکلِ ثابتی دارند", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    const malformed: string[] = [];

    for (const province of PROVINCES) {
      for (const city of province.cities) {
        if (seen.has(city.id)) duplicates.push(city.id);
        seen.add(city.id);
        // همان الگویی که `cityIdField` در `lib/profile/schemas.ts` می‌پذیرد.
        if (!/^IR\d{6}$/.test(city.id)) malformed.push(`${city.name} → ${city.id}`);
      }
    }

    assert.deepEqual(duplicates, []);
    assert.deepEqual(malformed, []);
  });

  it("در هر استان دو شهرِ هم‌نام نیست", () => {
    const clashes: string[] = [];
    for (const province of PROVINCES) {
      const names = new Set<string>();
      for (const city of province.cities) {
        const key = city.name.replace(/\s+/g, "");
        if (names.has(key)) clashes.push(`${province.name}/${city.name}`);
        names.add(key);
      }
    }
    assert.deepEqual(clashes, []);
  });

  it("نام‌ها تمیزند — بدون فاصلهٔ ابتدا/انتها و بدون حرفِ عربی", () => {
    /* ⚠️ «ي» و «ك» عربی در نامِ شهر یعنی جست‌وجوی کاربر پیدایش نمی‌کند،
       چون `normalize()` در انتخابگر ورودیِ *کاربر* را نرمال می‌کند و
       فرض دارد که خودِ داده از قبل فارسی است. */
    const dirty: string[] = [];
    for (const province of PROVINCES) {
      for (const city of province.cities) {
        if (city.name !== city.name.trim()) dirty.push(`«${city.name}» فاصلهٔ اضافه`);
        if (/[يكى]/.test(city.name)) dirty.push(`«${city.name}» حرفِ عربی`);
        if (city.name.length === 0) dirty.push("نامِ خالی");
      }
    }
    assert.deepEqual(dirty, []);
  });

  it("شهرهای واقعی که قبلاً در فهرست نبودند حالا هستند", () => {
    /* ⚠️ این همان چیزی است که کلِ تغییر برایش انجام شد. نمونه‌ها عمداً
       شهرهای پرجمعیتی‌اند که در فهرستِ شهرستانی وجود نداشتند و کاربرشان
       مجبور بود نامِ شهرستان را حدس بزند. */
    const expected: [string, string][] = [
      ["اصفهان", "زرین شهر"],
      ["اصفهان", "فولادشهر"],
      ["اصفهان", "درچه"],
      ["قم", "کهک"],
      ["تهران", "لواسان"],
      ["البرز", "محمدشهر"],
    ];

    const missing: string[] = [];
    for (const [provinceName, cityName] of expected) {
      const province = PROVINCES.find((p) => p.name === provinceName);
      assert.ok(province, `استان «${provinceName}» نیست`);
      const key = cityName.replace(/\s+/g, "");
      if (!province.cities.some((c) => c.name.replace(/\s+/g, "") === key)) {
        missing.push(`${provinceName}/${cityName}`);
      }
    }
    assert.deepEqual(missing, []);
  });
});

describe("جست‌وجو و اعتبارسنجیِ مکان", () => {
  const province = PROVINCES[0];
  const city = province.cities[0];
  const other = PROVINCES[1];

  it("شهر و استان پیدا می‌شوند", () => {
    assert.equal(findProvince(province.id)?.name, province.name);
    assert.equal(findCity(city.id)?.name, city.name);
    assert.equal(citiesOf(province.id).length, province.cities.length);
  });

  it("شناسهٔ ناشناخته null می‌دهد و throw نمی‌کند", () => {
    assert.equal(findProvince("IR999"), null);
    assert.equal(findCity("IR999999"), null);
    assert.equal(findProvince(null), null);
    assert.equal(citiesOf(undefined).length, 0);
  });

  it("جفتِ استان/شهرِ ناهمخوان رد می‌شود", () => {
    assert.equal(isValidLocation(province.id, city.id), true);
    assert.equal(isValidLocation(other.id, city.id), false);
    // شهر بدونِ استان بی‌معناست؛ استانِ تنها معتبر است؛ هیچ‌کدام هم معتبر.
    assert.equal(isValidLocation(null, city.id), false);
    assert.equal(isValidLocation(province.id, null), true);
    assert.equal(isValidLocation(null, null), true);
  });

  it("برچسبِ نمایشی برای جفتِ ناهمخوان فقط استان را می‌نویسد", () => {
    assert.equal(locationLabel(province.id, city.id), `${province.name} / ${city.name}`);
    assert.equal(locationLabel(other.id, city.id), other.name);
    assert.equal(locationLabel(null, null), null);
  });
});

describe("usableCityId — شناسه‌های یتیمِ فهرستِ قدیمی", () => {
  const province = PROVINCES.find((p) => p.name === "اصفهان")!;

  it("شناسهٔ معتبر را همان‌طور برمی‌گرداند", () => {
    const city = province.cities[0];
    assert.equal(usableCityId(province.id, city.id), city.id);
  });

  it("شناسهٔ یتیم را به null تبدیل می‌کند", () => {
    /* ⚠️ `IR012003` شناسهٔ شهرستانِ «برخوار» در فهرستِ قبلی بود. مرکزِ آن
       شهرستان «دولت‌آباد» نام دارد، پس نامش با هیچ شهری یکی نشد و
       شناسه‌اش رزرو ماند — عمداً، تا به شهرِ دیگری نرسد.

       بدونِ این تبدیل، کاربری که پیش‌تر «برخوار» را انتخاب کرده بود در یک
       بن‌بست می‌افتاد: انتخابگر خالی نشان می‌داد و ذخیره خطا می‌داد. */
    const orphan = "IR012003";
    assert.equal(findCity(orphan), null, "این شناسه نباید در فهرست باشد");
    assert.equal(usableCityId(province.id, orphan), null);
  });

  it("خالی را خالی نگه می‌دارد", () => {
    assert.equal(usableCityId(province.id, null), null);
    assert.equal(usableCityId(null, null), null);
    assert.equal(usableCityId(null, "IR012003"), null);
  });
});
