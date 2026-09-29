import { ESTEARE } from "./esteare";
import { HOSN_TALIL } from "./hosnTalil";
import { IHAM } from "./iham";
import { MAFOOL } from "./mafool";
import { MAJAZ } from "./majaz";
import { MOTAMMAM } from "./motammam";
import { MOZAF_ELAYH } from "./mozafElayh";
import { NAHAD } from "./nahad";
import { PARADOX } from "./paradox";
import { SEFAT } from "./sefat";
import { TASHBIH } from "./tashbih";
import type { Lesson } from "./types";

/** درسنامه‌های تعاملیِ آماده، به ترتیب نمایش. مسیر هر کدام `/learn/<slug>` است. */
export const LESSONS: Lesson[] = [NAHAD, MAFOOL, MOTAMMAM, MOZAF_ELAYH, SEFAT, TASHBIH, ESTEARE, MAJAZ, IHAM, HOSN_TALIL, PARADOX];

export const lessonBySlug = (slug: string) => LESSONS.find(lesson => lesson.slug === slug);
/** برای میان‌بُرها: فقط وقتی لینک بده که صفحهٔ مقصد واقعاً وجود دارد. */
export const hasLessonPath = (path: string) => LESSONS.some(lesson => `/learn/${lesson.slug}` === path);

/** دو قفسهٔ فهرستِ `/learn`، به ترتیبِ پیشنهادیِ خواندن (همان ترتیبِ `LESSONS`). */
export const LESSON_GROUPS = [
  { id: "grammar", hash: "dastoor", title: "دستور زبان", lede: "نقشِ کلمه‌ها توی جمله و گروه؛ از نهاد تا صفت." },
  { id: "figures", hash: "arayeh", title: "آرایه‌های ادبی", lede: "تشبیه تا متناقض‌نما، با مصراع‌های کتابِ خودت." },
] as const satisfies readonly { id: Lesson["group"]; hash: string; title: string; lede: string }[];

/** آنچه کارتِ فهرست از یک درس لازم دارد؛ خودِ قدم‌ها به مرورگر نمی‌روند. */
export type LessonCard = Pick<Lesson, "slug" | "title" | "tagline" | "character" | "group" | "needsName"> & {
  chapters: number;
  minutes: number;
  /** شمارِ قدم‌ها و جای جمع‌بندی، برای خواندنِ پیشرفتِ ذخیره‌شده. */
  beats: number;
  finish: number;
};

export const lessonCard = (lesson: Lesson): LessonCard => ({
  slug: lesson.slug, title: lesson.title, tagline: lesson.tagline, character: lesson.character, group: lesson.group, needsName: lesson.needsName,
  chapters: lesson.beats.filter(beat => beat.kind === "chapter").length,
  // هر قدم به‌طورِ میانگین ده-پانزده ثانیه؛ به پنج دقیقه گرد می‌شود تا ادعای دقیقی نکند.
  minutes: Math.max(5, Math.round(lesson.beats.length * .22 / 5) * 5),
  beats: lesson.beats.length,
  finish: lesson.beats.findIndex(beat => beat.kind === "finish"),
});
