import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/types";
import { requireTeacher } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { queryOne } from "@/lib/db";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import { getPanelOverview } from "@/lib/panel/queries";
import { AREA_LABEL, type BookmarkArea } from "@/lib/panel/types";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import { fa, pct } from "@/lib/panel/format";
import { getTeacherClass, teacherCanSeeStudent } from "@/lib/teacher/classes";

/**
 * عملکردِ یک دانش‌آموز، از دیدِ دبیرش.
 *
 * =============================================================================
 * ⚠️ بند ۱۰ — هیچ جدولِ تازه‌ای برای نتایج ساخته نشد
 * =============================================================================
 *
 * همهٔ اعدادِ این صفحه از `getPanelOverview` می‌آیند — همان تابعی که صفحهٔ
 * خانهٔ خودِ دانش‌آموز هم از آن می‌خواند، و همان جدول‌های موجود
 * (`user_answers`، `vocab_answers`، `jasoos_answers`، `exam_attempts`).
 *
 * وسوسه‌اش یک جدولِ «خلاصهٔ کلاسی» بود که از قبل محاسبه شده باشد. دو دلیل
 * که نشد: خواسته صریحاً منعش کرده، و مهم‌تر — دو منبعِ حقیقت برای یک عدد
 * یعنی روزی دانش‌آموز در پنلِ خودش ۸۰٪ ببیند و دبیرش ۷۵٪، و هیچ‌کدام
 * نفهمند کدام درست است.
 *
 * =============================================================================
 * ⚠️ دو گارد، و هر دو لازم‌اند
 * =============================================================================
 *
 *   ۱) `getTeacherClass(teacher.id, classId)` — این کلاس مالِ این دبیر است؟
 *   ۲) `teacherCanSeeStudent(teacher.id, studentId)` — این دانش‌آموز عضوِ
 *      *فعالِ* یکی از کلاس‌های همین دبیر است؟
 *
 * دومی بدونِ اولی کافی نیست و برعکسش هم: بدونِ (۲)، یک دبیر می‌توانست
 * شناسهٔ هر کاربرِ سایت را در نوارِ آدرس بگذارد و کارنامه‌اش را ببیند؛
 * بدونِ (۱)، می‌توانست کلاسِ همکارش را در مسیر بگذارد.
 */

export const metadata: Metadata = {
  title: "عملکرد دانش‌آموز",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>;
}) {
  const { classId, studentId } = await params;

  let teacher;
  try {
    teacher = await requireTeacher();
  } catch (err) {
    if (err instanceof AuthError) redirect(err.status === 401 ? "/auth" : "/panel/teacher");
    throw err;
  }

  if (!isUuid(classId) || !isUuid(studentId)) notFound();

  const klass = await getTeacherClass(teacher.id, classId);
  if (!klass) notFound();

  const allowed = await teacherCanSeeStudent(teacher.id, studentId);
  if (!allowed) notFound();

  /* ⚠️ فقط نام و پایه خوانده می‌شوند.
     ایمیل، شماره و کد ملیِ دانش‌آموز هیچ ربطی به «عملکرد» ندارند و دبیر
     هیچ دلیلی برای دیدنشان ندارد. یک `select *` اینجا، اطلاعاتِ تماسِ
     نوجوانان را در اختیارِ کسی می‌گذاشت که فقط باید نمره‌شان را ببیند. */
  const student = await queryOne<{ full_name: string | null; grade: "10" | "11" | "12" | null }>(
    "select full_name, grade from users where id = ?",
    [studentId],
  );
  if (!student) notFound();

  const overview = await getPanelOverview(studentId);

  const areas = Object.entries(overview.counts) as [BookmarkArea, { total: number; correct: number }][];
  const totalAnswers = areas.reduce((sum, [, c]) => sum + c.total, 0);
  const totalCorrect = areas.reduce((sum, [, c]) => sum + c.correct, 0);
  const activeDays = new Set(overview.dayCounts.map((d) => d.day)).size;

  return (
    <>
      <PanelPageHeader
        title={student.full_name ?? "دانش‌آموز بدون نام"}
        description={`${klass.name}${student.grade ? ` · پایهٔ ${GRADE_LABEL[student.grade]}` : ""}`}
        eyebrow="عملکرد دانش‌آموز"
        tone="lilac"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/panel/teacher/class/${klass.id}`}>بازگشت به کلاس</Link>
          </Button>
        }
      />

      {totalAnswers === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            این دانش‌آموز هنوز تمرینی انجام نداده است.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="کل پاسخ‌ها" value={fa(totalAnswers)} />
            <Stat label="درصد درست" value={pct(totalCorrect, totalAnswers)} />
            <Stat label="روزهای فعال" value={fa(activeDays)} />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4">
              <h2 className="font-bold">به تفکیک بخش</h2>
              <ul className="flex flex-col divide-y divide-border">
                {areas
                  // بخشی که هیچ پاسخی ندارد، یک ردیفِ «۰ از ۰» می‌شد که
                  // چیزی نمی‌گوید و فقط جدول را بلند می‌کند.
                  .filter(([, counts]) => counts.total > 0)
                  .map(([area, counts]) => (
                    <li
                      key={area}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="font-medium">{AREA_LABEL[area]}</span>
                      <span className="text-sm text-muted-foreground">
                        {fa(counts.correct)} از {fa(counts.total)} · {pct(counts.correct, counts.total)}
                      </span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          {overview.exams.attempts > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-4">
                <h2 className="font-bold">آزمون نهایی</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="دفعات" value={fa(overview.exams.attempts)} />
                  <Stat label="بهترین" value={`${fa(overview.exams.best)}٪`} />
                  <Stat label="میانگین" value={`${fa(overview.exams.average)}٪`} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-extrabold">{value}</span>
      </CardContent>
    </Card>
  );
}
