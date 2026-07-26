import type { Metadata } from "next";
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
  if (!grade) return { title: "درسنامه" };
  return {
    title: `درسنامهٔ ${grade.book} — پایهٔ ${grade.label}`,
    description: `فهرستِ ۱۸ درسِ ${grade.book} با شرحِ بیت‌به‌بیت و تفکیکِ سه قلمرو.`,
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
