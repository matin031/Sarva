import type { Metadata } from "next";
import ExamPreview from "@/components/exam/ExamPreview";
import { toClientExam } from "@/lib/exam/client-exam";
import { farsi3Dey1401 } from "@/lib/exam/seed-data/farsi3-1401-dey";
import { farsi3Kherdad1403 } from "@/lib/exam/seed-data/farsi3-1403-kherdad";

export const metadata: Metadata = {
  title: "پیش‌نمایش آزمون (dev)",
  robots: { index: false, follow: false },
};

const exams = {
  "1403-kherdad": farsi3Kherdad1403,
  "1401-dey": farsi3Dey1401,
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  const { exam: examKey } = await searchParams;
  const exam = exams[examKey as keyof typeof exams] ?? farsi3Kherdad1403;

  return <ExamPreview exam={toClientExam(exam)} />;
}
