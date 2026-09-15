"use server";

import { revalidatePath } from "next/cache";
import { requireTeacher } from "@/lib/auth/current-user";
import { enumArg, uuidArg } from "@/lib/api/action-input";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import {
  archiveFeedback,
  createFeedback,
  updateFeedback,
  type FeedbackResult,
} from "./feedback";
import { FEEDBACK_CATEGORIES, MAX_FEEDBACK_LENGTH } from "./feedback-rules";

/**
 * Server Actionهای بازخورد.
 *
 * ⚠️ هر تابع با `requireTeacher()` شروع می‌شود. آن تابع نقش را از سشن
 * می‌خواند و `users.role` فقط از مسیرِ تأییدِ درخواستِ دبیری نوشته می‌شود —
 * یعنی «دبیرِ واقعی و تأییدشده» همین‌جا اثبات می‌شود و نه با یک پرچمِ
 * ارسالی.
 *
 * ⚠️ و تایپ‌های TypeScript در زمانِ اجرا وجود ندارند: Server Action یک
 * endpointِ عمومی است و هر کسی می‌تواند هر چیزی به آن بفرستد. پس هر
 * آرگومان با `uuidArg` / `enumArg` واقعاً بررسی می‌شود.
 */

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

function fromResult(result: FeedbackResult): ActionResult<{ id: string }> {
  return result.ok ? { ok: true, data: { id: result.id } } : { ok: false, errors: [result.error] };
}

export async function teacherCreateFeedback(input: {
  studentId: string;
  classId: string;
  category: string;
  message: string;
  relatedType?: string | null;
  relatedId?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const teacher = await requireTeacher();

  const studentId = uuidArg(input.studentId, "شناسهٔ دانش‌آموز نامعتبر است.");
  const classId = uuidArg(input.classId, "شناسهٔ کلاس نامعتبر است.");
  const category = enumArg(input.category, [...FEEDBACK_CATEGORIES], "دستهٔ بازخورد نامعتبر است.");

  const message = typeof input.message === "string" ? input.message : "";
  if (message.length > MAX_FEEDBACK_LENGTH) {
    return { ok: false, errors: ["متن بازخورد خیلی بلند است."] };
  }

  /* ⚠️ سقفِ نرخ، و دیتابیسی و نه در-حافظه.

     این مسیر برای *دانش‌آموز* اعلان می‌سازد. بدونِ سقف، یک حسابِ دبیرِ
     دزدیده‌شده می‌توانست صدها اعلان برای یک نوجوان بفرستد — و ری‌استارتِ
     سرور نباید سهمیه را برگرداند. (همان استدلالی که ورود و OTP دارند.) */
  const limit = await rateLimitDb(`feedback:${teacher.id}`, 60, 60 * 60);
  if (!limit.allowed) {
    return { ok: false, errors: [`بازخوردهای زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`] };
  }

  const relatedType = input.relatedType
    ? enumArg(
        input.relatedType,
        ["exam_attempt", "quiz_attempt", "activity"],
        "نوع ارجاع نامعتبر است.",
      )
    : null;
  const relatedId = input.relatedId ? uuidArg(input.relatedId, "شناسهٔ ارجاع نامعتبر است.") : null;

  const result = await createFeedback({
    teacherId: teacher.id,
    teacherName: teacher.fullName ?? null,
    studentId,
    classId,
    category,
    message,
    relatedType,
    relatedId,
  });

  if (result.ok) {
    revalidatePath(`/panel/teacher/class/${classId}/student/${studentId}`);
  }
  return fromResult(result);
}

export async function teacherUpdateFeedback(
  feedbackId: string,
  message: string,
): Promise<ActionResult<{ id: string }>> {
  const teacher = await requireTeacher();
  const id = uuidArg(feedbackId, "شناسهٔ بازخورد نامعتبر است.");

  const text = typeof message === "string" ? message : "";
  if (text.length > MAX_FEEDBACK_LENGTH) {
    return { ok: false, errors: ["متن بازخورد خیلی بلند است."] };
  }

  /* ⚠️ شرطِ مالکیت در خودِ `UPDATE` است و نه اینجا — دبیر فقط بازخوردِ
     خودش را ویرایش می‌کند. */
  const result = await updateFeedback(teacher.id, id, text);
  if (result.ok) revalidatePath("/panel/teacher");
  return fromResult(result);
}

/**
 * ⚠️ «بایگانی» و نه «حذف».
 *
 * بازخوردی که یک نوجوان خوانده، نباید بتواند ناپدید شود. ردیف می‌ماند و
 * فقط از فهرست‌ها بیرون می‌رود. (چرایی کاملش بالای مهاجرت ۰۱۳.)
 */
export async function teacherArchiveFeedback(
  feedbackId: string,
): Promise<ActionResult<{ id: string }>> {
  const teacher = await requireTeacher();
  const id = uuidArg(feedbackId, "شناسهٔ بازخورد نامعتبر است.");

  const result = await archiveFeedback(teacher.id, id);
  if (result.ok) revalidatePath("/panel/teacher");
  return fromResult(result);
}
