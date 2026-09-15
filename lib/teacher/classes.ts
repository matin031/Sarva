import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne, execute, transaction, isUniqueViolation } from "@/lib/db";
import type { Grade } from "@/lib/profile/schemas";
import { generateJoinCode } from "./join-code";
import type { ClassMember, StudentClass, TeacherClass } from "./types";
/* ⚠️ قاعدهٔ «می‌تواند عضو شود؟» در یک ماژولِ خالصِ جدا زندگی می‌کند، چون در
   دو جا اجرا می‌شود — پیش‌نمایش و خودِ عضویت — و دو پیاده‌سازیِ جدا روزی
   از هم جدا می‌افتادند. */
import {
  NO_SUCH_CODE,
  joinGate,
  type MembershipStatus,
} from "./membership";

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
  join_enabled: boolean;
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
    joinEnabled: row.join_enabled,
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
         c.join_code, c.is_active, c.join_enabled, c.created_at,
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
    status: MembershipStatus;
  }>(
    /* ⚠️ `active` و `blocked`، ولی **نه** `removed`.
    
       اخراج‌شده‌ها باید دیده شوند، وگرنه دبیر هیچ راهی برای «اجازهٔ
       بازگشت» ندارد — کسی که بیرونش گذاشته از فهرست ناپدید می‌شد و دکمهٔ
       رفعِ بلاک هیچ‌جا نبود.
    
       ولی کسی که خودش رفته نمی‌آید: دبیر کاری با او ندارد و فهرستِ کلاس
       نباید با هر خروجِ داوطلبانه بلندتر شود.
    
       ⚠️ `student_id` به‌عنوان شکنندهٔ تساوی: بدونِ آن، دو دانش‌آموزِ
       هم‌نام (یا هر دو بدونِ نام) ترتیبشان بینِ دو خواندن عوض می‌شود. */
    `select m.student_id, u.full_name, u.grade, m.joined_at, m.status
       from class_members m
       join teacher_classes c on c.id = m.class_id
       join users u on u.id = m.student_id
      where m.class_id = ? and c.teacher_id = ? and m.status in ('active', 'blocked')
      order by m.status = 'active' desc, u.full_name is null, u.full_name, m.student_id
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
    /* ⚠️ `t.role = 'teacher'` هم شرط است و نه فقط مالکیتِ کلاس.
    
       بدونِ آن، دبیری که مدیر دسترسی‌اش را لغو کرده هنوز از دیدِ **این
       تابع** دانش‌آموزانش را می‌بیند: کلاس‌ها سرِ جایشان می‌مانند (عمداً —
       سابقه حذف نمی‌شود) و این کوئری فقط همان‌ها را می‌سنجید.
    
       در عمل `requireTeacher()` در صفحه جلویش را می‌گیرد، ولی این تابع
       «دروازهٔ کلِ تحلیل» نامیده شده و باید خودش هم درست جواب بدهد —
       وگرنه اولین فراخوانی که یادش برود گاردِ نقش را بگذارد، یک نشتِ
       کامل است. آزمونِ `db:check-teacher` دقیقاً همین را گرفت. */
    `select 1 as n
       from class_members m
       join teacher_classes c on c.id = m.class_id
       join users t on t.id = c.teacher_id
      where m.student_id = ? and c.teacher_id = ? and m.status = 'active'
        and t.role = 'teacher'
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
    status: "active" | "blocked";
  }>(
    /* ⚠️ `join_code` عمداً در این select نیست.
       دانش‌آموزِ عضو نیازی به کد ندارد، و برگرداندنش یعنی هر عضوی
       می‌تواند کلاس را برای دیگران باز کند — کاری که فقط از دبیر
       برمی‌آید. */
    /* ⚠️ `active` و `blocked`، ولی **نه** `removed`.
    
       خروجِ خودخواسته از فهرست می‌رود (دانش‌آموز خودش رفته و نشان دادنِ
       کلاسِ ترک‌شده فقط شلوغی است)، ولی اخراج می‌ماند: کسی که دبیر بیرونش
       گذاشته باید بفهمد چه شده. اگر کلاس بی‌توضیح ناپدید می‌شد، با کد
       دوباره امتحان می‌کرد و پیامِ «نمی‌توانی» می‌گرفت بدونِ اینکه بداند
       چرا. */
    `select c.id, c.name, c.grade, s.name as school_name,
            t.full_name as teacher_name, c.is_active, m.joined_at, m.status
       from class_members m
       join teacher_classes c on c.id = m.class_id
       join schools s on s.id = c.school_id
       join users t on t.id = c.teacher_id
      where m.student_id = ? and m.status in ('active', 'blocked')
      -- عضویتِ فعال اول، بعد کلاسِ باز، بعد تازه‌ترین.
      order by m.status = 'active' desc, c.is_active desc, m.joined_at desc
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
    status: r.status,
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

/* ═════════════════════ پیش‌نمایشِ کلاس، پیش از عضویت ═══════════════════ */

/**
 * آنچه دانش‌آموز **پیش از** عضویت می‌بیند.
 *
 * ⚠️ هر فیلدی که اینجا نیست، عمداً نیست.
 *
 * این داده به کسی می‌رسد که فقط یک کدِ شش‌نویسه‌ای دارد و هنوز هیچ رابطه‌ای
 * با این کلاس ندارد. پس فقط چیزهایی می‌آید که برای تصمیمِ «عضو بشوم یا نه»
 * لازم است: کلاس کجاست، دبیرش کیست، پایه‌اش چیست.
 *
 * ⚠️ نه ایمیل، نه شماره، نه شناسهٔ دبیر، نه فهرستِ اعضا، نه تعدادشان.
 * «چند نفر عضوند» بی‌ضرر به‌نظر می‌رسد ولی نیست: با کدی که حدس زده شده، یک
 * شمارندهٔ زنده از یک کلاسِ واقعی می‌دهد.
 */
export type ClassPreview = {
  className: string;
  grade: Grade;
  schoolName: string;
  teacherName: string | null;
  /** آیا همین حالا می‌شود عضو شد؟ */
  joinable: boolean;
  /** اگر نمی‌شود، چرا. */
  reason: string | null;
  /** از قبل عضوِ فعال است؟ آن‌وقت دکمهٔ «تأیید و عضویت» معنا ندارد. */
  alreadyMember: boolean;
};

export type PreviewResult =
  | { ok: true; preview: ClassPreview }
  | { ok: false; error: string };

/**
 * ⚠️ این تابع **هیچ چیزی نمی‌نویسد** و نباید بنویسد.
 *
 * اگر روزی کسی اینجا `insert` یا `update` اضافه کند، «پیش‌نمایش» به یک
 * عضویتِ ناخواسته تبدیل می‌شود — کاربری که فقط می‌خواست ببیند کلاس چیست،
 * عضو شده. تستِ E2E دقیقاً همین را می‌سنجد: پیش‌نمایش نباید تعدادِ ردیف‌های
 * `class_members` را تغییر دهد.
 */
export async function previewClassByCode(
  studentId: string,
  joinCode: string,
): Promise<PreviewResult> {
  const row = await queryOne<{
    id: string;
    name: string;
    grade: Grade;
    is_active: number;
    join_enabled: number;
    teacher_id: string;
    school_name: string;
    teacher_name: string | null;
  }>(
    `select c.id, c.name, c.grade, c.is_active, c.join_enabled, c.teacher_id,
            s.name as school_name, t.full_name as teacher_name
       from teacher_classes c
       join schools s on s.id = c.school_id
       join users t on t.id = c.teacher_id
      where c.join_code = ?`,
    [joinCode],
  );

  if (!row) return { ok: false, error: NO_SUCH_CODE };

  const membership = await queryOne<{ status: MembershipStatus }>(
    "select status from class_members where class_id = ? and student_id = ?",
    [row.id, studentId],
  );

  /* ⚠️ همان تابعی که خودِ عضویت هم صدا می‌زند. دو پیاده‌سازیِ جدا روزی از
     هم جدا می‌افتادند و نتیجه‌اش دکمه‌ای می‌شد که «تأیید و عضویت» می‌گوید و
     بعد خطا می‌دهد. */
  const gate = joinGate({
    isActive: Boolean(row.is_active),
    joinEnabled: Boolean(row.join_enabled),
    isOwnClass: row.teacher_id === studentId,
    membership: membership?.status ?? null,
  });

  return {
    ok: true,
    preview: {
      className: row.name,
      grade: row.grade,
      schoolName: row.school_name,
      teacherName: row.teacher_name,
      joinable: gate.ok && !gate.alreadyActive,
      reason: gate.ok ? null : gate.error,
      alreadyMember: membership?.status === "active",
    },
  };
}

/* ═════════════════════════════ عضویت ══════════════════════════════════ */

export type JoinResult =
  | { ok: true; classId: string; className: string; rejoined: boolean }
  | { ok: false; error: string };

/**
 * پیوستنِ دانش‌آموز با کد — گامِ دومِ جریانِ «پیش‌نمایش سپس تأیید».
 *
 * =============================================================================
 * ⚠️ به نتیجهٔ پیش‌نمایش **هیچ اعتمادی** نمی‌شود
 * =============================================================================
 *
 * بینِ لحظه‌ای که دانش‌آموز پیش‌نمایش را دید و لحظه‌ای که «تأیید» زد، هر
 * چیزی ممکن است عوض شده باشد — و همه‌شان اتفاق‌های عادی‌اند، نه حمله:
 *
 *   • دبیر کد را چرخانده باشد.
 *   • دبیر عضوگیری را بسته باشد.
 *   • دبیر کلاس را بایگانی کرده باشد.
 *   • دبیر همین نفر را بلاک کرده باشد.
 *
 * پس همهٔ بررسی‌ها از نو و روی وضعیتِ تازهٔ دیتابیس انجام می‌شوند. (TOCTOU:
 * فاصلهٔ بینِ «سنجیدن» و «انجام دادن».)
 *
 * ⚠️ و همه داخلِ **یک تراکنش** با `for update` روی ردیفِ کلاس. بدونِ آن، دو
 * تبِ باز که هم‌زمان «تأیید» بزنند هر دو «عضو نیست» می‌بینند و دومی به
 * خطای یکتایی می‌خورد — یعنی کاربری که واقعاً عضو شده، پیامِ خطا می‌گیرد.
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
      join_enabled: number;
      teacher_id: string;
    }>(
      `select id, name, is_active, join_enabled, teacher_id
         from teacher_classes where join_code = ? for update`,
      [joinCode],
    );

    if (!row) return { ok: false as const, error: NO_SUCH_CODE };

    /* ⚠️ `for update` روی ردیفِ عضویت هم لازم است و نه فقط روی کلاس: دو
       درخواستِ هم‌زمانِ همین دانش‌آموز باید پشتِ سرِ هم قرار بگیرند، وگرنه
       هر دو ردیفِ موجود را «نیست» می‌بینند و `insert` دوم به ایندکسِ
       یکتا می‌خورد. */
    const existing = await tx.queryOne<{ id: string; status: MembershipStatus }>(
      "select id, status from class_members where class_id = ? and student_id = ? for update",
      [row.id, studentId],
    );

    const gate = joinGate({
      isActive: Boolean(row.is_active),
      joinEnabled: Boolean(row.join_enabled),
      isOwnClass: row.teacher_id === studentId,
      membership: existing?.status ?? null,
    });

    if (!gate.ok) return { ok: false as const, error: gate.error };

    if (gate.alreadyActive) {
      /* از قبل عضو است — موفقیتِ بی‌اثر. هیچ ردیفی نوشته نمی‌شود، پس
         `joined_at` هم عقب نمی‌رود. */
      return { ok: true as const, classId: row.id, className: row.name, rejoined: false };
    }

    if (existing) {
      /* ⚠️ عضوِ قبلی با **همان ردیف** برمی‌گردد و نه ردیفِ تازه — یکتاییِ
         (کلاس، دانش‌آموز) هم همین را می‌خواهد و تاریخچه حفظ می‌شود.

         و اینجا فقط `removed` می‌رسد: `blocked` را `joinGate` بالاتر رد
         کرده. */
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

/* ═══════════════════════════ خروج و بازگشت ════════════════════════════ */

/* ═══════════════════════ مسابقهٔ خروج و اخراج ══════════════════════════ */

/**
 * یک تلاشِ دوباره وقتی InnoDB بن‌بست اعلام می‌کند.
 *
 * =============================================================================
 * ⚠️ چرا لازم شد — یک بن‌بستِ واقعی، نه نظری
 * =============================================================================
 *
 * `removeClassMember` با `join` روی `teacher_classes` قفل می‌گیرد (برای
 * گاردِ مالکیت) و `leaveClass` فقط `class_members` را دست می‌زند. دو
 * دستور، دو ترتیبِ متفاوتِ قفل‌گیری — و اگر هم‌زمان روی **یک ردیف** اجرا
 * شوند، InnoDB یکی را با خطای ۱۲۱۳ برمی‌گرداند.
 *
 * سناریوی واقعی‌اش کوتاه است ولی ممکن: دانش‌آموز «خروج از کلاس» را
 * می‌زند در همان لحظه‌ای که دبیرش «خارج کردن» را. آزموده شد و دقیقاً
 * همین اتفاق افتاد.
 *
 * ⚠️ بن‌بست یک باگ نیست؛ رفتارِ عادیِ InnoDB است و چارهٔ استانداردش هم
 * همین است: تراکنشِ بازگردانده‌شده دوباره اجرا شود. یک تلاشِ دوباره کافی
 * است — دو دستورِ کوتاه دو بار پشتِ سرِ هم بن‌بست نمی‌سازند.
 *
 * ⚠️ و فقط ۱۲۱۳: هر خطای دیگری همان‌طور که هست بالا می‌رود. بلعیدنِ
 * خطاهای دیگر یعنی یک اشکالِ واقعی دو بار اجرا شود و بعد ناپدید.
 */
async function retryOnDeadlock<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if ((err as { errno?: number })?.errno !== 1213) throw err;
    return run();
  }
}

/**
 * بیرون گذاشتنِ عضو **توسطِ دبیر** → `blocked`.
 *
 * ⚠️ تفاوتش با `leaveClass` فقط یک کلمه در SQL است و کلِ تفاوتِ رفتاری را
 * می‌سازد: دانش‌آموزی که دبیر بیرونش گذاشته، با همان کد برنمی‌گردد.
 *
 * پیش از مهاجرت ۰۱۴ هر دو `removed` می‌نوشتند و اخراج‌شده **بلافاصله**
 * برمی‌گشت؛ تنها چارهٔ دبیر چرخاندنِ کدِ کلِ کلاس بود.
 *
 * ردیف حذف نمی‌شود — تاریخچهٔ «این نفر در این بازه عضو بود» تنها مبنای
 * درستِ خواندنِ عملکردِ گذشته‌اش است.
 */
export async function removeClassMember(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<boolean> {
  const affected = await retryOnDeadlock(() =>
    execute(
      `update class_members m
         join teacher_classes c on c.id = m.class_id
          set m.status = 'blocked', m.left_at = now(6)
        where m.class_id = ? and m.student_id = ? and c.teacher_id = ? and m.status = 'active'`,
      [classId, studentId, teacherId],
    ),
  );
  return affected > 0;
}

/**
 * «اجازهٔ بازگشت» — `blocked` → `removed`.
 *
 * ⚠️ خودش عضو نمی‌کند و نباید بکند: دانش‌آموز باید خودش دوباره با کد وارد
 * شود. عضو کردنِ کسی بدونِ اینکه خواسته باشد، همان کاری است که کلِ جریانِ
 * «پیش‌نمایش سپس تأیید» برای جلوگیری از آن ساخته شد.
 *
 * شرطِ `teacher_id` داخلِ خودِ UPDATE است — دبیرِ دیگری نمی‌تواند بلاکِ
 * همکارش را بردارد.
 */
export async function allowRejoin(
  teacherId: string,
  classId: string,
  studentId: string,
): Promise<boolean> {
  const affected = await execute(
    `update class_members m
       join teacher_classes c on c.id = m.class_id
        set m.status = 'removed'
      where m.class_id = ? and m.student_id = ? and c.teacher_id = ? and m.status = 'blocked'`,
    [classId, studentId, teacherId],
  );
  return affected > 0;
}

/**
 * خروجِ خودخواستهٔ دانش‌آموز → `removed`.
 *
 * ⚠️ `removed` و نه `blocked`: کسی که خودش رفته باید بتواند برگردد. اگر
 * این دو یکی بودند، دانش‌آموزی که اشتباهی «خروج» زده تا ابد بیرون می‌ماند
 * و دبیر هم نمی‌فهمید چرا.
 */
export async function leaveClass(studentId: string, classId: string): Promise<boolean> {
  const affected = await retryOnDeadlock(() =>
    execute(
      `update class_members set status = 'removed', left_at = now(6)
        where class_id = ? and student_id = ? and status = 'active'`,
      [classId, studentId],
    ),
  );
  return affected > 0;
}

/**
 * باز و بسته کردنِ **عضوگیری** — و نه بایگانیِ کلاس.
 *
 * ⚠️ دو مفهومِ جدا که تا مهاجرت ۰۱۴ یک ستون بودند:
 *
 *   • `join_enabled` — کلاس زنده است، فقط کدش دیگر کسی را وارد نمی‌کند.
 *   • `is_active`    — ترم تمام شده. (`setClassActive`)
 *
 * هیچ‌کدام عضوِ فعلی را بیرون نمی‌کنند و هیچ‌کدام دسترسیِ دبیر به عملکردِ
 * اعضای فعال را قطع نمی‌کنند.
 */
export async function setJoinEnabled(
  teacherId: string,
  classId: string,
  enabled: boolean,
): Promise<boolean> {
  const affected = await execute(
    "update teacher_classes set join_enabled = ?, updated_at = now(6) where id = ? and teacher_id = ?",
    [enabled, classId, teacherId],
  );
  return affected > 0;
}

