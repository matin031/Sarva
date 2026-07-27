import "server-only";
import { createSupabaseServer } from "@/lib/supabase-server";
import type {
  AruzAttempt,
  AruzQuestionType,
  Bookmark,
  BookmarkArea,
  ExamAttempt,
  JasoosAnswer,
  PanelUser,
  VocabAnswer,
} from "@/lib/panel/types";

// re-exported so server pages can keep importing everything from one place
export * from "@/lib/panel/types";

/** Server-side reads for the user panel.
 *
 *  Every function here is scoped to the signed-in user by RLS *and* by an
 *  explicit `user_id` filter — the filter is not redundant, it keeps the query
 *  cheap and makes the intent obvious at the call site. */

export async function getPanelUser(): Promise<PanelUser | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName:
      profile?.full_name || user.user_metadata?.full_name || "دانش‌آموز",
    createdAt: user.created_at ?? null,
  };
}

// ---------------------------------------------------------------- عروض ----

type RawAruzAnswer = {
  id: string;
  is_correct: boolean;
  questions: { id: string; type: string; poem: string[] | null } | null;
};

export async function getAruzAttempts(userId: string): Promise<AruzAttempt[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `id, total, correct, created_at,
       quiz_attempt_answers ( id, is_correct, questions ( id, type, poem ) )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAruzAttempts:", error.message);
    return [];
  }

  return (data ?? []).map((a) => ({
    id: a.id as string,
    total: Number(a.total ?? 0),
    correct: Number(a.correct ?? 0),
    createdAt: a.created_at as string,
    answers: ((a.quiz_attempt_answers ?? []) as unknown as RawAruzAnswer[]).map(
      (ans) => ({
        id: ans.id,
        isCorrect: ans.is_correct,
        questionId: ans.questions?.id ?? null,
        type: (ans.questions?.type ?? null) as AruzQuestionType | null,
        poem: ans.questions?.poem ?? null,
      }),
    ),
  }));
}

/** Raw per-answer history, used for the activity chart and the streak. */
export async function getAruzActivity(
  userId: string,
): Promise<{ at: string; ok: boolean }[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("user_answers")
    .select("is_correct, answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("getAruzActivity:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    at: r.answered_at as string,
    ok: Boolean(r.is_correct),
  }));
}

// ------------------------------------------------------------ واژه‌یاب ----

export async function getVocabAnswers(userId: string): Promise<VocabAnswer[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("vocab_answers")
    .select("id, grade, lesson, word, meaning, image, is_correct, answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(3000);
  if (error) {
    console.error("getVocabAnswers:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    grade: (r.grade as string) ?? "",
    lesson: (r.lesson as number | null) ?? null,
    word: (r.word as string) ?? "",
    meaning: (r.meaning as string) ?? "",
    image: (r.image as string) ?? "",
    isCorrect: Boolean(r.is_correct),
    answeredAt: r.answered_at as string,
  }));
}

// -------------------------------------------------------------- جاسوس ----

export async function getJasoosAnswers(
  userId: string,
): Promise<JasoosAnswer[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("jasoos_answers")
    .select(
      "id, level_id, category, chosen_role, correct_role, is_correct, answered_at",
    )
    .eq("user_id", userId)
    .order("answered_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.error("getJasoosAnswers:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    levelId: Number(r.level_id ?? 0),
    category: (r.category as string) ?? "",
    chosenRole: (r.chosen_role as string) ?? "",
    correctRole: (r.correct_role as string) ?? "",
    isCorrect: Boolean(r.is_correct),
    answeredAt: r.answered_at as string,
  }));
}

// ------------------------------------------------------- امتحان نهایی ----

export async function getExamAttempts(userId: string): Promise<ExamAttempt[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("exam_attempts")
    .select("id, total_score, max_score, created_at, question_results, exams(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getExamAttempts:", error.message);
    return [];
  }
  return (data ?? []).map((r) => {
    const exam = r.exams as unknown as { title?: string } | null;
    return {
      id: r.id as string,
      examTitle: exam?.title ?? "آزمون",
      totalScore: Number(r.total_score ?? 0),
      maxScore: Number(r.max_score ?? 0),
      createdAt: r.created_at as string,
      results:
        (r.question_results as Record<
          string,
          { score?: number; max?: number }
        >) ?? {},
    };
  });
}

// --------------------------------------------------------- نشان‌شده‌ها ----

export async function getBookmarks(userId: string): Promise<Bookmark[]> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("user_bookmarks")
    .select("id, area, ref_id, title, subtitle, payload, note, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    // the table may not exist yet if the migration has not been run — the panel
    // should still render, just with an empty bookmarks section
    console.error("getBookmarks:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id as string,
    area: r.area as BookmarkArea,
    refId: r.ref_id as string,
    title: (r.title as string) ?? "",
    subtitle: (r.subtitle as string) ?? null,
    payload: (r.payload as Record<string, unknown>) ?? {},
    note: (r.note as string) ?? null,
    createdAt: r.created_at as string,
  }));
}
