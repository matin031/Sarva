import type { Metadata } from "next";
import Link from "next/link";
import { adminListExams } from "@/lib/exam/admin-actions";
import { quizAdminList } from "@/lib/quiz/admin-actions";
import { adminUserCounts } from "@/lib/admin/user-actions";
import { adminQuizStatsOverview } from "@/lib/admin/quiz-stats-actions";
import { adminExamStatsOverview } from "@/lib/admin/exam-stats-actions";
import { clubAdminStats } from "@/lib/club/admin-actions";
import { adminRecentActivity } from "@/lib/admin/log-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  robots: { index: false, follow: false },
};

// فعالیت اخیر باید واقعاً اخیر باشد.
export const dynamic = "force-dynamic";

async function loadStats() {
  const [exams, quizList, users, quizActivity, examActivity, club, recent] = await Promise.all([
    adminListExams(),
    quizAdminList({ limit: 1 }),
    adminUserCounts(),
    adminQuizStatsOverview(),
    adminExamStatsOverview(),
    clubAdminStats(),
    adminRecentActivity(),
  ]);
  return {
    examCount: exams.length,
    quizQuestionCount: quizList.total,
    users,
    quizActivity,
    examActivity,
    club,
    recent,
  };
}

const fa = (n: number) => n.toLocaleString("fa-IR");

