import type { Metadata } from "next";
import VocabAdminPanel from "@/components/admin/VocabAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import { vocabAdminList } from "@/lib/admin/vocab-actions";

export const metadata: Metadata = {
  title: "مدیریت واژه‌یاب",
  robots: { index: false, follow: false },
};

const GRADES = ["dahom", "yazdahom", "davazdahom"] as const;
type Grade = (typeof GRADES)[number];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; lesson?: string; focus?: string }>;
}) {
  const sp = await searchParams;

  /* آمدن از یک گزارش: پایه و درسِ همان واژه در نشانی است. اگر نبود یا
     بی‌معنی بود، همان درسِ پیش‌فرض باز می‌شود — یک نشانیِ دست‌کاری‌شده نباید
     صفحه را بشکند. */
  const grade: Grade = GRADES.includes(sp.grade as Grade) ? (sp.grade as Grade) : "dahom";
  const parsed = Number(sp.lesson);
  const lesson = Number.isInteger(parsed) && parsed >= 1 && parsed <= 18 ? parsed : 2;

  const result = await loadAdminData(() => vocabAdminList(grade, lesson));
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;
  return (
    <VocabAdminPanel
      initialGrade={grade}
      initialLesson={lesson}
      initialWords={result.data}
      focusId={sp.focus ?? null}
    />
  );
}
