import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGrade, getLesson, readyLessonParams } from "@/lib/doroos";
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
  const lesson = await getLesson(gradeKey, Number(lessonNo));
  if (!grade || !lesson) return { title: "درسنامه" };
  return {
    title: `${lesson.title} — ${grade.book}`,
    description:
      lesson.kind === "poem"
        ? `شرحِ بیت‌به‌بیتِ «${lesson.title}» با تفکیکِ قلمرو زبانی، ادبی و فکری.`
        : `شرحِ «${lesson.title}» با تفکیکِ قلمرو زبانی، ادبی و فکری.`,
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ grade: string; lesson: string }>;
}) {
  const { grade: gradeKey, lesson: lessonNo } = await params;
  const grade = getGrade(gradeKey);
  const number = Number(lessonNo);
  if (!grade || !Number.isInteger(number)) notFound();
  const lesson = await getLesson(gradeKey, number);
  if (!lesson) notFound();
  return <LessonView grade={grade} lesson={lesson} />;
}
