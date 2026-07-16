"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type QuizAnswerDetail = {
  questionId: string;
  type: string;
  poem?: string[];
  difficulty?: string;
  isCorrect: boolean;
};

export type QuizAttemptRow = {
  id: string;
  total: number;
  correct: number;
  createdAt: string;
  answers: QuizAnswerDetail[];
};

export async function adminQuizStatsOverview() {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase.from("quiz_attempts").select("total, correct");
  if (error) throw new Error(`adminQuizStatsOverview: ${error.message}`);

  const attemptCount = data?.length ?? 0;
  const totalQuestions = (data ?? []).reduce((s, a) => s + a.total, 0);
  const totalCorrect = (data ?? []).reduce((s, a) => s + a.correct, 0);

  return {
    attemptCount,
    avgAccuracy: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
  };
}

export async function adminQuizAttemptsForUser(userId: string): Promise<QuizAttemptRow[]> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("id, total, correct, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`adminQuizAttemptsForUser: ${error.message}`);

  const attempts = data ?? [];
  if (attempts.length === 0) return [];

  const { data: answers, error: answersError } = await supabase
    .from("quiz_attempt_answers")
    .select("attempt_id, question_id, is_correct, questions(type, poem, difficulty)")
    .in(
      "attempt_id",
      attempts.map((a) => a.id),
    );
  if (answersError) throw new Error(`adminQuizAttemptsForUser answers: ${answersError.message}`);

  const byAttempt = new Map<string, QuizAnswerDetail[]>();
  for (const row of answers ?? []) {
    const question = row.questions as unknown as {
      type: string;
      poem: string[] | null;
      difficulty: string | null;
    } | null;
    const list = byAttempt.get(row.attempt_id) ?? [];
    list.push({
      questionId: row.question_id,
      type: question?.type ?? "—",
      poem: question?.poem ?? undefined,
      difficulty: question?.difficulty ?? undefined,
      isCorrect: row.is_correct,
    });
    byAttempt.set(row.attempt_id, list);
  }

  return attempts.map((a) => ({
    id: a.id,
    total: a.total,
    correct: a.correct,
    createdAt: a.created_at,
    answers: byAttempt.get(a.id) ?? [],
  }));
}
