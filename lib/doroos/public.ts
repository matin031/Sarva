import type { Lesson, LessonAnalysis } from "@/lib/doroos/types";

/**
 * جدا کردنِ بخشِ پولیِ درس از بخشِ رایگان.
 *
 * ⚠️ قفلِ رابط کاربری به‌تنهایی قفل نیست. تا پیش از این، صفحهٔ درس کلِ
 * `syntax` و `devices` هر بیت را در HTML می‌فرستاد و دکمهٔ «+» فقط نمایشش را
 * پنهان می‌کرد — با «View Source» همه‌اش خوانده می‌شد. حالا صفحه فقط نسخهٔ
 * `toPublicLesson` را می‌فرستد و خودِ نقش‌ها از `/api/v1/doroos/analysis`
 * می‌آیند، که پشتِ `requirePlus()` است.
 *
 * ⚠️ عمداً بدونِ `server-only`: منطقِ خالص است و باید در `node --test`
 * قابلِ آزمون باشد.
 */

/** نسخهٔ قابلِ ارسال به هر کسی: بدونِ نقش و آرایه، با دو بولیِ «وجود دارد». */
export function toPublicLesson(lesson: Lesson): Lesson {
  if (lesson.kind === "poem") {
    return {
      ...lesson,
      beyts: lesson.beyts.map(({ syntax, devices, ...rest }) => ({
        ...rest,
        analysis: { syntax: !!syntax?.length, devices: !!devices?.length },
      })),
    };
  }
  return {
    ...lesson,
    passages: lesson.passages.map(({ syntax, devices, ...rest }) => ({
      ...rest,
      analysis: { syntax: !!syntax?.length, devices: !!devices?.length },
    })),
  };
}

/** فقط بخشِ پولی، کلید به شمارهٔ بیت/بند. */
export function extractAnalysis(
  lesson: Lesson,
  { devices = true }: { devices?: boolean } = {},
): LessonAnalysis {
  const units = lesson.kind === "poem" ? lesson.beyts : lesson.passages;
  const out: LessonAnalysis = {};
  for (const unit of units) {
    if (!unit.syntax?.length && !(devices && unit.devices?.length)) continue;
    out[unit.n] = {
      ...(unit.syntax?.length ? { syntax: unit.syntax } : {}),
      ...(devices && unit.devices?.length ? { devices: unit.devices } : {}),
    };
  }
  return out;
}
