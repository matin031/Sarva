import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/types";
import { requireTeacher } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/UI/kit/card";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import { ActivityStrip, BarRow, StatRow } from "@/components/UI/panel/primitives";
import { GRADE_LABEL } from "@/lib/profile/schemas";
import { fa, jalali, relativeDay } from "@/lib/panel/format";
import { getStudentDailyActivity } from "@/lib/teacher/analytics";
import { getStudentReport } from "@/lib/teacher/student-report";
import { getQuizBuilderData, listTeacherAssignments } from "@/lib/teacher/assignments";
import type { GameKey } from "@/lib/activity/schema";
import type { DailyPoint } from "@/lib/analytics/daily";
import RegisterStudentView from "@/components/UI/panel/teacher/RegisterStudentView";
import { listTeacherFeedbackFor } from "@/lib/teacher/feedback";
import FeedbackPanel from "@/components/UI/panel/teacher/FeedbackPanel";
import AruzActions from "@/components/UI/panel/teacher/AruzActions";
import AssignmentList from "@/components/UI/panel/teacher/AssignmentList";
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
 * (تنها جدولِ تازه `teacher_assignments` است: تکلیف، نه نتیجه.)
 *
 * =============================================================================
 * ⚠️ گارد
 * =============================================================================
 *
 * `getStudentReport` در خطِ اولش `getStudentForTeacher` را صدا می‌زند و آن
 * شناسهٔ دبیر را داخلِ خودِ `where` می‌گذارد. پس عوض کردنِ `studentId` در
 * نوارِ آدرس یک ۴۰۴ می‌دهد و نه کارنامهٔ یک غریبه — و «وجود ندارد» با «مالِ
 * تو نیست» یک پاسخ می‌گیرند تا نشود با امتحانِ شناسه‌ها فهمید کدام کاربرِ
 * واقعی است. توابعِ تکلیف همان گارد را جداگانه دارند.
 *
 * ⚠️ و هیچ دادهٔ غیرآموزشی خوانده نمی‌شود: نه ایمیل، نه شماره، نه خرید، نه
 * تیکت، نه نشست. دبیر فقط باید عملکرد را ببیند.
 *
 * =============================================================================
 * چیدمان
 * =============================================================================
 *
 * بالا خلاصه (چهار عدد)، بعد یک «بخش» برای هر درس. امروز فقط عروض کارِ
 * عملیاتی دارد (ساختِ آزمون و تکلیف)؛ درسِ بعدی همین قالب را می‌گیرد —
 * سرتیتر + کارهای دبیر، کارت‌های عملکرد، و فهرستِ تکالیفِ همان درس.
 */

export const metadata: Metadata = {
  title: "عملکرد دانش‌آموز",
  robots: { index: false, follow: false },
};

/**
 * بازی‌هایی که صفحهٔ «فعالیتِ نشست‌به‌نشست» دارند.
 *
 * ⚠️ فهرستِ بسته و دستی، و نه مشتق از `hasStoredResults`. جاسوس و مدارِ
 * دستور هم پاسخ ذخیره می‌کنند ولی صفحه‌ای برایشان ساخته نشده؛ ساختنِ لینک
 * از روی «داده دارد» یعنی دو لینک که به ۴۰۴ می‌رسند.
 *
 * ⚠️ مقدارها باید با کلیدهای `GAMES` در
 * `app/panel/teacher/class/[classId]/student/[studentId]/game/[game]/page.tsx`
 * یکی باشند. آن صفحه هر چیزِ دیگری را ۴۰۴ می‌کند، پس ناهماهنگی یک لینکِ
 * مرده می‌سازد و نه یک خطا.
 */
