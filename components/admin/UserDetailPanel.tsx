import Link from "next/link";
import type { AdminUserRow } from "@/lib/admin/user-actions";
import type { QuizAttemptRow } from "@/lib/admin/quiz-stats-actions";
import type { ExamAttemptRow } from "@/lib/admin/exam-stats-actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  user: AdminUserRow;
  quizAttempts: QuizAttemptRow[];
  examAttempts: ExamAttemptRow[];
};

export default function UserDetailPanel({ user, quizAttempts, examAttempts }: Props) {
  const quizTotal = quizAttempts.reduce((s, a) => s + a.total, 0);
  const quizCorrect = quizAttempts.reduce((s, a) => s + a.correct, 0);
  const quizAccuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null;

  const examTotal = examAttempts.reduce((s, a) => s + a.maxScore, 0);
  const examScored = examAttempts.reduce((s, a) => s + a.totalScore, 0);
  const examAccuracy = examTotal > 0 ? Math.round((examScored / examTotal) * 100) : null;

  return (
    <div dir="rtl" className="flex max-w-3xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground">
          ← بازگشت به کاربران
        </Link>
        <h1 className="mt-1 text-xl font-bold">{user.fullName || user.email || user.id}</h1>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {user.email}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{quizAttempts.length}</span>
          <span className="text-xs text-muted-foreground">آزمون عروض سماعی</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{quizAccuracy ?? "—"}٪</span>
          <span className="text-xs text-muted-foreground">دقت عروض سماعی</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{examAttempts.length}</span>
          <span className="text-xs text-muted-foreground">امتحان نهایی انجام‌شده</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{examAccuracy ?? "—"}٪</span>
          <span className="text-xs text-muted-foreground">میانگین نمرهٔ امتحانات</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">امتحانات نهایی</h2>
        {examAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ امتحانی را کامل نکرده.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">آزمون</th>
                  <th className="px-4 py-2.5 font-medium">نمره</th>
                  <th className="px-4 py-2.5 font-medium">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {examAttempts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">{a.examTitle}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {a.totalScore.toFixed(2)} / {a.maxScore}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">عروض سماعی</h2>
        {quizAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ آزمونی بازی نکرده.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">نتیجه</th>
                  <th className="px-4 py-2.5 font-medium">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {quizAttempts.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {a.correct} / {a.total}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
