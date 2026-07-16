import type { Metadata } from "next";
import { adminListExams } from "@/lib/exam/admin-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import AdminNav from "@/components/admin/AdminNav";
import ExamListPanel from "@/components/admin/ExamListPanel";

export const metadata: Metadata = {
  title: "مدیریت امتحانات نهایی",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const result = await loadAdminData(() => adminListExams());
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  return (
    <>
      <AdminNav />
      <ExamListPanel initialExams={result.data} />
    </>
  );
}
