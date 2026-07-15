import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamRunner from "@/components/exam/ExamRunner";
import { toClientExam } from "@/lib/exam/client-exam";
import { farsi3Dey1401 } from "@/lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "@/lib/exam/seed-data/farsi3-1403-kherdad";

// Kept separate from the server action's exam map on purpose: this one
// only ever needs to produce the sanitized ClientExam, never the answer
// key, so there's no reason for it to share a module with grading.
const exams = {
  "1403-kherdad": farsi3Kherdad1403,
  "1401-dey": farsi3Dey1401,
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examKey: string }>;
}): Promise<Metadata> {
  const { examKey } = await params;
  const exam = exams[examKey as keyof typeof exams];
  return {
    title: exam?.title ?? "آزمون",
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ examKey: string }>;
}) {
  const { examKey } = await params;
  const exam = exams[examKey as keyof typeof exams];
  if (!exam) notFound();

  return <ExamRunner examKey={examKey} exam={toClientExam(exam)} />;
}
