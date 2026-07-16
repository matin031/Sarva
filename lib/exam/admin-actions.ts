"use server";

import { requireAdmin } from "@/lib/require-admin";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import {
  correctAnswerSchemaByType,
  questionPartContentSchema,
  type LayoutPattern,
  type QuestionPartContent,
  type QuestionPartType,
} from "./content-schemas";
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
  acceptedAnswers?: string[];
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

const NEEDS_OPTIONS: QuestionPartType[] = ["mcq-inline", "mcq-multi-select", "mcq-plus-correction", "aroozi-samaei"];

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
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("exams")
    .select("id, subject, grade, title, exam_session, total_score")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`adminListExams: ${error.message}`);
  return (data ?? []).map((e) => ({
    id: e.id,
    subject: e.subject,
    grade: e.grade,
    title: e.title,
    examKey: e.exam_session ?? "",
    totalScore: Number(e.total_score),
  }));
}

export async function adminGetExamDetail(examId: string): Promise<AdminExamDetail | null> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, subject, grade, title, exam_session, total_score")
    .eq("id", examId)
    .maybeSingle();
  if (examError) throw new Error(`adminGetExamDetail: ${examError.message}`);
  if (!exam) return null;

  const { data: sections, error: sectionsError } = await supabase
    .from("exam_sections")
    .select("id, title, order_index, section_score")
    .eq("exam_id", exam.id)
    .order("order_index");
  if (sectionsError) throw new Error(`adminGetExamDetail sections: ${sectionsError.message}`);

  const { data: questions, error: questionsError } = await supabase
    .from("exam_questions")
    .select("id, exam_section_id, number, page_ref, instruction, layout_pattern, order_index")
    .in("exam_section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");
  if (questionsError) throw new Error(`adminGetExamDetail questions: ${questionsError.message}`);

  const { data: parts, error: partsError } = await supabase
    .from("exam_question_parts")
    .select(
      "id, question_id, part_index, label, type, score, content, correct_answer, accepted_answers, grading_mode, ai_grading_hint",
    )
    .in("question_id", (questions ?? []).map((q) => q.id))
    .order("part_index");
  if (partsError) throw new Error(`adminGetExamDetail parts: ${partsError.message}`);

  const { data: options, error: optionsError } = await supabase
    .from("exam_question_options")
    .select("id, question_part_id, option_key, order_index, text, is_correct")
    .in("question_part_id", (parts ?? []).map((p) => p.id))
    .order("order_index");
  if (optionsError) throw new Error(`adminGetExamDetail options: ${optionsError.message}`);

  const optionsByPart = new Map<string, SeedOption[]>();
  for (const o of options ?? []) {
    const list = optionsByPart.get(o.question_part_id) ?? [];
    list.push({ optionKey: o.option_key ?? undefined, text: o.text, isCorrect: o.is_correct });
    optionsByPart.set(o.question_part_id, list);
  }

  const partsByQuestion = new Map<string, AdminPartDetail[]>();
  for (const p of parts ?? []) {
    const detail: AdminPartDetail = {
      id: p.id,
      label: p.label ?? undefined,
      type: p.type as QuestionPartType,
      score: Number(p.score),
      content: p.content,
      correctAnswer: p.correct_answer,
      acceptedAnswers: p.accepted_answers ?? undefined,
      gradingMode: p.grading_mode,
      aiGradingHint: p.ai_grading_hint ?? undefined,
      options: optionsByPart.get(p.id),
    };
    const list = partsByQuestion.get(p.question_id) ?? [];
    list.push(detail);
    partsByQuestion.set(p.question_id, list);
  }

  const questionsBySection = new Map<string, AdminQuestionDetail[]>();
  for (const q of questions ?? []) {
    const detail: AdminQuestionDetail = {
      id: q.id,
      number: q.number,
      pageRef: q.page_ref ?? undefined,
      layoutPattern: q.layout_pattern ?? undefined,
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
    totalScore: Number(exam.total_score),
    sections: (sections ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      orderIndex: s.order_index,
      sectionScore: Number(s.section_score),
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
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("exams")
    .insert({
      subject: input.subject,
      grade: input.grade,
      title: input.title,
      exam_session: input.examKey,
      total_score: input.totalScore,
    })
    .select("id")
    .single();
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: { id: data.id } };
}

export async function adminCreateSection(
  examId: string,
  input: { title: string; orderIndex: number; sectionScore: number },
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("exam_sections")
    .insert({
      exam_id: examId,
      title: input.title,
      order_index: input.orderIndex,
      section_score: input.sectionScore,
    })
    .select("id")
    .single();
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: { id: data.id } };
}

