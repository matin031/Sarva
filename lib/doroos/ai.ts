import "server-only";

import type { GradeKey, Lesson } from "@/lib/doroos/types";

/**
 * نسخهٔ «هوشواره»ی درس‌ها — **فقط سرور**.
 *
 * برای هر درس می‌توان یک فایلِ دوم داشت که همان درس را با تحلیلِ تولیدشده
 * به‌دستِ هوش مصنوعی نگه می‌دارد: `dahom-05.ts` و کنارش `dahom-05-ai.ts`.
 * شکلِ هر دو یکی است (`PoemLesson`/`ProseLesson`)، پس ساختنِ نسخهٔ هوشواره
 * یعنی «تولیدِ دوبارهٔ همان درس».
 *
 * ⚠️ `server-only`: نسخهٔ اول این فایل را کلاینت import می‌کرد و فایلِ
 * هوشواره یک chunkِ عمومی بود (`lib_doroos_content_dahom-05-ai_ts_*.js`) —
 * هر کسی بی‌اشتراک دانلودش می‌کرد. حالا فقط `/api/v1/doroos/analysis` آن را
 * بار می‌کند، آن هم بعد از `requirePlus()`.
 *
 * ⚠️ کلیدهای این نقشه باید با `AI_READY` در `ai-catalog.ts` یکی باشند.
 */

type AiLoader = () => Promise<{ default: Lesson }>;

const AI_LESSONS: Partial<Record<GradeKey, Record<number, AiLoader>>> = {
  dahom: {
    5: () => import("@/lib/doroos/content/dahom-05-ai"),
  },
};

export async function loadAiLesson(grade: string, number: number): Promise<Lesson | null> {
  const loader = AI_LESSONS[grade as GradeKey]?.[number];
  if (!loader) return null;
  return (await loader()).default;
}
