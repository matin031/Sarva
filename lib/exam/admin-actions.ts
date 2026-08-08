"use server";

import { requireAdmin } from "@/lib/require-admin";
import { query, queryOne, execute, transaction } from "@/lib/db";
import {
  correctAnswerSchemaByType,
  questionPartContentSchema,
  type LayoutPattern,
  type QuestionPartContent,
  type QuestionPartType,
} from "@/lib/exam/content-schemas";
import type { SeedOption } from "./seed-data/seed-types";

// ---------------------------------------------------------------------------
// Input/detail shapes
// ---------------------------------------------------------------------------

export type AdminPartInput = {
  label?: string;
  pageRef?: number;
  type: QuestionPartType;
  score: number;
  content: QuestionPartContent;
  correctAnswer: unknown;
  /* jsonb, not a string list. Real rows hold shapes keyed by what the part
     needs — {"accepted":[…]} for free text, {"optionKeys":[…]} for MCQ,
     {"i1":[…],"i5":[…]} for find-the-errors — so this stays `unknown` and the
     admin form edits it as JSON. Typing it `string[]` is what made the editor
     call .join() on an object and crash the page. */
  acceptedAnswers?: unknown;
  gradingMode: "exact_match" | "ai_semantic" | "ai_partial_credit" | "manual";
  aiGradingHint?: string;
  options?: SeedOption[];
};

export type AdminQuestionInput = {
  /** Present = updating an existing question; absent = creating a new one. */
  id?: string;
  number: number;
  pageRef?: number;
  layoutPattern?: LayoutPattern;
  instruction?: string;
  parts: AdminPartInput[];
};

export type AdminPartDetail = AdminPartInput & { id: string };
export type AdminQuestionDetail = Omit<AdminQuestionInput, "id" | "parts"> & { id: string; parts: AdminPartDetail[] };
export type AdminSectionDetail = {
  id: string;
  title: string;
  orderIndex: number;
  sectionScore: number;
  questions: AdminQuestionDetail[];
};
export type AdminExamDetail = {
  id: string;
  subject: string;
  grade: number;
  title: string;
  examKey: string;
  totalScore: number;
  sections: AdminSectionDetail[];
};

export type ActionResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// ---------------------------------------------------------------------------
// Validation — same rules as lib/exam/seed-data/seed-types.ts's
// validateSeedExam, applied to one question at a time so the panel can
// show errors before the exam-wide score totals are even relevant.
// ---------------------------------------------------------------------------

const NEEDS_OPTIONS: QuestionPartType[] = ["mcq-inline", "mcq-multi-select", "mcq-plus-correction"];