const DETAILED_GAMES = new Set<GameKey>(["aruz-bridge", "vocab"]);

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

  const [daily, feedback, assignments, builder] = await Promise.all([
    getStudentDailyActivity(teacher.id, studentId),
    /* فقط بازخوردهای *همین* دبیر: صفحه جای نوشتنِ اوست و نه خواندنِ
       یادداشت‌های همکارانش. */
    listTeacherFeedbackFor(teacher.id, studentId),
    listTeacherAssignments(teacher.id, studentId, classId),
    getQuizBuilderData(teacher.id, studentId, classId),
  ]);

  const { student, aruz, quizRecent, weights, roles, exams, games } = report;
  const activeClass = student.classes.find((c) => c.id === classId) ?? student.classes[0];

  const totalActivity =
    aruz.total + games.filter((g) => g.key !== "aruz-bridge").reduce((n, g) => n + g.total, 0);

  const open = (assignments ?? []).filter((a) => a.status !== "done").length;
  const doneCount = (assignments ?? []).length - open;

  return (
    <>
      {/* ⚠️ ثبتِ بازدید از **مرورگر** و نه از رندرِ سرور.

          پیش از این در بدنهٔ همین صفحه بود، یعنی هر prefetchِ `<Link>` —
          هر بار که موسِ دبیر روی دکمهٔ «عملکرد» می‌رفت — یک ردیفِ بازدید
          می‌ساخت و در فهرستِ «چه کسانی عملکردِ من را دیده‌اند» دانش‌آموز
          می‌نشست. چراییِ کامل در `lib/teacher/view-actions.ts`. */}
      <RegisterStudentView classId={classId} studentId={studentId} />

      <PanelPageHeader
        title={student.fullName ?? "دانش‌آموز بدون نام"}
        description={`${activeClass?.name ?? "کلاس"}${
          student.grade ? ` · پایهٔ ${GRADE_LABEL[student.grade]}` : ""
        } · عضو از ${jalali(student.joinedAt)}`}
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
        <StatRow
          items={[
            {
              label: "آخرین فعالیت",
              value: games.some((g) => g.lastAt) || aruz.lastAt ? lastSeen(report) : "—",
            },
            { label: "فعالیت‌های آموزشی", value: fa(totalActivity) },
            {
              label: "دقت عروض سماعی",
              value: aruz.accuracy === null ? "—" : `${fa(Math.round(aruz.accuracy * 100))}٪`,
              hint: aruz.accuracy === null ? "داده کافی نیست" : `${fa(aruz.correct)} از ${fa(aruz.total)}`,
            },
            {
              label: "تکالیف باز",
              value: fa(open),
              hint: doneCount > 0 ? `${fa(doneCount)} انجام‌شده` : undefined,
            },
          ]}
        />

        {student.classes.length > 1 && (
          <p className="text-[13px] text-muted-foreground">
            این دانش‌آموز در {fa(student.classes.length)} کلاس شماست:{" "}
            {student.classes.map((c) => c.name).join("، ")}. اعداد این صفحه کلِ فعالیت او در سروا
            است و به کلاس تفکیک نمی‌شود.
          </p>
        )}

        {/* ── عروض ──────────────────────────────────────────────────── */}
        <section aria-labelledby="aruz-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="aruz-heading" className="text-lg font-extrabold">
              عروض
            </h2>
            {builder && (
              <AruzActions
                studentId={studentId}
                classId={classId}
                weights={builder.weights}
                mistakes={builder.mistakes}
              />
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>عروض سماعی</CardTitle>
                <CardDescription>آخرین پاسخ به هر سؤال؛ تصحیح سمت سرور.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <dl className="grid grid-cols-4 gap-2 text-center">
                  <Num label="پاسخ" value={fa(aruz.total)} />
                  <Num label="درست" value={fa(aruz.correct)} />
                  <Num label="غلط" value={fa(aruz.total - aruz.correct)} />
                  <Num
                    label="دقت"
                    value={aruz.accuracy === null ? "—" : `${fa(Math.round(aruz.accuracy * 100))}٪`}
                  />
                </dl>

                <div>
                  <h3 className="mb-2 text-[13px] font-bold">دورهای اخیر</h3>
                  {quizRecent.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">هنوز دوری تمام نکرده است.</p>
                  ) : (
                    <ul className="flex flex-col gap-2.5">
                      {quizRecent.map((q) => (
                        <li key={q.id}>
                          <BarRow
                            label={relativeDay(q.at)}
                            correct={q.correct}
                            total={q.total}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>وزن‌ها</CardTitle>
                <CardDescription>از عروض سماعی، پل وزن و کیمیای وزن.</CardDescription>
              </CardHeader>
              <CardContent>
                <SkillList
                  analysis={weights}
                  emptyNote="هنوز داده کافی برای تحلیل وزن‌ها وجود ندارد."
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>تکالیف و آزمون‌های عروض</CardTitle>
              <CardDescription>آنچه شما برای این دانش‌آموز گذاشته‌اید.</CardDescription>
            </CardHeader>
            <CardContent>
              <AssignmentList initial={assignments ?? []} />
            </CardContent>
          </Card>
        </section>

        {/* ── فعالیتِ روزانه ────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>فعالیت روزانه</CardTitle>
            <CardDescription>سی روز گذشته، همهٔ بخش‌ها</CardDescription>
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
              <ActivityStrip days={lastDays(daily.days, 30)} />
            )}
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
            <CardTitle>امتحانات نهایی</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {exams.count === 0 ? (
              <p className="py-4 text-center text-[13px] text-muted-foreground">
                هنوز آزمونی نداده است.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-3 gap-2 text-center">
                  <Num label="تعداد" value={fa(exams.count)} />
                  <Num label="بهترین" value={exams.best === null ? "—" : `${fa(exams.best)}٪`} />
                  <Num label="میانگین" value={exams.average === null ? "—" : `${fa(exams.average)}٪`} />
                </dl>
                {/* ⚠️ هر ردیف یک لینک است و نه یک خطِ مرده.

                    «۱۴ از ۲۰» به دبیر نمی‌گوید ضعف کجاست؛ برای تصمیم گرفتن
                    باید دید *کدام* سؤال‌ها از دست رفته‌اند. صفحهٔ مقصد
                    همان کارنامه است، سؤال‌به‌سؤال.

                    ⚠️ جزئیات عمداً در همین صفحه باز نمی‌شود: کارنامه دو
                    ستونِ JSON بزرگ دارد و کشیدنِ آن‌ها برای ده کارنامه،
                    این صفحه را — که فقط خلاصه می‌خواهد — سنگین می‌کرد.
                    (همان استدلالِ بالای `recentExamList`.) */}
                <ul className="flex flex-col divide-y divide-border">
                  {exams.recent.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/panel/teacher/class/${classId}/student/${studentId}/exam/${e.id}`}
                        className="group flex flex-wrap items-center justify-between gap-2 rounded-lg py-2.5 transition-colors hover:bg-foreground/[0.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      >
                        <span className="font-medium group-hover:text-primary">{e.title}</span>
                        <span className="panel-num text-[13px] text-muted-foreground">
                          {fa(e.score)} از {fa(e.max)} · {jalali(e.at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── بازخورد ───────────────────────────────────────────────── */}
        <FeedbackPanel studentId={studentId} classId={classId} initial={feedback} />

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
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
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

                      {/* ⚠️ لینک فقط برای بازی‌هایی که صفحهٔ جزئیات دارند.

                          `DETAILED_GAMES` عمداً یک فهرستِ بستهٔ کوچک است و
                          نه «هر بازی‌ای که داده دارد»: جاسوس و مدارِ دستور
                          هم پاسخ ذخیره می‌کنند، ولی صفحه‌ای برایشان ساخته
                          نشده. ساختنِ لینک از روی `hasStoredResults` یعنی
                          دو لینکِ ۴۰۴. */}
                      {DETAILED_GAMES.has(g.key) && (
                        <Link
                          href={`/panel/teacher/class/${classId}/student/${studentId}/game/${g.key}`}
                          className="text-[12.5px] text-primary underline-offset-[6px] hover:underline"
                        >
                          دیدنِ فعالیت
                        </Link>
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
 * روزهای خالی هم یک ستون می‌گیرند.
 *
 * ⚠️ سری از سرور فقط روزهای *دارای* فعالیت را دارد؛ کشیدنش بدونِ پر کردنِ
 * جای خالی، سه روزِ پراکنده را کنارِ هم می‌نشاند و «هر روز کار کرده» خوانده
 * می‌شد. کلیدِ روز همان تاریخِ میلادیِ تهران است که `tehranDay` ساخته.
 */
function lastDays(points: DailyPoint[], n: number) {
  const byDay = new Map(points.map((p) => [p.day, p]));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
  const base = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => {
    const date = new Date(base - (n - 1 - i) * 86_400_000);
    const p = byDay.get(date.toISOString().slice(0, 10));
    return {
      label: i % 5 === 4 ? jalali(date.toISOString()).slice(5) : "",
      total: p?.total ?? 0,
      correct: p?.correct ?? 0,
    };
  });
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
  /* ⚠️ از *باقی‌ماندهٔ* سطل‌ها، نه از کلِ فهرست: با پنج سطل یا کمتر، یک وزن
     هم «نیازمند تمرین» و هم «قوی‌تر» نشان داده می‌شد. */
  const strongest = analysis.buckets.slice(5).reverse().slice(0, 3);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-3 text-[13px] font-bold">
          {analysis.buckets.length > 5 ? "نیازمند تمرین" : "ضعیف‌ترین اول"}
        </h3>
        <ul className="flex flex-col gap-3">
          {weakest.map((b) => (
            <li key={b.key}>
              <BarRow label={b.label} correct={b.correct} total={b.total} />
            </li>
          ))}
        </ul>
      </div>

      {strongest.length > 0 && (
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
      )}

      {analysis.ignoredBuckets > 0 && (
        <p className="text-[11px] text-muted-foreground">
          {fa(analysis.ignoredBuckets)} مورد دیگر هنوز پاسخ کافی ندارند و در این فهرست نیامده‌اند.
        </p>
      )}
    </div>
  );
}

function Num({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-foreground/[0.03] px-2 py-3">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="panel-num mt-1 text-lg font-extrabold">{value}</dd>
    </div>
  );
}
