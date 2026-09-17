import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/types";
import { requireTeacher } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import { Button } from "@/components/UI/kit/button";
import { Card, CardContent } from "@/components/UI/kit/card";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import { fa, jalali, pct } from "@/lib/panel/format";
import { STATUS_LABEL } from "@/lib/exam/attempt-view";
import { getStudentExamAttempt, type ExamQuestionLine } from "@/lib/teacher/student-detail";
import { cn } from "@/lib/cn";

/**
 * یک کارنامهٔ آزمون، سؤال‌به‌سؤال — از دیدِ دبیر.
 *
 * =============================================================================
 * ⚠️ چرا این صفحه لازم بود
 * =============================================================================
 *
 * صفحهٔ «عملکرد دانش‌آموز» فقط می‌گفت «آزمون فارسی ۳ — ۱۴ از ۲۰». برای
 * تصمیم گرفتن کافی نیست: دبیر باید بداند *کدام* سؤال‌ها از دست رفته‌اند تا
 * بفهمد ضعف در کجاست. «۷۰٪» دربارهٔ آرایه‌های ادبی چیزی نمی‌گوید.
 *
 * =============================================================================
 * ⚠️ گارد
 * =============================================================================
 *
 * `getStudentExamAttempt` سه شرط را با هم می‌سنجد و هر سه لازم‌اند:
 * این دبیر حق دارد این دانش‌آموز را ببیند، دانش‌آموز عضوِ *همین* کلاس است،
 * و این کارنامه مالِ همان دانش‌آموز است. `null` برای هر سه یکی است، تا
 * نشود با امتحانِ شناسه‌ها فهمید کدام‌یک وجود دارد.
 *
 * ⚠️ و هیچ دادهٔ غیرآموزشی خوانده نمی‌شود — همان قاعدهٔ صفحهٔ عملکرد.
 */

