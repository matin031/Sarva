import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { adminQuizAttemptsForUser } from "@/lib/admin/quiz-stats-actions";
import { adminExamAttemptsForUser } from "@/lib/admin/exam-stats-actions";
import {
  adminGetUserProfile,
  adminListUserSessions,
  adminUserAuditTrail,
} from "@/lib/admin/user-control-actions";
import { requireAdmin } from "@/lib/require-admin";
import { isUuid } from "@/lib/api/action-input";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import UserDetailPanel from "@/components/admin/UserDetailPanel";
import UserControls from "@/components/admin/UserControls";

export const metadata: Metadata = {
  title: "جزئیات کاربر",
  robots: { index: false, follow: false },
};

async function loadUserDetail(userId: string) {
  const [viewer, profile, sessions, audit, quizAttempts, examAttempts] = await Promise.all([
    requireAdmin(),
    adminGetUserProfile(userId),
    adminListUserSessions(userId),
    adminUserAuditTrail(userId),
    adminQuizAttemptsForUser(userId),
    adminExamAttemptsForUser(userId),
  ]);
  return { viewerId: viewer.id, profile, sessions, audit, quizAttempts, examAttempts };
}

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  // آدرسِ دست‌نوشتهٔ بدشکل «پیدا نشد» است، نه خطای سرور.
  if (!isUuid(userId)) notFound();
  const result = await loadAdminData(() => loadUserDetail(userId));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  const { profile, sessions, audit, viewerId, quizAttempts, examAttempts } = result.data;
  if (!profile) notFound();

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-6 p-4 xs:p-6">
      <UserControls profile={profile} sessions={sessions} audit={audit} isSelf={viewerId === profile.id} />
      <UserDetailPanel quizAttempts={quizAttempts} examAttempts={examAttempts} />
    </div>
  );
}
