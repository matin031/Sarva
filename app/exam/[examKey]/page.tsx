import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamRunner from "@/components/exam/ExamRunner";
import { toClientExam } from "@/lib/exam/client-exam";
import { getExamByKey } from "@/lib/exam/db-exam";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ examKey: string }>;
}): Promise<Metadata> {
  const { examKey } = await params;
  const exam = await getExamByKey(examKey);
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
  const exam = await getExamByKey(examKey);
  if (!exam) notFound();

  return <ExamRunner examKey={examKey} exam={toClientExam(exam)} />;
}
