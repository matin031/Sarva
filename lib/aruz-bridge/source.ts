import type { AruzBridgeQuestion, Difficulty } from "./types";
import { buildDemoQuestions } from "./questions";

/**
 * تنها دری که بازی برای گرفتنِ پرسش دارد.
 *
 * صحنهٔ سه‌بعدی و ماشینِ حالت هیچ‌وقت نمی‌دانند پرسش از کجا آمده. امروز از
 * حافظه می‌آید، فردا از یک endpoint؛ آن روز فقط پیاده‌سازیِ دیگری به
 * `AruzBridgeGame` داده می‌شود و هیچ‌چیزِ دیگری عوض نمی‌شود.
 */
export interface QuestionSource {
  /** نامی برای گزارش و اشکال‌زدایی. */
  readonly id: string;
  /** آیا خروجی، دادهٔ نمایشی است؟ HUD بر اساسِ همین نشانِ «نمایشی» را می‌زند. */
  readonly isDemo: boolean;
  load(params: {
    difficulty: Difficulty;
    count: number;
    signal?: AbortSignal;
  }): Promise<AruzBridgeQuestion[]>;
}

/** درهم‌ریزیِ Fisher–Yates روی یک کپی. */
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * منبعِ محلی: دادهٔ نمایشیِ درونِ باندل.
 *
 * ⚠️ دیگر منبعِ پیش‌فرضِ بازی نیست — پرسش‌ها از دیتابیس می‌آیند. این کلاس
 * برای تست و توسعهٔ آفلاین می‌ماند، و خروجی‌اش همچنان `isDemo` است تا اگر
 * جایی به‌کار رفت، رابطِ کاربری نشانِ «دادهٔ نمایشی» را نشان بدهد.
 */
export class LocalQuestionSource implements QuestionSource {
  readonly id = "local-demo";
  readonly isDemo = true;

  constructor(private readonly random: () => number = Math.random) {}

  async load({
    difficulty,
    count,
  }: {
    difficulty: Difficulty;
    count: number;
  }): Promise<AruzBridgeQuestion[]> {
    const all = buildDemoQuestions(difficulty, this.random);
    return shuffled(all, this.random).slice(0, count);
  }
}

/**
 * منبعِ اصلیِ بازی: جدولِ `aruz_bridge_questions`.
 *
 * پاسخ در پوششِ استانداردِ `lib/api/http` می‌آید — `{ ok, data }` — و
 * `data.questions` آرایهٔ پرسش‌هاست.
 *
 * توجه: این پروژه روی Supabase نیست؛ دسترسی به داده از راهِ `lib/db` و
 * مسیرهای `app/api/v1/**` انجام می‌شود و *قاعدهٔ دسترسی در کدِ برنامه است،
 * نه در دیتابیس*. شرطِ `is_published` در خودِ کوئریِ آن مسیر نوشته شده.
 */
export class RemoteQuestionSource implements QuestionSource {
  readonly id = "remote";
  readonly isDemo = false;

  constructor(private readonly endpoint = "/api/v1/aruz-bridge/questions") {}

  async load({
    difficulty,
    count,
    signal,
  }: {
    difficulty: Difficulty;
    count: number;
    signal?: AbortSignal;
  }): Promise<AruzBridgeQuestion[]> {
    /* بازی کلِ مخزن را می‌خواهد تا خودش نمونه‌گیری کند و بتواند پیش از شروع
       بگوید چند پرسشِ یکتا موجود است. `count` اینجا فقط یک سقف است؛ سقفِ
       واقعی سمتِ سرور اعمال می‌شود. */
    const url = new URL(this.endpoint, window.location.origin);
    if (Number.isFinite(count) && count > 0) {
      url.searchParams.set("limit", String(Math.min(count, 1000)));
    }
    void difficulty; // صافیِ سختی سمتِ سرور هست ولی بازی خودش نمونه می‌گیرد

    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`دریافتِ پرسش‌ها ناموفق بود (${res.status})`);

    const body: unknown = await res.json();
    const payload =
      typeof body === "object" && body !== null && "data" in body
        ? (body as { data: unknown }).data
        : body;
    const rows =
      typeof payload === "object" && payload !== null && "questions" in payload
        ? (payload as { questions: unknown }).questions
        : payload;

    if (!Array.isArray(rows)) throw new Error("قالبِ پاسخِ پرسش‌ها نامعتبر است.");
    return rows as AruzBridgeQuestion[];
  }
}

/**
 * منبعِ راه‌دور با عقب‌نشینی به دادهٔ محلی.
 *
 * تا وقتی endpoint وجود ندارد این دقیقاً مثلِ `LocalQuestionSource` رفتار
 * می‌کند، و روزی که بالا آمد بدونِ تغییرِ کد شروع به استفاده از آن می‌کند.
 */
export class FallbackQuestionSource implements QuestionSource {
  readonly id = "remote-with-local-fallback";
  private usedFallback = true;

  constructor(
    private readonly primary: QuestionSource,
    private readonly fallback: QuestionSource = new LocalQuestionSource(),
  ) {}

  get isDemo() {
    return this.usedFallback ? this.fallback.isDemo : this.primary.isDemo;
  }

  async load(params: {
    difficulty: Difficulty;
    count: number;
    signal?: AbortSignal;
  }): Promise<AruzBridgeQuestion[]> {
    try {
      const rows = await this.primary.load(params);
      if (rows.length) {
        this.usedFallback = false;
        return rows;
      }
    } catch (err) {
      // لغوِ عمدی (خروج از صفحه) نباید به عقب‌نشینی تعبیر شود.
      if (err instanceof DOMException && err.name === "AbortError") throw err;
    }
    this.usedFallback = true;
    return this.fallback.load(params);
  }
}
