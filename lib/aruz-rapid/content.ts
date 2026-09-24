import "server-only";
import { query } from "@/lib/db";
import { recordError } from "@/lib/admin/audit";
import { DEMO_RAPID_ARUZ_QUESTIONS } from "./demo-questions";
import { screenRapidAruzQuestions } from "./validator";
import { readStoredUnits, withRevealProgress } from "./units";
import type { RapidAruzQuestion } from "./types";

/**
 * مصراع‌های بازی «کوتاه یا بلند؟» — از دیتابیس.
 *
 * ⚠️ همان قاعدهٔ «همه یا هیچ»ِ جفت‌های ادبی: تا وقتی جدول خالی است، بازی با
 * پنج مصراعِ نمایشیِ داخلِ کد کار می‌کند؛ به‌محضِ ثبتِ اولین مصراع، *فقط*
 * دادهٔ مدیر بازی می‌شود. قاطی کردنشان یعنی دانش‌آموز دادهٔ نمایشی را
 * ـ که خودش می‌گوید مرجع نیست ـ کنارِ محتوای تأییدشده می‌بیند و فرقشان را
 * نمی‌داند.
 */
export type RapidAruzContent = {
  questions: RapidAruzQuestion[];
  /** false یعنی جدول خالی بود و دارد از دادهٔ نمایشی استفاده می‌شود. */
  fromDatabase: boolean;
};

type QuestionRow = {
  id: string;
  preview_text: string;
  units: unknown;
  meter: string;
  attribution: string;
  explanation: string | null;
  has_unit_overlap: boolean | number;
};

export async function loadRapidAruzQuestions(): Promise<RapidAruzContent> {
  let rows: QuestionRow[];
  try {
    rows = await query<QuestionRow>(
      `select id, preview_text, units, meter, attribution, explanation, has_unit_overlap
         from aruz_rapid_questions
        where is_published = 1
        order by sort_index, preview_text`,
    );
  } catch (err) {
    // خواندنِ ناموفق نباید صفحهٔ بازی را از کار بیندازد؛ دادهٔ نمایشی همیشه هست.
    await recordError("db", err, "loadRapidAruzQuestions");
    rows = [];
  }

  if (rows.length === 0) {
    return { questions: DEMO_RAPID_ARUZ_QUESTIONS, fromDatabase: false };
  }

  const questions: RapidAruzQuestion[] = rows.map((r) => ({
    id: r.id,
    type: "hemistich",
    previewText: r.preview_text,
    units: withRevealProgress(readStoredUnits(r.units), r.id),
    meter: r.meter || undefined,
    attribution: r.attribution || undefined,
    explanation: r.explanation || undefined,
    hasUnitTextOverlap: Boolean(r.has_unit_overlap),
  }));

  /* همان اعتبارسنجی‌ای که بازی روی دادهٔ محلی اجرا می‌کند، اینجا هم اجرا
     می‌شود: ردیفی که مثلاً واحدهایش خراب خوانده شده‌اند نباید به دانش‌آموز
     برسد. اگر *همه* رد شدند، دادهٔ نمایشی بهتر از یک بازیِ خالی است. */
  const screened = screenRapidAruzQuestions(questions);
  if (screened.questions.length === 0) {
    return { questions: DEMO_RAPID_ARUZ_QUESTIONS, fromDatabase: false };
  }

  return { questions: screened.questions, fromDatabase: true };
}
