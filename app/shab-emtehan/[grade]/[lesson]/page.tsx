import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { faNum, getGrade, parseLessonNumber, readyLessonParams } from "@/lib/doroos";
import { getReviewSheet } from "@/lib/doroos/exam-night";
import ReviewSheetView from "@/components/UI/shab-emtehan/ReviewSheetView";

/** فقط درس‌های آماده برگه دارند؛ بقیه ۴۰۴ می‌دهند. برخلافِ خودِ درسنامه
 *  اینجا صفحهٔ «به‌زودی» لازم نیست: فهرستِ شب امتحان درسِ آماده‌نشده را
 *  اصلاً لینک نمی‌کند. */
export const dynamicParams = false;

export function generateStaticParams() {
  return readyLessonParams();
}

type Params = Promise<{ grade: string; lesson: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { grade: gradeKey, lesson: lessonNo } = await params;
  const grade = getGrade(gradeKey);
  const number = parseLessonNumber(lessonNo);
  const sheet = grade && number !== null ? await getReviewSheet(gradeKey, number) : null;
  if (!grade || !sheet) return { title: "شب امتحان", robots: { index: false, follow: true } };

  return pageMetadata({
    path: `/shab-emtehan/${grade.key}/${sheet.number}`,
    title: `شب امتحان درس ${faNum(sheet.number)} فارسی ${grade.label}: ${sheet.title} — مفهوم و جمع‌بندی`,
    description: `مرور فشردهٔ درس ${faNum(sheet.number)} ${grade.book} («${sheet.title}»${sheet.by ? `، ${sheet.by}` : ""}) برای شب امتحان: مفهوم هر ${sheet.kind === "poem" ? "بیت" : "بند"}، معنی، آرایه‌ها و نکته‌های پایانی، با حالت خودآزمایی.`,
    openGraphType: "article",
  });
}

export default async function Page({ params }: { params: Params }) {
  const { grade: gradeKey, lesson: lessonNo } = await params;
  const grade = getGrade(gradeKey);
  const number = parseLessonNumber(lessonNo);
  if (!grade || number === null) notFound();

  const sheet = await getReviewSheet(grade.key, number);
  if (!sheet) notFound();

  const ready = grade.lessons.filter((l) => l.ready);
  const at = ready.findIndex((l) => l.number === number);
  const neighbour = (i: number) => {
    const l = ready[i];
    return l ? { number: l.number, title: l.title ?? `درس ${faNum(l.number)}` } : null;
  };

  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "شب امتحان", path: "/shab-emtehan" },
          { name: sheet.title, path: `/shab-emtehan/${grade.key}/${number}` },
        ])}
      />
      <ReviewSheetView
        sheet={sheet}
        book={grade.book}
        gradeLabel={grade.label}
        prev={neighbour(at - 1)}
        next={neighbour(at + 1)}
      />
    </>
  );
}
