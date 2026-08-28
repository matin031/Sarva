import { apiGet } from "@/lib/api/client";
import { DEMO_GRAMMAR_CIRCUIT_QUESTIONS } from "./demo-data";
import type { GradeKey } from "@/lib/doroos/types";
import type {
  GrammarCircuitAvailability,
  GrammarCircuitQuestion,
  GrammarCircuitQuestionSource,
} from "./types";
import { filterValidQuestions } from "./validator";

/** خطای قابلِ نمایش به کاربر. بازی باید بتواند صادقانه بگوید چه شد. */
export class GrammarCircuitSourceError extends Error {}

/** منبعِ تولید — پرسش‌ها از دیتابیس، از راهِ API.
 *
 *  اینجا عمداً هیچ fallbackی به دادهٔ نمایشی وجود ندارد. اگر API خطا بدهد یا
 *  درس‌های انتخابی پرسشِ سالمی نداشته باشند، بازی باید *صادقانه شکست بخورد*،
 *  نه اینکه بی‌سروصدا محتوای تأییدنشده جلوی دانش‌آموز بگذارد. یک تمرینِ
 *  ساختگی که دانش‌آموز فکر کند محتوای درسی است، از یک پیام خطا بدتر است. */
export class ApiGrammarCircuitSource implements GrammarCircuitQuestionSource {
  async getQuestions(options: {
    grade: GradeKey;
    lessons: readonly number[];
    limit?: number;
    signal?: AbortSignal;
  }): Promise<GrammarCircuitQuestion[]> {
    if (options.lessons.length === 0) {
      throw new GrammarCircuitSourceError("هیچ درسی انتخاب نشده است.");
    }
    const params = new URLSearchParams({
      grade: options.grade,
      lessons: [...options.lessons].join(","),
    });
    if (options.limit) params.set("limit", String(options.limit));

    const result = await apiGet<{ questions: GrammarCircuitQuestion[] }>(
      `/api/v1/grammar-circuit/questions?${params.toString()}`,
    );
    if (!result.ok) {
      throw new GrammarCircuitSourceError(
        result.errors.join(" ") || "دریافتِ پرسش‌ها ممکن نشد.",
      );
    }
    // سرور خودش اعتبارسنجی کرده؛ این یک لایهٔ دوم است، نه تکرارِ بی‌دلیل:
    // کلاینت نباید به سالم‌بودنِ چیزی که از شبکه می‌آید تکیه کند.
    return filterValidQuestions(result.data.questions);
  }
}

export async function fetchGrammarCircuitAvailability(): Promise<GrammarCircuitAvailability> {
  const result = await apiGet<GrammarCircuitAvailability>(
    "/api/v1/grammar-circuit/availability",
  );
  if (!result.ok) {
    throw new GrammarCircuitSourceError(
      result.errors.join(" ") || "دریافتِ فهرستِ درس‌ها ممکن نشد.",
    );
  }
  return result.data;
}

/** منبعِ محلی — فقط برای تست‌های واحد و توسعهٔ جدا از دیتابیس.
 *
 *  هیچ‌وقت در مسیرِ تولید استفاده نمی‌شود. دادهٔ پشتش `isDemo: true` دارد و
 *  محتوای آموزشیِ تأییدشده نیست. */
export class LocalGrammarCircuitSource implements GrammarCircuitQuestionSource {
  constructor(
    private readonly pool: readonly GrammarCircuitQuestion[] = DEMO_GRAMMAR_CIRCUIT_QUESTIONS,
  ) {}

  async getQuestions(options: {
    grade: GradeKey;
    lessons: readonly number[];
    limit?: number;
  }): Promise<GrammarCircuitQuestion[]> {
    let questions = filterValidQuestions(this.pool);
    if (options.lessons.length > 0) {
      questions = questions.filter(
        (q) => q.lesson === undefined || options.lessons.includes(q.lesson),
      );
    }
    if (options.limit != null) questions = questions.slice(0, options.limit);
    return questions;
  }
}

export const defaultGrammarCircuitSource: GrammarCircuitQuestionSource =
  new ApiGrammarCircuitSource();
