"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher, requireUser } from "@/lib/auth/current-user";
import { InvalidInputError, uuidArg } from "@/lib/api/action-input";
import { rateLimitDb } from "@/lib/api/rate-limit-db";
import {
  cancelAssignment,
  completeRapidAssignment,
  createGameAssignment,
  createQuizAssignment,
  markAssignmentStarted,
  type QuizRequest,
} from "./assignments";

/**
 * Server Actionهای تکلیف.
 *
 * ⚠️ Server Action یک endpointِ عمومی است: تایپ‌ها در زمانِ اجرا نیستند و هر
 * آرگومان اینجا واقعاً سنجیده می‌شود. نقشِ دبیر از سشن می‌آید
 * (`requireTeacher`) و شناسهٔ دانش‌آموز در سمتِ دانش‌آموز هم همین‌طور
 * (`requireUser`) — هیچ‌کدام از بدنهٔ درخواست خوانده نمی‌شوند.
 */

type Result<T = { id: string }> = { ok: true; data: T } | { ok: false; errors: string[] };

function invalid(err: unknown): Result<never> {
  if (err instanceof InvalidInputError) return { ok: false, errors: [err.message] };
  throw err;
}

/** همان سقفِ بازخورد: هر تکلیف برای دانش‌آموز اعلان می‌سازد. */
async function teacherLimit(teacherId: string): Promise<string | null> {
  const limit = await rateLimitDb(`assignment:${teacherId}`, 60, 60 * 60);
  return limit.allowed ? null : `تکلیف‌های زیاد. ${limit.retryAfterSeconds} ثانیه دیگر تلاش کنید.`;
}

function studentPage(classId: string, studentId: string): string {
  return `/panel/teacher/class/${classId}/student/${studentId}`;
}

const quizInput = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("weights"),
    weights: z.record(z.string().trim().min(1).max(160), z.number().int().min(0)).refine(
      (w) => Object.keys(w).length <= 64,
    ),
    excludeSeen: z.boolean(),
  }),
  z.object({ source: z.literal("mistakes"), count: z.number().int() }),
]);

export async function teacherCreateQuizAssignment(input: {
  studentId: string;
  classId: string;
  request: QuizRequest;
}): Promise<Result> {
  const teacher = await requireTeacher();
  try {
    const studentId = uuidArg(input?.studentId, "شناسهٔ دانش‌آموز نامعتبر است.");
    const classId = uuidArg(input?.classId, "شناسهٔ کلاس نامعتبر است.");
    const parsed = quizInput.safeParse(input?.request);
    if (!parsed.success) return { ok: false, errors: ["درخواست آزمون نامعتبر است."] };

    const limited = await teacherLimit(teacher.id);
    if (limited) return { ok: false, errors: [limited] };

    const result = await createQuizAssignment(
      { teacherId: teacher.id, teacherName: teacher.fullName ?? null, studentId, classId },
      parsed.data,
    );
    if (!result.ok) return result;
    revalidatePath(studentPage(classId, studentId));
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return invalid(err);
  }
}

export async function teacherCreateGameAssignment(input: {
  studentId: string;
  classId: string;
  kind: "aruz_rapid" | "aruz_bridge";
  count: number;
}): Promise<Result> {
  const teacher = await requireTeacher();
  try {
    const studentId = uuidArg(input?.studentId, "شناسهٔ دانش‌آموز نامعتبر است.");
    const classId = uuidArg(input?.classId, "شناسهٔ کلاس نامعتبر است.");
    const kind = input?.kind;
    if (kind !== "aruz_rapid" && kind !== "aruz_bridge") {
      return { ok: false, errors: ["نوع تکلیف نامعتبر است."] };
    }
    const count = Number(input?.count);

    const limited = await teacherLimit(teacher.id);
    if (limited) return { ok: false, errors: [limited] };

    const result = await createGameAssignment(
      { teacherId: teacher.id, teacherName: teacher.fullName ?? null, studentId, classId },
      kind,
      count,
    );
    if (!result.ok) return result;
    revalidatePath(studentPage(classId, studentId));
    return { ok: true, data: { id: result.id } };
  } catch (err) {
    return invalid(err);
  }
}

export async function teacherCancelAssignment(assignmentId: string): Promise<Result<null>> {
  const teacher = await requireTeacher();
  try {
    const id = uuidArg(assignmentId, "شناسهٔ تکلیف نامعتبر است.");
    const result = await cancelAssignment(teacher.id, id);
    if (!result.ok) return result;
    revalidatePath("/panel/teacher");
    return { ok: true, data: null };
  } catch (err) {
    return invalid(err);
  }
}

/**
 * «شروع کردم» — از مرورگر و نه از رندرِ سرور.
 *
 * ⚠️ همان درسِ `view-actions.ts`: اگر صفحهٔ بازی موقعِ رندر وضعیت را عوض
 * می‌کرد، هر prefetchِ یک لینک (مثلاً در فهرستِ اعلان‌ها) تکلیف را «در حال
 * انجام» می‌کرد بی‌آنکه دانش‌آموز بازش کرده باشد.
 */
export async function studentStartAssignment(assignmentId: string): Promise<void> {
  const user = await requireUser();
  if (typeof assignmentId !== "string") return;
  try {
    await markAssignmentStarted(user.id, uuidArg(assignmentId));
  } catch (err) {
    if (!(err instanceof InvalidInputError)) throw err;
  }
}

const rapidInput = z.object({
  assignmentId: z.uuid(),
  questionIds: z.array(z.string().min(1).max(80)).min(1).max(20),
  wrongChoices: z.number().int().min(0).max(10_000),
  timeouts: z.number().int().min(0).max(10_000),
  /** زمانِ فعالِ بازی؛ شش ساعت سقفِ تدافعی است، نه انتظار. */
  activeMs: z.number().int().min(0).max(6 * 60 * 60 * 1000),
});

export async function studentCompleteRapidAssignment(input: unknown): Promise<Result<null>> {
  const user = await requireUser();
  const parsed = rapidInput.safeParse(input);
  if (!parsed.success) return { ok: false, errors: ["نتیجهٔ ارسالی نامعتبر است."] };

  const { assignmentId, ...report } = parsed.data;
  const result = await completeRapidAssignment(user.id, assignmentId, report);
  if (!result.ok) return result;
  revalidatePath("/panel/classes");
  return { ok: true, data: null };
}
