import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PROVINCES,
  citiesOf,
  findCity,
  findProvince,
  isValidLocation,
  locationLabel,
} from "@/lib/geo";
import { generateJoinCode, normalizeJoinCode } from "@/lib/teacher/join-code";
import { normalizeSchoolName } from "@/lib/teacher/school-name";

/**
 * منطقِ خالصِ «استان/شهر»، «کدِ عضویت» و «نامِ مدرسه».
 *
 * هر سه چیزهایی‌اند که دیتابیس هم نگهبانشان است، ولی پیامِ خطای دیتابیس به
 * کاربر نشان داده نمی‌شود — پس اگر این‌ها بشکنند، نتیجه‌اش یک خطای ۵۰۰
 * بی‌توضیح است و نه یک پیامِ روشن.
 */

describe("دادهٔ تقسیمات کشوری", () => {
  test("۳۱ استان دارد", () => {
    assert.equal(PROVINCES.length, 31);
  });

  test("هر استان دستِ‌کم یک شهرستان دارد", () => {
    for (const province of PROVINCES) {
      assert.ok(province.cities.length > 0, `${province.name} شهرستان ندارد`);
    }
  });

  /**
   * ⚠️ کلِ اعتبارسنجیِ سمتِ دیتابیس به این قرارداد تکیه دارد:
   * `users_city_under_province_check` می‌گوید `LEFT(city_id, 5) = province_id`.
   * اگر روزی دادهٔ تازه‌ای این الگو را نداشته باشد، هر ذخیرهٔ پروفایل با
   * خطای constraint شکست می‌خورد و هیچ‌کس نمی‌فهمد چرا.
   */
  test("شناسهٔ هر شهر با شناسهٔ استانش شروع می‌شود", () => {
    for (const province of PROVINCES) {
      assert.match(province.id, /^IR\d{3}$/);
      for (const city of province.cities) {
        assert.match(city.id, /^IR\d{6}$/);
        assert.equal(city.id.slice(0, 5), province.id, `${city.name} زیرِ ${province.name} نیست`);
      }
    }
  });

  test("شناسهٔ شهرها در کلِ کشور یکتاست", () => {
    const seen = new Set<string>();
    for (const province of PROVINCES) {
      for (const city of province.cities) {
        assert.equal(seen.has(city.id), false, `${city.id} تکراری است`);
        seen.add(city.id);
      }
    }
  });

  test("پیشوندِ «شهرستان» از نام‌ها برداشته شده", () => {
    for (const province of PROVINCES) {
      for (const city of province.cities) {
        assert.equal(city.name.startsWith("شهرستان"), false, `${city.name} پیشوند دارد`);
      }
    }
  });
});

describe("اعتبارسنجیِ استان و شهر", () => {
  const tehran = PROVINCES.find((p) => p.name === "تهران")!;
  const fars = PROVINCES.find((p) => p.name === "فارس")!;

  test("هر دو خالی، معتبر است — پروفایل اختیاری‌شان می‌داند", () => {
    assert.ok(isValidLocation(null, null));
    assert.ok(isValidLocation(undefined, undefined));
  });

  test("استانِ تنها معتبر است", () => {
    assert.ok(isValidLocation(tehran.id, null));
  });

  test("شهرِ بدونِ استان معتبر نیست", () => {
    assert.equal(isValidLocation(null, tehran.cities[0].id), false);
  });

  /**
   * ⚠️ مهم‌ترین تستِ این فایل.
   *
   * هر دو شناسه جداگانه کاملاً معتبرند؛ آنچه بی‌معناست کنارِ هم بودنشان
   * است. کسی که مستقیماً به API درخواست بزند دقیقاً همین را می‌فرستد.
   */
  test("شهری از استانِ دیگر رد می‌شود", () => {
    assert.equal(isValidLocation(tehran.id, fars.cities[0].id), false);
  });

  test("جفتِ درست پذیرفته می‌شود", () => {
    assert.ok(isValidLocation(tehran.id, tehran.cities[0].id));
  });

  test("شناسهٔ ناموجود رد می‌شود", () => {
    assert.equal(isValidLocation("IR999", null), false);
    assert.equal(isValidLocation(tehran.id, "IR999999"), false);
  });
});

