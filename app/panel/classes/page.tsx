import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import StudentClasses from "@/components/UI/panel/StudentClasses";
import { listStudentClasses } from "@/lib/teacher/classes";
import { listMyViewers } from "@/lib/teacher/views";
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

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const [classes, viewers] = await Promise.all([
    listStudentClasses(user.id),
    /* ⚠️ شرطِ `student_id` داخلِ خودِ کوئری است — این فهرست فقط بازدیدهای
       *همین* کاربر را می‌دهد و هیچ‌کس نمی‌تواند ببیند دبیرها سراغِ چه
       کسانِ دیگری رفته‌اند. */
    listMyViewers(user.id),
  ]);

  return (
    <>
      <PanelPageHeader
        title="کلاس‌های من"
        description="با کدی که دبیرت می‌دهد وارد کلاس شو؛ بعد از آن، عملکردت را می‌بیند."
        eyebrow="کلاس"
        tone="mint"
      />

      <StudentClasses initial={classes} />

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
