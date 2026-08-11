import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  faNum,
  getGrade,
  getLesson,
  isLessonInBook,
  parseLessonNumber,
  readyLessonParams,
} from "@/lib/doroos";
import LessonView from "@/components/UI/doroos/LessonView";

export function generateStaticParams() {
  return readyLessonParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grade: string; lesson: string }>;
}): Promise<Metadata> {
  const { grade: gradeKey, lesson: lessonNo } = await params;
  const grade = getGrade(gradeKey);
  const number = parseLessonNumber(lessonNo);
  const lesson = number === null ? null : await getLesson(gradeKey, number);

  if (!grade || !lesson) {
    // درسی که هنوز نوشته نشده نباید ایندکس شود — وگرنه گوگل صفحه‌ای را ثبت
    // می‌کند که محتوایش هیچ‌وقت آنجا نبوده.
    return { title: "درسنامه", robots: { index: false, follow: true } };
  }

  return {
    title: `${lesson.title} — ${grade.book}`,
    description:
      lesson.kind === "poem"
        ? `شرحِ بیت‌به‌بیتِ «${lesson.title}» با تفکیکِ قلمرو زبانی، ادبی و فکری.`
        : `شرحِ «${lesson.title}» با تفکیکِ قلمرو زبانی، ادبی و فکری.`,
  };
}

/**
 * یک درس.
 *
 * سه حالت دارد و تفکیکشان مهم است:
 *
 *   ۱) پایه یا شماره بی‌معنی است → ۴۰۴ واقعی.
 *   ۲) درس در کتاب هست ولی محتوایش هنوز نوشته نشده → صفحهٔ «به‌زودی».
 *   ۳) محتوا هست → خودِ درس.
 *
 * ⚠️ حالت ۲ قبلاً هم ۴۰۴ می‌داد. از ۵۴ درسِ سه کتاب، فقط یکی محتوا دارد —
 * یعنی ۵۳ آدرسِ کاملاً معتبر به صفحهٔ «پیدا نشد» می‌رسیدند. برای کسی که از یک
 * بوکمارک یا لینکِ قدیمی می‌آمد، این از سایتِ خراب قابل تشخیص نبود. حالا
 * می‌گوید چه خبر است و راهِ برگشت می‌دهد.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ grade: string; lesson: string }>;
}) {
  const { grade: gradeKey, lesson: lessonNo } = await params;
  const grade = getGrade(gradeKey);
  const number = parseLessonNumber(lessonNo);

  if (!grade || number === null || !isLessonInBook(number)) notFound();

  const lesson = await getLesson(gradeKey, number);
  if (lesson) return <LessonView grade={grade} lesson={lesson} />;

  const ref = grade.lessons.find((l) => l.number === number);

  return (
    <div dir="rtl" className="container relative z-20 mx-auto mt-10 mb-32 max-w-2xl px-4">
      <Link
        href={`/doroos/${grade.key}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
        </svg>
        بازگشت به {grade.book}
      </Link>

      <div className="glass rounded-2xl p-8 text-center sm:p-12">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="size-7">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"
            />
          </svg>
        </span>

        <h1 className="text-xl font-bold sm:text-2xl">
          درس {faNum(number)}
          {ref?.title ? ` — ${ref.title}` : ""} هنوز آماده نیست
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-8 text-muted-foreground">
          این درس از {grade.book} ({grade.label}) در فهرست هست، ولی شرحش هنوز
          نوشته نشده. درس‌ها یکی‌یکی اضافه می‌شوند — فهرست را ببین تا آنچه آماده
          است را پیدا کنی.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href={`/doroos/${grade.key}`}
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-transform active:scale-95"
          >
            فهرستِ {grade.book}
          </Link>
          <Link
            href="/doroos"
            className="inline-flex min-h-11 items-center rounded-xl border border-border px-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            همهٔ کتاب‌ها
          </Link>
        </div>
      </div>
    </div>
  );
}
