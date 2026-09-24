import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import StudentClasses from "@/components/UI/panel/StudentClasses";
import { listStudentClasses } from "@/lib/teacher/classes";
import { JOIN_PARAM, invitePath } from "@/lib/teacher/invite";
import { normalizeJoinCode } from "@/lib/teacher/join-code";
import { listMyViewers } from "@/lib/teacher/views";
import ClassPrivacyCard from "@/components/UI/panel/ClassPrivacyCard";
import StudentFeedbackList from "@/components/UI/panel/StudentFeedbackList";
import { listStudentFeedback } from "@/lib/teacher/feedback";
import { listStudentAssignments } from "@/lib/teacher/assignments";
import StudentAssignments from "@/components/UI/panel/StudentAssignments";

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

  const [classes, viewers, feedback, assignments] = await Promise.all([
    listStudentClasses(user.id),
    /* ⚠️ شرطِ `student_id` داخلِ خودِ کوئری است — این فهرست فقط بازدیدهای
       *همین* کاربر را می‌دهد و هیچ‌کس نمی‌تواند ببیند دبیرها سراغِ چه
       کسانِ دیگری رفته‌اند. */
    listMyViewers(user.id),
    /* باز هم شرطِ `student_id` در خودِ کوئری — تنها چیزی که بینِ این
       کاربر و بازخوردهای بقیه ایستاده. */
    listStudentFeedback(user.id),
    /* شرطِ `student_id` در خودِ کوئری؛ شناسه از سشن. */
    listStudentAssignments(user.id),
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

      <StudentAssignments items={assignments} />

      <StudentFeedbackList feedback={feedback} />

      {/* ⚠️ افشا **همیشه** نشان داده می‌شود و نه فقط وقتی کلاسی هست.
          کسی که هنوز عضو نشده، دقیقاً همان کسی است که باید پیش از وارد
          کردنِ کد بداند چه چیزی را می‌پذیرد. */}
      <div className="mt-4">
        <ClassPrivacyCard viewers={viewers} />
      </div>

    </>
  );
}
