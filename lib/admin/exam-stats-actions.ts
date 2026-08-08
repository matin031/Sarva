"use server";

import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";
import type { QuestionResult } from "@/app/exam/[examKey]/actions";

export type ExamAttemptRow = {
  id: string;
  examTitle: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  questionResults: Record<number, QuestionResult>;
};

/**
 * آمار کلی امتحانات، برای داشبورد.
 *
 * جمع‌بندی در خودِ دیتابیس انجام می‌شود. نسخهٔ قبلی *همهٔ* ردیف‌های
 * exam_attempts را می‌کشید و در جاوااسکریپت جمع می‌زد — با ده هزار تلاش، یعنی
 * ده هزار ردیف روی سیم برای رسیدن به دو عدد.
 */
export async function adminExamStatsOverview() {
  await requireAdmin();

  const row = await queryOne<{ attempt_count: number; total_score: number; max_score: number }>(
    `select count(*)                         as attempt_count,
            coalesce(sum(total_score), 0)    as total_score,
            coalesce(sum(max_score), 0)      as max_score
       from exam_attempts`,
  );

  const totalScore = row?.total_score ?? 0;
  const maxScore = row?.max_score ?? 0;

  return {
    attemptCount: row?.attempt_count ?? 0,
    avgPercent: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
  };
}

export async function adminExamAttemptsForUser(userId: string): Promise<ExamAttemptRow[]> {
  await requireAdmin();

  const rows = await query<{
    id: string;
    total_score: number;
    max_score: number;
    created_at: string;
    question_results: Record<number, QuestionResult> | null;
    exam_title: string | null;
  }>(
    `select a.id, a.total_score, a.max_score, a.created_at, a.question_results,
            e.title as exam_title
       from exam_attempts a
       left join exams e on e.id = a.exam_id
      where a.user_id = $1
      order by a.created_at desc`,
    [userId],
  );

  return rows.map((a) => ({
    id: a.id,
    examTitle: a.exam_title ?? "—",
    // Number() لازم نیست چون مبدل نوعِ lib/db مقادیر numeric را از قبل عدد
    // کرده؛ نسخهٔ قبلی مجبور بود چون PostgREST رشته می‌داد.
    totalScore: a.total_score,
    maxScore: a.max_score,
    createdAt: a.created_at,
    questionResults: a.question_results ?? {},
  }));
}
