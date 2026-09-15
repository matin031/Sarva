import "server-only";
import { randomUUID } from "node:crypto";
import { execute, query, queryOne } from "@/lib/db";
import { notify } from "@/lib/plus/notifications";
import { getStudentForTeacher } from "./analytics";
import {
  FEEDBACK_CATEGORIES,
  RELATED_TYPES,
  feedbackPreview,
  type FeedbackCategory,
  type RelatedType,
} from "./feedback-rules";

/**
 * بازخوردِ دبیر به دانش‌آموز.
 *
 * =============================================================================
 * ⚠️ چهار چیز پیش از هر نوشتن اثبات می‌شود
 * =============================================================================
 *
 *   ۱) نویسنده واقعاً **دبیرِ تأییدشده** است — با `requireTeacher()` در
 *      لایهٔ Server Action، و `users.role` فقط از مسیرِ تأییدِ درخواست
 *      نوشته می‌شود.
 *   ۲) کلاس مالِ **همین** دبیر است.
 *   ۳) دانش‌آموز عضوِ **فعالِ** همان کلاس است.
 *   ۴) اگر ارجاعی به یک فعالیت داده شده، آن فعالیت مالِ **همین دانش‌آموز**
 *      است.
 *
 * ⚠️ بندِ چهارم را به‌سادگی می‌شود جا انداخت و نتیجه‌اش بدترینِ این چهار
 * تاست: بدونِ آن، یک دبیر می‌توانست با فرستادنِ شناسهٔ کارنامهٔ کاربرِ
 * دیگری، بازخوردی بسازد که به دادهٔ آن غریبه ارجاع می‌دهد — و بعد همان
 * ارجاع در صفحهٔ دانش‌آموزِ خودش رندر شود.
 *
 * (بندهای ۲ و ۳ هر دو در یک کوئری‌اند: `getStudentForTeacher`.)
 */

