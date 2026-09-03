import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminGetExamDetail } from "@/lib/exam/admin-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import ExamDetailPanel from "@/components/admin/ExamDetailPanel";

export const metadata: Metadata = {
  title: "مدیریت آزمون",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { examId } = await params;
  const { focus } = await searchParams;
  const result = await loadAdminData(() => adminGetExamDetail(examId));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  if (!result.data) notFound();
  // گزارشِ امتحان *شمارهٔ* سؤال را نگه می‌دارد، نه شناسهٔ ردیف.
  return <ExamDetailPanel exam={result.data} focusNumber={focus ?? null} />;
}
