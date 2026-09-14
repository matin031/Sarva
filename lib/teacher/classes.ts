import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne, execute, transaction, isUniqueViolation } from "@/lib/db";
import type { Grade } from "@/lib/profile/schemas";
import { generateJoinCode } from "./join-code";
import type { ClassMember, StudentClass, TeacherClass } from "./types";

/**
 * کلاس و عضویت — لایهٔ کوئری.
 *
 * =============================================================================
 * ⚠️ قاعده‌ای که هر تابعِ این فایل رعایتش می‌کند
 * =============================================================================
 *
 * **هیچ تابعی فقط با شناسهٔ کلاس کار نمی‌کند.** هر کدام شناسهٔ *دبیر* را هم
 * می‌گیرند و در `where` می‌گذارند.
 *
 * دلیلش این است که RLS ای در کار نیست (بالای `AGENTS.md`): یک کوئریِ
 * `where id = ?` بدونِ `and teacher_id = ?` یعنی هر دبیری با عوض کردنِ یک
 * شناسه در نوارِ آدرس، کلاسِ دبیرِ دیگری را می‌بیند — و با آن، فهرستِ
 * دانش‌آموزانش.
 *
 * نوشتنِ گاردِ مالکیت در *خودِ کوئری* و نه در یک `if` جداگانه عمدی است:
 * یک `if` را می‌شود جا انداخت، ولی تابعی که بدونِ `teacherId` اصلاً
 * کامپایل نمی‌شود را نه.
 */

/* ────────────────────────────── خواندن ────────────────────────────────── */

type ClassRow = {
  id: string;
  name: string;
  grade: Grade;
  school_id: string;
  school_name: string;
  join_code: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
};

function toTeacherClass(row: ClassRow): TeacherClass {
  return {
    id: row.id,
    name: row.name,
    grade: row.grade,
    schoolId: row.school_id,
    schoolName: row.school_name,
    joinCode: row.join_code,
    isActive: row.is_active,
    memberCount: Number(row.member_count),
    createdAt: row.created_at,
  };
}

/* ⚠️ شمارشِ اعضا با یک زیرکوئری و نه `left join … group by`.
   با join، هر ستونِ دیگری هم باید در `group by` بیاید یا زیرِ یک تابعِ
   تجمیعی برود — و `ONLY_FULL_GROUP_BY` (که در MySQL 8 پیش‌فرض است) هر
   فراموشی را به خطا تبدیل می‌کند. زیرکوئری همان عدد را بدونِ آن بند
   می‌دهد. */
const CLASS_SELECT = `
  select c.id, c.name, c.grade, c.school_id, s.name as school_name,
         c.join_code, c.is_active, c.created_at,
         (select count(*) from class_members m
           where m.class_id = c.id and m.status = 'active') as member_count
    from teacher_classes c
    join schools s on s.id = c.school_id`;

/** کلاس‌های یک دبیر — فقط مالِ خودش. */
export async function listTeacherClasses(teacherId: string): Promise<TeacherClass[]> {
  const rows = await query<ClassRow>(
    `${CLASS_SELECT}
      where c.teacher_id = ?
      -- فعال‌ها اول: کلاسِ آرشیوشده نباید بالای فهرست بنشیند.
      order by c.is_active desc, c.created_at desc
      limit 200`,
    [teacherId],
  );
  return rows.map(toTeacherClass);
}

/**
 * یک کلاس — **فقط اگر مالِ همین دبیر باشد**.
 *
 * ⚠️ `null` برای «وجود ندارد» و «مالِ تو نیست» یکی است و باید باشد. اگر
 * دومی پیامِ متفاوتی می‌داد، دبیری که شناسه‌ها را امتحان می‌کند می‌فهمید
 * کدام شناسه‌ها کلاسِ واقعی‌اند.
 */
