import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ExamRunner from "@/components/exam/ExamRunner";
import { toClientExam } from "@/lib/exam/client-exam";
import { getExamByKey, freeExamKey } from "@/lib/exam/db-exam";

/** Same reason as the list page: an exam edited in the admin panel must show
 *  its new content without a redeploy. */
export const dynamic = "force-dynamic";

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

  // آزمونِ اولِ فهرست برای مهمان کاملاً باز است؛ بقیه از همان سؤالِ اول
  // ورود می‌خواهند. تصمیم روی سرور گرفته می‌شود تا کلاینت نتواند عوضش کند.
  const guestAllowed = (await freeExamKey()) === examKey;

  return (
    <ExamRunner
      examKey={examKey}
      exam={toClientExam(exam)}
      guestAllowed={guestAllowed}
    />
  );
}
