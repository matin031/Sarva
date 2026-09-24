import "server-only";

import type { Grade, GradeKey, Lesson, LessonRef } from "@/lib/doroos/types";
import { GRADE_META, LESSONS_PER_BOOK, LESSON_TITLES } from "@/lib/doroos/catalog";

export {
  faNum,
  GRADE_META,
  isLessonInBook,
  LESSON_TITLES,
  LESSONS_PER_BOOK,
  parseLessonNumber,
} from "@/lib/doroos/catalog";

/**
 * Registry for the درسنامه section — **server only**.
 *
 * Three books, eighteen lessons each. Titles live in `catalog.ts` (safe for
 * the client); this file adds the one thing only the server may know: the
 * content itself, and from it, which lessons are ready.
 *
 * ⚠️ `server-only` است چون نقشهٔ `import()`ِ پایینی، اگر به bundleِ کلاینت
 * برسد، کلِ تحلیلِ همهٔ درس‌ها را chunkِ عمومی می‌کند. کلاینت از
 * `@/lib/doroos/catalog` می‌خواند.
 */

/**
 * Content modules, imported lazily so a lesson's text is only shipped to the
 * reader who opens that lesson — 54 lessons of analysis must never all land
 * in one bundle.
 */
const CONTENT: Partial<
  Record<GradeKey, Record<number, () => Promise<{ default: Lesson }>>>
> = {
  dahom: {
    1: () => import("@/lib/doroos/content/dahom-01"),
    2: () => import("@/lib/doroos/content/dahom-02"),
    3: () => import("@/lib/doroos/content/dahom-03"),
    5: () => import("@/lib/doroos/content/dahom-05"),
    6: () => import("@/lib/doroos/content/dahom-06"),
    7: () => import("@/lib/doroos/content/dahom-07"),
    8: () => import("@/lib/doroos/content/dahom-08"),
    9: () => import("@/lib/doroos/content/dahom-09"),
    10: () => import("@/lib/doroos/content/dahom-10"),
    11: () => import("@/lib/doroos/content/dahom-11"),
    12: () => import("@/lib/doroos/content/dahom-12"),
    13: () => import("@/lib/doroos/content/dahom-13"),
    14: () => import("@/lib/doroos/content/dahom-14"),
    16: () => import("@/lib/doroos/content/dahom-16"),
    17: () => import("@/lib/doroos/content/dahom-17"),
    18: () => import("@/lib/doroos/content/dahom-18"),
  },

  yazdahom: {
    1: () => import("@/lib/doroos/content/yazdahom-01"),
    2: () => import("@/lib/doroos/content/yazdahom-02"),
    3: () => import("@/lib/doroos/content/yazdahom-03"),
    5: () => import("@/lib/doroos/content/yazdahom-05"),
    6: () => import("@/lib/doroos/content/yazdahom-06"),
    7: () => import("@/lib/doroos/content/yazdahom-07"),
    8: () => import("@/lib/doroos/content/yazdahom-08"),
    9: () => import("@/lib/doroos/content/yazdahom-09"),
    10: () => import("@/lib/doroos/content/yazdahom-10"),
    11: () => import("@/lib/doroos/content/yazdahom-11"),
    12: () => import("@/lib/doroos/content/yazdahom-12"),
    14: () => import("@/lib/doroos/content/yazdahom-14"),
    15: () => import("@/lib/doroos/content/yazdahom-15"),
    16: () => import("@/lib/doroos/content/yazdahom-16"),
    17: () => import("@/lib/doroos/content/yazdahom-17"),
    18: () => import("@/lib/doroos/content/yazdahom-18"),
  },

  davazdahom: {
    1: () => import("@/lib/doroos/content/davazdahom-01"),
    2: () => import("@/lib/doroos/content/davazdahom-02"),
    3: () => import("@/lib/doroos/content/davazdahom-03"),
    5: () => import("@/lib/doroos/content/davazdahom-05"),
    6: () => import("@/lib/doroos/content/davazdahom-06"),
    7: () => import("@/lib/doroos/content/davazdahom-07"),
    8: () => import("@/lib/doroos/content/davazdahom-08"),
    9: () => import("@/lib/doroos/content/davazdahom-09"),
    10: () => import("@/lib/doroos/content/davazdahom-10"),
    11: () => import("@/lib/doroos/content/davazdahom-11"),
    12: () => import("@/lib/doroos/content/davazdahom-12"),
    13: () => import("@/lib/doroos/content/davazdahom-13"),
    14: () => import("@/lib/doroos/content/davazdahom-14"),
    16: () => import("@/lib/doroos/content/davazdahom-16"),
    17: () => import("@/lib/doroos/content/davazdahom-17"),
    18: () => import("@/lib/doroos/content/davazdahom-18"),
  },
};

function readySet(grade: GradeKey): Set<number> {
  return new Set(Object.keys(CONTENT[grade] ?? {}).map(Number));
}

function buildLessons(grade: GradeKey): LessonRef[] {
  const ready = readySet(grade);

  return Array.from({ length: LESSONS_PER_BOOK }, (_, i) => {
    const number = i + 1;

    return {
      number,
      title: LESSON_TITLES[grade][number],
      ready: ready.has(number),
    };
  });
}

export const GRADES: Grade[] = GRADE_META.map((g) => ({
  ...g,
  lessons: buildLessons(g.key),
}));

export const GRADE_KEYS = GRADES.map((g) => g.key);

export function getGrade(key: string): Grade | undefined {
  return GRADES.find((g) => g.key === key);
}

export async function getLesson(
  grade: string,
  number: number,
): Promise<Lesson | null> {
  const loader = CONTENT[grade as GradeKey]?.[number];

  if (!loader) return null;

  const mod = await loader();
  return mod.default;
}

export function readyLessonParams(): {
  grade: string;
  lesson: string;
}[] {
  return GRADES.flatMap((g) =>
    g.lessons
      .filter((l) => l.ready)
      .map((l) => ({
        grade: g.key,
        lesson: String(l.number),
      })),
  );
}
