import "server-only";
import { query, queryOne, placeholders } from "@/lib/db";
import type { Grade } from "@/lib/profile/schemas";
import {
  dailySeries,
  tehranDay,
  tehranDayAvailable,
  unavailableSeries,
  type DailySeries,
} from "@/lib/analytics/timezone";
import { accuracyOrNull, attentionReasons, type AttentionReason } from "./analytics-rules";

/**
 * تحلیلِ دبیر — «دانش‌آموزانم چطور کار می‌کنند؟»
 *
 * =============================================================================
 * ⚠️ دو قاعده که هر تابعِ این فایل رعایتشان می‌کند
 * =============================================================================
 *
 * **۱) هیچ تابعی بدونِ `teacherId` کار نمی‌کند، و گارد داخلِ خودِ SQL است.**
 *
 * RLS نداریم. یک `where student_id = ?` بدونِ `and c.teacher_id = ?` یعنی
 * هر دبیری با عوض کردنِ یک شناسه در نوارِ آدرس، کارنامهٔ هر کاربرِ سایت را
 * می‌بیند. گذاشتنِ شرط در یک `if` جداگانه کافی نیست — یک `if` را می‌شود جا
 * انداخت، ولی تابعی که بدونِ `teacherId` کامپایل نمی‌شود را نه.
 *
 * **۲) هیچ عددی ساخته نمی‌شود.**
 *
 * هر سنجه یا از یک جدولِ واقعی می‌آید یا `null` است. «صفر درصد» و «هنوز
 * داده نداریم» دو چیزِ متفاوت‌اند و در تایپ‌ها هم متفاوت می‌مانند
 * (`accuracyOrNull`).
 *
 * =============================================================================
 * ⚠️ منابعِ داده — و کدامشان قابلِ اعتمادند
 * =============================================================================
 *
 * | جدول                      | درستی را چه کسی تعیین کرده |
 * |---------------------------|----------------------------|
 * | `user_answers`            | سرور (از `question_options`) |
 * | `jasoos_answers`          | سرور (از `jasoos_levels`)    |
 * | `aruz_bridge_answers`     | سرور (از جدولِ پرسش)         |
 * | `grammar_circuit_answers` | سرور (از جدولِ پرسش)         |
 * | `quiz_attempts`           | سرور                         |
 * | `exam_attempts`           | سرور (بازتصحیح می‌کند)       |
 * | `vocab_answers`           | **مرورگر** ⚠️                 |
 *
 * واژه‌یاب گزینه‌هایش را در مرورگر می‌سازد و هیچ‌جا ثبت نمی‌کند، پس سرور
 * راهی برای بازسنجی ندارد (توضیحِ کاملش بالای
 * `app/api/v1/vocab/answer/route.ts`). ردیف‌هایش در «فعالیت» شمرده می‌شوند
 * ولی **در هیچ درصدِ موفقیتی نمی‌آیند** — وگرنه عددی که به دبیر نشان داده
 * می‌شود، همان چیزی است که خودِ دانش‌آموز می‌توانست تعیینش کند.
 */

/* ═══════════════════════════ دسترسی ═══════════════════════════════════ */

export type TeacherStudentRef = {
  studentId: string;
  fullName: string | null;
  grade: Grade | null;
  /** فقط کلاس‌های **همین دبیر** که دانش‌آموز عضوِ فعالشان است. */
  classes: { id: string; name: string; grade: Grade }[];
  /** قدیمی‌ترین عضویتِ فعال در کلاس‌های همین دبیر. */
  joinedAt: string;
};

