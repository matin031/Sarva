import type { SeedExam } from "./seed-types";

import { farsi3Khordad1400 } from "./12/farsi3/farsi3-1400-khordad";
import { farsi3Dey1401 } from "./12/farsi3/farsi3-1401-dey";
import { farsi3Shahrivar1402 } from "./12/farsi3/farsi3-1402-shahrivar";
import { farsi3Kherdad1403 } from "./12/farsi3/farsi3-1403-kherdad";
import { farsi3Mordad1403 } from "./12/farsi3/farsi3-1403-mordad";
import { farsi3Khordad1404 } from "./12/farsi3/farsi3-1404-khordad";
import { farsi3Shahrivar1404 } from "./12/farsi3/farsi3-1404-shahrivar";

import { olumFonoon3Khordad1400 } from "./12/olum-fonoon3/olum-fonoon3-1400-khordad";
import { olumFonoon3Khordad1401 } from "./12/olum-fonoon3/olum-fonoon3-1401-khordad";
import { olumFonoon3Shahrivar1401 } from "./12/olum-fonoon3/olum-fonoon3-1401-shahrivar";
import { olumFonoon3Khordad1402 } from "./12/olum-fonoon3/olum-fonoon3-1402-khordad";
import { olumFonoon3Shahrivar1402 } from "./12/olum-fonoon3/olum-fonoon3-1402-shahrivar";
import { olumFonoon3Khordad1403 } from "./12/olum-fonoon3/olum-fonoon3-1403-khordad";
import { olumFonoon3Shahrivar1403 } from "./12/olum-fonoon3/olum-fonoon3-1403-shahrivar";
import { olumFonoon3Khordad1404 } from "./12/olum-fonoon3/olum-fonoon3-1404-khordad";
import { olumFonoon3Shahrivar1404 } from "./12/olum-fonoon3/olum-fonoon3-1404-shahrivar";
import { olumFonoon3Mordad1405 } from "./12/olum-fonoon3/olum-fonoon3-1405-mordad";

/**
 * همهٔ آزمون‌های ایستا، یک‌جا. seed-exams، validate-exam-seeds، exam-preview و
 * تست‌ها همه از همین فهرست می‌خوانند؛ آزمونِ تازه فقط اینجا اضافه می‌شود.
 *
 * پوشه‌بندی: `<پایه>/<کتاب>/<کتاب>-<سال>-<ماه>.ts` — مثلاً `12/farsi3/`.
 *
 * `examSession` کلیدِ یکتای آزمون در دیتابیس و آدرسِ `/exam/<examSession>` است.
 * «1403-kherdad» و «1401-dey» بی‌پیشوندند چون پیش از این روی سایت بوده‌اند و
 * عوض‌کردنشان آدرس‌ها و پیوندِ آزمون‌های داده‌شده را می‌شکند.
 */
export const seedExams: readonly SeedExam[] = [
  // ---- پایهٔ دوازدهم: فارسی ۳
  farsi3Khordad1400,
  farsi3Dey1401,
  farsi3Shahrivar1402,
  farsi3Kherdad1403,
  farsi3Mordad1403,
  farsi3Khordad1404,
  farsi3Shahrivar1404,
  // ---- پایهٔ دوازدهم: علوم و فنون ادبی ۳
  olumFonoon3Khordad1400,
  olumFonoon3Khordad1401,
  olumFonoon3Shahrivar1401,
  olumFonoon3Khordad1402,
  olumFonoon3Shahrivar1402,
  olumFonoon3Khordad1403,
  olumFonoon3Shahrivar1403,
  olumFonoon3Khordad1404,
  olumFonoon3Shahrivar1404,
  olumFonoon3Mordad1405,
];

export function findSeedExam(examSession: string): SeedExam | undefined {
  return seedExams.find((e) => e.examSession === examSession);
}
