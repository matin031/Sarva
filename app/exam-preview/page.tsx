import type { Metadata } from "next";
import ExamPreview from "@/components/exam/ExamPreview";
import { toClientExam } from "@/lib/exam/client-exam";
import { findSeedExam, seedExams } from "@/lib/exam/seed-data";

export const metadata: Metadata = {
  title: "پیش‌نمایش آزمون (dev)",
  robots: { index: false, follow: false },
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examKey } = await searchParams;
  const exam = (examKey && findSeedExam(examKey)) || seedExams[0];

  return <ExamPreview exam={toClientExam(exam)} />;
}
