"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { QuestionResult } from "@/app/exam/[examKey]/actions";

export type ExamAttemptRow = {
  id: string;
  examTitle: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  questionResults: Record<number, QuestionResult>;
};

export async function adminExamStatsOverview() {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.from("exam_attempts").select("total_score, max_score");
  if (error) throw new Error(`adminExamStatsOverview: ${error.message}`);

  const attemptCount = data?.length ?? 0;
  const totalScore = (data ?? []).reduce((s, a) => s + Number(a.total_score), 0);
  const maxScore = (data ?? []).reduce((s, a) => s + Number(a.max_score), 0);

  return {
    attemptCount,
    avgPercent: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
  };
}

export async function adminExamAttemptsForUser(userId: string): Promise<ExamAttemptRow[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("exam_attempts")
    .select("id, total_score, max_score, created_at, question_results, exams(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`adminExamAttemptsForUser: ${error.message}`);

  return (data ?? []).map((a) => ({
    id: a.id,
    examTitle: (a.exams as unknown as { title: string } | null)?.title ?? "—",
    totalScore: Number(a.total_score),
    maxScore: Number(a.max_score),
    createdAt: a.created_at,
    questionResults: (a.question_results as unknown as Record<number, QuestionResult>) ?? {},
  }));
}