export const metadata: Metadata = {
  title: "کارنامهٔ آزمون",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ classId: string; studentId: string; attemptId: string }>;
}) {
  const { classId, studentId, attemptId } = await params;

  let teacher;
  try {
    teacher = await requireTeacher();
  } catch (err) {
    if (err instanceof AuthError) redirect(err.status === 401 ? "/auth" : "/panel/teacher");
    throw err;
  }

  if (!isUuid(classId) || !isUuid(studentId) || !isUuid(attemptId)) notFound();

  const attempt = await getStudentExamAttempt(teacher.id, studentId, attemptId, classId);
  if (!attempt) notFound();

  const backHref = `/panel/teacher/class/${classId}/student/${studentId}`;
  const percent = attempt.maxScore > 0 ? Math.round((attempt.totalScore / attempt.maxScore) * 100) : 0;

  /* ⚠️ «کاملاً درست» یعنی نمرهٔ کامل و نه «صفر نبود». سؤالِ نیمه‌درست باید
     در دستهٔ خودش بماند، وگرنه دبیر یک برگهٔ پر از نیمه‌نمره را «خوب»
     می‌خواند. */
  const full = attempt.questions.filter((q) => q.max > 0 && q.score >= q.max).length;
  const zero = attempt.questions.filter((q) => q.max > 0 && q.score === 0).length;
  const partial = attempt.questions.length - full - zero;

  return (
    <>
      <PanelPageHeader
        title={attempt.examTitle}
        description={`${jalali(attempt.createdAt)} · نمره ${fa(round(attempt.totalScore))} از ${fa(round(attempt.maxScore))}`}
        eyebrow="کارنامهٔ آزمون"
        tone="rose"
        art={false}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href={backHref}>بازگشت به عملکرد</Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="درصد" value={`${fa(percent)}٪`} />
          <Stat label="کاملاً درست" value={fa(full)} />
          <Stat label="نیمه‌درست" value={fa(partial)} />
          <Stat label="بی‌نمره" value={fa(zero)} />
        </div>

        {attempt.questions.length === 0 ? (
          /* ⚠️ این حالت واقعی است و نه نظری: کارنامه‌های خیلی قدیمی
             می‌توانند `question_results`ِ خالی داشته باشند. نوشتنِ یک
             فهرستِ خالی بدونِ توضیح، شبیهِ خرابیِ صفحه دیده می‌شود. */
          <Card>
            <CardContent className="py-8 text-center text-[13px] text-muted-foreground">
              جزئیاتِ سؤال‌ها برای این کارنامه ثبت نشده است.
            </CardContent>
          </Card>
        ) : (
          <ol className="flex flex-col gap-3">
            {attempt.questions.map((question) => (
              <li key={question.number}>
                <QuestionCard question={question} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}

/** نمره‌ها اعشاریِ یک‌رقمی‌اند؛ «۱٫۵۰» فقط شلوغی است. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function QuestionCard({ question }: { question: ExamQuestionLine }) {
  const kind =
    question.max <= 0
      ? "none"
      : question.score >= question.max
        ? "full"
        : question.score > 0
          ? "partial"
          : "zero";

  /* ⚠️ رنگ فقط پشتیبان است. برچسبِ «۰ از ۲» همیشه نوشته می‌شود، چون
     تشخیصِ سبز از قرمز برای بخشی از کاربران ممکن نیست — و این صفحه ممکن
     است چاپ هم بشود. */
  const tone = {
    full: "border-primary/35 bg-primary/[0.05]",
    partial: "border-gold/40 bg-gold/[0.06]",
    zero: "border-destructive/30 bg-destructive/[0.04]",
    none: "border-border/70",
  }[kind];

  return (
    <Card className={cn("overflow-hidden", tone)}>
      <CardContent className="flex flex-col gap-3 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-[13px] font-bold">
            سؤال {fa(question.number)}
            {question.section && (
              <span className="ms-2 font-normal text-muted-foreground">{question.section}</span>
            )}
          </h2>
          <span className="panel-num text-[13px] font-bold">
            {fa(round(question.score))} از {fa(round(question.max))}
            {question.max > 0 && (
              <span className="ms-2 font-normal text-muted-foreground">
                {pct(question.score, question.max)}
              </span>
            )}
          </span>
        </div>

        {question.instruction ? (
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
            {question.instruction}
          </p>
        ) : (
          /* ⚠️ صریح گفته می‌شود که *صورتِ سؤال* در دسترس نیست و نه اینکه
             سؤالی نبوده. کارنامه مالِ روزی است که گرفته شده؛ اگر از آن
             موقع سؤال از برگه حذف شده باشد، نمره‌اش هنوز معتبر است. */
          <p className="text-[12px] text-muted-foreground">
            صورتِ این سؤال دیگر در برگه نیست (ویرایش شده یا حذف شده).
          </p>
        )}

        {question.parts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {question.parts.map((part, index) => (
              <li
                key={index}
                className="rounded-xl border border-border/60 bg-background/35 p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-[12.5px] font-semibold">
                    {part.label || `بخش ${fa(index + 1)}`}
                  </span>
                  <span className="panel-num text-[12px] text-muted-foreground">
                    {fa(round(part.score))} از {fa(round(part.max))}
                    {part.status && (
                      <span className="ms-2">{STATUS_LABEL[part.status] ?? part.status}</span>
                    )}
                  </span>
                </div>

                <dl className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-muted-foreground">پاسخ دانش‌آموز:</dt>
                    {/* ⚠️ «پاسخی ثبت نشده» و نه یک جای خالی. جای خالی شبیهِ
                        خرابیِ رندر است؛ این جمله یک واقعیت است. */}
                    <dd className="min-w-0 whitespace-pre-wrap">
                      {part.answer || (
                        <span className="text-muted-foreground">پاسخی ثبت نشده</span>
                      )}
                    </dd>
                  </div>

                  {part.correctAnswerText && (
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted-foreground">پاسخ درست:</dt>
                      <dd className="min-w-0 whitespace-pre-wrap">{part.correctAnswerText}</dd>
                    </div>
                  )}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
