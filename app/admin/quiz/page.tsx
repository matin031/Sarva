import type { Metadata } from "next";
import { quizAdminList } from "@/lib/quiz/admin-actions";
import QuizAdminPanel from "@/components/admin/QuizAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "مدیریت عروض سماعی",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const result = await loadAdminData(() => quizAdminList());
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  return <QuizAdminPanel initialQuestions={result.data} />;
}
