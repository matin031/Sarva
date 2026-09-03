import type { Grade, GradeKey, Lesson, LessonRef } from "@/lib/doroos/types";

/**
 * Registry for the درسنامه section.
 *
 * Three books, eighteen lessons each. Titles are filled in only where we
 * actually have them — an unknown lesson renders as «درس ۷» rather than an
 * invented name — and `ready` gates whether it is clickable yet.
 */

export const LESSONS_PER_BOOK = 18;

/**
 * شمارهٔ درس از آدرس.
 *
 * ⚠️ ارقام فارسی هم پذیرفته می‌شوند. کلِ رابط شماره‌ها را فارسی نشان می‌دهد
 * («درس ۱»)، پس کاربری که آدرس را از روی صفحه تایپ یا کپی می‌کند، طبیعتاً
 * `/doroos/yazdahom/۱` می‌سازد — و `Number("۱")` در جاوااسکریپت NaN است، یعنی
 * یک ۴۰۴ برای درسی که وجود دارد.
 *
 * `Number` تنها بعد از این نرمال‌سازی صدا زده می‌شود و ورودی‌هایی مثل "1.5" یا
 * "1e2" یا رشتهٔ خالی هم رد می‌شوند: شمارهٔ درس یک عدد صحیح است، نه هر چیزی که
 * جاوااسکریپت بتواند به عدد تبدیلش کند.
 */
export function parseLessonNumber(raw: string): number | null {
  // ⚠️ اول decode. Next پارامترِ مسیر را **کدشده** می‌دهد، نه رمزگشایی‌شده:
  // برای `/doroos/yazdahom/۱` رشته‌ای که به اینجا می‌رسد `"%DB%B1"` است، نه
  // `"۱"`. بدون این خط، نرمال‌سازیِ ارقام فارسیِ پایین هیچ‌وقت چیزی برای
  // نرمال کردن پیدا نمی‌کرد.
  //
  // decodeURIComponent روی `%` تنها یا دنبالهٔ ناقص استثنا می‌دهد، و
  // آدرس را کاربر می‌سازد — پس داخل try.

  let decoded: string;

  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  // ارقام فارسی (۰-۹، U+06F0..U+06F9) و عربی (٠-٩، U+0660..U+0669)
  // هر دو پذیرفته می‌شوند.
  const normalized = decoded
    .trim()
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  // فقط رقم — نه "1.5"، نه "1e2"، نه رشتهٔ خالی.
  if (!/^\d+$/.test(normalized)) return null;

  const n = Number(normalized);

  return Number.isInteger(n) ? n : null;
}

/**
 * آیا این شماره اصلاً در کتاب هست؟
 * جدا از اینکه محتوایش نوشته شده یا نه.
 */
export function isLessonInBook(number: number): boolean {
  return number >= 1 && number <= LESSONS_PER_BOOK;
}

/**
 * Lesson titles we know, per grade, keyed by lesson number.
 *
 * برای درس‌هایی که عنوان دقیقشان اینجا ثبت نشده،
 * رابط به‌صورت خودکار «درس ۹»، «درس ۱۱» و ... نمایش می‌دهد.
 */
const TITLES: Record<GradeKey, Record<number, string>> = {
  dahom: {},

  yazdahom: {
    1: "نیکی",
    2: "قاضی بُست",
    3: "در امواج سند",
    5: "آغازگری تنها",
    6: "پروردۀ عشق",
    7: "باران محبّت",
    8: "در کوی عاشقان",
    9: "ذوق لطیف",
    10: "بانگ جَرَس",
    11: "یاران عاشق",
    12: "کاوه دادخواه",
    14: "حملۀ حیدری",
    15: "کبوتر طوق‌دار",
    16: "قصّۀ عینکم",
    17: "خاموشی دریا",
    18: "خوان عدل",
  },

  davazdahom: {
    1: "شکر نعمت",
    2: "مست و هشیار",
    3: "آزادی و دفتر زمانه",
    5: "دماوندیه",
    6: "نی‌نامه",
    7: "در حقیقت عشق",
    8: "از پاریز تا پاریس",
    9: "کویر",
    10: "فصل شکوفایی",
    11: "آن شب عزیز",
    12: "گذر سیاوش از آتش",
    13: "خوان هشتم",
    14: "سی‌مرغ و سیمرغ",
    16: "کباب غاز",
    17: "خندۀ تو",
    18: "خندۀ جاودانی",
  },
};

/**
 * Content modules, imported lazily so a lesson's text is only shipped to the
 * reader who opens that lesson — 54 lessons of analysis must never all land
 * in one bundle.
 */
const CONTENT: Partial<
  Record<GradeKey, Record<number, () => Promise<{ default: Lesson }>>>
> = {
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

/**
 * Which lessons are ready, derived from the map above rather than listed
 * separately.
 *
 * The two used to be hand-kept lists and had drifted: lessons could be marked
 * ready even when no content module existed. Now readiness is derived directly
 * from CONTENT, so the list and the actual modules cannot disagree.
 */
function readySet(grade: GradeKey): Set<number> {
  return new Set(Object.keys(CONTENT[grade] ?? {}).map(Number));
}

function buildLessons(grade: GradeKey): LessonRef[] {
  const ready = readySet(grade);

  return Array.from({ length: LESSONS_PER_BOOK }, (_, i) => {
    const number = i + 1;

    return {
      number,
      title: TITLES[grade][number],
      ready: ready.has(number),
    };
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

export async function getLesson(
  grade: string,
  number: number,
): Promise<Lesson | null> {
  const loader = CONTENT[grade as GradeKey]?.[number];

  if (!loader) return null;

  const mod = await loader();

  return mod.default;
}

/**
 * Every (grade, lesson) pair that has content — used to prerender exactly
 * the lesson pages that exist.
 */
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

/**
 * Persian digits, for labels like «درس ۱۲».
 */
export function faNum(n: number | string): string {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}
