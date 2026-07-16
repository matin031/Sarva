import type { Metadata } from "next";
import Link from "next/link";
import { adminListExams } from "@/lib/exam/admin-actions";
import { quizAdminList } from "@/lib/quiz/admin-actions";
import { adminListUsers } from "@/lib/admin/user-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  robots: { index: false, follow: false },
};

async function loadStats() {
  const [exams, quizQuestions, users] = await Promise.all([adminListExams(), quizAdminList(), adminListUsers()]);
  return {
    examCount: exams.length,
    quizQuestionCount: quizQuestions.length,
    userCount: users.length,
    adminCount: users.filter((u) => u.role === "admin").length,
  };
}

export default async function Page() {
  const result = await loadAdminData(loadStats);
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  const stats = result.data;

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 xs:px-5">
      <h1 className="text-2xl font-bold">پنل مدیریت</h1>

      <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
        <div className="glass flex flex-col items-center gap-1 rounded-2xl p-4">
          <span className="text-2xl font-bold text-primary">{stats.examCount}</span>
          <span className="text-xs text-muted-foreground">آزمون</span>
        </div>
        <div className="glass flex flex-col items-center gap-1 rounded-2xl p-4">
          <span className="text-2xl font-bold text-primary">{stats.quizQuestionCount}</span>
          <span className="text-xs text-muted-foreground">سؤال عروض سماعی</span>
        </div>
        <div className="glass flex flex-col items-center gap-1 rounded-2xl p-4">
          <span className="text-2xl font-bold text-primary">{stats.userCount}</span>
          <span className="text-xs text-muted-foreground">کاربر</span>
        </div>
        <div className="glass flex flex-col items-center gap-1 rounded-2xl p-4">
          <span className="text-2xl font-bold text-primary">{stats.adminCount}</span>
          <span className="text-xs text-muted-foreground">مدیر</span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Link
          href="/admin/exams"
          className="glass flex flex-col gap-1 rounded-2xl p-5 transition-colors hover:border-primary/50"
        >
          <h2 className="text-lg font-semibold">امتحانات نهایی</h2>
          <p className="text-sm text-muted-foreground">افزودن و ویرایش آزمون‌ها و سؤالات هر ۱۸ نوع.</p>
        </Link>

        <Link
          href="/admin/quiz"
          className="glass flex flex-col gap-1 rounded-2xl p-5 transition-colors hover:border-primary/50"
        >
          <h2 className="text-lg font-semibold">عروض سماعی</h2>
          <p className="text-sm text-muted-foreground">افزودن و ویرایش سؤالات بازی تشخیص وزن با صوت.</p>
        </Link>

        <Link
          href="/admin/users"
          className="glass flex flex-col gap-1 rounded-2xl p-5 transition-colors hover:border-primary/50"
        >
          <h2 className="text-lg font-semibold">کاربران</h2>
          <p className="text-sm text-muted-foreground">مشاهدهٔ کاربران و تغییر نقش (دانش‌آموز/مدیر).</p>
        </Link>
      </div>
    </div>
  );
}
