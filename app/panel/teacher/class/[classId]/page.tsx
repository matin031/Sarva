import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/types";
import { requireTeacher } from "@/lib/auth/current-user";
import { isUuid } from "@/lib/api/action-input";
import PanelPageHeader from "@/components/UI/panel/PanelPageHeader";
import ClassDetail from "@/components/UI/panel/teacher/ClassDetail";
import { getTeacherClass, listClassMembers } from "@/lib/teacher/classes";
import { GRADE_LABEL } from "@/lib/profile/schemas";

/**
 * یک کلاس — اعضا، کد عضویت و مدیریتش.
 *
 * ⚠️ `requireTeacher()` اینجا هست ولی **گاردِ اصلی نیست**.
 *
 * گاردِ اصلی `getTeacherClass(teacher.id, classId)` است: شناسهٔ دبیر داخلِ
 * خودِ کوئری می‌رود، پس کلاسِ دبیرِ دیگری اصلاً برنمی‌گردد. اگر فقط نقش
 * بررسی می‌شد، هر دبیری با عوض کردنِ شناسه در نوارِ آدرس فهرستِ
 * دانش‌آموزانِ کلاسِ همکارش را می‌دید.
 *
 * ⚠️ و «پیدا نشد» برای کلاسِ ناموجود و کلاسِ دیگری یکی است — تفکیکشان فقط
 * به کسی که شناسه‌ها را امتحان می‌کند می‌گفت کدام‌ها واقعی‌اند.
 */

export const metadata: Metadata = {
  title: "مدیریت کلاس",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;

  let teacher;
  try {
    teacher = await requireTeacher();
  } catch (err) {
    // ⚠️ ۴۰۱ به صفحهٔ ورود می‌رود و ۴۰۳ به پنلِ دبیر — جایی که کاربر
    // می‌فهمد چرا نمی‌تواند وارد شود و چه کاری باید بکند. نشان دادنِ یک
    // صفحهٔ خطای خام برای کسی که هنوز دبیر نشده، بن‌بست است.
    if (err instanceof AuthError) redirect(err.status === 401 ? "/auth" : "/panel/teacher");
    throw err;
  }

  // شناسهٔ بدشکل نباید به دیتابیس برسد؛ `CHAR(36)` با یک رشتهٔ دلخواه فقط
  // یک کوئریِ بی‌نتیجه است، ولی ۴۰۴ دادنش زودتر و صادقانه‌تر است.
  if (!isUuid(classId)) notFound();

  const klass = await getTeacherClass(teacher.id, classId);
  if (!klass) notFound();

  const members = await listClassMembers(teacher.id, classId);

  return (
    <>
      <PanelPageHeader
        title={klass.name}
        description={`${klass.schoolName} · پایهٔ ${GRADE_LABEL[klass.grade]}`}
        eyebrow="کلاس"
        tone="mint"
      />

      <ClassDetail klass={klass} initialMembers={members} />
    </>
  );
}
