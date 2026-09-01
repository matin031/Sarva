"use server";

import { requireAdmin } from "@/lib/require-admin";
import { uuidArg } from "@/lib/api/action-input";
import { recordAudit } from "@/lib/admin/audit";
import { query, queryOne, execute, transaction } from "@/lib/db";
import { logger } from "@/lib/observability";

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
 *  page; `total` (from a window count over the filtered set) reflects the whole
 *  filtered set regardless of the page size, so callers can drive a "load more". */
export async function quizAdminList(params: QuizListParams = {}): Promise<{ items: QuizListItem[]; total: number }> {
  await requireAdmin();

  // فیلترها به‌صورت شرط‌های اختیاری ساخته می‌شوند تا یک کوئری هم صفحه را
  // بدهد و هم تعداد کل را. count(*) over () تعداد کلِ *فیلترشده* را در هر
  // ردیف برمی‌گرداند — همان چیزی که PostgREST با count: "exact" می‌داد.
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.type) {
    values.push(params.type);
    conditions.push(`q.type = $${values.length}`);
  }
  if (params.difficulty) {
    values.push(params.difficulty);
    conditions.push(`q.difficulty = $${values.length}`);
  }

  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  let limitClause = "";
  if (params.limit !== undefined) {
    values.push(params.limit);
    limitClause += ` limit $${values.length}`;
    values.push(params.offset ?? 0);
    limitClause += ` offset $${values.length}`;
  }

  const rows = await query<{
    id: string;
    type: string;
    poem: string[] | null;
    audio_url: string | null;
    difficulty: string | null;
    option_count: number;
    total_count: number;
  }>(
    `select q.id, q.type, q.poem, q.audio_url, q.difficulty,
            (select count(*) from question_options o where o.question_id = q.id) as option_count,
            count(*) over () as total_count
       from questions q
       ${where}
      -- id به‌عنوان شکنندهٔ تساوی: ردیف‌های زیادی created_at یکسان دارند
      -- (درج انبوه)، و صفحه‌بندی روی مرتب‌سازیِ غیریکتا می‌تواند یک ردیف را
      -- در دو صفحه بیاورد یا یکی را جا بیندازد.
      order by q.created_at desc, q.id
      ${limitClause}`,
    values,
  );

  return {
    items: rows.map((q) => ({
      id: q.id,
      type: q.type as QuizType,
      poem: q.poem ?? undefined,
      audioUrl: q.audio_url ?? undefined,
      difficulty: (q.difficulty ?? "medium") as "easy" | "medium" | "hard",
      optionCount: q.option_count,
    })),
    // وقتی هیچ ردیفی برنگردد، count(*) over () هم ردیفی ندارد که در آن بیاید
    total: rows[0]?.total_count ?? 0,
  };
}

export async function quizAdminGet(questionId: string): Promise<QuizQuestionDetail | null> {
  await requireAdmin();

  const [question, options] = await Promise.all([
    queryOne<{
      id: string;
      type: string;
      poem: string[] | null;
      audio_url: string | null;
      difficulty: string | null;
    }>(`select id, type, poem, audio_url, difficulty from questions where id = $1`, [questionId]),
    query<{
      id: string;
      label: string | null;
      poem: string[] | null;
      audio_url: string | null;
      is_correct: boolean;
    }>(
      `select id, label, poem, audio_url, is_correct
         from question_options where question_id = $1 order by x, id`,
      [questionId],
    ),
  ]);

  if (!question) return null;

  return {
    id: question.id,
    type: question.type as QuizType,
    poem: question.poem ?? undefined,
    audioUrl: question.audio_url ?? undefined,
    difficulty: (question.difficulty ?? "medium") as "easy" | "medium" | "hard",
    options: options.map((o) => ({
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

/** ساخت سؤال تازه یا جایگزینی کاملِ گزینه‌های سؤال موجود — همان استدلال
 *  adminUpsertQuestion بانک آزمون: گزینه‌ها همراه خودِ سؤال تألیف می‌شوند، نه
 *  جداگانه. مثل آنجا، حالا در یک تراکنش است تا حذفِ گزینه‌ها بدون درجِ دوباره
 *  ممکن نباشد. */
export async function quizAdminUpsertQuestion(input: QuizQuestionInput): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();

  const errors = validateQuizQuestion(input);
  if (errors.length > 0) return { ok: false, errors };

  try {
    const questionId = await transaction(async (tx) => {
      let id: string;

      if (input.id) {
        id = input.id;
        await tx.execute(
          `update questions set type = $1, poem = $2, audio_url = $3, difficulty = $4 where id = $5`,
          [input.type, input.poem ?? null, input.audioUrl ?? null, input.difficulty ?? "medium", id],
        );
        await tx.execute(`delete from question_options where question_id = $1`, [id]);
      } else {
        const created = await tx.queryOne<{ id: string }>(
          `insert into questions (type, poem, audio_url, difficulty)
           values ($1, $2, $3, $4) returning id`,
          [input.type, input.poem ?? null, input.audioUrl ?? null, input.difficulty ?? "medium"],
        );
        id = created!.id;
      }

      for (const [i, o] of input.options.entries()) {
        await tx.execute(
          `insert into question_options (question_id, label, poem, audio_url, is_correct, x)
           values ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            o.label ?? null,
            o.poem ?? null,
            o.audioUrl ?? null,
            o.isCorrect,
            // جابه‌جاییِ یک‌درمیان برای انیمیشن ورود (whileInView در
            // QuestionOption) — کاملاً ظاهری، نه محتوای تألیف‌شده.
            i % 2 === 0 ? -40 : 40,
          ],
        );
      }

      return id;
    });

    await recordAudit({
      actor: admin,
      action: "quiz.question_save",
      targetType: "quiz_question",
      targetId: questionId,
      summary: input.poem?.[0]
        ? `سؤال عروض سماعی «${input.poem[0]}» ${input.id ? "ویرایش" : "اضافه"} شد`
        : `یک سؤال عروض سماعی ${input.id ? "ویرایش" : "اضافه"} شد`,
      metadata: { type: input.type, difficulty: input.difficulty },
    });

    return { ok: true, data: { id: questionId } };
  } catch (err) {
    logger.error("ذخیرهٔ سؤال عروض سماعی ناموفق بود", { event: "quiz.question_save_failed", err });
    return { ok: false, errors: ["ذخیرهٔ سؤال ناموفق بود. هیچ تغییری اعمال نشد."] };
  }
}

export async function quizAdminDeleteQuestion(questionId: string): Promise<ActionResult<null>> {
  const admin = await requireAdmin();
  questionId = uuidArg(questionId, "شناسهٔ سؤال نامعتبر است.");

  const target = await queryOne<{ type: string; poem: string[] | null }>(
    "select type, poem from questions where id = $1",
    [questionId],
  );

  const deleted = await execute("delete from questions where id = $1", [questionId]);
  if (!deleted) return { ok: false, errors: ["سؤال پیدا نشد."] };

  await recordAudit({
    actor: admin,
    action: "quiz.question_delete",
    targetType: "quiz_question",
    targetId: questionId,
    summary: target?.poem?.[0]
      ? `سؤال عروض سماعی «${target.poem[0]}» حذف شد`
      : "یک سؤال عروض سماعی حذف شد",
    metadata: { type: target?.type },
  });

  return { ok: true, data: null };
}
