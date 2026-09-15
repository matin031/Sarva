import type { Metadata } from "next";
import { adminListTeacherRequests } from "@/lib/admin/teacher-actions";
import { AdminAccessDenied, loadAdminData } from "@/components/admin/AdminGate";
import TeacherAdminTabs from "@/components/admin/TeacherAdminTabs";

/**
 * مدیریت درخواست دبیران — بند ۷.
 *
 * ⚠️ `loadAdminData` جای یک `try/catch` دستی را می‌گیرد و لازم است: بدونِ
 * آن، «شما دسترسی مدیریت ندارید» به‌شکلِ یک صفحهٔ خطای خامِ Next دیده
 * می‌شود، و مهم‌تر — خطای «جدول وجود ندارد» (یعنی migration اجرا نشده) به
 * یک دستورِ روشن تبدیل می‌شود به‌جای یک stack trace. این صفحه اولین جایی
 * است که بعد از مهاجرت ۰۰۹ باز می‌شود، پس آن حالت اینجا واقعاً پیش می‌آید.
 */

export const metadata: Metadata = {
  title: "مدیریت دبیران",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Page() {
  const result = await loadAdminData(() => adminListTeacherRequests({ status: "pending" }));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  /* ⚠️ فقط صفِ درخواست‌ها از سرور می‌آید. فهرستِ دبیرانِ فعال در تبِ دوم و
     در کلاینت خوانده می‌شود — بیشترِ دفعات این صفحه برای رسیدگی به صف باز
     می‌شود و کوئریِ آن تب هزینه‌ای است که آن دفعات نباید داده شود. */
  return (
    <TeacherAdminTabs
      initialRequests={result.data.requests}
      initialTotal={result.data.total}
      initialPending={result.data.pendingCount}
    />
  );
}
