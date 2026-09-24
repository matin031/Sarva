import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { gradeCourseJsonLd } from "@/lib/seo/lesson";
import { breadcrumbList } from "@/lib/seo/jsonld";
import JsonLd from "@/components/seo/JsonLd";
import { notFound } from "next/navigation";
import { GRADES, faNum, getGrade } from "@/lib/doroos";
import type { Grade } from "@/lib/doroos/types";
import LessonPicker from "@/components/UI/doroos/LessonPicker";

export function generateStaticParams() {
  return GRADES.map((g) => ({ grade: g.key }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ grade: string }>;
}): Promise<Metadata> {
  const { grade: key } = await params;
  const grade = getGrade(key);
  // پایهٔ ناشناخته صفحه‌ای ندارد (`notFound` پایین‌تر)، پس canonical هم
  // نمی‌گیرد — وگرنه یک آدرسِ ۴۰۴ خودش را معتبر اعلام می‌کرد.
  if (!grade) return { title: "درسنامه", robots: { index: false, follow: false } };
  return pageMetadata({
    path: `/doroos/${grade.key}`,
    title: gradeTitle(grade),
    description: gradeDescription(grade),
  });
}

/* «درسنامه فارسی یازدهم» و «معنی درس‌های فارسی ۲» هر دو شکلِ رایجِ
   جست‌وجوی دانش‌آموزند؛ عنوان اولی را دارد و توضیح دومی را. */
function gradeTitle(grade: Grade): string {
  return `درسنامه و معنی درس‌های فارسی ${grade.label} (${grade.book}) — شرح و آرایه‌ها`;
}

function gradeDescription(grade: Grade): string {
  const ready = grade.lessons.filter((l) => l.ready).length;
  return `معنی روان و شرحِ بیت‌به‌بیتِ ${faNum(ready)} درسِ ${grade.book} پایهٔ ${grade.label}، با تفکیکِ قلمرو زبانی، ادبی و فکری، آرایه‌ها و مفهومِ هر بیت.`;
}

export default async function Page({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const { grade: key } = await params;
  const grade = getGrade(key);
  if (!grade) notFound();
  return (
    <>
      <JsonLd
        data={breadcrumbList([
          { name: "خانه", path: "/" },
          { name: "درسنامه", path: "/doroos" },
          { name: grade.book, path: `/doroos/${grade.key}` },
        ])}
      />
      <JsonLd
        data={gradeCourseJsonLd(
          grade,
          grade.lessons.filter((l) => l.ready),
          gradeDescription(grade),
        )}
      />
      <LessonPicker grade={grade} />
    </>
  );
}
