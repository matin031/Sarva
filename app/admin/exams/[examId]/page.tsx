import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminGetExamDetail } from "@/lib/exam/admin-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import ExamDetailPanel from "@/components/admin/ExamDetailPanel";

export const metadata: Metadata = {
  title: "مدیریت آزمون",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = await params;
  const result = await loadAdminData(() => adminGetExamDetail(examId));
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  if (!result.data) notFound();
  return <ExamDetailPanel exam={result.data} />;
}