function validateQuestionInput(input: AdminQuestionInput): string[] {
  const errors: string[] = [];
  if (input.parts.length === 0) errors.push("سؤال باید حداقل یک بخش داشته باشد.");

  for (const part of input.parts) {
    const label = `${input.number}${part.label ? `(${part.label})` : ""}`;

    const contentResult = questionPartContentSchema.safeParse(part.content);
    if (!contentResult.success) {
      errors.push(`${label}: محتوای نامعتبر — ${contentResult.error.issues.map((i) => i.message).join("; ")}`);
    } else if (contentResult.data.type !== part.type) {
      errors.push(`${label}: نوع محتوا "${contentResult.data.type}" با نوع بخش "${part.type}" یکی نیست.`);
    }

    const answerSchema = correctAnswerSchemaByType[part.type];
    const answerResult = answerSchema.safeParse(part.correctAnswer);
    if (!answerResult.success) {
      errors.push(`${label}: پاسخ صحیح نامعتبر — ${answerResult.error.issues.map((i) => i.message).join("; ")}`);
    }

    if (NEEDS_OPTIONS.includes(part.type)) {
      if (!part.options || part.options.length < 2) {
        errors.push(`${label}: این نوع سؤال حداقل ۲ گزینه لازم دارد.`);
      } else if (!part.options.some((o) => o.isCorrect)) {
        errors.push(`${label}: هیچ گزینه‌ای به‌عنوان پاسخ صحیح مشخص نشده.`);
      }
    }

    if (part.score <= 0) errors.push(`${label}: نمره باید بزرگ‌تر از صفر باشد.`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function adminListExams() {
  await requireAdmin();

  const rows = await query<{
    id: string;
    subject: string;
    grade: number;
    title: string;
    exam_session: string | null;
    total_score: number;
    created_at: string;
  }>(
    `select id, subject, grade, title, exam_session, total_score, created_at
       from exams order by created_at desc`,
  );

  return rows.map((e) => ({
    id: e.id,
    subject: e.subject,
    grade: e.grade,
    title: e.title,
    examKey: e.exam_session ?? "",
    totalScore: e.total_score,
    createdAt: e.created_at,
  }));
}

export async function adminGetExamDetail(examId: string): Promise<AdminExamDetail | null> {
  await requireAdmin();

  const exam = await queryOne<{
    id: string;
    subject: string;
    grade: number;
    title: string;
    exam_session: string | null;
    total_score: number;
  }>(`select id, subject, grade, title, exam_session, total_score from exams where id = $1`, [examId]);

  if (!exam) return null;

  // چهار کوئری موازی — همان الگوی lib/exam/db-exam.ts. نسخهٔ قبلی مجبور بود
  // ترتیبی باشد چون هر مرحله شناسه‌های مرحلهٔ قبل را برای .in(...) لازم داشت.
  const [sections, questions, parts, options] = await Promise.all([
    query<{ id: string; title: string; order_index: number; section_score: number }>(
      `select id, title, order_index, section_score
         from exam_sections where exam_id = $1 order by order_index`,
      [examId],
    ),
    query<{
      id: string;
      exam_section_id: string;
      number: number;
      page_ref: number | null;
      instruction: string | null;
      layout_pattern: string | null;
    }>(
      `select q.id, q.exam_section_id, q.number, q.page_ref, q.instruction, q.layout_pattern
         from exam_questions q
         join exam_sections s on s.id = q.exam_section_id
        where s.exam_id = $1
        order by q.order_index`,
      [examId],
    ),
    query<{
      id: string;
      question_id: string;
      label: string | null;
      type: string;
      score: number;
      content: unknown;
      correct_answer: unknown;
      accepted_answers: unknown;
      grading_mode: string;
      ai_grading_hint: string | null;
    }>(
      `select p.id, p.question_id, p.label, p.type, p.score, p.content,
              p.correct_answer, p.accepted_answers, p.grading_mode, p.ai_grading_hint
         from exam_question_parts p
         join exam_questions q on q.id = p.question_id
         join exam_sections s on s.id = q.exam_section_id
        where s.exam_id = $1
        order by p.part_index`,
      [examId],
    ),
    query<{ question_part_id: string; option_key: string | null; text: string; is_correct: boolean }>(
      `select o.question_part_id, o.option_key, o.text, o.is_correct
         from exam_question_options o
         join exam_question_parts p on p.id = o.question_part_id
         join exam_questions q on q.id = p.question_id
         join exam_sections s on s.id = q.exam_section_id
        where s.exam_id = $1
        order by o.order_index`,
      [examId],
    ),
  ]);

  const optionsByPart = new Map<string, SeedOption[]>();
  for (const o of options) {
    const list = optionsByPart.get(o.question_part_id) ?? [];
    list.push({ optionKey: o.option_key ?? undefined, text: o.text, isCorrect: o.is_correct });
    optionsByPart.set(o.question_part_id, list);
  }

  const partsByQuestion = new Map<string, AdminPartDetail[]>();
  for (const p of parts) {
    const detail: AdminPartDetail = {
      id: p.id,
      label: p.label ?? undefined,
      type: p.type as QuestionPartType,
      score: p.score,
      content: p.content as QuestionPartContent,
      correctAnswer: p.correct_answer,
      acceptedAnswers: p.accepted_answers ?? undefined,
      gradingMode: p.grading_mode as AdminPartInput["gradingMode"],
      aiGradingHint: p.ai_grading_hint ?? undefined,
      options: optionsByPart.get(p.id),
    };
    const list = partsByQuestion.get(p.question_id) ?? [];
    list.push(detail);
    partsByQuestion.set(p.question_id, list);
  }

  const questionsBySection = new Map<string, AdminQuestionDetail[]>();
  for (const q of questions) {
    const detail: AdminQuestionDetail = {
      id: q.id,
      number: q.number,
      pageRef: q.page_ref ?? undefined,
      layoutPattern: (q.layout_pattern as LayoutPattern) ?? undefined,
      instruction: q.instruction ?? undefined,
      parts: partsByQuestion.get(q.id) ?? [],
    };
    const list = questionsBySection.get(q.exam_section_id) ?? [];
    list.push(detail);
    questionsBySection.set(q.exam_section_id, list);
  }

  return {
    id: exam.id,
    subject: exam.subject,
    grade: exam.grade,
    title: exam.title,
    examKey: exam.exam_session ?? "",
    totalScore: exam.total_score,
    sections: sections.map((s) => ({
      id: s.id,
      title: s.title,
      orderIndex: s.order_index,
      sectionScore: s.section_score,
      questions: questionsBySection.get(s.id) ?? [],
    })),
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function adminCreateExam(input: {
  subject: string;
  grade: number;
  title: string;
  examKey: string;
  totalScore: number;
}): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  try {
    const row = await queryOne<{ id: string }>(
      `insert into exams (subject, grade, title, exam_session, total_score)
       values ($1, $2, $3, $4, $5) returning id`,
      [input.subject, input.grade, input.title, input.examKey, input.totalScore],
    );
    return { ok: true, data: { id: row!.id } };
  } catch (err) {
    // exam_session یکتاست و این محتمل‌ترین خطای این تابع است. پیام خام پستگرس
    // («duplicate key value violates unique constraint») به درد ادمین نمی‌خورد.
    if ((err as { code?: string }).code === "23505") {
      return { ok: false, errors: ["آزمونی با این شناسه از قبل وجود دارد."] };
    }
    console.error("[exam] ساخت آزمون ناموفق بود:", err);
    return { ok: false, errors: ["ساخت آزمون ناموفق بود."] };
  }
}

export async function adminCreateSection(
  examId: string,
  input: { title: string; orderIndex: number; sectionScore: number },
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  try {
    const row = await queryOne<{ id: string }>(
      `insert into exam_sections (exam_id, title, order_index, section_score)
       values ($1, $2, $3, $4) returning id`,
      [examId, input.title, input.orderIndex, input.sectionScore],
    );
    return { ok: true, data: { id: row!.id } };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return { ok: false, errors: ["بخشی با این ترتیب از قبل در این آزمون هست."] };
    }
    console.error("[exam] ساخت بخش ناموفق بود:", err);
    return { ok: false, errors: ["ساخت بخش ناموفق بود."] };
  }
}

/**
 * ساخت سؤال تازه، یا جایگزینی کاملِ بخش‌ها و گزینه‌های سؤال موجود.
 *
 * حذف-و-درجِ-دوباره عمدی است: بخش‌های یک سؤال به‌عنوان یک واحد تألیف می‌شوند و
 * «ویرایش فقط یک بخش» جدا از ارسال دوبارهٔ کل فرم معنایی ندارد.
 *
 * همه‌اش در یک تراکنش است، و این تفاوت واقعیِ نسبت به نسخهٔ قبل است: آنجا هر
 * insert یک درخواست HTTP جدا بود، پس اگر بعد از حذف بخش‌ها و وسط درج دوباره
 * خطایی می‌آمد، سؤال با بخش‌های ناقص — یا اصلاً بدون هیچ بخشی — رها می‌شد و
 * راه برگشتی وجود نداشت.
 */
export async function adminUpsertQuestion(
  sectionId: string,
  input: AdminQuestionInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const errors = validateQuestionInput(input);
  if (errors.length > 0) return { ok: false, errors };

  try {
    const questionId = await transaction(async (tx) => {
      let id: string;

      if (input.id) {
        id = input.id;
        await tx.execute(
          `update exam_questions
              set number = $1, page_ref = $2, instruction = $3, layout_pattern = $4
            where id = $5`,
          [input.number, input.pageRef ?? null, input.instruction ?? null, input.layoutPattern ?? null, id],
        );
        // حذف بخش‌ها؛ گزینه‌هایشان با cascade می‌روند
        await tx.execute(`delete from exam_question_parts where question_id = $1`, [id]);
      } else {
        const created = await tx.queryOne<{ id: string }>(
          `insert into exam_questions
             (exam_section_id, number, page_ref, instruction, layout_pattern, order_index)
           values ($1, $2, $3, $4, $5,
                   (select count(*) from exam_questions where exam_section_id = $1))
           returning id`,
          [sectionId, input.number, input.pageRef ?? null, input.instruction ?? null, input.layoutPattern ?? null],
        );
        id = created!.id;
      }

      for (const [partIndex, part] of input.parts.entries()) {
        const partRow = await tx.queryOne<{ id: string }>(
          `insert into exam_question_parts
             (question_id, part_index, label, type, score, content,
              correct_answer, accepted_answers, grading_mode, ai_grading_hint)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           returning id`,
          [
            id,
            partIndex,
            part.label ?? null,
            part.type,
            part.score,
            // jsonb از رشتهٔ JSON ساخته می‌شود. اگر شیء خام را می‌دادیم، درایور
            // آن را به نمایش متنیِ رکورد پستگرس تبدیل می‌کرد، نه JSON.
            JSON.stringify(part.content),
            JSON.stringify(part.correctAnswer),
            part.acceptedAnswers === undefined ? null : JSON.stringify(part.acceptedAnswers),
            part.gradingMode,
            part.aiGradingHint ?? null,
          ],
        );

        for (const [i, o] of (part.options ?? []).entries()) {
          await tx.execute(
            `insert into exam_question_options
               (question_part_id, option_key, order_index, text, is_correct)
             values ($1, $2, $3, $4, $5)`,
            [partRow!.id, o.optionKey ?? null, i, o.text, o.isCorrect],
          );
        }
      }

      return id;
    });

    return { ok: true, data: { id: questionId } };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      return { ok: false, errors: ["سؤالی با این شماره در این بخش از قبل هست."] };
    }
    console.error("[exam] ذخیرهٔ سؤال ناموفق بود:", err);
    return { ok: false, errors: ["ذخیرهٔ سؤال ناموفق بود. هیچ تغییری اعمال نشد."] };
  }
}

export async function adminDeleteQuestion(questionId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const deleted = await execute("delete from exam_questions where id = $1", [questionId]);
  if (!deleted) return { ok: false, errors: ["سؤال پیدا نشد."] };
  return { ok: true, data: null };
}

export async function adminDeleteSection(sectionId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const deleted = await execute("delete from exam_sections where id = $1", [sectionId]);
  if (!deleted) return { ok: false, errors: ["بخش پیدا نشد."] };
  return { ok: true, data: null };
}

export async function adminDeleteExam(examId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const deleted = await execute("delete from exams where id = $1", [examId]);
  if (!deleted) return { ok: false, errors: ["آزمون پیدا نشد."] };
  return { ok: true, data: null };
}
