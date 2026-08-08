"use server";

import { query, queryOne } from "@/lib/db";
import { requireAdmin } from "@/lib/require-admin";

export type QuizAnswerDetail = {
  questionId: string;
  type: string;
  poem?: string[];
  difficulty?: string;
  isCorrect: boolean;
};

export type QuizAttemptRow = {
  id: string;
  total: number;
  correct: number;
  createdAt: string;
  answers: QuizAnswerDetail[];
};

/** آمار کلی عروض سماعی — مثل آمار امتحانات، جمع‌بندی در دیتابیس. */
export async function adminQuizStatsOverview() {
  await requireAdmin();

  const row = await queryOne<{ attempt_count: number; total_questions: number; total_correct: number }>(
    `select count(*)                    as attempt_count,
            coalesce(sum(total), 0)     as total_questions,
            coalesce(sum(correct), 0)   as total_correct
       from quiz_attempts`,
  );

  const totalQuestions = row?.total_questions ?? 0;

  return {
    attemptCount: row?.attempt_count ?? 0,
    avgAccuracy: totalQuestions > 0 ? Math.round(((row?.total_correct ?? 0) / totalQuestions) * 100) : 0,
  };
}

export async function adminQuizAttemptsForUser(userId: string): Promise<QuizAttemptRow[]> {
  await requireAdmin();

  // قبلاً دو رفت‌وبرگشت بود (اول تلاش‌ها، بعد پاسخ‌ها با in(...)). حالا یک JOIN
  // است و گروه‌بندی در کد انجام می‌شود — همان کاری که آن نسخه هم می‌کرد، فقط
  // بدون کوئری دوم.
  const rows = await query<{
    attempt_id: string;
    total: number;
    correct: number;
    created_at: string;
    question_id: string | null;
    is_correct: boolean | null;
    q_type: string | null;
    q_poem: string[] | null;
    q_difficulty: string | null;
  }>(
    `select a.id as attempt_id, a.total, a.correct, a.created_at,
            ans.question_id, ans.is_correct,
            q.type as q_type, q.poem as q_poem, q.difficulty as q_difficulty
       from quiz_attempts a
       left join quiz_attempt_answers ans on ans.attempt_id = a.id
       left join questions q on q.id = ans.question_id
      where a.user_id = $1
      order by a.created_at desc, ans.created_at`,
    [userId],
  );

  const byAttempt = new Map<string, QuizAttemptRow>();

  for (const row of rows) {
    let attempt = byAttempt.get(row.attempt_id);
    if (!attempt) {
      attempt = {
        id: row.attempt_id,
        total: row.total,
        correct: row.correct,
        createdAt: row.created_at,
        answers: [],
      };
      byAttempt.set(row.attempt_id, attempt);
    }

    // left join یعنی تلاشی که هیچ پاسخی ندارد هم یک ردیف با ستون‌های null
    // برمی‌گرداند — آن ردیف نباید به یک پاسخِ ساختگی تبدیل شود.
    if (row.question_id) {
      attempt.answers.push({
        questionId: row.question_id,
        type: row.q_type ?? "—",
        poem: row.q_poem ?? undefined,
        difficulty: row.q_difficulty ?? undefined,
        isCorrect: row.is_correct ?? false,
      });
    }
  }

  // ترتیب Map همان ترتیب درجِ اول است، که به‌خاطر order by بالا از تازه به قدیم است
  return [...byAttempt.values()];
}
