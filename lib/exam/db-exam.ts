import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { QuestionPartType } from "./content-schemas";
import type { SeedExam, SeedOption, SeedPart, SeedQuestion } from "./seed-data/seed-types";

/**
 * Reconstructs the exact SeedExam shape (server-only, has the answer key)
 * from exam_bank tables via the service-role client. Kept type-compatible
 * with the static seed-data modules on purpose: grading.ts, client-exam.ts
 * and format-answer.ts all consume SeedExam already and don't need to
 * change — only where the exam page / grading action GET their SeedExam
 * from changes, from a static import to this function.
 */
export async function getExamByKey(examKey: string): Promise<SeedExam | null> {
  const supabase = createSupabaseAdmin();

  const { data: exam, error: examError } = await supabase
    .from("exams")
    .select("id, subject, grade, title, exam_session, total_score")
    .eq("exam_session", examKey)
    .maybeSingle();
  if (examError) throw new Error(`getExamByKey(${examKey}): ${examError.message}`);
  if (!exam) return null;

  const { data: sections, error: sectionsError } = await supabase
    .from("exam_sections")
    .select("id, title, order_index, section_score")
    .eq("exam_id", exam.id)
    .order("order_index");
  if (sectionsError) throw new Error(`getExamByKey(${examKey}) sections: ${sectionsError.message}`);

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, exam_section_id, number, page_ref, instruction, layout_pattern, order_index")
    .in("exam_section_id", (sections ?? []).map((s) => s.id))
    .order("order_index");
  if (questionsError) throw new Error(`getExamByKey(${examKey}) questions: ${questionsError.message}`);

  const { data: parts, error: partsError } = await supabase
    .from("question_parts")
    .select(
      "id, question_id, part_index, label, type, score, content, correct_answer, accepted_answers, grading_mode, ai_grading_hint",
    )
    .in("question_id", (questions ?? []).map((q) => q.id))
    .order("part_index");
  if (partsError) throw new Error(`getExamByKey(${examKey}) parts: ${partsError.message}`);

  const { data: options, error: optionsError } = await supabase
    .from("question_options")
    .select("id, question_part_id, option_key, order_index, text, is_correct")
    .in("question_part_id", (parts ?? []).map((p) => p.id))
    .order("order_index");
  if (optionsError) throw new Error(`getExamByKey(${examKey}) options: ${optionsError.message}`);

  const optionsByPart = new Map<string, SeedOption[]>();
  for (const o of options ?? []) {
    const list = optionsByPart.get(o.question_part_id) ?? [];
    list.push({ optionKey: o.option_key ?? undefined, text: o.text, isCorrect: o.is_correct });
    optionsByPart.set(o.question_part_id, list);
  }

  const partsByQuestion = new Map<string, SeedPart[]>();
  for (const p of parts ?? []) {
    const seedPart: SeedPart = {
      label: p.label ?? undefined,
      type: p.type as QuestionPartType,
      score: Number(p.score),
      content: p.content,
      correctAnswer: p.correct_answer,
      acceptedAnswers: p.accepted_answers ?? undefined,
      gradingMode: p.grading_mode,
      aiGradingHint: p.ai_grading_hint ?? undefined,
      options: optionsByPart.get(p.id),
      // exam_bank has no verified/sourceNote columns — every question
      // authored through the admin panel is treated as verified by the
      // person who typed it in, unlike the OCR-transcribed seed files.
      verified: true,
    };
    const list = partsByQuestion.get(p.question_id) ?? [];
    list.push(seedPart);
    partsByQuestion.set(p.question_id, list);
  }

  const questionsBySection = new Map<string, SeedQuestion[]>();
  for (const q of questions ?? []) {
    const seedQuestion: SeedQuestion = {
      number: q.number,
      pageRef: q.page_ref ?? undefined,
      layoutPattern: q.layout_pattern ?? undefined,
      instruction: q.instruction ?? undefined,
      parts: partsByQuestion.get(q.id) ?? [],
    };
    const list = questionsBySection.get(q.exam_section_id) ?? [];
    list.push(seedQuestion);
    questionsBySection.set(q.exam_section_id, list);
  }

  return {
    subject: exam.subject,
    grade: exam.grade,
    title: exam.title,
    examSession: exam.exam_session ?? examKey,
    totalScore: Number(exam.total_score),
    sourcePdf: "",
    sections: (sections ?? []).map((s) => ({
      title: s.title,
      orderIndex: s.order_index,
      sectionScore: Number(s.section_score),
      questions: questionsBySection.get(s.id) ?? [],
    })),
  };
}
