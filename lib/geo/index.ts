/**
 * تقسیمات کشوری ایران — استان و شهر.
 *
 * ⚠️ عمداً بدون `"server-only"`: هم فرمِ پروفایل در مرورگر باید فهرست را
 * نشان بدهد و هم سرور باید همان فهرست را برای اعتبارسنجی داشته باشد. اگر دو
 * نسخه می‌بودند، اولین به‌روزرسانیِ یکی‌شان یعنی شهری که کاربر می‌بیند ولی
 * سرور قبولش نمی‌کند.
 *
 * ── چرا «شهر» و نه «شهرستان» ───────────────────────────────────────────────
 * ⚠️ این فهرست تا امروز ۴۲۹ ردیف داشت و هر ردیف یک **شهرستان** بود — یعنی
 * عملاً فقط مرکزِ هر شهرستان. ولی برچسبِ فیلد «شهر» است و کاربر دنبالِ شهرِ
 * خودش می‌گشت: کسی که در زرین‌شهر یا فولادشهر یا درچه درس می‌دهد هیچ‌کدام
 * را پیدا نمی‌کرد و باید «لنجان» را می‌زد — نامی که شاید اصلاً نمی‌دانست
 * شهرستانش است.
 *
 * حالا ۱۱۱۹ شهر است.
 *
 * ── منبع ───────────────────────────────────────────────────────────────────
 * فهرستِ شهرها از بستهٔ `iran-city` می‌آید، با مجوز ISC:
 *
 *     https://github.com/mohammad-hassani/iran-city
 *
 * و شناسه و نامِ استان‌ها همچنان از Open Admin Data (CC-BY-4.0):
 *
 *     https://github.com/open-admin-data/iran-administrative-divisions
 *
 * ⚠️ هر دو مجوز اسناد می‌خواهند و اسنادشان در دو جاست و باید بماند: همین
 * بالا، و کلیدِ `_source` در خودِ `iran-divisions.json`.
 *
 * ── ⚠️⚠️ شناسه‌ها پایدارند، و یک حالتِ «یتیم» هست ────────────────────────────
 * فایل با `scripts/geo/build-divisions.mjs` ساخته می‌شود و آن اسکریپت دو
 * قاعده را تضمین می‌کند: شهری که از قبل بوده شناسه‌اش عوض نمی‌شود، و
 * شناسهٔ قدیمی **هرگز** به شهرِ دیگری داده نمی‌شود.
 *
 * نتیجهٔ قاعدهٔ دوم این است که ۸۶ شناسه یتیم‌اند: شهرستان‌هایی که نامشان با
 * نامِ مرکزشان فرق دارد (شهرستانِ «لنجان» مرکزش «زرین‌شهر»، «برخوار» →
 * «دولت‌آباد»، «گچساران» → «دوگنبدان»). کاربری که پیش از این تغییر یکی از
 * آن‌ها را انتخاب کرده بود، شناسه‌اش در دیتابیس هست ولی در این فهرست نیست.
 *
 * ⚠️ این حالت بی‌خطر است و *باید* همین‌طور بماند:
 *
 *   • `findCity()` برایش `null` می‌دهد و `locationLabel()` فقط نامِ استان
 *     را می‌نویسد — که درست است و نه غلط.
 *   • قیدِ `users_city_under_province_check` در دیتابیس همچنان برقرار است،
 *     چون پیشوندِ استان عوض نشده.
 *   • `isValidLocation()` عمداً ردش می‌کند — و به همین دلیل فرمِ پروفایل
 *     پیش از نمایش، شناسهٔ ناشناخته را دور می‌اندازد. (توضیحِ کامل در
 *     `lib/profile/schemas.ts`، کنارِ `usableCityId`.)
 *
 * ── چرا در کد و نه در دیتابیس ──────────────────────────────────────────────
 * توضیحِ کاملش بالای `mysql-migrations/009_profile_teacher_classes.sql` است.
 * خلاصه: این داده سالی یکی‌دو بار عوض می‌شود و به‌روزرسانی‌اش باید یک commit
 * باشد، نه یک migration به‌علاوهٔ یک seed که روی هر محیط جدا اجرا شود.
 *
 * ⚠️ ۴۶ کیلوبایت است و مستقیم import می‌شود (و نه از پشتِ یک endpoint).
 * فهرستِ شهرها *همان لحظه‌ای* لازم است که کاربر استان را عوض می‌کند؛ یک
 * رفت‌وبرگشتِ شبکه در آن لحظه یعنی یک فهرستِ خالی برای نیم ثانیه.
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

/** شهرهای یک استان — ورودیِ انتخابگرِ دوم. */
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
