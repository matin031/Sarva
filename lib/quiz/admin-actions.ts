"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

/** Scoped to the three types the admin panel authors today. The DB/UI
 *  (Quiz.tsx, QuestionCard.tsx, QuestionOption.tsx) also support
 *  pattern-to-audio/audio-to-pattern (syllabic ∪/— pattern matching) —
 *  intentionally left out of the panel for now, not removed from the app. */
export type QuizType = "poem-to-audio" | "audio-to-poem" | "weight-to-audio";

export type QuizOptionInput = {
  label?: string;
  poem?: string[];
  audioUrl?: string;
  isCorrect: boolean;
};

export type QuizQuestionInput = {
  /** Present = updating an existing question; absent = creating a new one. */
  id?: string;
  type: QuizType;
  poem?: string[];
  audioUrl?: string;
  difficulty?: "easy" | "medium" | "hard";
  options: QuizOptionInput[];
};

export type QuizOptionDetail = QuizOptionInput & { id: string };
export type QuizQuestionDetail = Omit<QuizQuestionInput, "id" | "options"> & {
  id: string;
  options: QuizOptionDetail[];
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// ---------------------------------------------------------------------------
// Validation — matches what components/UI/QuestionCard.tsx and
// QuestionOption.tsx actually read per type, so a question saved through
// the panel is guaranteed to render on the live quiz.
// ---------------------------------------------------------------------------

function validateQuizQuestion(input: QuizQuestionInput): string[] {
  const errors: string[] = [];

  if (input.type === "poem-to-audio") {
    if (!input.poem || input.poem.length < 2) errors.push("بیت سؤال (دو مصراع) را کامل وارد کنید.");
    if (input.options.some((o) => !o.audioUrl)) errors.push("همهٔ گزینه‌ها باید لینک فایل صوتی داشته باشند.");
  } else if (input.type === "weight-to-audio") {
    if (!input.poem || !input.poem[0]) errors.push("الگوی وزن (مثل «فاعلاتن فاعلاتن فاعلاتن فاعلن») را وارد کنید.");
    if (input.options.some((o) => !o.audioUrl)) errors.push("همهٔ گزینه‌ها باید لینک فایل صوتی داشته باشند.");
  } else if (input.type === "audio-to-poem") {
    if (!input.audioUrl) errors.push("لینک فایل صوتی سؤال را وارد کنید.");
    if (input.options.some((o) => !o.poem || o.poem.length < 2)) {
      errors.push("همهٔ گزینه‌ها باید یک بیت (دو مصراع) داشته باشند.");
    }
  }

  if (input.options.length < 2) errors.push("حداقل ۲ گزینه لازم است.");
  if (input.options.filter((o) => o.isCorrect).length !== 1) {
    errors.push("دقیقاً یک گزینه باید به‌عنوان پاسخ صحیح مشخص شود.");
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export type QuizListItem = {
  id: string;
  type: QuizType;
  poem?: string[];
  audioUrl?: string;
  difficulty: "easy" | "medium" | "hard";
  optionCount: number;
};

export type QuizListParams = {
  type?: QuizType;
  difficulty?: "easy" | "medium" | "hard";
  /** Omit to fetch every matching row (used by the dashboard count and by
   *  search mode, which needs the full filtered set to search text across). */
  limit?: number;
  offset?: number;
};

/** Paginated + filterable by category (type/difficulty) so the admin panel
 *  never has to render every question at once — pass `limit` to fetch one
 *  page; `total` (from Postgrest's exact count) reflects the whole filtered
 *  set regardless of the page size, so callers can drive a "load more". */
export async function quizAdminList(params: QuizListParams = {}): Promise<{ items: QuizListItem[]; total: number }> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  let query = supabase
    .from("questions")
    .select("id, type, poem, audio_url, difficulty, question_options(id)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.type) query = query.eq("type", params.type);
  if (params.difficulty) query = query.eq("difficulty", params.difficulty);
  if (params.limit !== undefined) {
    const offset = params.offset ?? 0;
    query = query.range(offset, offset + params.limit - 1);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`quizAdminList: ${error.message}`);

  return {
    items: (data ?? []).map((q) => ({
      id: q.id,
      type: q.type as QuizType,
      poem: q.poem ?? undefined,
      audioUrl: q.audio_url ?? undefined,
      difficulty: (q.difficulty ?? "medium") as "easy" | "medium" | "hard",
      optionCount: q.question_options?.length ?? 0,
    })),
    total: count ?? 0,
  };
}

export async function quizAdminGet(questionId: string): Promise<QuizQuestionDetail | null> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data: question, error } = await supabase
    .from("questions")
    .select("id, type, poem, audio_url, difficulty")
    .eq("id", questionId)
    .maybeSingle();
  if (error) throw new Error(`quizAdminGet: ${error.message}`);
  if (!question) return null;

  const { data: options, error: optionsError } = await supabase
    .from("question_options")
    .select("id, label, poem, audio_url, is_correct")
    .eq("question_id", questionId);
  if (optionsError) throw new Error(`quizAdminGet options: ${optionsError.message}`);

  return {
    id: question.id,
    type: question.type as QuizType,
    poem: question.poem ?? undefined,
    audioUrl: question.audio_url ?? undefined,
    difficulty: (question.difficulty ?? "medium") as "easy" | "medium" | "hard",
    options: (options ?? []).map((o) => ({
      id: o.id,
      label: o.label ?? undefined,
      poem: o.poem ?? undefined,
      audioUrl: o.audio_url ?? undefined,
      isCorrect: o.is_correct,
    })),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

/** Creates a new question or fully replaces an existing one's options
 *  (delete-then-reinsert), same reasoning as the exam bank's
 *  adminUpsertQuestion: options are authored as one unit with the question,
 *  not edited individually. */
export async function quizAdminUpsertQuestion(input: QuizQuestionInput): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const errors = validateQuizQuestion(input);
  if (errors.length > 0) return { ok: false, errors };

  const supabase = createSupabaseAdmin();

  let questionId: string;
  if (input.id) {
    questionId = input.id;
    const { error: updateError } = await supabase
      .from("questions")
      .update({
        type: input.type,
        poem: input.poem ?? null,
        audio_url: input.audioUrl ?? null,
        difficulty: input.difficulty ?? "medium",
      })
      .eq("id", questionId);
    if (updateError) return { ok: false, errors: [updateError.message] };

    const { error: deleteError } = await supabase.from("question_options").delete().eq("question_id", questionId);
    if (deleteError) return { ok: false, errors: [deleteError.message] };
  } else {
    const { data: created, error: createError } = await supabase
      .from("questions")
      .insert({
        type: input.type,
        poem: input.poem ?? null,
        audio_url: input.audioUrl ?? null,
        difficulty: input.difficulty ?? "medium",
      })
      .select("id")
      .single();
    if (createError) return { ok: false, errors: [createError.message] };
    questionId = created.id;
  }

  const { error: optionsError } = await supabase.from("question_options").insert(
    input.options.map((o, i) => ({
      question_id: questionId,
      label: o.label ?? null,
      poem: o.poem ?? null,
      audio_url: o.audioUrl ?? null,
      is_correct: o.isCorrect,
      // alternating slide-in offset for the entrance animation
      // (QuestionOption's whileInView) — purely cosmetic, not authored content.
      x: i % 2 === 0 ? -40 : 40,
    })),
  );
  if (optionsError) return { ok: false, errors: [optionsError.message] };

  return { ok: true, data: { id: questionId } };
}

export async function quizAdminDeleteQuestion(questionId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}
