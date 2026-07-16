"use server";

import { formatCorrectAnswer } from "@/lib/exam/format-answer";
import { gradePart } from "@/lib/exam/grading";
import { gradePartWithAI } from "@/lib/exam/ai-grading";
import { getExamByKey } from "@/lib/exam/db-exam";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

// Server-only: getExamByKey uses the service-role client and returns the
// full SeedExam (with the answer key), so this action must never be
// imported from a "use client" file. The page component fetches its own
// copy separately and sanitizes it via toClientExam before it reaches the
// browser.

export type PartResult = {
  label?: string;
  score: number;
  maxScore: number;
  status: "correct" | "incorrect" | "partial" | "needs_review";
  correctAnswerText: string;
};

export type QuestionResult = {
  number: number;
  parts: PartResult[];
};

/** Grades one question and reveals its answer key — called right after
 *  the student submits that single question, so feedback is immediate
 *  instead of batched to the end of the exam. */
export async function submitQuestion(
  examKey: string,
  questionNumber: number,
  answers: Record<number, unknown>,
): Promise<QuestionResult> {
  const exam = await getExamByKey(examKey);
  if (!exam) throw new Error(`Unknown exam: ${examKey}`);

  const question = exam.sections.flatMap((s) => s.questions).find((q) => q.number === questionNumber);
  if (!question) throw new Error(`Unknown question: ${questionNumber}`);

  // Parts are graded in parallel: exact_match ones resolve synchronously,
  // AI ones (ai_semantic / ai_partial_credit) await Gemini. Most questions
  // have a single part, so this is usually one await at most.
  const parts = await Promise.all(
    question.parts.map(async (part, partIndex) => {
      const graded =
        part.gradingMode === "exact_match"
          ? gradePart(part, partIndex, answers[partIndex])
          : await gradePartWithAI(part, answers[partIndex]);
      return {
        label: part.label,
        score: graded.score,
        maxScore: graded.maxScore,
        status: graded.status,
        correctAnswerText: formatCorrectAnswer(part),
      };
    }),
  );

  return { number: question.number, parts };
}

/** Called once when a signed-in student reaches the results screen
 *  (ExamResults.tsx) — mirrors components/UI/Quiz.tsx's saveQuizAttempt:
 *  same "guests aren't persisted" guard, same "fire on finish" timing.
 *  Recomputes the total from the results the client already has (not
 *  re-graded here) since this is a stats record, not a security boundary
 *  — the actual grading already happened server-side in submitQuestion. */
export async function submitExamAttempt(
  examKey: string,
  questionResults: Record<number, QuestionResult>,
): Promise<void> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createSupabaseAdmin();
  const { data: exam } = await admin.from("exams").select("id").eq("exam_session", examKey).maybeSingle();
  if (!exam) return;

  let totalScore = 0;
  let maxScore = 0;
  for (const result of Object.values(questionResults)) {
    for (const part of result.parts) {
      totalScore += part.score;
      maxScore += part.maxScore;
    }
  }
  if (maxScore === 0) return;

  await admin.from("exam_attempts").insert({
    user_id: user.id,
    exam_id: exam.id,
    total_score: totalScore,
    max_score: maxScore,
    question_results: questionResults,
  });
}