export async function getTeacherClass(
  teacherId: string,
  classId: string,
): Promise<TeacherClass | null> {
  const row = await queryOne<ClassRow>(
    `${CLASS_SELECT} where c.id = ? and c.teacher_id = ?`,
    [classId, teacherId],
  );
  return row ? toTeacherClass(row) : null;
}

/** اعضای یک کلاس — باز هم با گاردِ مالکیت در همان کوئری. */
export async function listClassMembers(
  teacherId: string,
  classId: string,
): Promise<ClassMember[]> {
  const rows = await query<{
    student_id: string;
    full_name: string | null;
    grade: Grade | null;
    joined_at: string;
    status: "active" | "removed";
  }>(
    `select m.student_id, u.full_name, u.grade, m.joined_at, m.status
       from class_members m
       join teacher_classes c on c.id = m.class_id
       join users u on u.id = m.student_id
      where m.class_id = ? and c.teacher_id = ?
      order by m.status, u.full_name, m.joined_at
      limit 500`,
    [classId, teacherId],
  );

  return rows.map((r) => ({
    studentId: r.student_id,
    fullName: r.full_name,
    grade: r.grade,
    joinedAt: r.joined_at,
    status: r.status,
  }));
}

/**
 * آیا این دانش‌آموز عضوِ *فعالِ* یکی از کلاس‌های این دبیر است؟
 *
 * ⚠️ این تابع دروازهٔ صفحهٔ «عملکردِ دانش‌آموز» است و مهم‌ترین گاردِ کلِ
 * بخشِ کلاس‌هاست: بدونِ آن، یک دبیر با عوض کردنِ شناسه در نوارِ آدرس
 * می‌توانست کارنامهٔ *هر* کاربرِ سایت را ببیند.
 *
 * ⚠️ و `status = 'active'`: دانش‌آموزی که از کلاس بیرون گذاشته شده، دیگر
 * دیده نمی‌شود. ردیفش می‌ماند (برای سابقه) ولی دسترسی با آن برنمی‌گردد.
 */
export async function teacherCanSeeStudent(
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  const row = await queryOne<{ n: number }>(
    `select 1 as n
       from class_members m
       join teacher_classes c on c.id = m.class_id
      where m.student_id = ? and c.teacher_id = ? and m.status = 'active'
      limit 1`,
    [studentId, teacherId],
  );
  return row !== null;
}

/** کلاس‌هایی که یک دانش‌آموز عضوشان است — بدونِ `joinCode`. */
export async function listStudentClasses(studentId: string): Promise<StudentClass[]> {
  const rows = await query<{
    id: string;
    name: string;
    grade: Grade;
    school_name: string;
    teacher_name: string | null;
    is_active: boolean;
    joined_at: string;
  }>(
    /* ⚠️ `join_code` عمداً در این select نیست.
       دانش‌آموزِ عضو نیازی به کد ندارد، و برگرداندنش یعنی هر عضوی
       می‌تواند کلاس را برای دیگران باز کند — کاری که فقط از دبیر
       برمی‌آید. */
    `select c.id, c.name, c.grade, s.name as school_name,
            t.full_name as teacher_name, c.is_active, m.joined_at
       from class_members m
       join teacher_classes c on c.id = m.class_id
       join schools s on s.id = c.school_id
       join users t on t.id = c.teacher_id
      where m.student_id = ? and m.status = 'active'
      order by c.is_active desc, m.joined_at desc
      limit 100`,
    [studentId],
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    grade: r.grade,
    schoolName: r.school_name,
    teacherName: r.teacher_name,
    isActive: r.is_active,
    joinedAt: r.joined_at,
  }));
}

/* ────────────────────────────── نوشتن ─────────────────────────────────── */

