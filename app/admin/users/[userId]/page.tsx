import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminGetUser } from "@/lib/admin/user-actions";
import { adminQuizAttemptsForUser } from "@/lib/admin/quiz-stats-actions";
import { adminExamAttemptsForUser } from "@/lib/admin/exam-stats-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import UserDetailPanel from "@/components/admin/UserDetailPanel";

export const metadata: Metadata = {
  title: "جزئیات کاربر",
  robots: { index: false, follow: false },
};

async function loadUserDetail(userId: string) {
  const [user, quizAttempts, examAttempts] = await Promise.all([
    adminGetUser(userId),
    adminQuizAttemptsForUser(userId),
    adminExamAttemptsForUser(userId),
  ]);
  return { user, quizAttempts, examAttempts };
}

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const result = await loadAdminData(() => loadUserDetail(userId));
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  if (!result.data.user) notFound();

  return (
    <UserDetailPanel
      user={result.data.user}
      quizAttempts={result.data.quizAttempts}
      examAttempts={result.data.examAttempts}
    />
  );
}
