import { DEMO_GRAMMAR_CIRCUIT_QUESTIONS } from "./demo-data";
import type { GrammarCircuitQuestion, GrammarCircuitQuestionSource } from "./types";
import { filterValidQuestions } from "./validator";

/** منبعِ محلی — تا وقتی جدول/اندپوینتِ اختصاصیِ «مدار دستور» ساخته نشده.
 *
 *  هر سؤال پیش از تحویل از اعتبارسنج رد می‌شود، دقیقاً همان‌طور که منبعِ سمتِ
 *  سرور هم باید رد کند: سؤالِ خراب هرگز به دستِ دانش‌آموز نمی‌رسد. */
export class LocalGrammarCircuitSource implements GrammarCircuitQuestionSource {
  constructor(
    private readonly pool: readonly GrammarCircuitQuestion[] = DEMO_GRAMMAR_CIRCUIT_QUESTIONS,
  ) {}

  async getQuestions(options?: {
    limit?: number;
    difficulty?: 1 | 2 | 3;
  }): Promise<GrammarCircuitQuestion[]> {
    let questions = filterValidQuestions(this.pool);
    if (options?.difficulty) {
      questions = questions.filter((q) => q.difficulty === options.difficulty);
    }
    if (options?.limit != null) questions = questions.slice(0, options.limit);
    return questions;
  }
}

/* منبعِ سمتِ سرور هنوز وجود ندارد: در این مخزن نه جدولی برای «مدار دستور» هست
   و نه اندپوینتی زیر app/api/v1. طرحِ پیشنهادیِ جدول و مسیر در گزارشِ این
   تغییر آمده؛ ساختِ migration بدونِ درخواستِ صریح انجام نشده است.

   وقتی آن اندپوینت ساخته شد، فقط همین‌جا یک
   `ApiGrammarCircuitSource implements GrammarCircuitQuestionSource`
   اضافه می‌شود که با `lib/api/client` سؤال‌ها را می‌گیرد و از همان
   `filterValidQuestions` می‌گذراند؛ خودِ بازی دست نمی‌خورد. کلاینت هرگز
   نباید مستقیم به دیتابیس وصل شود. */

export const defaultGrammarCircuitSource: GrammarCircuitQuestionSource =
  new LocalGrammarCircuitSource();