describe("جست‌وجو و برچسبِ مکان", () => {
  const tehran = PROVINCES.find((p) => p.name === "تهران")!;

  test("استان و شهر با شناسه پیدا می‌شوند", () => {
    assert.equal(findProvince(tehran.id)?.name, "تهران");
    assert.equal(findCity(tehran.cities[0].id)?.name, tehran.cities[0].name);
  });

  test("شناسهٔ خالی یا ناموجود null می‌دهد", () => {
    assert.equal(findProvince(null), null);
    assert.equal(findProvince("IR999"), null);
    assert.equal(findCity(undefined), null);
  });

  test("شهرهای یک استان برگردانده می‌شوند", () => {
    assert.equal(citiesOf(tehran.id).length, tehran.cities.length);
    assert.equal(citiesOf("IR999").length, 0);
  });

  test("برچسب شاملِ استان و شهر است", () => {
    const label = locationLabel(tehran.id, tehran.cities[0].id);
    assert.ok(label?.startsWith("تهران / "));
  });

  /**
   * ⚠️ ردیفِ کجی که ممکن است از قبلِ این کد در دیتابیس مانده باشد، نباید
   * «تهران / تبریز» نشان بدهد — در آن حالت فقط استان نوشته می‌شود.
   */
  test("شهرِ ناسازگار در برچسب نادیده گرفته می‌شود", () => {
    const fars = PROVINCES.find((p) => p.name === "فارس")!;
    assert.equal(locationLabel(tehran.id, fars.cities[0].id), "تهران");
  });

  test("بدونِ استان، برچسبی نیست", () => {
    assert.equal(locationLabel(null, null), null);
  });
});

describe("کدِ عضویتِ کلاس", () => {
  /**
   * ⚠️ الفبا باید با `teacher_classes_join_code_check` در مهاجرت ۰۰۹ بخواند.
   * اگر یکی عوض شود و دیگری نه، کدی تولید می‌شود که دیتابیس ردش می‌کند —
   * یعنی ساختِ کلاس با یک خطای ۵۰۰ شکست می‌خورد.
   */
  test("کدِ تولیدشده با الگوی دیتابیس می‌خواند", () => {
    for (let i = 0; i < 200; i++) {
      assert.match(generateJoinCode(), /^[A-Z2-9]{6,10}$/);
    }
  });

  test("حروف و ارقامِ مبهم در کد نمی‌آیند", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      for (const bad of ["I", "O", "0", "1"]) {
        assert.equal(code.includes(bad), false, `${code} شاملِ «${bad}» است`);
      }
    }
  });

  test("کدها تکراری نیستند", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateJoinCode());
    // با ۵۰۰ نمونه از فضای ~۱ میلیارد، برخورد عملاً غیرممکن است.
    assert.equal(seen.size, 500);
  });

  test("حروفِ کوچک، فاصله و خط تیره یکدست می‌شوند", () => {
    assert.equal(normalizeJoinCode("a7k-2p9"), "A7K2P9");
    assert.equal(normalizeJoinCode(" ab 3k 9p "), "AB3K9P");
  });

  test("ارقامِ فارسی هم پذیرفته می‌شوند", () => {
    assert.equal(normalizeJoinCode("AB۳K۹P"), "AB3K9P");
  });
});

describe("یکدست کردنِ نامِ مدرسه", () => {
  /**
   * ⚠️ چرا لازم است: جدولِ `schools` با `utf8mb4_bin` مقایسه می‌کند، یعنی
   * بایت‌به‌بایت. بدونِ این تابع، هر یک از این نوشتن‌ها یک ردیفِ جدا
   * می‌ساخت و دو دبیرِ یک مدرسه به دو چیزِ متفاوت وصل می‌شدند.
   */
  test("یِ عربی و یِ فارسی یکی می‌شوند", () => {
    assert.equal(normalizeSchoolName("دبیرستان هدي"), normalizeSchoolName("دبیرستان هدی"));
  });

  test("کافِ عربی و کافِ فارسی یکی می‌شوند", () => {
    assert.equal(normalizeSchoolName("مدرسه كوثر"), normalizeSchoolName("مدرسه کوثر"));
  });

  test("فاصله‌های تکراری و ابتدایی/انتهایی حذف می‌شوند", () => {
    assert.equal(normalizeSchoolName("  دبیرستان   هدف  "), normalizeSchoolName("دبیرستان هدف"));
  });

  test("نیم‌فاصله مثل فاصله رفتار می‌کند", () => {
    assert.equal(normalizeSchoolName("دبیرستان‌هدف"), normalizeSchoolName("دبیرستان هدف"));
  });

  test("اعراب نادیده گرفته می‌شود", () => {
    assert.equal(normalizeSchoolName("مدرسهٔ هُدی"), normalizeSchoolName("مدرسه هدی"));
  });

  test("مدرسه‌های واقعاً متفاوت یکی نمی‌شوند", () => {
    assert.notEqual(normalizeSchoolName("دبیرستان هدف"), normalizeSchoolName("دبیرستان امید"));
  });
});