/**
 * دروازهٔ کلِ تحلیلِ دبیر.
 *
 * ⚠️ `null` برای «وجود ندارد» و «مالِ تو نیست» یکی است و باید باشد. اگر
 * دومی پیامِ متفاوتی می‌داد، دبیری که شناسه‌ها را امتحان می‌کند می‌فهمید
 * کدام شناسه‌ها کاربرِ واقعی‌اند.
 *
 * ⚠️ `m.status = 'active'`: دانش‌آموزی که از کلاس خارج شده یا بیرون گذاشته
 * شده، از همان لحظه دیده نمی‌شود. ردیفِ عضویتش می‌ماند (تاریخچهٔ کلاس حذف
 * نمی‌شود) ولی دسترسی با آن برنمی‌گردد.
 *
 * ⚠️ اگر دانش‌آموز در چند کلاسِ همین دبیر باشد، **یک** رکورد برمی‌گردد با
 * فهرستی از کلاس‌ها — نه چند رکورد. تحلیلِ تکراری یعنی دبیر فکر کند
 * دانش‌آموز دو برابر فعالیت داشته.
 */
export async function getStudentForTeacher(
  teacherId: string,
  studentId: string,
  /** اگر داده شود، دانش‌آموز باید عضوِ فعالِ **همین** کلاسِ همین دبیر باشد. */
  classId?: string | null,
): Promise<TeacherStudentRef | null> {
  const rows = await query<{
    class_id: string;
    class_name: string;
    class_grade: Grade;
    joined_at: string;
    full_name: string | null;
    grade: Grade | null;
  }>(
    `select c.id as class_id, c.name as class_name, c.grade as class_grade,
            m.joined_at, u.full_name, u.grade
       from class_members m
       join teacher_classes c on c.id = m.class_id
       join users u on u.id = m.student_id
      where m.student_id = ?
        and c.teacher_id = ?
        and m.status = 'active'
        -- ⚠️ الگوی «یا فیلتر نده یا برابر باشد»: در MySQL هر ? یک پارامتر
        -- مصرف می‌کند، پس مقدار دو بار فرستاده می‌شود.
        and (? is null or c.id = ?)
      order by m.joined_at
      limit 100`,
    [studentId, teacherId, classId ?? null, classId ?? null],
  );

  if (rows.length === 0) return null;

  return {
    studentId,
    fullName: rows[0].full_name,
    grade: rows[0].grade,
    classes: rows.map((r) => ({ id: r.class_id, name: r.class_name, grade: r.class_grade })),
    joinedAt: rows[0].joined_at,
  };
}

/* ═══════════════════════ داشبوردِ کلاس ═════════════════════════════════ */

export type ClassStudentRow = {
  studentId: string;
  fullName: string | null;
  grade: Grade | null;
  joinedAt: string;
  lastActivityAt: string | null;
  /** پاسخ‌های آموزشی — همهٔ منابع، شامل واژه‌یاب. */
  answerCount: number;
  quizCount: number;
  examCount: number;
  /** پاسخ‌هایی که **سرور** درستی‌شان را تعیین کرده. */
  verifiedTotal: number;
  verifiedCorrect: number;
  /** `null` یعنی «هنوز نمی‌دانیم» و نه صفر. */
  accuracy: number | null;
  attention: AttentionReason[];
};

export type ClassDashboard = {
  classId: string;
  className: string;
  grade: Grade;
  isActive: boolean;
  studentCount: number;
  students: ClassStudentRow[];
  /** نسبتِ دانش‌آموزانی که شواهدِ کافی برای سنجشِ دقت دارند. */
  measuredRatio: number;
  hasMore: boolean;
};

/** سقفِ یک صفحه از فهرستِ دانش‌آموزان. */
export const CLASS_PAGE_SIZE = 50;

