import "server-only";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
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

type RawOption = {
  id: string;
  label: string | null;
  poem: string[] | null;
  audio_url: string | null;
  is_correct: boolean;
};

type RawAruzAnswer = {
  id: string;
  is_correct: boolean;
  selected_option_id: string | null;
  questions: {
    id: string;
    type: string;
    poem: string[] | null;
    audio_url: string | null;
    question_options: RawOption[] | null;
  } | null;
};

/** Past عروض attempts, with everything the review needs: the prompt (a بیت or
 *  an audio clip), every option, which one the student chose and which one was
 *  right. Without the options there is nothing to listen back to — the whole
 *  point of reviewing an ear-training test. */
export async function getAruzAttempts(
  userId: string,
  offset = 0,
  limit = 5,
): Promise<{ attempts: AruzAttempt[]; hasMore: boolean }> {
  const supabase = await createSupabaseServer();
  // one row past the page, purely to learn whether a "بارگیری بیشتر" button is
  // needed — cheaper and more reliable than a second count query
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select(
      `id, total, correct, created_at,
       quiz_attempt_answers (
         id, is_correct, selected_option_id,
         questions (
           id, type, poem, audio_url,
           question_options ( id, label, poem, audio_url, is_correct )
         )
       )`,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    console.error("getAruzAttempts:", error.message);
    return { attempts: [], hasMore: false };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const attempts = rows.slice(0, limit).map((a) => ({
    id: a.id as string,
    total: Number(a.total ?? 0),
    correct: Number(a.correct ?? 0),
    createdAt: a.created_at as string,
    answers: ((a.quiz_attempt_answers ?? []) as unknown as RawAruzAnswer[]).map(
      (ans) => {
        const q = ans.questions;
        const options = (q?.question_options ?? []).map((o) => ({
          id: o.id,
          label: o.label,
          poem: o.poem,
          audioUrl: o.audio_url,
          isCorrect: o.is_correct,
        }));
        return {
          id: ans.id,
          isCorrect: ans.is_correct,
          selectedOptionId: ans.selected_option_id,
          questionId: q?.id ?? null,
          type: (q?.type ?? null) as AruzQuestionType | null,
          poem: q?.poem ?? null,
          audioUrl: q?.audio_url ?? null,
          options,
        };
      },
    ),
  }));

  return { attempts, hasMore };
}

/** Every attempt's score, without the answers.
 *
 *  The list is paginated, but «بهترین عملکرد» and the totals describe the whole
 *  history — so they get their own query, three columns wide instead of a join
 *  down to every option of every question. */
export async function getAruzSummary(userId: string): Promise<{
  attempts: number;
  best: number;
  questions: number;
  correct: number;
}> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("total, correct")
    .eq("user_id", userId);
  if (error) {
    console.error("getAruzSummary:", error.message);
    return { attempts: 0, best: 0, questions: 0, correct: 0 };
  }
  const rows = data ?? [];
  return {
    attempts: rows.length,
    best: rows.reduce((m, r) => {
      const total = Number(r.total ?? 0);
      const p = total ? Math.round((Number(r.correct ?? 0) / total) * 100) : 0;
      return Math.max(m, p);
    }, 0),
    questions: rows.reduce((s, r) => s + Number(r.total ?? 0), 0),
    correct: rows.reduce((s, r) => s + Number(r.correct ?? 0), 0),
  };
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

/** `exam_attempts` (and the whole exam bank) deliberately carries no
 *  authenticated RLS policy — every student-facing write goes through a server
 *  action on the service-role client. Reading it with the anon client therefore
 *  fails with "permission denied", so the panel reads it the same way the rest
 *  of that bank is read: server-side, with the user id taken from the verified
 *  session rather than from anything a caller could supply. */
export async function getExamAttempts(userId: string): Promise<ExamAttempt[]> {
  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    // service-role key not configured in this environment
    return [];
  }
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

export async function getBookmarks(
  userId: string,
  area?: BookmarkArea,
): Promise<Bookmark[]> {
  const supabase = await createSupabaseServer();
  let query = supabase
    .from("user_bookmarks")
    .select("id, area, ref_id, title, subtitle, payload, note, created_at")
    .eq("user_id", userId);
  if (area) query = query.eq("area", area);
  const { data, error } = await query.order("created_at", {
    ascending: false,
  });
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
