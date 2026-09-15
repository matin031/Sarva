import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/types";
import { requireTeacher } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import { fa, jalali, relativeDay } from "@/lib/panel/format";
import { getStudentDailyActivity } from "@/lib/teacher/analytics";
import { getStudentReport } from "@/lib/teacher/student-report";
import { recordStudentView } from "@/lib/teacher/views";
import type { SkillAnalysis } from "@/lib/plus/analysis";

/**
 * عملکردِ یک دانش‌آموز، از دیدِ دبیرش.
 *
 * =============================================================================
 * ⚠️ بند ۱۰ — هیچ جدولِ تازه‌ای برای نتایج ساخته نشد
 * =============================================================================
 *
 * همهٔ اعدادِ این صفحه از جدول‌های موجود می‌آیند، و تحلیلِ وزن و نقش از
 * **همان توابعی** که پنلِ خودِ دانش‌آموز هم از آن‌ها می‌خواند
 * (`getWeightAnalysis` / `getRoleAnalysis`). دو پیاده‌سازیِ جدا یعنی روزی
 * دانش‌آموز ۸۰٪ ببیند و دبیرش ۷۵٪، و هیچ‌کدام نفهمند کدام درست است.
 *
 * =============================================================================
 * ⚠️ گارد
 * =============================================================================
 *
 * `getStudentReport` در خطِ اولش `getStudentForTeacher` را صدا می‌زند و آن
 * شناسهٔ دبیر را داخلِ خودِ `where` می‌گذارد. پس عوض کردنِ `studentId` در
 * نوارِ آدرس یک ۴۰۴ می‌دهد و نه کارنامهٔ یک غریبه — و «وجود ندارد» با «مالِ
 * تو نیست» یک پاسخ می‌گیرند تا نشود با امتحانِ شناسه‌ها فهمید کدام کاربرِ
 * واقعی است.
 *
 * ⚠️ و هیچ دادهٔ غیرآموزشی خوانده نمی‌شود: نه ایمیل، نه شماره، نه خرید، نه
 * تیکت، نه نشست. دبیر فقط باید عملکرد را ببیند.
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

  /* ⚠️ `classId` هم فرستاده می‌شود: دانش‌آموزی که عضوِ کلاسِ دیگری از همین
     دبیر است، نباید از مسیرِ این کلاس دیده شود. بدونِ آن، نشانیِ صفحه یک
     چیز می‌گفت و محتوایش چیزِ دیگری. */
  const report = await getStudentReport(teacher.id, studentId, classId);
  if (!report) notFound();

  const daily = await getStudentDailyActivity(teacher.id, studentId);

  /* ⚠️ **بعد** از گاردِ دسترسی و نه قبلش.
  
     اگر بالاتر بود، تلاشِ ناموفقِ یک دبیر برای دیدنِ دانش‌آموزی که مالِ او
     نیست هم ثبت می‌شد — و بدتر، برای آن دانش‌آموز اعلان می‌ساخت. یعنی
     همان گارد به ابزارِ آزار تبدیل می‌شد.
  
     ⚠️ و `await` و نه fire-and-forget: کارِ رهاشده در پایانِ رندرِ یک
     Server Component ممکن است اصلاً اجرا نشود. خودِ تابع هرگز throw
     نمی‌کند، پس هزینه‌اش فقط یکی دو کوئری است.
  
     دبیری که صفحه را چند بار تازه می‌کند، اینجا چند ردیفِ بازدید می‌سازد
     ولی فقط یک اعلان — تفکیکشان در `lib/teacher/views.ts`. */
  await recordStudentView({
    teacherId: teacher.id,
    teacherName: teacher.fullName ?? null,
    studentId,
    classId,
    className: activeClassName(report.student.classes, classId),
  });

  const { student, aruz, weights, roles, exams, games } = report;
  const activeClass = student.classes.find((c) => c.id === classId) ?? student.classes[0];

  const totalActivity =
    aruz.total + games.filter((g) => g.key !== "aruz-bridge").reduce((n, g) => n + g.total, 0);

  return (
    <>
      <PanelPageHeader
        title={student.fullName ?? "دانش‌آموز بدون نام"}
        description={`${activeClass?.name ?? "کلاس"}${
          student.grade ? ` · پایهٔ ${GRADE_LABEL[student.grade]}` : ""
        }`}
        eyebrow="عملکرد دانش‌آموز"
        tone="lilac"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={`/panel/teacher/class/${classId}`}>بازگشت به کلاس</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        {/* ── خلاصه ─────────────────────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="تاریخ عضویت در کلاس" value={jalali(student.joinedAt)} />
          <Stat
            label="آخرین فعالیت"
            value={games.some((g) => g.lastAt) || aruz.lastAt ? lastSeen(report) : "—"}
          />
          <Stat label="فعالیت‌های آموزشی" value={fa(totalActivity)} />
        </div>

        {student.classes.length > 1 && (
          <p className="text-[13px] text-muted-foreground">
            این دانش‌آموز در {fa(student.classes.length)} کلاس شماست:{" "}
            {student.classes.map((c) => c.name).join("، ")}. اعداد این صفحه کلِ فعالیت او در سروا
            است و به کلاس تفکیک نمی‌شود.
          </p>
        )}

        {/* ── نمودارِ روزانه ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>فعالیت روزانه</CardTitle>
            <CardDescription>شصت روز گذشته</CardDescription>
          </CardHeader>
          <CardContent>
            {/* ⚠️ سه حالتِ جدا و نه دو. «نمودار خالی» و «سرور نمی‌تواند
                روز را حساب کند» دو چیزِ کاملاً متفاوت‌اند؛ یکی کردنشان یعنی
                دبیر بخواند «این دانش‌آموز هیچ کاری نکرده» در حالی که فقط
                جدول‌های منطقهٔ زمانی روی سرور بارگذاری نشده‌اند. */}
            {daily === null || daily.state !== "ready" ? (
              <p className="py-6 text-center text-[13px] text-muted-foreground">
                {daily?.note ?? "در دسترس نیست."}
              </p>
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {daily.days.map((d) => (
                  <li
                    key={d.day}
                    title={`${d.day} — ${d.correct} از ${d.total}`}
                    className="rounded-md bg-primary/10 px-2 py-1 text-[11px]"
                  >
                    <span className="panel-num">{d.day.slice(5)}</span>
                    <span className="panel-num ms-1 text-muted-foreground">{fa(d.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* ── عروض ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>عروض</CardTitle>
            <CardDescription>
              از پاسخ‌های عروضِ سماعی و پلِ وزن — هر دو را سرور تصحیح کرده.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="پاسخ‌های عروض سماعی" value={fa(aruz.total)} />
              <Stat label="درست" value={fa(aruz.correct)} />
              <Stat
                label="درصد موفقیت"
                value={aruz.accuracy === null ? "داده کافی نیست" : `${fa(Math.round(aruz.accuracy * 100))}٪`}
              />
            </div>
            <SkillList
              analysis={weights}
              emptyNote="هنوز داده کافی برای تحلیل وزن‌ها وجود ندارد."
            />
          </CardContent>
        </Card>

        {/* ── نقش‌های دستوری ─────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>نقش‌های دستوری</CardTitle>
            <CardDescription>از جاسوس و مدارِ دستور.</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillList
              analysis={roles}
              emptyNote="هنوز داده کافی برای تحلیل نقش‌ها وجود ندارد."
            />
          </CardContent>
        </Card>

        {/* ── آزمون‌ها ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>آزمون‌ها</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {exams.count === 0 ? (
              <p className="py-4 text-center text-[13px] text-muted-foreground">
                هنوز آزمونی نداده است.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="تعداد" value={fa(exams.count)} />
                  <Stat label="بهترین" value={exams.best === null ? "—" : `${fa(exams.best)}٪`} />
                  <Stat
                    label="میانگین"
                    value={exams.average === null ? "—" : `${fa(exams.average)}٪`}
                  />
                </div>
                <ul className="flex flex-col divide-y divide-border">
                  {exams.recent.map((e) => (
                    <li
                      key={e.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <span className="font-medium">{e.title}</span>
                      <span className="panel-num text-[13px] text-muted-foreground">
                        {fa(e.score)} از {fa(e.max)} · {jalali(e.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── بازی‌ها ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>بازی‌ها</CardTitle>
            <CardDescription>
              برای هر بازی فقط چیزی نشان داده می‌شود که واقعاً ثبت شده است.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {games.map((g) => (
                <li
                  key={g.key}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <span className="font-medium">{g.label}</span>

                  {/* ⚠️ قاعدهٔ دادهٔ بازی، همین‌جا و به‌صراحت.
                      این سه بازی نتیجه‌ای ذخیره نمی‌کنند؛ ساختنِ یک عدد
                      برایشان — حتی «۰» — دروغ است. */}
                  {!g.hasStoredResults ? (
                    <span className="text-[13px] text-muted-foreground">
                      جزئیات نتیجه برای این بازی هنوز ثبت نمی‌شود.
                    </span>
                  ) : g.total === 0 ? (
                    <span className="text-[13px] text-muted-foreground">هنوز بازی نکرده است.</span>
                  ) : (
                    <span className="panel-num text-[13px] text-muted-foreground">
                      {fa(g.correct)} از {fa(g.total)}
                      {g.accuracy !== null && ` · ${fa(Math.round(g.accuracy * 100))}٪`}
                      {/* ⚠️ واژه‌یاب داده دارد ولی درستی‌اش را مرورگر
                          فرستاده. بدونِ این برچسب، دبیر آن درصد را
                          هم‌ارزِ بقیه می‌خواند. */}
                      {g.clientReported && (
                        <span className="ms-2 text-[11px]">(گزارش‌شده توسط خودِ بازی)</span>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/** نامِ کلاسی که صفحه از راهش باز شده. */
function activeClassName(
  classes: { id: string; name: string }[],
  classId: string,
): string {
  return classes.find((c) => c.id === classId)?.name ?? classes[0]?.name ?? "کلاس";
}

/** تازه‌ترین زمانِ ثبت‌شده در میانِ همهٔ منابع. */
function lastSeen(report: Awaited<ReturnType<typeof getStudentReport>>): string {
  if (!report) return "—";
  const times = [report.aruz.lastAt, ...report.games.map((g) => g.lastAt)].filter(
    (t): t is string => t !== null,
  );
  if (times.length === 0) return "—";
  return relativeDay(times.reduce((a, b) => (a > b ? a : b)));
}

/**
 * سطل‌های یک تحلیلِ مهارت — ضعیف‌ترین اول.
 *
 * ⚠️ `hasEnoughEvidence` از خودِ `bucketize` می‌آید و همان قاعده‌ای است که
 * پنلِ دانش‌آموز هم رعایتش می‌کند: تحلیلی که با سه پاسخ نتیجه بگیرد حدس
 * است، نه تحلیل.
 */
function SkillList({ analysis, emptyNote }: { analysis: SkillAnalysis; emptyNote: string }) {
  if (!analysis.hasEnoughEvidence || analysis.buckets.length === 0) {
    return <p className="py-4 text-center text-[13px] text-muted-foreground">{emptyNote}</p>;
  }

  const weakest = analysis.buckets.slice(0, 5);
  const strongest = [...analysis.buckets].reverse().slice(0, 3);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mb-2 text-[13px] font-bold">نیازمند تمرین</h3>
        <ul className="flex flex-col gap-1.5">
          {weakest.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-3 text-[13px]">
              <span>{b.label}</span>
              <span className="panel-num text-muted-foreground">
                {fa(b.correct)} از {fa(b.total)} · {fa(Math.round(b.accuracy * 100))}٪
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 text-[13px] font-bold">قوی‌ترها</h3>
        <ul className="flex flex-col gap-1.5">
          {strongest.map((b) => (
            <li key={b.key} className="flex items-center justify-between gap-3 text-[13px]">
              <span>{b.label}</span>
              <span className="panel-num text-muted-foreground">
                {fa(Math.round(b.accuracy * 100))}٪
              </span>
            </li>
          ))}
        </ul>
      </div>

      {analysis.ignoredBuckets > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {fa(analysis.ignoredBuckets)} مورد دیگر هنوز پاسخ کافی ندارند و در این فهرست نیامده‌اند.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="panel-num text-lg font-extrabold">{value}</span>
      </CardContent>
    </Card>
  );
}
