"use server";

import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import {
  getTeacherSupportView,
  listTeacherDirectory,
  TEACHER_DIRECTORY_PAGE_SIZE,
  type TeacherDirectoryRow,
  type TeacherSupportClassRow,
  type TeacherSupportView,
} from "@/lib/teacher/directory";

/**
 * نمای عملیاتیِ دبیران — لایهٔ گارد.
 *
 * ⚠️ این فایل عمداً هیچ SQL ای ندارد. کوئری‌ها در `lib/teacher/directory.ts`
 * هستند تا `db:check-teacher` بتواند *همان* توابع را روی دیتابیسِ واقعی
 * بسنجد؛ `requireAdmin()` اینجا `cookies()` می‌خواند و بیرونِ یک درخواستِ
 * Next اجرا نمی‌شود. همان جدایی‌ای که `lib/teacher/review.ts` دارد — گارد
 * در اکشن، کوئری در lib، و آزمون روی خودِ کوئری و نه رونوشتی از آن.
 *
 * ⚠️ و این گارد با وجودِ گاردِ layout در `app/admin/layout.tsx` باز هم لازم
 * است: یک Server Action از مسیرِ رندرِ layout رد نمی‌شود و هرکسی می‌تواند
 * مستقیم صدایش بزند.
 */

export type AdminTeacherRow = TeacherDirectoryRow;
export type AdminTeacherClassRow = TeacherSupportClassRow;

export async function adminListTeachers(
  params: { search?: string; limit?: number; offset?: number } = {},
): Promise<{ teachers: AdminTeacherRow[]; total: number }> {
  await requireAdmin();
  return listTeacherDirectory({
    search: params.search,
    limit: params.limit ?? TEACHER_DIRECTORY_PAGE_SIZE,
    offset: params.offset,
  });
}

export async function adminGetTeacherClasses(
  teacherId: string,
): Promise<TeacherSupportView | null> {
  await requireAdmin();
  return getTeacherSupportView(uuidArg(teacherId, "شناسهٔ دبیر نامعتبر است."));
}
