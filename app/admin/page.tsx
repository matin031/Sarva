import type { Metadata } from "next";
import Link from "next/link";
import { adminListExams } from "@/lib/exam/admin-actions";
import { quizAdminList } from "@/lib/quiz/admin-actions";
import { adminListUsers } from "@/lib/admin/user-actions";
import { adminQuizStatsOverview } from "@/lib/admin/quiz-stats-actions";
import { adminExamStatsOverview } from "@/lib/admin/exam-stats-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  robots: { index: false, follow: false },
};

async function loadStats() {
  const [exams, quizList, users, quizActivity, examActivity] = await Promise.all([
    adminListExams(),
    quizAdminList({ limit: 1 }),
    adminListUsers(),
    adminQuizStatsOverview(),
    adminExamStatsOverview(),
  ]);
  return {
    examCount: exams.length,
    quizQuestionCount: quizList.total,
    userCount: users.length,
    adminCount: users.filter((u) => u.role === "admin").length,
    quizActivity,
    examActivity,
  };
}

const STAT_ICON_PATH: Record<string, string> = {
  exam: "M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-12Z M4 17.5a2.5 2.5 0 0 1 2.5-2.5H20 M8 7.5h8M8 10.5h5",
  quiz: "M9 18V6l11-2v12",
  user: "M3.5 19.5c.7-3.4 3-5.25 5.5-5.25s4.8 1.85 5.5 5.25",
  admin: "M16.7 14.3c2.1.5 3.6 2.2 4.1 5.2",
  activity: "M3 12h4l2.5-7 4 14 2.5-7H21",
};

function StatIcon({ kind }: { kind: "exam" | "quiz" | "user" | "admin" | "activity" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d={STAT_ICON_PATH[kind]} />
    </svg>
  );
}

export default async function Page() {
  const result = await loadAdminData(loadStats);
  if (!result.ok) return <AdminAccessDenied message={result.message} />;
  const stats = result.data;

  const statCards = [
    { kind: "exam" as const, value: stats.examCount, label: "آزمون" },
    { kind: "quiz" as const, value: stats.quizQuestionCount, label: "سؤال عروض سماعی" },
    { kind: "user" as const, value: stats.userCount, label: "کاربر" },
    { kind: "admin" as const, value: stats.adminCount, label: "مدیر" },
  ];

  const shortcuts = [
    {
      href: "/admin/exams",
      title: "امتحانات نهایی",
      desc: "افزودن و ویرایش آزمون‌ها و سؤالات هر ۱۸ نوع.",
    },
    {
      href: "/admin/quiz",
      title: "عروض سماعی",
      desc: "افزودن و ویرایش سؤالات بازی تشخیص وزن با صوت.",
    },
    {
      href: "/admin/users",
      title: "کاربران",
      desc: "مشاهدهٔ کاربران و تغییر نقش (دانش‌آموز/مدیر).",
    },
  ];

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-8 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-sm text-muted-foreground">نمای کلی محتوا و کاربران سروا.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.kind} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <StatIcon kind={s.kind} />
            </span>
            <div>
              <span className="block text-2xl font-bold">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">فعالیت کاربران</h2>
        <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <StatIcon kind="activity" />
            </span>
            <div>
              <span className="block text-2xl font-bold">{stats.quizActivity.attemptCount}</span>
              <span className="text-xs text-muted-foreground">بازی عروض سماعی انجام‌شده</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <StatIcon kind="activity" />
            </span>
            <div>
              <span className="block text-2xl font-bold">{stats.quizActivity.avgAccuracy}٪</span>
              <span className="text-xs text-muted-foreground">میانگین دقت عروض سماعی</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <StatIcon kind="activity" />
            </span>
            <div>
              <span className="block text-2xl font-bold">{stats.examActivity.attemptCount}</span>
              <span className="text-xs text-muted-foreground">امتحان نهایی تکمیل‌شده</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
              <StatIcon kind="activity" />
            </span>
            <div>
              <span className="block text-2xl font-bold">{stats.examActivity.avgPercent}٪</span>
              <span className="text-xs text-muted-foreground">میانگین نمرهٔ امتحانات</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">دسترسی سریع</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {shortcuts.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.75}
                className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6 3 12l6 6M21 12H4" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
