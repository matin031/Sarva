import type { Grade, GradeKey, Lesson, LessonRef } from "@/lib/doroos/types";

/** Registry for the درسنامه section.
 *
 *  Three books, eighteen lessons each. Titles are filled in only where we
 *  actually have them — an unknown lesson renders as «درس ۷» rather than an
 *  invented name — and `ready` gates whether it is clickable yet. */

const LESSONS_PER_BOOK = 18;

/** Lesson titles we know, per grade, keyed by lesson number. */
const TITLES: Record<GradeKey, Record<number, string>> = {
  dahom: {},
  yazdahom: { 1: "روباهِ بی‌دست‌وپا" },
  davazdahom: {},
};

/** Lesson numbers that have content wired up, per grade. */
const READY: Record<GradeKey, number[]> = {
  dahom: [],
  yazdahom: [1],
  davazdahom: [],
};

function buildLessons(grade: GradeKey): LessonRef[] {
  const ready = new Set(READY[grade]);
  return Array.from({ length: LESSONS_PER_BOOK }, (_, i) => {
    const number = i + 1;
    return { number, title: TITLES[grade][number], ready: ready.has(number) };
  });
}

export const GRADES: Grade[] = [
  {
    key: "dahom",
    label: "دهم",
    book: "فارسی ۱",
    lessons: buildLessons("dahom"),
  },
  {
    key: "yazdahom",
    label: "یازدهم",
    book: "فارسی ۲",
    lessons: buildLessons("yazdahom"),
  },
  {
    key: "davazdahom",
    label: "دوازدهم",
    book: "فارسی ۳",
    lessons: buildLessons("davazdahom"),
  },
];

export const GRADE_KEYS = GRADES.map((g) => g.key);

export function getGrade(key: string): Grade | undefined {
  return GRADES.find((g) => g.key === key);
}

/** Content modules, imported lazily so a lesson's text is only shipped to the
 *  reader who opens that lesson — 54 lessons of analysis must never all land in
 *  one bundle. */
const CONTENT: Partial<
  Record<GradeKey, Record<number, () => Promise<{ default: Lesson }>>>
> = {
  yazdahom: {
    1: () => import("@/lib/doroos/content/yazdahom-01"),
  },
};

export async function getLesson(
  grade: string,
  number: number,
): Promise<Lesson | null> {
  const loader = CONTENT[grade as GradeKey]?.[number];
  if (!loader) return null;
  const mod = await loader();
  return mod.default;
}

/** Every (grade, lesson) pair that has content — used to prerender exactly the
 *  lesson pages that exist. */
export function readyLessonParams(): { grade: string; lesson: string }[] {
  return GRADES.flatMap((g) =>
    g.lessons
      .filter((l) => l.ready)
      .map((l) => ({ grade: g.key, lesson: String(l.number) })),
  );
}

/** Persian digits, for labels like «درس ۱۲». */
export function faNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
