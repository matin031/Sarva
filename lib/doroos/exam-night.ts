import "server-only";

import { GRADES, faNum, getLesson } from "@/lib/doroos";
import type { GradeKey, Lesson } from "@/lib/doroos/types";

/**
 * «شب امتحان» — همان درسنامه، فشرده برای مرورِ آخر.
 *
 * ⚠️ هیچ محتوای تازه‌ای اینجا نوشته نمی‌شود. هرچه صفحهٔ شب امتحان نشان
 * می‌دهد از خودِ درسنامه می‌آید (مفهوم، معنی، قلمرو ادبی و جمع‌بندی)، پس با
 * ویرایشِ یک درس، برگهٔ شب امتحانش هم خودبه‌خود درست می‌شود و دو نسخه از یک
 * حرف هیچ‌وقت از هم جدا نمی‌افتند.
 *
 * ⚠️ نقشِ دستوری و آرایه‌های روی واژه (`syntax` و `devices`) پشتِ سروا
 * پلاس‌اند و اینجا هرگز خوانده نمی‌شوند؛ فقط فیلدهایی که صفحهٔ عمومیِ درس
 * هم نشان می‌دهد.
 */

/** یک بیت یا بند، به کوتاه‌ترین شکلی که هنوز قابلِ مرور است. */
export type ReviewUnit = {
  n: number;
  /** «verse» دو مصراع است و «prose» یک تکهٔ کوتاه از آغازِ بند. */
  form: "verse" | "prose";
  lines: string[];
  concept: string | null;
  meaning: string | null;
  literary: string[];
};

export type ReviewSheet = {
  grade: GradeKey;
  number: number;
  title: string;
  /** شاعر یا نویسنده */
  by: string | null;
  kind: Lesson["kind"];
  intro: string | null;
  units: ReviewUnit[];
  wrapUp: { title: string; body: string }[];
};

/** یک درس در فهرستِ شب امتحان. */
export type ReviewLessonRef = {
  number: number;
  title: string;
  ready: boolean;
  /** چند مفهوم برای مرور دارد — برای برآوردِ زمان. */
  concepts: number;
};

export type ReviewGrade = {
  key: GradeKey;
  label: string;
  book: string;
  lessons: ReviewLessonRef[];
};

/** بندِ نثر تا چند نویسه در برگه می‌آید. متنِ کامل در خودِ درسنامه است؛
 *  اینجا فقط باید یادآوری کند کدام بند است. */
const PROSE_SNIPPET = 150;

function snippet(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= PROSE_SNIPPET) return clean;
  // روی مرزِ واژه می‌بُرد، نه وسطِ یک کلمه.
  const cut = clean.slice(0, PROSE_SNIPPET);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 80 ? space : PROSE_SNIPPET)}…`;
}

export function toReviewSheet(lesson: Lesson): ReviewSheet {
  const units: ReviewUnit[] =
    lesson.kind === "poem"
      ? lesson.beyts.map((b) => ({
          n: b.n,
          form: "verse",
          lines: [...b.hemistichs],
          concept: b.concept || null,
          meaning: b.meaning || null,
          literary: b.literary ?? [],
        }))
      : lesson.passages.map((p) => ({
          n: p.n,
          form: p.form === "verse" ? "verse" : "prose",
          lines: p.form === "verse" ? p.lines : [snippet(p.lines.join(" "))],
          concept: p.concept || null,
          meaning: p.meaning || null,
          literary: p.literary ?? [],
        }));

  return {
    grade: lesson.grade,
    number: lesson.number,
    title: lesson.title,
    by: (lesson.kind === "poem" ? lesson.poet : lesson.author) ?? null,
    kind: lesson.kind,
    intro: lesson.intro ?? null,
    // بندی که نه مفهوم دارد و نه معنی، در مرورِ شب امتحان چیزی نمی‌گوید.
    units: units.filter((u) => u.concept || u.meaning),
    wrapUp: lesson.wrapUp ?? [],
  };
}

export async function getReviewSheet(grade: string, number: number): Promise<ReviewSheet | null> {
  const lesson = await getLesson(grade, number);
  return lesson ? toReviewSheet(lesson) : null;
}

/** فهرستِ هر سه کتاب با شمارِ مفهوم‌های هر درس.
 *
 *  ⚠️ این یعنی بارگذاریِ همهٔ درس‌های آماده روی سرور. صفحه ایستا ساخته
 *  می‌شود، پس این کار یک بار و در زمانِ build انجام می‌شود و نه در هر
 *  درخواست. */
export async function reviewGrades(): Promise<ReviewGrade[]> {
  return Promise.all(
    GRADES.map(async (g) => ({
      key: g.key,
      label: g.label,
      book: g.book,
      lessons: await Promise.all(
        g.lessons.map(async (l) => {
          const lesson = l.ready ? await getLesson(g.key, l.number) : null;
          const units = lesson ? (lesson.kind === "poem" ? lesson.beyts : lesson.passages) : [];
          return {
            number: l.number,
            title: l.title ?? lesson?.title ?? `درس ${faNum(l.number)}`,
            ready: !!lesson,
            concepts: units.filter((u) => u.concept).length,
          };
        }),
      ),
    })),
  );
}
