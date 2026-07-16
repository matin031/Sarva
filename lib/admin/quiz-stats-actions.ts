"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type QuizAttemptRow = {
  id: string;
  total: number;
  correct: number;
  createdAt: string;
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

  return (data ?? []).map((a) => ({ id: a.id, total: a.total, correct: a.correct, createdAt: a.created_at }));
}
