"use server";

import { formatCorrectAnswer } from "@/lib/exam/format-answer";
import { MAX_ANSWER_KEYS, MAX_ANSWER_TEXT, regradeAttempt } from "@/lib/exam/regrade";
import { gradePart } from "@/lib/exam/grading";
import { getExamByKey } from "@/lib/exam/db-exam";
import { queryOne, execute } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";

// Server-only: getExamByKey returns the full SeedExam (with the answer key),
// so this action must never be imported from a "use client" file. The page
// component fetches its own copy separately and sanitizes it via
// toClientExam before it reaches the browser.

import type { PartResult, QuestionResult } from "@/lib/exam/result-types";

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

  const paper = await getExamByKey(examKey);
  if (!paper) return { saved: false, reason: "unknown_exam" };

  // شکلِ ورودی، پیش از هر کاری. یک بدنهٔ غول‌پیکر نباید تا محاسبه پیش برود.
  const safeAnswers: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(answers ?? {})) {
    if (Object.keys(safeAnswers).length >= MAX_ANSWER_KEYS) break;
    // فقط کلیدهای «شمارهٔ سؤال:اندیس بخش»
    if (!/^\d{1,4}:\d{1,3}$/.test(key)) continue;
    safeAnswers[key] =
      typeof value === "string" ? value.slice(0, MAX_ANSWER_TEXT) : value;
  }

  /* A کارنامه should describe a paper the student actually sat. Answering three
     questions and leaving would otherwise land in the panel next to a full
     attempt and drag the average down for no reason — so the threshold is
     checked here, on the server, where the real question count lives, rather
     than trusting whatever the client chose to send. */
  const totalQuestions = paper.sections.reduce((n, s) => n + s.questions.length, 0);

  // ⚠️ نمره روی سرور و از روی برگهٔ واقعی حساب می‌شود، نه از روی چیزی که
  //    کلاینت فرستاده. توضیح کامل بالای regradeAttempt.
  const { totalScore, maxScore, answeredQuestions, results } = regradeAttempt(
    paper,
    questionResults ?? {},
    safeAnswers,
  );

  if (totalQuestions > 0 && answeredQuestions < Math.ceil(totalQuestions * MIN_ANSWERED_RATIO)) {
    return { saved: false, reason: "too_few" };
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
        // نسخهٔ سرور، نه آنچه کلاینت فرستاده
        JSON.stringify(results),
        JSON.stringify(safeAnswers),
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
