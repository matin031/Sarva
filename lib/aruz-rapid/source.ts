import type { RapidAruzQuestion } from "./types";
import { screenRapidAruzQuestions } from "./validator";
import { DEMO_RAPID_ARUZ_QUESTIONS } from "./demo-questions";

export interface RapidAruzQuery {
  /** بیشترین تعدادِ مصراعِ خواسته‌شده. */
  limit?: number;
  /** ترتیبِ نشست یک‌بار همین‌جا قطعی می‌شود و بعد دیگر عوض نمی‌شود. */
  shuffle?: boolean;
}

export interface RapidAruzQuestionSource {
  getQuestions(query: RapidAruzQuery): Promise<RapidAruzQuestion[]>;
}

/** جابه‌جاییِ Fisher–Yates. یک‌بار در شروعِ نشست صدا زده می‌شود، نه در رندر. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * منبعِ محلی: دادهٔ نمایشی، بدون شبکه.
 *
 * اعتبارسنجی همین‌جا انجام می‌شود، پس سؤالِ خراب اصلاً به بازی نمی‌رسد —
 * چه از این منبع بیاید چه بعداً از API.
 */
export class LocalRapidAruzSource implements RapidAruzQuestionSource {
  private readonly pool: RapidAruzQuestion[];

  constructor(questions: RapidAruzQuestion[] = DEMO_RAPID_ARUZ_QUESTIONS) {
    this.pool = screenRapidAruzQuestions(questions).questions;
  }

  async getQuestions(query: RapidAruzQuery): Promise<RapidAruzQuestion[]> {
    const { limit, shuffle = true } = query;
    const ordered = shuffle ? shuffled(this.pool) : this.pool.slice();
    return limit != null ? ordered.slice(0, limit) : ordered;
  }
}

/*
 * منبعِ بک‌اند — عمداً هنوز نوشته نشده.
 *
 * سروا روی PostgreSQLِ خودمیزبان است (lib/db + app/api/v1/**) و هیچ جدولی
 * برای تقطیعِ تأییدشده ندارد. تا وقتی آن جدول و endpointش وجود ندارد، ساختنِ
 * یک migration الکی بدهی است، نه سرمایه. وقتی آماده شد:
 *
 *   class ApiRapidAruzSource implements RapidAruzQuestionSource {
 *     async getQuestions(q) {
 *       const res = await fetch(`/api/v1/aruz-rapid/questions?...`);
 *       return screenRapidAruzQuestions(await res.json()).questions;
 *     }
 *   }
 *
 * کلاینت هرگز مستقیم به دیتابیس وصل نمی‌شود و هیچ SQL ای اینجا نمی‌آید؛
 * فیلترِ «فقط محتوای منتشرشده» هم کارِ همان route است، نه کارِ مرورگر.
 */

export const defaultRapidAruzSource: RapidAruzQuestionSource = new LocalRapidAruzSource();