/**
 * داشبوردِ یک کلاس.
 *
 * =============================================================================
 * ⚠️ تعدادِ کوئری‌ها ثابت است و به تعدادِ دانش‌آموزان بستگی ندارد
 * =============================================================================
 *
 * راهِ ساده این بود که برای هر دانش‌آموز `getPanelOverview` صدا زده شود.
 * با ۱۰۰ دانش‌آموز یعنی چند صد کوئری در یک بار باز کردنِ صفحه — و بدترین
 * قسمتش این است که با ۵ دانش‌آموزِ تستی سریع به‌نظر می‌رسد و فقط در کلاسِ
 * واقعی معلوم می‌شود.
 *
 * پس دقیقاً **سه** کوئری، هر تعداد دانش‌آموز:
 *
 *   ۱) خودِ کلاس (با گاردِ مالکیت).
 *   ۲) اعضای فعال، صفحه‌بندی‌شده.
 *   ۳) یک `UNION ALL` روی همهٔ منابع با `user_id in (…) group by user_id`.
 *
 * ⚠️ کوئریِ سوم از ایندکسِ `(user_id, answered_at)` هر جدول استفاده می‌کند
 * (بررسی شد: هر هفت جدول این ایندکس را دارند)، پس `IN` با ۵۰ شناسه یک
 * range scanِ کوچک است و نه اسکنِ کامل.
 */
export async function getClassDashboard(
  teacherId: string,
  classId: string,
  offset = 0,
  limit = CLASS_PAGE_SIZE,
): Promise<ClassDashboard | null> {
  const size = Math.min(Math.max(limit, 1), CLASS_PAGE_SIZE);

  /* ── ۱) کلاس، با گاردِ مالکیت در همان کوئری ──────────────────────── */
  const klass = await queryOne<{
    id: string;
    name: string;
    grade: Grade;
    is_active: boolean;
    member_count: number;
  }>(
    `select c.id, c.name, c.grade, c.is_active,
            (select count(*) from class_members m
              where m.class_id = c.id and m.status = 'active') as member_count
       from teacher_classes c
      where c.id = ? and c.teacher_id = ?`,
    [classId, teacherId],
  );
  if (!klass) return null;

  /* ── ۲) اعضای این صفحه ─────────────────────────────────────────── */
  const members = await query<{
    student_id: string;
    full_name: string | null;
    grade: Grade | null;
    joined_at: string;
  }>(
    `select m.student_id, u.full_name, u.grade, m.joined_at
       from class_members m
       join users u on u.id = m.student_id
      where m.class_id = ? and m.status = 'active'
      -- ⚠️ student_id به‌عنوان شکنندهٔ تساوی: بدونِ آن، دو دانش‌آموز با نامِ
      -- یکسان (یا هر دو بدونِ نام) می‌توانند بینِ دو صفحه تکرار یا جا
      -- بیفتند — همان باگی که صفحه‌بندیِ ناپایدار می‌سازد.
      order by u.full_name is null, u.full_name, m.student_id
      limit ? offset ?`,
    [classId, size + 1, Math.max(offset, 0)],
  );

  const hasMore = members.length > size;
  const page = members.slice(0, size);

  if (page.length === 0) {
    return {
      classId: klass.id,
      className: klass.name,
      grade: klass.grade,
      isActive: klass.is_active,
      studentCount: Number(klass.member_count),
      students: [],
      measuredRatio: 0,
      hasMore: false,
    };
  }

  const ids = page.map((m) => m.student_id);
  const stats = await activityStats(ids);
  const now = Date.now();

  const students: ClassStudentRow[] = page.map((m) => {
    const s = stats.get(m.student_id) ?? EMPTY_STATS;
    return {
      studentId: m.student_id,
      fullName: m.full_name,
      grade: m.grade,
      joinedAt: m.joined_at,
      lastActivityAt: s.lastActivityAt,
      answerCount: s.answerCount,
      quizCount: s.quizCount,
      examCount: s.examCount,
      verifiedTotal: s.verifiedTotal,
      verifiedCorrect: s.verifiedCorrect,
      accuracy: accuracyOrNull(s.verifiedCorrect, s.verifiedTotal),
      attention: attentionReasons({
        joinedAt: m.joined_at,
        lastActivityAt: s.lastActivityAt,
        verifiedTotal: s.verifiedTotal,
        verifiedCorrect: s.verifiedCorrect,
        now,
      }),
    };
  });

  const measured = students.filter((s) => s.accuracy !== null).length;

  return {
    classId: klass.id,
    className: klass.name,
    grade: klass.grade,
    isActive: klass.is_active,
    studentCount: Number(klass.member_count),
    students,
    measuredRatio: students.length ? measured / students.length : 0,
    hasMore,
  };
}