/** Creates a new question or fully replaces an existing one's parts/options
 *  (delete-then-reinsert): a question's parts are authored as one cohesive
 *  unit — there's no meaningful "edit just one part" workflow separate from
 *  re-submitting the whole question form. */
export async function adminUpsertQuestion(
  sectionId: string,
  input: AdminQuestionInput,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const errors = validateQuestionInput(input);
  if (errors.length > 0) return { ok: false, errors };

  const supabase = createSupabaseAdmin();

  let questionId: string;
  if (input.id) {
    questionId = input.id;
    const { error: updateError } = await supabase
      .from("exam_questions")
      .update({
        number: input.number,
        page_ref: input.pageRef ?? null,
        instruction: input.instruction ?? null,
        layout_pattern: input.layoutPattern ?? null,
      })
      .eq("id", questionId);
    if (updateError) return { ok: false, errors: [updateError.message] };

    // Delete existing parts (cascades to their options) before reinserting.
    const { error: deleteError } = await supabase.from("exam_question_parts").delete().eq("question_id", questionId);
    if (deleteError) return { ok: false, errors: [deleteError.message] };
  } else {
    const { count } = await supabase
      .from("exam_questions")
      .select("id", { count: "exact", head: true })
      .eq("exam_section_id", sectionId);

    const { data: created, error: createError } = await supabase
      .from("exam_questions")
      .insert({
        exam_section_id: sectionId,
        number: input.number,
        page_ref: input.pageRef ?? null,
        instruction: input.instruction ?? null,
        layout_pattern: input.layoutPattern ?? null,
        order_index: count ?? 0,
      })
      .select("id")
      .single();
    if (createError) return { ok: false, errors: [createError.message] };
    questionId = created.id;
  }

  for (const [partIndex, part] of input.parts.entries()) {
    const { data: partRow, error: partError } = await supabase
      .from("exam_question_parts")
      .insert({
        question_id: questionId,
        part_index: partIndex,
        label: part.label ?? null,
        type: part.type,
        score: part.score,
        content: part.content,
        correct_answer: part.correctAnswer,
        accepted_answers: part.acceptedAnswers ?? null,
        grading_mode: part.gradingMode,
        ai_grading_hint: part.aiGradingHint ?? null,
      })
      .select("id")
      .single();
    if (partError) return { ok: false, errors: [partError.message] };

    if (part.options?.length) {
      const { error: optionsError } = await supabase.from("exam_question_options").insert(
        part.options.map((o, i) => ({
          question_part_id: partRow.id,
          option_key: o.optionKey ?? null,
          order_index: i,
          text: o.text,
          is_correct: o.isCorrect,
        })),
      );
      if (optionsError) return { ok: false, errors: [optionsError.message] };
    }
  }

  return { ok: true, data: { id: questionId } };
}

export async function adminDeleteQuestion(questionId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("exam_questions").delete().eq("id", questionId);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}

export async function adminDeleteSection(sectionId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("exam_sections").delete().eq("id", sectionId);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}

export async function adminDeleteExam(examId: string): Promise<ActionResult<null>> {
  await requireAdmin();
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) return { ok: false, errors: [error.message] };
  return { ok: true, data: null };
}
