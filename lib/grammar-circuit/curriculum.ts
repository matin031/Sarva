import { GRADES } from "@/lib/doroos";
import type { GradeKey } from "@/lib/doroos/types";

/** برنامهٔ درسیِ «مدار دستور».
 *
 *  پایه‌ها و شمارهٔ درس‌ها از `lib/doroos` می‌آیند — همان‌جایی که درسنامه و
 *  واژه‌یاب هم از آن می‌خوانند. اینجا حقیقتِ تازه‌ای از برنامهٔ درسی ساخته
 *  نمی‌شود؛ فقط چیزی که *مخصوصِ این بازی* است اضافه می‌شود.
 *
 *  کلیدِ پایه در سرتاسرِ پروژه رشته است (`dahom` / `yazdahom` / `davazdahom`)،
 *  نه عددِ ۱۰/۱۱/۱۲ — ستونِ `grade` در `vocab_words` هم دقیقاً همین است. عددها
 *  فقط برای خواندنِ آدمی‌اند و در `GRADE_NUMBER` نگه داشته می‌شوند. */

export type { GradeKey };

export const GRAMMAR_CIRCUIT_GRADES = GRADES.map((g) => ({
  key: g.key,
  label: g.label,
  book: g.book,
}));

export const GRADE_KEYS: GradeKey[] = GRAMMAR_CIRCUIT_GRADES.map((g) => g.key);

/** فقط برای نمایش و پیام‌های خطا. کلیدِ رشته‌ای حقیقتِ اصلی است. */
export const GRADE_NUMBER: Record<GradeKey, 10 | 11 | 12> = {
  dahom: 10,
  yazdahom: 11,
  davazdahom: 12,
};

export const LESSONS_PER_GRADE = 18;

/** درس‌های «آزاد» که محتوای دستوریِ این بازی را ندارند.
 *
 *  این‌ها شمارهٔ درسِ نامعتبر نیستند — درس‌های واقعیِ کتاب‌اند که برای «مدار
 *  دستور» محتوایی ندارند. برای همین در *انتخابِ* بازی نمی‌آیند، ولی دیتابیس
 *  عمداً جلویشان را نمی‌گیرد: اگر روزی برای همین درس‌ها هم محتوا ساخته شد،
 *  نباید مجبور به تغییرِ اسکیما شویم. */
export const EXCLUDED_LESSONS: Record<GradeKey, readonly number[]> = {
  dahom: [4, 15],
  yazdahom: [4, 13],
  davazdahom: [4, 15],
};

export function isValidGradeKey(value: unknown): value is GradeKey {
  return typeof value === "string" && (GRADE_KEYS as string[]).includes(value);
}

/** آیا این شمارهٔ درس اصلاً می‌تواند در دیتابیس باشد؟ (۱ تا ۱۸) */
export function isStorableLesson(lesson: number): boolean {
  return Number.isInteger(lesson) && lesson >= 1 && lesson <= LESSONS_PER_GRADE;
}

/** آیا این درس در «مدار دستور» قابلِ انتخاب است؟ درس‌های آزاد نه. */
export function isSelectableLesson(grade: GradeKey, lesson: number): boolean {
  return isStorableLesson(lesson) && !EXCLUDED_LESSONS[grade].includes(lesson);
}

/** شمارهٔ همهٔ درس‌هایی که این پایه در بازی نشان می‌دهد، به ترتیب. */
export function selectableLessons(grade: GradeKey): number[] {
  const out: number[] = [];
  for (let n = 1; n <= LESSONS_PER_GRADE; n++) {
    if (isSelectableLesson(grade, n)) out.push(n);
  }
  return out;
}

/** «درس‌های ۱، ۲ و ۶» — برای صفحهٔ نتیجه. */
export function formatLessonList(lessons: readonly number[]): string {
  const fa = lessons.map((n) => n.toLocaleString("fa-IR"));
  if (fa.length === 0) return "";
  if (fa.length === 1) return fa[0];
  return `${fa.slice(0, -1).join("، ")} و ${fa[fa.length - 1]}`;
}

/** عنوانِ درس، از همان رجیستریِ درسنامه. برای درسی که عنوانش را نداریم
 *  «درس ۷» برمی‌گردد و نه یک نامِ ساختگی — همان قاعدهٔ lib/doroos. */
export function lessonTitle(grade: GradeKey, lesson: number): string {
  const title = GRADES.find((g) => g.key === grade)?.lessons.find(
    (l) => l.number === lesson,
  )?.title;
  return title || `درس ${lesson.toLocaleString("fa-IR")}`;
}

export function gradeLabel(grade: GradeKey): string {
  return GRAMMAR_CIRCUIT_GRADES.find((g) => g.key === grade)?.label ?? grade;
}