export type FeedbackEntry = {
  id: string;
  teacherName: string | null;
  className: string;
  category: FeedbackCategory;
  message: string;
  relatedType: RelatedType | null;
  relatedId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * جدولِ مالکیتِ ارجاع.
 *
 * ⚠️ نامِ جدول درون‌ریزیِ رشته **نمی‌شود** و هر حالت کوئریِ کاملِ خودش را
 * دارد — وگرنه `npm run db:check-sql` نمی‌تواند بازسازی‌شان کند و هر دو از
 * پوششِ بررسی بیرون می‌افتند. (آزموده شد: کوئریِ عمداً خراب در چنین شکلی
 * گزارش نمی‌شد.)
 *
 * `activity` یعنی `user_activity_events` — که ستونش `user_id` است، مثلِ
 * دو تای دیگر.
 */
async function relatedBelongsToStudent(
  relatedType: RelatedType,
  relatedId: string,
  studentId: string,
): Promise<boolean> {
  if (relatedType === "exam_attempt") {
    return (
      (await queryOne<{ n: number }>(
        "select 1 as n from exam_attempts where id = ? and user_id = ? limit 1",
        [relatedId, studentId],
      )) !== null
    );
  }
  if (relatedType === "quiz_attempt") {
    return (
      (await queryOne<{ n: number }>(
        "select 1 as n from quiz_attempts where id = ? and user_id = ? limit 1",
        [relatedId, studentId],
      )) !== null
    );
  }
  return (
    (await queryOne<{ n: number }>(
      "select 1 as n from user_activity_events where id = ? and user_id = ? limit 1",
      [relatedId, studentId],
    )) !== null
  );
}

export type CreateFeedbackParams = {
  teacherId: string;
  teacherName: string | null;
  studentId: string;
  classId: string;
  category: FeedbackCategory;
  message: string;
  relatedType?: RelatedType | null;
  relatedId?: string | null;
};

export async function createFeedback(params: CreateFeedbackParams): Promise<FeedbackResult> {
  const message = params.message.trim();
  if (!message) return { ok: false, error: "متن بازخورد را بنویسید." };
  if (message.length > 2000) return { ok: false, error: "متن بازخورد خیلی بلند است." };

  if (!FEEDBACK_CATEGORIES.includes(params.category)) {
    return { ok: false, error: "دستهٔ بازخورد معتبر نیست." };
  }

  /* بندهای ۲ و ۳ — کلاس مالِ این دبیر، و دانش‌آموز عضوِ فعالش.
     ⚠️ «عضو نیست» و «وجود ندارد» یک پیام می‌گیرند. */
  const student = await getStudentForTeacher(params.teacherId, params.studentId, params.classId);
  if (!student) return { ok: false, error: "این دانش‌آموز در کلاس شما نیست." };

  /* بندِ ۴ — ارجاع، اگر داده شده. */
  const relatedType = params.relatedType ?? null;
  const relatedId = params.relatedId ?? null;

  if ((relatedType === null) !== (relatedId === null)) {
    return { ok: false, error: "ارجاع ناقص است." };
  }

  if (relatedType !== null && relatedId !== null) {
    if (!RELATED_TYPES.includes(relatedType)) {
      return { ok: false, error: "نوع ارجاع معتبر نیست." };
    }
    if (!(await relatedBelongsToStudent(relatedType, relatedId, params.studentId))) {
      /* ⚠️ همان پیامِ «مالِ تو نیست» و نه «پیدا نشد»: تفکیکشان به دبیری
         که شناسه‌ها را امتحان می‌کند می‌گفت کدام‌ها واقعی‌اند. */
      return { ok: false, error: "این فعالیت به این دانش‌آموز مربوط نیست." };
    }
  }

  const id = randomUUID();
  const now = new Date();

  await execute(
    `insert into teacher_feedback
       (id, teacher_id, student_id, class_id, category,
        related_type, related_id, message, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    /* ⚠️ زمان از Node — همان قراردادِ بقیهٔ جدول‌های تازه. */
    [
      id,
      params.teacherId,
      params.studentId,
      params.classId,
      params.category,
      relatedType,
      relatedId,
      message,
      now,
      now,
    ],
  );

  const teacher = params.teacherName?.trim() || "دبیر شما";

  await notify({
    userId: params.studentId,
    kind: "teacher_feedback",
    title: `${teacher} برای شما بازخورد جدیدی نوشته است`,
    /* ⚠️ فقط پیش‌نمایشِ کوتاه و نه کلِ متن.

       متنِ کامل در `teacher_feedback.message` است و صفحهٔ بازخوردها از
       همان‌جا می‌خواند. تکرارِ دو هزار نویسه در ردیفِ اعلان یعنی دو نسخه
       که با ویرایشِ بازخورد از هم جدا می‌افتند — و آن‌وقت اعلان چیزی
       می‌گوید که دیگر نوشته نشده. */
    body: feedbackPreview(message),
    href: "/panel/classes#feedback",
    /* ⚠️ بدونِ `dedupeKey`: هر بازخورد یک رویدادِ واقعی و جداست، برخلافِ
       «دبیرت نگاه کرد» که با تازه‌سازی تکرار می‌شود. */
  });

  return { ok: true, id };
}

/* ═══════════════════════════ ویرایش ═══════════════════════════════════ */

/**
 * ⚠️ شرطِ `teacher_id` **داخلِ خودِ UPDATE** است و نه در یک `if` جدا.
 *
 * دبیر فقط بازخوردِ خودش را ویرایش می‌کند. یک `if` را می‌شود جا انداخت؛
 * یک `where` را نه — و مسابقه هم ندارد.
 */
export async function updateFeedback(
  teacherId: string,
  feedbackId: string,
  message: string,
): Promise<FeedbackResult> {
  const text = message.trim();
  if (!text) return { ok: false, error: "متن بازخورد را بنویسید." };
  if (text.length > 2000) return { ok: false, error: "متن بازخورد خیلی بلند است." };

  const affected = await execute(
    `update teacher_feedback
        set message = ?, updated_at = ?
      where id = ? and teacher_id = ? and status = 'active'`,
    [text, new Date(), feedbackId, teacherId],
  );

  if (affected === 0) return { ok: false, error: "این بازخورد پیدا نشد." };
  return { ok: true, id: feedbackId };
}

/**
 * بایگانی — جایگزینِ حذف.
 *
 * ⚠️ `delete` عمداً وجود ندارد. بازخوردی که یک نوجوان خوانده، نباید بتواند
 * ناپدید شود. ردیف می‌ماند و فقط از فهرست‌ها بیرون می‌رود.
 */
export async function archiveFeedback(
  teacherId: string,
  feedbackId: string,
): Promise<FeedbackResult> {
  const affected = await execute(
    `update teacher_feedback
        set status = 'archived', updated_at = ?
      where id = ? and teacher_id = ? and status = 'active'`,
    [new Date(), feedbackId, teacherId],
  );

  if (affected === 0) return { ok: false, error: "این بازخورد پیدا نشد." };
  return { ok: true, id: feedbackId };
}

/* ═══════════════════════════ خواندن ═══════════════════════════════════ */

const SELECT_FEEDBACK = `
  select f.id, f.category, f.message, f.related_type, f.related_id,
         f.created_at, f.updated_at,
         u.full_name as teacher_name, c.name as class_name
    from teacher_feedback f
    join users u on u.id = f.teacher_id
    join teacher_classes c on c.id = f.class_id`;

type FeedbackRow = {
  id: string;
  category: FeedbackCategory;
  message: string;
  related_type: RelatedType | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
  teacher_name: string | null;
  class_name: string;
};

function toEntry(r: FeedbackRow): FeedbackEntry {
  return {
    id: r.id,
    teacherName: r.teacher_name,
    className: r.class_name,
    category: r.category,
    message: r.message,
    relatedType: r.related_type,
    relatedId: r.related_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/**
 * بازخوردهای خودِ دانش‌آموز.
 *
 * ⚠️ شرطِ `student_id = ?` امنیتی است و نه فیلترِ راحتی: تنها چیزی است که
 * بینِ این کاربر و بازخوردهای بقیه ایستاده.
 */
export async function listStudentFeedback(
  studentId: string,
  limit = 30,
): Promise<FeedbackEntry[]> {
  const rows = await query<FeedbackRow>(
    `${SELECT_FEEDBACK}
      where f.student_id = ? and f.status = 'active'
      order by f.created_at desc, f.id
      limit ?`,
    [studentId, Math.min(Math.max(limit, 1), 100)],
  );
  return rows.map(toEntry);
}

/** بازخوردهایی که **این دبیر** به این دانش‌آموز داده. */
export async function listTeacherFeedbackFor(
  teacherId: string,
  studentId: string,
  limit = 30,
): Promise<FeedbackEntry[]> {
  const rows = await query<FeedbackRow>(
    `${SELECT_FEEDBACK}
      where f.teacher_id = ? and f.student_id = ? and f.status = 'active'
      order by f.created_at desc, f.id
      limit ?`,
    [teacherId, studentId, Math.min(Math.max(limit, 1), 100)],
  );
  return rows.map(toEntry);
}
