// Imports the two static SeedExam files into exam_bank tables via the
// service-role client. Safe to re-run: it deletes any existing row with
// the same exam_session first (cascade takes sections/questions/parts/
// options with it), so this is "replace", not "append".
//
// Run with: npx tsx scripts/migrate-seed-to-db.ts

process.loadEnvFile(".env.local");

import { createSupabaseAdmin } from "../lib/supabase-admin";
import { farsi3Dey1401 } from "../lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "../lib/exam/seed-data/farsi3-1403-kherdad";
import type { SeedExam } from "../lib/exam/seed-data/seed-types";

const exams: { examKey: string; exam: SeedExam }[] = [
  { examKey: "1403-kherdad", exam: farsi3Kherdad1403 },
  { examKey: "1401-dey", exam: farsi3Dey1401 },
];

async function importExam(examKey: string, exam: SeedExam) {
  const supabase = createSupabaseAdmin();

  const { error: deleteError } = await supabase.from("exams").delete().eq("exam_session", examKey);
  if (deleteError) throw new Error(`delete existing ${examKey}: ${deleteError.message}`);

  const { data: examRow, error: examError } = await supabase
    .from("exams")
    .insert({
      subject: exam.subject,
      grade: exam.grade,
      title: exam.title,
      exam_session: examKey,
      total_score: exam.totalScore,
    })
    .select("id")
    .single();
  if (examError) throw new Error(`insert exam ${examKey}: ${examError.message}`);

  for (const section of exam.sections) {
    const { data: sectionRow, error: sectionError } = await supabase
      .from("exam_sections")
      .insert({
        exam_id: examRow.id,
        title: section.title,
        order_index: section.orderIndex,
        section_score: section.sectionScore,
      })
      .select("id")
      .single();
    if (sectionError) throw new Error(`insert section "${section.title}": ${sectionError.message}`);

    for (const [qIndex, question] of section.questions.entries()) {
      const { data: questionRow, error: questionError } = await supabase
        .from("exam_questions")
        .insert({
          exam_section_id: sectionRow.id,
          number: question.number,
          page_ref: question.pageRef ?? null,
          instruction: question.instruction ?? null,
          layout_pattern: question.layoutPattern ?? null,
          order_index: qIndex,
        })
        .select("id")
        .single();
      if (questionError) throw new Error(`insert Q${question.number}: ${questionError.message}`);

      for (const [partIndex, part] of question.parts.entries()) {
        const { data: partRow, error: partError } = await supabase
          .from("exam_question_parts")
          .insert({
            question_id: questionRow.id,
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
        if (partError) {
          throw new Error(`insert Q${question.number}${part.label ?? ""} part: ${partError.message}`);
        }

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
          if (optionsError) {
            throw new Error(`insert Q${question.number}${part.label ?? ""} options: ${optionsError.message}`);
          }
        }
      }
    }
  }

  console.log(`✓ imported ${examKey} (${exam.title})`);
}

for (const { examKey, exam } of exams) {
  await importExam(examKey, exam);
}
