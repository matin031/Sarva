import { IHAM } from "./iham";
import { MOTAMMAM } from "./motammam";
import { TASHBIH } from "./tashbih";
import type { Lesson } from "./types";

/** درسنامه‌های تعاملیِ آماده، به ترتیب نمایش. مسیر هر کدام `/learn/<slug>` است. */
export const LESSONS: Lesson[] = [MOTAMMAM, IHAM, TASHBIH];

export const lessonBySlug = (slug: string) => LESSONS.find(lesson => lesson.slug === slug);
/** برای میان‌بُرها: فقط وقتی لینک بده که صفحهٔ مقصد واقعاً وجود دارد. */
export const hasLessonPath = (path: string) => LESSONS.some(lesson => `/learn/${lesson.slug}` === path);