/* ═════════════════════ سنجه‌های دسته‌ای ════════════════════════════════ */

type ActivityStats = {
  lastActivityAt: string | null;
  answerCount: number;
  quizCount: number;
  examCount: number;
  verifiedTotal: number;
  verifiedCorrect: number;
};

const EMPTY_STATS: ActivityStats = {
  lastActivityAt: null,
  answerCount: 0,
  quizCount: 0,
  examCount: 0,
  verifiedTotal: 0,
  verifiedCorrect: 0,
};

/**
 * همهٔ سنجه‌های چند دانش‌آموز، در **یک** کوئری.
 *
 * ⚠️ چرا `union all` و نه هفت کوئریِ جدا مثلِ `getMistakeBook`:
 *
 * آنجا هر زیرکوئری `order by … limit` خودش را داشت و یک union با
 * مرتب‌سازیِ سراسری، هفت اسکنِ ایندکس‌دار را به یک Sort بزرگ می‌رساند.
 * اینجا هیچ مرتب‌سازی‌ای در کار نیست — فقط `group by` — پس بهینه‌ساز هر
 * شاخه را جداگانه با ایندکسِ خودش جمع می‌زند و نتیجه یک رفت‌وبرگشت است
 * به‌جای هشت.
 *
 * ⚠️ `is_verified` یک ستونِ ثابتِ ۰/۱ در خودِ SQL است و نه یک شرط در کد:
 * واژه‌یاب تنها منبعی است که درستی‌اش را مرورگر تعیین کرده، و همین‌جا از
 * جمعِ «سنجیده‌شده» بیرون می‌ماند. (چراییِ کاملش بالای همین فایل.)
 *
 * ⚠️ `quiz_attempts` و `exam_attempts` در `answerCount` **شمرده نمی‌شوند**:
 * هر کدام یک *تلاش*اند و نه یک پاسخ. جمع کردنشان با پاسخ‌ها، عددی می‌ساخت
 * که هیچ معنای یکدستی ندارد.
 */
async function activityStats(studentIds: string[]): Promise<Map<string, ActivityStats>> {
  const ph = placeholders(studentIds.length);

  /* ⚠️ هر ? یک پارامتر مصرف می‌کند، پس فهرستِ شناسه‌ها به‌ازای هر شاخه
     تکرار می‌شود. (در Postgres یک آرایه یک بار فرستاده می‌شد.) */
  const params = [
    ...studentIds, // user_answers
    ...studentIds, // jasoos_answers
    ...studentIds, // aruz_bridge_answers
    ...studentIds, // grammar_circuit_answers
    ...studentIds, // vocab_answers
    ...studentIds, // quiz_attempts
    ...studentIds, // exam_attempts
    ...studentIds, // user_activity_events
  ];

  const rows = await query<{
    user_id: string;
    last_at: string | null;
    answers: number;
    quizzes: number;
    exams: number;
    verified_total: number;
    verified_correct: number;
  }>(
    `select user_id,
            max(at)                             as last_at,
            sum(kind = 'answer')                as answers,
            sum(kind = 'quiz')                  as quizzes,
            sum(kind = 'exam')                  as exams,
            sum(is_verified)                    as verified_total,
            sum(is_verified and is_correct)     as verified_correct
       from (
         select user_id, answered_at as at, 'answer' as kind, 1 as is_verified, is_correct
           from user_answers where user_id in (${ph})
         union all
         select user_id, answered_at, 'answer', 1, is_correct
           from jasoos_answers where user_id in (${ph})
         union all
         select user_id, answered_at, 'answer', 1, is_correct
           from aruz_bridge_answers where user_id in (${ph})
         union all
         select user_id, answered_at, 'answer', 1, is_correct
           from grammar_circuit_answers where user_id in (${ph})
         union all
         select user_id, answered_at, 'answer', 0, is_correct
           from vocab_answers where user_id in (${ph})
         union all
         select user_id, created_at, 'quiz', 0, 0
           from quiz_attempts where user_id in (${ph})
         union all
         select user_id, created_at, 'exam', 0, 0
           from exam_attempts where user_id in (${ph})
         union all
         select user_id, occurred_at, 'event', 0, 0
           from user_activity_events where user_id in (${ph})
       ) t
      group by user_id`,
    params,
  );

  const out = new Map<string, ActivityStats>();
  for (const r of rows) {
    out.set(r.user_id, {
      lastActivityAt: r.last_at,
      answerCount: Number(r.answers ?? 0),
      quizCount: Number(r.quizzes ?? 0),
      examCount: Number(r.exams ?? 0),
      verifiedTotal: Number(r.verified_total ?? 0),
      verifiedCorrect: Number(r.verified_correct ?? 0),
    });
  }
  return out;
}

