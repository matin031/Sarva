import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne, execute, isUniqueViolation } from "@/lib/db";
import { locationLabel } from "@/lib/geo";
import { logger } from "@/lib/observability";
/* ⚠️ نرمال‌سازیِ نام در فایلِ جدا زندگی می‌کند و نه اینجا: این ماژول
   `"server-only"` است و هر چیزی که از آن import شود همان قید را با خودش
   می‌برد — یعنی آن تابعِ خالص نه قابلِ تست بود و نه قابلِ استفاده در
   مرورگر. همان کاری که `lib/plus/coverage.ts` کرد. */
import { normalizeSchoolName } from "./school-name";
import type { School } from "./types";

/**
 * مدرسه — ساختن و یافتن.
 *
 * ⚠️ این ماژول هیچ گاردی ندارد و عمداً. هر تابعش یک کوئریِ خالص است؛
 * «چه کسی اجازه دارد مدرسه بسازد» در `lib/teacher/actions.ts` تصمیم گرفته
 * می‌شود، کنارِ بقیهٔ گاردهای دبیر. پخش کردنِ گاردها در دو لایه یعنی روزی
 * یکی‌شان از قلم بیفتد و کسی متوجه نشود.
 */

/* ─────────────────────────────── خواندن ───────────────────────────────── */

type SchoolRow = {
  id: string;
  name: string;
  province_id: string;
  city_id: string;
};

function toSchool(row: SchoolRow): School {
  return {
    id: row.id,
    name: row.name,
    provinceId: row.province_id,
    cityId: row.city_id,
    locationLabel: locationLabel(row.province_id, row.city_id),
  };
}

/**
 * مدرسه‌های یک شهر — فهرستی که دبیر از آن انتخاب می‌کند.
 *
 * ⚠️ محدود به *شهر* و نه کلِ کشور: یک `<select>` با چند هزار گزینه چیزی
 * نیست که کسی در آن دنبالِ مدرسه‌اش بگردد. و چون کلاس به شهرِ خودِ دبیر
 * مربوط است، فهرستِ شهرهای دیگر هم به کارش نمی‌آید.
 */
export async function listSchoolsInCity(cityId: string): Promise<School[]> {
  const rows = await query<SchoolRow>(
    `select id, name, province_id, city_id
       from schools
      where city_id = ?
      order by name
      limit 500`,
    [cityId],
  );
  return rows.map(toSchool);
}

export async function findSchool(schoolId: string): Promise<School | null> {
  const row = await queryOne<SchoolRow>(
    "select id, name, province_id, city_id from schools where id = ?",
    [schoolId],
  );
  return row ? toSchool(row) : null;
}

/* ─────────────────────────────── نوشتن ────────────────────────────────── */

/**
 * مدرسه را می‌سازد، یا اگر از قبل هست همان را برمی‌گرداند.
 *
 * ⚠️ «بساز یا برگردان» و نه «بساز و اگر تکراری بود خطا بده».
 *
 * از دیدِ دبیر، «مدرسهٔ من این است» یک جمله است و نه دو حالت. اگر دبیرِ دوم
 * همان مدرسه را تایپ کند و خطای «این مدرسه قبلاً ثبت شده» بگیرد، تنها
 * کاری که از دستش برمی‌آید این است که یک کاراکتر عوض کند تا قبول شود — و
 * دقیقاً همان ردیفِ تکراری ساخته می‌شود که می‌خواستیم جلویش را بگیریم.
 *
 * ⚠️ و چرا `insert` اول و بعد `select` در شاخهٔ خطا، به‌جای «اول select بعد
 * insert»: بینِ آن دو یک پنجرهٔ مسابقه است که در آن دو دبیر هم‌زمان ردیفِ
 * خالی می‌بینند و هر دو insert می‌زنند. ایندکسِ یکتا برندهٔ مسابقه را
 * مشخص می‌کند و بازنده همان ردیفِ برنده را می‌خواند.
 */
export async function findOrCreateSchool(params: {
  name: string;
  provinceId: string;
  cityId: string;
  createdBy: string;
}): Promise<School> {
  const { name, provinceId, cityId, createdBy } = params;
  const nameKey = normalizeSchoolName(name);
  const id = randomUUID();

  let school: School;

  try {
    await execute(
      `insert into schools (id, name, name_key, province_id, city_id, created_by)
       values (?, ?, ?, ?, ?, ?)`,
      [id, name.trim(), nameKey, provinceId, cityId, createdBy],
    );
    school = {
      id,
      name: name.trim(),
      provinceId,
      cityId,
      locationLabel: locationLabel(provinceId, cityId),
    };
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;

    const existing = await queryOne<SchoolRow>(
      "select id, name, province_id, city_id from schools where city_id = ? and name_key = ?",
      [cityId, nameKey],
    );
    // ⚠️ اگر ردیف پیدا نشد، نقضِ یکتایی از جای دیگری بوده (مثلاً کلیدِ
    // اصلی) و بلعیدنش یعنی پنهان کردنِ یک خرابیِ واقعی.
    if (!existing) throw err;
    school = toSchool(existing);
  }

  // ⚠️ عضویت در **هر دو** شاخه نوشته می‌شود — چه مدرسه تازه ساخته شده باشد
  // و چه از قبل بوده. شاخهٔ دوم مهم‌تر است: دقیقاً همان‌جاست که دبیرِ دومِ
  // یک مدرسه به آن وصل می‌شود، و بدونش «چند دبیر در یک مدرسه» (بند ۱۳)
  // هیچ‌وقت داده‌ای نمی‌گرفت.
  await linkTeacherToSchool(createdBy, school.id);

  return school;
}

/**
 * عضویتِ صریحِ دبیر در مدرسه.
 *
 * ⚠️ چرا لازم است با اینکه `teacher_classes.school_id` وجود دارد:
 *
 * آن رابطه *ضمنی* است — دبیری که هنوز کلاس نساخته به هیچ مدرسه‌ای وصل
 * نیست، و «همهٔ دبیرانِ این مدرسه» با
 * `select distinct teacher_id from teacher_classes` دبیرانِ بی‌کلاس را جا
 * می‌اندازد.
 *
 * ⚠️ `INSERT IGNORE` چون این تابع در مسیرهای پرتکرار صدا زده می‌شود (هر
 * ساختِ مدرسه و هر ساختِ کلاس) و تکراری بودن کاملاً عادی است — نه خطا.
 *
 * ⚠️ و شکستش کلِ عملیات را نمی‌شکند: این یک رابطهٔ کمکی برای گزارش‌های
 * آینده است، نه چیزی که ساختِ کلاس به آن وابسته باشد.
 */
export async function linkTeacherToSchool(teacherId: string, schoolId: string): Promise<void> {
  try {
    await execute(
      "insert ignore into teacher_schools (id, teacher_id, school_id) values (?, ?, ?)",
      [randomUUID(), teacherId, schoolId],
    );
  } catch (err) {
    logger.warn("ثبت عضویت دبیر در مدرسه ناموفق بود", {
      event: "teacher.school_link.failed",
      user_id: teacherId,
      err,
    });
  }
}

export { normalizeSchoolName };
