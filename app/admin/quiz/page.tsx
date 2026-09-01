import type { Metadata } from "next";
import { quizAdminList } from "@/lib/quiz/admin-actions";
import { QUIZ_PAGE_SIZE } from "@/lib/quiz/constants";
import QuizAdminPanel from "@/components/admin/QuizAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "مدیریت عروض سماعی",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const result = await loadAdminData(() => quizAdminList({ limit: QUIZ_PAGE_SIZE }));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return <QuizAdminPanel initialItems={result.data.items} initialTotal={result.data.total} />;
}
