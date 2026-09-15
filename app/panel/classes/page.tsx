import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import StudentClasses from "@/components/UI/panel/StudentClasses";
import { listStudentClasses } from "@/lib/teacher/classes";
import { JOIN_PARAM, invitePath } from "@/lib/teacher/invite";
import { normalizeJoinCode } from "@/lib/teacher/join-code";
import { listMyViewers } from "@/lib/teacher/views";
import { listStudentFeedback } from "@/lib/teacher/feedback";
import { FEEDBACK_CATEGORY_LABEL } from "@/lib/teacher/feedback-rules";
import { jalali } from "@/lib/panel/format";
import { Card, CardContent } from "@/components/UI/kit/card";
import { relativeDay } from "@/lib/panel/format";

/**
 * کلاس‌های من — سمتِ دانش‌آموز.
 *
 * ⚠️ مسیرِ جدا از `/panel/teacher` و نه یک تبِ داخلِ آن: این دو صفحه دو
 * مخاطبِ متفاوت دارند و هیچ‌کدام چیزی از آن یکی لازم ندارند. دبیر هم
 * می‌تواند عضوِ کلاسِ دبیرِ دیگری باشد (مثلاً در یک دورهٔ ضمن خدمت)، پس این
 * صفحه برای او هم کار می‌کند.
 */

export const metadata: Metadata = {
  title: "کلاس‌های من",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* ⚠️ کدِ دعوت از نشانی خوانده و **همین‌جا** یکدست می‌شود.
  
     اگر خام به کامپوننت می‌رفت، کاربری که لینک را از یک پیام‌رسان کپی
     کرده (با فاصله یا حروفِ کوچک) کدِ درستش رد می‌شد. و الگو هم سنجیده
     می‌شود تا هر رشتهٔ دلخواهی از نشانی وارد فرم نشود. */
  const raw = (await searchParams)[JOIN_PARAM];
  const candidate = normalizeJoinCode(typeof raw === "string" ? raw : "");
  const inviteCode = /^[A-Z2-9]{6,10}$/.test(candidate) ? candidate : null;

  const user = await getCurrentUser();
  if (!user) {
    /* ⚠️ کد باید از ورود سالم رد شود.
    
       بدونِ `returnTo`، دانش‌آموزی که روی لینکِ دعوت زده پس از ورود به
       صفحهٔ خانه می‌رفت و هیچ‌وقت نمی‌فهمید کدش کجا رفت. مسیر از
       `safeReturnTo` رد می‌شود و فقط چون در فهرستِ سفید است پذیرفته
       می‌شود — نه چون از نشانی آمده. */
    const back = inviteCode ? invitePath(inviteCode) : "/panel/classes";
    redirect(`/auth?returnTo=${encodeURIComponent(back)}`);
  }

  const [classes, viewers, feedback] = await Promise.all([
    listStudentClasses(user.id),
    /* ⚠️ شرطِ `student_id` داخلِ خودِ کوئری است — این فهرست فقط بازدیدهای
       *همین* کاربر را می‌دهد و هیچ‌کس نمی‌تواند ببیند دبیرها سراغِ چه
       کسانِ دیگری رفته‌اند. */
    listMyViewers(user.id),
    /* باز هم شرطِ `student_id` در خودِ کوئری — تنها چیزی که بینِ این
       کاربر و بازخوردهای بقیه ایستاده. */
    listStudentFeedback(user.id),
  ]);

  return (
    <>
      <PanelPageHeader
        title="کلاس‌های من"
        description="با کدی که دبیرت می‌دهد وارد کلاس شو؛ بعد از آن، عملکردت را می‌بیند."
        eyebrow="کلاس"
        tone="mint"
      />

      <StudentClasses initial={classes} inviteCode={inviteCode} />

      {/* ── بازخوردهای دبیر ─────────────────────────────────────────
          ⚠️ `id="feedback"` همان لنگری است که لینکِ اعلان به آن می‌آید
          (`/panel/classes#feedback`). عوض کردنش یعنی هر اعلانِ قدیمی به
          بالای صفحه می‌رسد و کاربر خودش باید دنبالش بگردد. */}
      {feedback.length > 0 && (
        <Card id="feedback" className="mt-4 scroll-mt-24">
          <CardContent className="flex flex-col gap-3 py-4">
            <h2 className="font-bold">بازخورد دبیران</h2>
            <ul className="flex flex-col divide-y divide-border">
              {feedback.map((f) => (
                <li key={f.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-semibold">
                      {f.teacherName ?? "دبیر"}
                    </span>
                    <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[11px]">
                      {FEEDBACK_CATEGORY_LABEL[f.category]}
                    </span>
                    <span className="panel-num text-[11px] text-muted-foreground">
                      کلاس {f.className} · {jalali(f.createdAt)}
                    </span>
                  </div>
                  {/* متنِ کامل، از خودِ جدول — اعلان فقط پیش‌نمایش داشت. */}
                  <p className="whitespace-pre-wrap text-[13px]">{f.message}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ⚠️ شفافیت، و جایش عمدی است: کنارِ همان صفحه‌ای که کلاس‌ها در آن
          دیده می‌شوند، نه در یک صفحهٔ «قوانین» که کسی باز نمی‌کند.

          و دقیقاً همان‌قدر که درست است — «عملکرد آموزشی». دبیر خرید،
          صورتحساب، تیکتِ پشتیبانی، رمز، نشست‌ها و کلاس‌های دیگر را
          نمی‌بیند؛ نوشتنِ «فعالیت شما» این‌ها را هم القا می‌کرد. */}
      {classes.length > 0 && (
        <Card className="mt-4">
          <CardContent className="flex flex-col gap-3 py-4 text-[13px]">
            <p className="text-muted-foreground">
              دبیر هر کلاس می‌تواند عملکرد آموزشی مرتبط با فعالیت‌های شما در سروا را ببیند:
              پاسخ‌های تمرین‌ها و بازی‌ها، نتیجهٔ آزمون‌ها و زمان آخرین فعالیت. خریدها،
              صورتحساب، پیام‌های پشتیبانی، اطلاعات ورود و کلاس‌های دیگر شما برای او قابل
              مشاهده نیست.
            </p>

            {viewers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <h2 className="font-bold">چه کسانی عملکرد شما را دیده‌اند</h2>
                <ul className="flex flex-col gap-1 text-muted-foreground">
                  {viewers.map((v) => (
                    <li key={`${v.teacherName}-${v.className}-${v.viewedAt}`}>
                      {v.teacherName ?? "دبیر"} · کلاس {v.className} · {relativeDay(v.viewedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