/**
 * ساختِ کلاس، با کدِ عضویتِ یکتا.
 *
 * ⚠️ حلقهٔ تلاشِ مجدد لازم است و «بعید» بهانهٔ خوبی برای نداشتنش نیست.
 *
 * کد تصادفی است و `join_code` یکتا؛ برخوردش با هزار کلاسِ فعال حدود یک در
 * یک میلیون است. ولی «یک در یک میلیون» یعنی یک بار در هر یک میلیون ساختِ
 * کلاس *واقعاً اتفاق می‌افتد* — و بدونِ حلقه، آن یک بار به‌شکلِ یک خطای
 * ۵۰۰ی بی‌توضیح به یک دبیر نشان داده می‌شود.
 *
 * سه تلاش کافی است: شانسِ سه برخوردِ پشتِ سرِ هم از شانسِ خرابیِ دیسک
 * کمتر است.
 */
export async function createClass(params: {
  teacherId: string;
  schoolId: string;
  name: string;
  grade: Grade;
}): Promise<TeacherClass> {
  const { teacherId, schoolId, name, grade } = params;

  for (let attempt = 0; attempt < 3; attempt++) {
    const id = randomUUID();
    const joinCode = generateJoinCode();

    try {
      await execute(
        `insert into teacher_classes (id, teacher_id, school_id, name, grade, join_code)
         values (?, ?, ?, ?, ?, ?)`,
        [id, teacherId, schoolId, name.trim(), grade, joinCode],
      );

      const created = await getTeacherClass(teacherId, id);
      if (!created) throw new Error("کلاس ساخته شد ولی خوانده نشد.");
      return created;
    } catch (err) {
      // ⚠️ فقط برخوردِ کد تلاشِ دوباره می‌گیرد. هر نقضِ یکتاییِ دیگری
      // (که اینجا یعنی برخوردِ UUID — عملاً ناممکن) نباید بی‌صدا سه بار
      // تکرار شود.
      if (isUniqueViolation(err) && attempt < 2) continue;
      throw err;
    }
  }

  throw new Error("ساخت کد عضویت یکتا ناموفق بود. دوباره تلاش کنید.");
}

/** فعال یا غیرفعال کردنِ کلاس — «امکان غیرفعال کردن کلاس وجود داشته باشد». */
export async function setClassActive(
  teacherId: string,
  classId: string,
  isActive: boolean,
): Promise<boolean> {
  const affected = await execute(
    "update teacher_classes set is_active = ?, updated_at = now(6) where id = ? and teacher_id = ?",
    [isActive, classId, teacherId],
  );
  return affected > 0;
}

/**
 * چرخاندنِ کدِ عضویت.
 *
 * ⚠️ در خواسته نبود ولی بدونِ آن، یک کدِ لو رفته هیچ راهِ جبرانی ندارد:
 * دبیری که کدش در یک گروهِ عمومی پخش شده، تنها گزینه‌اش ساختنِ کلاسِ تازه و
 * از دست دادنِ همهٔ اعضاست. اعضای فعلی دست نمی‌خورند؛ فقط کدِ قدیمی دیگر
 * کسی را وارد نمی‌کند.
 */
export async function rotateJoinCode(
  teacherId: string,
  classId: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const joinCode = generateJoinCode();
    try {
      const affected = await execute(
        "update teacher_classes set join_code = ?, updated_at = now(6) where id = ? and teacher_id = ?",
        [joinCode, classId, teacherId],
      );
      return affected > 0 ? joinCode : null;
    } catch (err) {
      if (isUniqueViolation(err) && attempt < 2) continue;
      throw err;
    }
  }
  return null;
}

export type JoinResult =
  | { ok: true; classId: string; className: string; rejoined: boolean }
  | { ok: false; error: string };

/**
 * پیوستنِ دانش‌آموز با کد.
 *
 * ⚠️ همهٔ بررسی‌ها داخلِ **یک تراکنش** و با `for update` روی ردیفِ کلاس.
 * بدونِ آن، دو تبِ باز که هم‌زمان «پیوستن» بزنند، هر دو «عضو نیست»
 * می‌بینند و دومی به خطای یکتایی می‌خورد — یعنی کاربری که واقعاً عضو شده،
 * پیامِ خطا می‌گیرد.
 *
 * ⚠️ و پیامِ خطای کدِ نامعتبر با کدِ کلاسِ غیرفعال **یکی نیست** و نباید
 * باشد: اولی به کسی که دارد کد حدس می‌زند چیزی نمی‌گوید، ولی دومی به
 * دانش‌آموزی که کدِ درست دارد می‌گوید مشکل از او نیست.
 */