/* ═════════════════════ نمودارِ روزانه ══════════════════════════════════ */

/**
 * فعالیتِ روزانهٔ یک دانش‌آموز — **با محافظِ منطقهٔ زمانی**.
 *
 * ⚠️ اینجا تنها جایی از تحلیلِ دبیر است که به `CONVERT_TZ` نیاز دارد، و
 * تنها جایی که می‌تواند بی‌صدا دروغ بگوید: اگر جدول‌های منطقهٔ زمانی
 * بارگذاری نشده باشند، `CONVERT_TZ` مقدارِ NULL می‌دهد و نتیجه یک نمودارِ
 * خالی می‌شود — که دبیر آن را «این دانش‌آموز هیچ کاری نکرده» می‌خواند.
 *
 * پس اول سنجیده می‌شود و اگر نبود، کوئری **اصلاً زده نمی‌شود** و یک وضعیتِ
 * صریحِ «در دسترس نیست» برمی‌گردد. بقیهٔ تحلیل — که هیچ‌کدام `CONVERT_TZ`
 * نمی‌خواهند — دست‌نخورده کار می‌کند.
 */
export async function getStudentDailyActivity(
  teacherId: string,
  studentId: string,
  days = 60,
): Promise<DailySeries | null> {
  /* ⚠️ گاردِ دسترسی **قبل** از هر کوئریِ داده. */
  const access = await getStudentForTeacher(teacherId, studentId);
  if (!access) return null;

  if (!(await tehranDayAvailable())) return unavailableSeries();

  const span = Math.min(Math.max(days, 7), 400);

  const rows = await query<{ day: string; total: number; correct: number }>(
    `select ${tehranDay("at")} as day,
            count(*)            as total,
            sum(is_correct = 1) as correct
       from (
         select answered_at as at, is_correct from user_answers
          where user_id = ? and answered_at >= now(6) - interval ? day
         union all
         select answered_at, is_correct from jasoos_answers
          where user_id = ? and answered_at >= now(6) - interval ? day
         union all
         select answered_at, is_correct from aruz_bridge_answers
          where user_id = ? and answered_at >= now(6) - interval ? day
         union all
         select answered_at, is_correct from grammar_circuit_answers
          where user_id = ? and answered_at >= now(6) - interval ? day
         union all
         select answered_at, is_correct from vocab_answers
          where user_id = ? and answered_at >= now(6) - interval ? day
       ) t
      where at is not null
      group by 1
      order by 1`,
    [studentId, span, studentId, span, studentId, span, studentId, span, studentId, span],
  );

  return dailySeries(
    rows.map((r) => ({ day: r.day, total: Number(r.total), correct: Number(r.correct) })),
  );
}