function relativeTime(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "همین الان";
  if (min < 60) return `${fa(min)} دقیقه پیش`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${fa(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${fa(days)} روز پیش`;
  return new Date(iso).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

const STAT_ICON_PATH: Record<string, string> = {
  exam: "M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-12Z M4 17.5a2.5 2.5 0 0 1 2.5-2.5H20 M8 7.5h8M8 10.5h5",
  quiz: "M9 18V6l11-2v12",
  user: "M3.5 19.5c.7-3.4 3-5.25 5.5-5.25s4.8 1.85 5.5 5.25",
  admin: "M16.7 14.3c2.1.5 3.6 2.2 4.1 5.2",
  activity: "M3 12h4l2.5-7 4 14 2.5-7H21",
};

function StatIcon({ kind }: { kind: keyof typeof STAT_ICON_PATH }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="size-5">
      <path strokeLinecap="round" strokeLinejoin="round" d={STAT_ICON_PATH[kind]} />
    </svg>
  );
}

export default async function Page() {
  const result = await loadAdminData(loadStats);
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  const stats = result.data;
  const { recent } = stats;

  const statCards = [
    { kind: "exam" as const, value: stats.examCount, label: "آزمون" },
    { kind: "quiz" as const, value: stats.quizQuestionCount, label: "سؤال عروض سماعی" },
    { kind: "user" as const, value: stats.users.total, label: "کاربر" },
    { kind: "admin" as const, value: stats.users.admins, label: "مدیر" },
  ];

  const weekCards = [
    { value: recent.newUsersWeek, label: "کاربر تازه" },
    { value: recent.quizAttemptsWeek, label: "بازی عروض سماعی" },
    { value: recent.examAttemptsWeek, label: "امتحان نهایی" },
    { value: recent.clubPostsWeek, label: "سرودهٔ تازه" },
  ];

  const shortcuts = [
    { href: "/admin/exams", title: "امتحانات نهایی", desc: "افزودن و ویرایش آزمون‌ها و سؤالات هر ۱۸ نوع." },
    { href: "/admin/quiz", title: "عروض سماعی", desc: "افزودن و ویرایش سؤالات بازی تشخیص وزن با صوت." },
    { href: "/admin/vocab", title: "واژه‌یاب", desc: "افزودن و ویرایش واژگانِ درس‌های فارسی دهم تا دوازدهم." },
    { href: "/admin/games", title: "بازی‌ها", desc: "محتوای جفت‌های ادبی، نینجای دستور زبان و جاسوسِ نقش‌ها." },
    { href: "/admin/club", title: "سروا کلاب", desc: "بررسی سروده‌ها و دیدگاه‌ها و رسیدگی به گزارش‌ها." },
    { href: "/admin/users", title: "کاربران", desc: "جست‌وجو، مسدودسازی، تغییر نقش و حذف حساب." },
    { href: "/admin/settings", title: "تنظیمات", desc: "ایمیل، پیامک و وضعیت سرویس‌های سایت." },
  ];

  const clubQueue = stats.club.pendingPosts + stats.club.pendingComments;

  return (
    <div dir="rtl" className="flex max-w-4xl flex-col gap-8 p-4 xs:p-6">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-sm text-muted-foreground">
          {recent.newUsersToday > 0
            ? `امروز ${fa(recent.newUsersToday)} نفر ثبت‌نام کرده‌اند.`
            : "امروز هنوز ثبت‌نام تازه‌ای نبوده."}
        </p>
      </div>

      {/* کارهایی که منتظر شما هستند، بالای هر عددی. یک صف که کسی نگاهش نکند،
          تنها راهی است که این بخش‌ها شکست می‌خورند. */}
      {(recent.openErrors > 0 || clubQueue > 0 || stats.club.openReports > 0) && (
        <div className="flex flex-col gap-2">
          {recent.openErrors > 0 && (
            <AttentionCard
              href="/admin/activity"
              tone="destructive"
              title="خطای رسیدگی‌نشده روی سرور"
              body="ممکن است ارسال ایمیل یا بخشی از سایت با مشکل روبه‌رو شده باشد."
              count={recent.openErrors}
            />
          )}
          {(clubQueue > 0 || stats.club.openReports > 0) && (
            <AttentionCard
              href="/admin/club"
              tone="gold"
              title="سروا کلاب منتظر بررسی است"
              body={[
                clubQueue > 0 ? `${fa(clubQueue)} سروده و دیدگاه بررسی‌نشده` : "",
                stats.club.openReports > 0 ? `${fa(stats.club.openReports)} گزارش باز` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              count={clubQueue + stats.club.openReports}
            />
          )}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">در مجموع</h2>
        <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
          {statCards.map((s) => (
            <div key={s.kind} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <StatIcon kind={s.kind} />
              </span>
              <div>
                <span className="block text-2xl font-bold">{fa(s.value)}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">هفتهٔ گذشته</h2>
        <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
          {weekCards.map((s) => (
            <div key={s.label} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
              <span className="flex size-9 items-center justify-center rounded-lg bg-gold/15 text-gold">
                <StatIcon kind="activity" />
              </span>
              <div>
                <span className="block text-2xl font-bold">{fa(s.value)}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          میانگین دقت عروض سماعی {stats.quizActivity.avgAccuracy}٪ · میانگین نمرهٔ امتحانات{" "}
          {stats.examActivity.avgPercent}٪ · مجموع {fa(stats.quizActivity.attemptCount)} بازی و{" "}
          {fa(stats.examActivity.attemptCount)} امتحان از ابتدا
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">تازه‌واردها</h2>
            <Link href="/admin/users" className="text-xs text-primary hover:underline">
              همهٔ کاربران
            </Link>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2">
            {recent.latestUsers.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">هنوز کاربری ثبت‌نام نکرده.</p>
            ) : (
              recent.latestUsers.map((u) => (
                <Link
                  key={u.id}
                  href={`/admin/users/${u.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2 transition-colors hover:bg-muted/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{u.name || "بدون نام"}</span>
                    <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                      {u.email}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(u.createdAt)}
                  </time>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground">آخرین کارهای مدیران</h2>
            <Link href="/admin/activity" className="text-xs text-primary hover:underline">
              همهٔ فعالیت‌ها
            </Link>
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-2">
            {recent.latestAudit.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                هنوز کاری در پنل انجام نشده.
              </p>
            ) : (
              recent.latestAudit.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-2 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{a.summary}</span>
                    <span className="block truncate text-xs text-muted-foreground" dir="ltr">
                      {a.actorEmail}
                    </span>
                  </span>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {relativeTime(a.createdAt)}
                  </time>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-3">
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
      </section>
    </div>
  );
}

function AttentionCard({
  href,
  tone,
  title,
  body,
  count,
}: {
  href: string;
  tone: "destructive" | "gold";
  title: string;
  body: string;
  count: number;
}) {
  const styles =
    tone === "destructive"
      ? "border-destructive/50 bg-destructive/10 hover:bg-destructive/15"
      : "border-gold/50 bg-gold/10 hover:bg-gold/15";
  const numberColor = tone === "destructive" ? "text-destructive" : "text-gold";

  return (
    <Link
      href={href}
      className={`flex items-center justify-between gap-3 rounded-2xl border p-5 transition-colors ${styles}`}
    >
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
      <span className={`text-2xl font-bold ${numberColor}`}>{fa(count)}</span>
    </Link>
  );
}
