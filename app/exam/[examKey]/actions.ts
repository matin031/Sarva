"use server";

import { formatCorrectAnswer } from "@/lib/exam/format-answer";
import { gradePart } from "@/lib/exam/grading";
import { getExamByKey } from "@/lib/exam/db-exam";
import { queryOne, execute } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

// Server-only: getExamByKey returns the full SeedExam (with the answer key),
// so this action must never be imported from a "use client" file. The page
// component fetches its own copy separately and sanitizes it via
// toClientExam before it reaches the browser.

export type PartResult = {
  label?: string;
  score: number;
  maxScore: number;
  status: "correct" | "incorrect" | "partial" | "needs_review";
  correctAnswerText: string;
  /** Short feedback shown to the student. Reserved for future manual review. */
  feedback?: string;
  /** True for open-ended (conceptual) parts that the student scores
   *  themselves against the revealed answer — no auto grading. */
  selfGrade?: boolean;
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

  // exact_match parts are auto-graded here. Open-ended (conceptual) parts are
  // not auto-graded — the student sees the correct answer and scores
  // themselves (selfGrade). This used to be a temporary state while an LLM
  // grader existed behind it; that grader has been removed, so self-grading
  // is now the deliberate and only behaviour for these parts.
  const parts: PartResult[] = question.parts.map((part, partIndex) => {
    if (part.gradingMode === "exact_match") {
      const graded = gradePart(part, partIndex, answers[partIndex]);
      return {
        label: part.label,
        score: graded.score,
        maxScore: graded.maxScore,
        status: graded.status,
        correctAnswerText: formatCorrectAnswer(part),
      };
    }
    return {
      label: part.label,
      score: 0,
      maxScore: part.score,
      status: "needs_review",
      correctAnswerText: formatCorrectAnswer(part),
      selfGrade: true,
    };
  });

  return { number: question.number, parts };
}

/** How much of a paper has to be attempted before it counts as a کارنامه. */
const MIN_ANSWERED_RATIO = 2 / 3;

export type AttemptSaveResult =
  | { saved: true }
  | { saved: false; reason: "guest" | "too_few" | "unknown_exam" };

/** Called once when a signed-in student reaches the results screen
 *  (ExamResults.tsx) — mirrors components/UI/Quiz.tsx's saveQuizAttempt:
 *  same "guests aren't persisted" guard, same "fire on finish" timing. */
export async function submitExamAttempt(
  examKey: string,
  questionResults: Record<number, QuestionResult>,
  /** What the student actually wrote/chose, keyed "questionNumber:partIndex".
   *  Stored so the panel can show their answer next to the right one — the
   *  results alone only ever knew the score. */
  answers?: Record<string, unknown>,
): Promise<AttemptSaveResult> {
  const user = await getCurrentUser();
  if (!user) return { saved: false, reason: "guest" };

  const exam = await queryOne<{ id: string }>("select id from exams where exam_session = $1", [
    examKey,
  ]);
  if (!exam) return { saved: false, reason: "unknown_exam" };

  /* A کارنامه should describe a paper the student actually sat. Answering three
     questions and leaving would otherwise land in the panel next to a full
     attempt and drag the average down for no reason — so the threshold is
     checked here, on the server, where the real question count lives, rather
     than trusting whatever the client chose to send. */
  const paper = await getExamByKey(examKey);
  const totalQuestions = paper?.sections.reduce((n, s) => n + s.questions.length, 0) ?? 0;
  const answeredQuestions = Object.keys(questionResults).length;
  if (totalQuestions > 0 && answeredQuestions < Math.ceil(totalQuestions * MIN_ANSWERED_RATIO)) {
    return { saved: false, reason: "too_few" };
  }

  let totalScore = 0;
  let maxScore = 0;
  for (const result of Object.values(questionResults)) {
    for (const part of result.parts) {
      totalScore += part.score;
      maxScore += part.maxScore;
    }
  }
  if (maxScore === 0) return { saved: false, reason: "too_few" };

  try {
    await execute(
      `insert into exam_attempts (user_id, exam_id, total_score, max_score, question_results, answers)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        exam.id,
        totalScore,
        maxScore,
        JSON.stringify(questionResults),
        JSON.stringify(answers ?? {}),
      ],
    );
  } catch (err) {
    // نسخهٔ قبلی اینجا یک مسیر دوم داشت: اگر درج با ستون answers شکست می‌خورد،
    // دوباره بدون آن تلاش می‌کرد — چون آن ستون بعداً به جدول اضافه شده بود و
    // معلوم نبود روی هر پروژه‌ای وجود داشته باشد. حالا ستون بخشی از
    // 001_init.sql است و همیشه هست، پس آن مسیر حذف شده.
    console.error("[exam] ثبت کارنامه ناموفق بود:", err);
    return { saved: false, reason: "unknown_exam" };
  }

  return { saved: true };
}
