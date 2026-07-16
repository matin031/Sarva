import type { Metadata } from "next";
import Link from "next/link";
import { adminListExams } from "@/lib/exam/admin-actions";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  robots: { index: false, follow: false },
};

export default async function Page() {
  // any admin-only call works as the access check for this hub page
  const result = await loadAdminData(() => adminListExams());
  if (!result.ok) return <AdminAccessDenied message={result.message} />;

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10 xs:px-5">
      <h1 className="text-2xl font-bold">پنل مدیریت</h1>

      <div className="flex flex-col gap-4">
        <Link
          href="/admin/exams"
          className="glass flex flex-col gap-1 rounded-2xl p-5 transition-colors hover:border-primary/50"
        >
          <h2 className="text-lg font-semibold">امتحانات نهایی</h2>
          <p className="text-sm text-muted-foreground">افزودن و ویرایش آزمون‌ها و سؤالات هر ۱۸ نوع.</p>
        </Link>

        <Link
          href="/admin/quiz"
          className="glass flex flex-col gap-1 rounded-2xl p-5 transition-colors hover:border-primary/50"
        >
          <h2 className="text-lg font-semibold">عروض سماعی</h2>
          <p className="text-sm text-muted-foreground">افزودن و ویرایش سؤالات بازی تشخیص وزن با صوت.</p>
        </Link>
      </div>
    </div>
  );
}
