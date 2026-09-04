import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/seo/site";
import { notFound } from "next/navigation";
import { GRADES, getGrade } from "@/lib/doroos";
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
  return {
    title: `درسنامهٔ ${grade.book} — پایهٔ ${grade.label}`,
    description: `فهرستِ درس‌های ${grade.book} پایهٔ ${grade.label} با شرحِ بیت‌به‌بیت و تفکیکِ سه قلمرو زبانی، ادبی و فکری.`,
    alternates: { canonical: absoluteUrl(`/doroos/${grade.key}`) },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const { grade: key } = await params;
  const grade = getGrade(key);
  if (!grade) notFound();
  return <LessonPicker grade={grade} />;
}
