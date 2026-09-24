import type { GradeKey } from "@/lib/doroos/types";

/**
 * کدام درس‌ها نسخهٔ «هوشواره» دارند — فقط شماره‌ها، بی‌خطر برای کلاینت.
 *
 * ⚠️ خودِ فایل‌های `*-ai.ts` اینجا import نمی‌شوند. اگر می‌شدند، هر کسی
 * می‌توانست chunkِ عمومی‌شان را دانلود کند و قفلِ پلاس بی‌اثر می‌شد. بار
 * کردنشان فقط در `lib/doroos/ai.ts` است که `server-only` است و از
 * `/api/v1/doroos/analysis` صدا زده می‌شود.
 *
 * ⚠️ این فهرست و نقشهٔ `AI_LESSONS` در `ai.ts` باید یکی باشند؛
 * `tests/doroos/ai-catalog.test.ts` این را می‌سنجد.
 *
 * افزودنِ یک درس: فایلِ `<پایه>-<شماره>-ai.ts` را بساز، شماره را اینجا و
 * loaderاش را در `ai.ts` اضافه کن.
 */
export const AI_READY: Partial<Record<GradeKey, number[]>> = {
  dahom: [5],
};

/** آیا این درس نسخهٔ هوشواره دارد؟ (برای نشان دادن یا ندادنِ دکمه.) */
export function hasAiLesson(grade: GradeKey | string, number: number): boolean {
  return AI_READY[grade as GradeKey]?.includes(number) ?? false;
}
