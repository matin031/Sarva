import type { GradeKey } from "@/lib/doroos/types";

/** مدلِ دادهٔ «مدار دستور».
 *
 *  دو قاعدهٔ سفت‌وسختِ این مدل که همه‌جای بازی به آن تکیه می‌کند:
 *
 *  ۱) منطق فقط با `key` کار می‌کند. برچسبِ فارسی (`label`) صرفاً نمایشی است و
 *     هیچ جای بازی نباید با آن مقایسه شود — دو نقش می‌توانند برچسبِ یکسان
 *     داشته باشند و یک نقش می‌تواند بعداً برچسبش عوض شود.
 *
 *  ۲) متنِ جمله از قبل توکِنایز شده می‌آید. بازی هیچ‌وقت `split(" ")` نمی‌زند؛
 *     نیم‌فاصله، نشانه‌گذاری و واژه‌های مرکب چیزی نیست که در زمان اجرا بشود
 *     حدس زد. جداکنندهٔ بعد از هر توکن هم صریح در داده است.
 */

export interface GrammarRoleDefinition {
  /** شناسهٔ ماشینیِ نقش — تنها چیزی که منطق با آن کار می‌کند. */
  key: string;
  /** برچسبِ فارسیِ نمایشی. هرگز مبنای اعتبارسنجی نیست. */
  label: string;
  /** توضیحِ کوتاهِ اختیاری برای صفحهٔ نتیجه. */
  hint?: string;
}

/** یک قطعهٔ مدار در سینیِ نقش‌ها.
 *
 *  قطعه یک *نمونه* است، نه یک نوع: دو قطعه با `roleKey` یکسان کاملاً مجازند و
 *  هرکدام شناسهٔ مستقلِ خودشان را دارند. هر نمونه در هر سؤال فقط یک بار مصرف
 *  می‌شود. */
export interface GrammarRolePiece {
  id: string;
  roleKey: string;
}

export interface GrammarRoleSlot {
  /** نقش‌هایی که منبعِ علمی برای این واژه معتبر می‌داند. */
  acceptedRoleKeys: string[];
}

export interface GrammarCircuitToken {
  id: string;
  /** متنِ دقیقِ نمایشی. */
  text: string;
  /** جداکنندهٔ دقیقِ بعد از توکن (فاصله، نیم‌فاصله، «، »، «» و ...). */
  separatorAfter: string;
  /** نبودش یعنی این واژه نمایش داده می‌شود ولی سوکتِ دستوری ندارد. */
  roleSlot?: GrammarRoleSlot;
}

export type GrammarCircuitQuestionType = "sentence" | "hemistich" | "verse";

export interface GrammarCircuitQuestion {
  id: string;
  /** شناسهٔ پایدارِ ردیف در بستهٔ محتوایی — مبنای ورودِ دوبارهٔ idempotent. */
  sourceId?: string;
  /** پایه و درس؛ برای صفحهٔ نتیجه و تحلیل‌های بعدی همراهِ سؤال می‌مانند. */
  grade?: GradeKey;
  lesson?: number;
  type: GrammarCircuitQuestionType;
  tokens: GrammarCircuitToken[];
  roleDefinitions: GrammarRoleDefinition[];
  pieces: GrammarRolePiece[];
  /** ترتیبِ معناییِ مدار. اگر نبود، ترتیبِ توکن‌های دارای سوکت در داده. */
  circuitOrder?: string[];
  explanation?: string;
  /** مأخذِ بیت/جمله — در صفحهٔ نتیجه نشان داده می‌شود. */
  attribution?: string;
  difficulty?: 1 | 2 | 3;
  /** دادهٔ نمایشی؛ محتوای آموزشیِ تأییدشده نیست. */
  isDemo?: boolean;
}

/* ---------------------------------------------------------------- */

/** یک سوکتِ آمادهٔ بازی: توکن + جایگاهش در ترتیبِ مدار. */
export interface PreparedSlot {
  tokenId: string;
  /** اندیسِ توکن در `question.tokens` — برای ترتیبِ چیدمانِ افقی. */
  tokenIndex: number;
  acceptedRoleKeys: readonly string[];
}

/** عکسِ فوریِ تغییرناپذیرِ سؤال در لحظهٔ شروع.
 *
 *  ترتیبِ قطعه‌ها اینجا و فقط یک بار بُر می‌خورد؛ رندرِ دوبارهٔ React هرگز
 *  نباید سینی را دوباره بُر بزند. */
export interface PreparedQuestion {
  question: GrammarCircuitQuestion;
  /** ترتیبِ *معناییِ* بررسی: از راست‌ترین هدف به چپ‌ترین. یک بار در همین
   *  عکسِ فوری ثابت می‌شود و هیچ‌وقت از مختصاتِ DOM بازمحاسبه نمی‌شود. */
  validationOrder: readonly string[];
  /** سوکت‌ها به ترتیبِ معناییِ مدار (Power ← ... ← Lamp). */
  circuitSlots: readonly PreparedSlot[];
  /** سوکت‌ها به ترتیبِ ظاهرشدن در جمله — مبنای چیدمانِ افقی. */
  layoutSlots: readonly PreparedSlot[];
  /** قطعه‌ها با ترتیبِ نهاییِ سینی. */
  trayPieces: readonly GrammarRolePiece[];
  slotByTokenId: ReadonlyMap<string, PreparedSlot>;
  pieceById: ReadonlyMap<string, GrammarRolePiece>;
  roleByKey: ReadonlyMap<string, GrammarRoleDefinition>;
  requiredSlotCount: number;
}

/** منبعِ سؤال. پیاده‌سازیِ محلی و پیاده‌سازیِ سمتِ سرور هر دو این را برآورده
 *  می‌کنند تا جایگزینیِ منبع، بازی را دست نزند. */
export interface GrammarCircuitQuestionSource {
  getQuestions(options: {
    grade: GradeKey;
    lessons: readonly number[];
    limit?: number;
    signal?: AbortSignal;
  }): Promise<GrammarCircuitQuestion[]>;
}

/** پایه و درس‌هایی که یک جلسه رویشان بسته شده. بعد از «شروع تمرین» تغییر
 *  نمی‌کند — نه با تمِ صفحه، نه با چرخش، نه با رندرِ دوباره. */
export interface GrammarCircuitSessionConfig {
  grade: GradeKey;
  lessons: number[];
}

/** موجودیِ محتوا برای صفحهٔ انتخاب. */
export interface GrammarCircuitAvailability {
  grades: Array<{
    grade: GradeKey;
    lessons: Array<{ lesson: number; available: boolean; questionCount: number }>;
  }>;
}

export type PlacementInputMethod = "pointer" | "tap" | "keyboard";
