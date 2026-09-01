import "server-only";
import type { GradeKey } from "@/lib/doroos/types";
import { isStorableLesson } from "../curriculum";
import type { GrammarCircuitQuestion } from "../types";
import { validateGrammarCircuitQuestion } from "../validator";
import { logger } from "@/lib/observability";

/** تبدیلِ ردیفِ دیتابیس به پرسشِ *معتبرِ* بازی.
 *
 *  قاعده‌ای که این فایل بر آن ایستاده: **بودنِ یک ردیف در جدول هیچ اثباتی
 *  نیست که محتوایش از نظر آموزشی سالم است.** payload یک jsonb آزاد است؛ ممکن
 *  است شناسهٔ تکراری داشته باشد، به نقشی ارجاع بدهد که تعریف نشده، یا اصلاً
 *  حل‌نشدنی باشد. پس هر ردیف از همان اعتبارسنجی می‌گذرد که دادهٔ محلی
 *  می‌گذشت — شاملِ آزمونِ بن‌بست‌ناپذیری.
 *
 *  ردیفِ خراب بی‌سروصدا کنار گذاشته می‌شود و در سرور لاگ می‌شود؛ هرگز به
 *  دستِ دانش‌آموز نمی‌رسد. */

export interface GrammarCircuitRow {
  id: string;
  source_id: string;
  grade: string;
  lesson: number;
  question_type: string;
  payload: unknown;
  difficulty: number;
  explanation: string | null;
  attribution: string | null;
}

export interface RowConversion {
  question: GrammarCircuitQuestion | null;
  errors: string[];
}

export function rowToQuestion(row: GrammarCircuitRow): RowConversion {
  const errors: string[] = [];

  if (!isStorableLesson(row.lesson)) {
    errors.push(`شمارهٔ درسِ نامعتبر: ${row.lesson}`);
  }
  if (typeof row.payload !== "object" || row.payload === null || Array.isArray(row.payload)) {
    errors.push("payload یک شیء نیست.");
    return { question: null, errors };
  }

  const payload = row.payload as Partial<GrammarCircuitQuestion>;

  // شناسه‌ها و فراداده‌ها از *ستون‌ها* می‌آیند، نه از داخلِ payload: ستون‌ها
  // همان‌هایی‌اند که ایندکس و کوئری رویشان است، پس همان‌ها حقیقت‌اند.
  const question: GrammarCircuitQuestion = {
    ...(payload as GrammarCircuitQuestion),
    id: row.id,
    sourceId: row.source_id,
    grade: row.grade as GradeKey,
    lesson: row.lesson,
    type: (row.question_type as GrammarCircuitQuestion["type"]) ?? payload.type ?? "sentence",
    difficulty: (row.difficulty as 1 | 2 | 3) ?? payload.difficulty,
    ...(row.explanation ? { explanation: row.explanation } : {}),
    ...(row.attribution ? { attribution: row.attribution } : {}),
  };
  // دادهٔ دیتابیس محتوای واقعیِ سروا است؛ برچسبِ «نمایشی» فقط مالِ فایلِ محلی است.
  delete (question as { isDemo?: boolean }).isDemo;

  const result = validateGrammarCircuitQuestion(question);
  if (!result.ok) errors.push(...result.errors);

  return { question: errors.length === 0 ? question : null, errors };
}

/** چند ردیف را به پرسش تبدیل می‌کند و خراب‌ها را کنار می‌گذارد. */
export function rowsToQuestions(rows: readonly GrammarCircuitRow[]): {
  questions: GrammarCircuitQuestion[];
  rejected: Array<{ sourceId: string; errors: string[] }>;
} {
  const questions: GrammarCircuitQuestion[] = [];
  const rejected: Array<{ sourceId: string; errors: string[] }> = [];
  for (const row of rows) {
    const { question, errors } = rowToQuestion(row);
    if (question) questions.push(question);
    else rejected.push({ sourceId: row.source_id, errors });
  }
  return { questions, rejected };
}

/** خراب‌ها را یک بار و فشرده لاگ می‌کند. ردیفِ خرابِ محتوایی یک باگِ داده است
 *  و باید دیده شود، ولی نباید کلِ درخواست را زمین بزند. */
export function logRejected(
  scope: string,
  rejected: ReadonlyArray<{ sourceId: string; errors: string[] }>,
): void {
  if (rejected.length === 0) return;
  logger.error("ردیف‌هایی به‌خاطرِ دادهٔ نامعتبر کنار گذاشته شدند", {
    event: "grammar_circuit.rows_rejected",
    scope,
    rejected_count: rejected.length,
    // فقط شناسه و دلیل — نه متنِ خودِ پرسش.
    rejected_sample: rejected.slice(0, 10).map((r) => ({
      source_id: r.sourceId,
      errors: r.errors.slice(0, 3),
    })),
  });
}
