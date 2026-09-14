/**
 * تقسیمات کشوری ایران — استان و شهرستان.
 *
 * ⚠️ عمداً بدون `"server-only"`: هم فرمِ پروفایل در مرورگر باید فهرست را
 * نشان بدهد و هم سرور باید همان فهرست را برای اعتبارسنجی داشته باشد. اگر دو
 * نسخه می‌بودند، اولین به‌روزرسانیِ یکی‌شان یعنی شهری که کاربر می‌بیند ولی
 * سرور قبولش نمی‌کند.
 *
 * ── منبع ───────────────────────────────────────────────────────────────────
 * `iran-divisions.json` از Open Admin Data می‌آید، با مجوز CC-BY-4.0:
 *
 *     https://github.com/open-admin-data/iran-administrative-divisions
 *
 * شکلش کوچک شده (فقط شناسه و نامِ فارسی) و پیشوندِ «شهرستان » از نامِ
 * شهرستان‌ها برداشته شده، چون در یک `<select>` که لیبلش «شهر» است، تکرارِ
 * آن کلمه در هر ۴۲۹ گزینه فقط پهنا می‌گیرد.
 *
 * ⚠️ CC-BY-4.0 اسناد می‌خواهد و اسنادش در دو جا هست و باید بماند: همین
 * بالا، و کلیدِ `_source` در خودِ `iran-divisions.json`. اگر روزی این داده
 * به‌روزرسانی شد، آن کلید نباید حذف شود.
 *
 * ── چرا در کد و نه در دیتابیس ──────────────────────────────────────────────
 * توضیحِ کاملش بالای `mysql-migrations/009_profile_teacher_classes.sql` است.
 * خلاصه: این داده سالی یکی‌دو بار عوض می‌شود و به‌روزرسانی‌اش باید یک commit
 * باشد، نه یک migration به‌علاوهٔ یک seed که روی هر محیط جدا اجرا شود.
 *
 * ⚠️ ۱۹ کیلوبایت است و مستقیم import می‌شود (و نه از پشتِ یک endpoint).
 * فهرستِ شهرها *همان لحظه‌ای* لازم است که کاربر استان را عوض می‌کند؛ یک
 * رفت‌وبرگشتِ شبکه در آن لحظه یعنی یک `<select>` که نیم ثانیه خالی است.
 */

import data from "./iran-divisions.json";

export type City = { id: string; name: string };
export type Province = { id: string; name: string; cities: City[] };

export const PROVINCES: readonly Province[] = data.provinces;

/* ─────────────────────────── جست‌وجوی سریع ────────────────────────────── */

/**
 * ⚠️ نقشه‌ها یک بار در زمانِ بارگذاریِ ماژول ساخته می‌شوند و نه در هر
 * فراخوانی.
 *
 * `provinceName()` در جدولِ درخواست‌های مدیریت برای هر ردیف صدا زده می‌شود؛
 * با یک `find()` خطی روی ۳۱ استان و بعد `find()` روی ۴۲۹ شهر، یک صفحهٔ
 * پنجاه‌ردیفی بیست‌وپنج هزار مقایسه می‌شد. نقشه همان را یک بار می‌سازد.
 */
const PROVINCE_BY_ID = new Map(PROVINCES.map((p) => [p.id, p]));
const CITY_BY_ID = new Map<string, { city: City; province: Province }>();
for (const province of PROVINCES) {
  for (const city of province.cities) CITY_BY_ID.set(city.id, { city, province });
}

export function findProvince(provinceId: string | null | undefined): Province | null {
  if (!provinceId) return null;
  return PROVINCE_BY_ID.get(provinceId) ?? null;
}

export function findCity(cityId: string | null | undefined): City | null {
  if (!cityId) return null;
  return CITY_BY_ID.get(cityId)?.city ?? null;
}

/** شهرهای یک استان — ورودیِ `<select>` دوم. */
export function citiesOf(provinceId: string | null | undefined): readonly City[] {
  return findProvince(provinceId)?.cities ?? [];
}

/* ───────────────────────────── اعتبارسنجی ─────────────────────────────── */

/**
 * آیا این جفت واقعاً وجود دارد و شهر زیرِ همان استان است؟
 *
 * ⚠️ بررسیِ *جفت* و نه دو بررسیِ جدا. کسی که مستقیماً به API درخواست بزند
 * می‌تواند `{ provinceId: "IR010", cityId: "IR005001" }` بفرستد — هر دو
 * شناسهٔ معتبرند و هر دو جداگانه از هر بررسی‌ای رد می‌شوند. آنچه بی‌معناست،
 * کنارِ هم بودنشان است.
 *
 * (دیتابیس هم با `LEFT(city_id, 5) = province_id` همین را می‌گوید. دو
 * نگهبان عمدی است: این یکی پیامِ فارسی می‌دهد، آن یکی تضمین می‌کند که هیچ
 * مسیرِ دیگری — اسکریپت، کنسول SQL — هم نتواند ردیفِ کج بنویسد.)
 */
export function isValidLocation(
  provinceId: string | null | undefined,
  cityId: string | null | undefined,
): boolean {
  // هیچ‌کدام: پروفایل هر دو را اختیاری می‌داند.
  if (!provinceId && !cityId) return true;

  // شهر بدونِ استان بی‌معناست؛ استانِ تنها کاملاً معتبر است.
  if (cityId && !provinceId) return false;
  if (!findProvince(provinceId)) return false;
  if (!cityId) return true;

  return CITY_BY_ID.get(cityId)?.province.id === provinceId;
}

/** نامِ نمایشی — «تهران / شهریار»، یا null وقتی چیزی ثبت نشده. */
export function locationLabel(
  provinceId: string | null | undefined,
  cityId: string | null | undefined,
): string | null {
  const province = findProvince(provinceId);
  if (!province) return null;
  const city = findCity(cityId);
  // ⚠️ شهر فقط وقتی به برچسب اضافه می‌شود که واقعاً زیرِ همین استان باشد.
  // ردیفِ کجی که از قبلِ این کد در دیتابیس مانده، نباید «تهران / تبریز»
  // نشان بدهد — در آن حالت فقط استان نوشته می‌شود.
  if (city && CITY_BY_ID.get(city.id)?.province.id === province.id) {
    return `${province.name} / ${city.name}`;
  }
  return province.name;
}