export async function joinClassByCode(
  studentId: string,
  joinCode: string,
): Promise<JoinResult> {
  return transaction(async (tx) => {
    const row = await tx.queryOne<{
      id: string;
      name: string;
      is_active: number;
      teacher_id: string;
    }>(
      "select id, name, is_active, teacher_id from teacher_classes where join_code = ? for update",
      [joinCode],
    );

    if (!row) return { ok: false as const, error: "کدی با این مشخصات پیدا نشد." };

    if (!row.is_active) {
      return { ok: false as const, error: "این کلاس بسته شده است. با دبیرت هماهنگ کن." };
    }

    // ⚠️ دبیر نمی‌تواند عضوِ کلاسِ خودش شود. بی‌ضرر به‌نظر می‌رسد ولی نیست:
    // بعدش در فهرستِ اعضا ظاهر می‌شود و «عملکردِ دانش‌آموزان» کارنامهٔ خودِ
    // دبیر را هم نشان می‌دهد، که فقط گیج‌کننده است.
    if (row.teacher_id === studentId) {
      return { ok: false as const, error: "این کلاسِ خودت است." };
    }

    const existing = await tx.queryOne<{ id: string; status: "active" | "removed" }>(
      "select id, status from class_members where class_id = ? and student_id = ? for update",
      [row.id, studentId],
    );

    if (existing?.status === "active") {
      // از قبل عضو است — یک موفقیتِ بی‌اثر و نه یک خطا. دانش‌آموزی که کد را
      // دوبار وارد کرده، نتیجه‌اش همان است که می‌خواست.
      return { ok: true as const, classId: row.id, className: row.name, rejoined: false };
    }

    if (existing) {
      /* ⚠️ عضوی که قبلاً خارج شده، با همان ردیف برمی‌گردد و نه با ردیفِ
         تازه — یکتاییِ (کلاس، دانش‌آموز) هم همین را می‌خواهد.

         و بله، این یعنی دانش‌آموزی که دبیر بیرونش گذاشته می‌تواند با همان
         کد برگردد. عمدی است: ابزارِ درستِ «دیگر راهش نده» چرخاندنِ کد است
         (`rotateJoinCode`)، نه یک بن‌شدنِ دائمیِ نامرئی که دبیر خبر ندارد
         ساخته. */
      await tx.execute(
        "update class_members set status = 'active', left_at = null, joined_at = now(6) where id = ?",
        [existing.id],
      );
      return { ok: true as const, classId: row.id, className: row.name, rejoined: true };
    }

    await tx.execute(
      "insert into class_members (id, class_id, student_id, status) values (?, ?, ?, 'active')",
      [randomUUID(), row.id, studentId],
    );
    return { ok: true as const, classId: row.id, className: row.name, rejoined: false };
  });
}

/** بیرون گذاشتنِ عضو — ردیف می‌ماند، فقط خاموش می‌شود (چراییِ کاملش در ۰۰۹). */
export async function removeClassMember(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<boolean> {
  const affected = await execute(
    `update class_members m
       join teacher_classes c on c.id = m.class_id
        set m.status = 'removed', m.left_at = now(6)
      where m.class_id = ? and m.student_id = ? and c.teacher_id = ? and m.status = 'active'`,
    [classId, studentId, teacherId],
  );
  return affected > 0;
}

/** خروجِ خودخواستهٔ دانش‌آموز از کلاس. */
export async function leaveClass(studentId: string, classId: string): Promise<boolean> {
  const affected = await execute(
    `update class_members set status = 'removed', left_at = now(6)
      where class_id = ? and student_id = ? and status = 'active'`,
    [classId, studentId],
  );
  return affected > 0;
}
