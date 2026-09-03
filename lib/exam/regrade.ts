import type { SeedExam } from "@/lib/exam/seed-data/seed-types";
import { formatCorrectAnswer } from "@/lib/exam/format-answer";
import { gradePart } from "@/lib/exam/grading";
import type { PartResult, QuestionResult } from "@/lib/exam/result-types";

/** سقف‌های شکلِ ورودی.
 *
 *  یک Server Action در عمل یک endpoint شبکه است و هرکسی می‌تواند مستقیم
 *  صدایش بزند. بدون این سقف‌ها، یک درخواست می‌تواند صدها هزار کلید بفرستد و
 *  هم حافظه را بخورد و هم یک jsonb غول‌پیکر در جدول جا بگذارد. */
export const MAX_ANSWER_KEYS = 500;
export const MAX_ANSWER_TEXT = 2_000;

/** عددی که واقعاً عدد است — نه NaN، نه Infinity، نه رشته‌ای که شبیه عدد است. */
export function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * نمرهٔ یک آزمون، محاسبه‌شده روی سرور.
 *
 * ⚠️ این تابع قلبِ رفعِ یک آسیب‌پذیری است.
 *
 * تا دیروز `submitExamAttempt` مستقیماً `part.score` و `part.maxScore` را از
 * `questionResults`ی که کلاینت فرستاده بود جمع می‌زد. یعنی هر دانش‌آموزی
 * می‌توانست همان Server Action را دستی صدا بزند و با
 * `{ parts: [{ score: 20, maxScore: 20 }] }` یک کارنامهٔ بیست بسازد — بدون
 * اینکه حتی یک سؤال را دیده باشد. `submitQuestion` درست تصحیح می‌کرد، ولی
 * نتیجه‌اش به کلاینت می‌رفت و همان‌جا قابل دستکاری بود.
 *
 * حالا `questionResults` فقط می‌گوید **کدام سؤال‌ها پاسخ داده شده‌اند**؛ نمره
 * از نو و از روی برگهٔ authoritative حساب می‌شود:
 *
 *   • بخش‌های `exact_match` با همان `gradePart` سرور و از روی `answers`
 *     خام دوباره تصحیح می‌شوند. نمرهٔ کلاینت کاملاً نادیده گرفته می‌شود.
 *
 *   • بخش‌های خودارزیابی مرجعِ سروری ندارند — خودِ دانش‌آموز نمره می‌دهد و
 *     این عمدِ محصول است. پس نمرهٔ کلاینت پذیرفته می‌شود ولی به بازهٔ
 *     `[0, part.score]` **بریده** می‌شود. نمی‌شود صفرش کرد بی‌آنکه قابلیت از
 *     بین برود؛ می‌شود جلوی «۹۹۹ از ۰٫۵» را گرفت.
 *
 *   • `maxScore` هرگز از کلاینت نمی‌آید: جمعِ `part.score`های همان سؤال‌ها
 *     روی برگهٔ واقعی است.
 */
export function regradeAttempt(
  paper: SeedExam,
  questionResults: Record<number, QuestionResult>,
  answers: Record<string, unknown>,
): {
  totalScore: number;
  maxScore: number;
  answeredQuestions: number;
  /** همان شکلی که ExamResults و پنل رندر می‌کنند — ولی ساختهٔ سرور.
   *  ذخیرهٔ نسخهٔ کلاینت یعنی جمعِ درست ولی جزئیاتِ جعلی در کارنامه. */
  results: Record<number, QuestionResult>;
} {
  const byNumber = new Map(
    paper.sections.flatMap((s) => s.questions).map((q) => [q.number, q]),
  );

  let totalScore = 0;
  let maxScore = 0;
  let answeredQuestions = 0;
  const results: Record<number, QuestionResult> = {};

  for (const [rawNumber, clientResult] of Object.entries(questionResults)) {
    const number = Number(rawNumber);
    const question = byNumber.get(number);
    // سؤالی که روی برگه نیست اصلاً شمرده نمی‌شود — نه در نمره، نه در تعداد.
    if (!question) continue;

    answeredQuestions++;
    const parts: PartResult[] = [];

    question.parts.forEach((part, partIndex) => {
      maxScore += part.score;

      if (part.gradingMode === "exact_match") {
        const graded = gradePart(part, partIndex, answers[`${number}:${partIndex}`]);
        totalScore += graded.score;
        parts.push({
          label: part.label,
          score: graded.score,
          maxScore: graded.maxScore,
          status: graded.status,
          correctAnswerText: formatCorrectAnswer(part),
        });
        return;
      }

      // خودارزیابی: نمرهٔ کلاینت، بریده‌شده در بازهٔ مجاز
      const claimed = finiteOr(clientResult?.parts?.[partIndex]?.score, 0);
      const score = Math.max(0, Math.min(part.score, claimed));
      totalScore += score;
      parts.push({
        label: part.label,
        score,
        maxScore: part.score,
        status: score >= part.score ? "correct" : score > 0 ? "partial" : "needs_review",
        correctAnswerText: formatCorrectAnswer(part),
        selfGrade: true,
      });
    });

    results[number] = { number, parts };
  }

  return { totalScore, maxScore, answeredQuestions, results };
}

