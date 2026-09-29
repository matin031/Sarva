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
