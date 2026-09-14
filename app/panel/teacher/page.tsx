import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import TeacherActivation from "@/components/UI/panel/teacher/TeacherActivation";
import TeacherClasses from "@/components/UI/panel/teacher/TeacherClasses";
import { getTeacherAccountState, teacherRequestReadiness } from "@/lib/teacher/requests";
import { listTeacherClasses } from "@/lib/teacher/classes";
import { listSchoolsInCity } from "@/lib/teacher/schools";

/**
 * پنل دبیر — بندهای ۴، ۶ و ۸.
 *
 * ⚠️ یک صفحه با دو چهره، و نه دو صفحه:
 *
 *   • کاربرِ عادی → کارتِ «فعال‌سازی حساب دبیر» (فرم یا وضعیت).
 *   • دبیرِ تأییدشده → همان کارت به‌شکلِ یک نوارِ «تأیید شده»، و زیرش
 *     مدرسه‌ها و کلاس‌ها.
 *
 * دو مسیرِ جدا یعنی کاربری که تازه تأیید شده، لینکِ قدیمی‌اش ۴۰۴ می‌دهد و
 * باید بفهمد حالا باید کجا برود.
 *
 * ⚠️ این صفحه **گاردِ نقش ندارد** و عمدی است: هر کاربرِ واردشده‌ای باید
 * بتواند درخواست بدهد. گاردِ واقعی روی *کارها*ست — `requireTeacher()` در
 * `lib/teacher/actions.ts` — و نه روی دیدنِ صفحه.
 */

export const metadata: Metadata = {
  title: "پنل دبیر",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth");

  const state = await getTeacherAccountState(user);
  const isTeacher = state.state === "teacher";

  /* ⚠️ داده‌های کلاس فقط برای دبیرِ تأییدشده خوانده می‌شوند.
     نه به‌خاطر امنیت (کوئری‌ها خودشان با `teacher_id` محدودند و برای
     غیر-دبیر خالی برمی‌گردند)، بلکه به‌خاطر اینکه سه کوئریِ بی‌فایده روی
     صفحه‌ای که فقط یک فرم نشان می‌دهد، هزینهٔ الکی است. */
  const [classes, schools] = isTeacher
    ? await Promise.all([
        listTeacherClasses(user.id),
        // ⚠️ فهرستِ مدرسه‌ها از شهرِ *پروفایلِ* دبیر می‌آید. اگر شهری ثبت
        // نکرده باشد، فهرست خالی است و `TeacherClasses` از او می‌خواهد
        // اول شهرش را انتخاب کند — بهتر از یک `<select>` خالیِ بی‌توضیح.
        user.cityId ? listSchoolsInCity(user.cityId) : Promise.resolve([]),
      ])
    : [[], []];

  return (
    <>
      <PanelPageHeader
        title={isTeacher ? "کلاس‌های تو" : "دبیر سروا شو"}
        description={
          isTeacher
            ? "مدرسه و کلاس بساز، کد عضویت را به دانش‌آموزانت بده و عملکردشان را دنبال کن."
            : "اگر دبیر ادبیاتی، با فرستادن مدارکت پنل دبیر و سروا پلاسِ دائمی برایت باز می‌شود."
        }
        eyebrow="حساب دبیر"
        tone="mint"
      />

      <TeacherActivation initialState={state} readiness={teacherRequestReadiness(user)} />

      {isTeacher && (
        <TeacherClasses
          initialClasses={classes}
          initialSchools={schools}
          provinceId={user.provinceId}
          cityId={user.cityId}
        />
      )}
    </>
  );
}
