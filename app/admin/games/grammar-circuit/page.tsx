import type { Metadata } from "next";
import GrammarCircuitAdminPanel from "@/components/admin/GrammarCircuitAdminPanel";
import { loadAdminData, AdminAccessDenied } from "@/components/admin/AdminGate";
import {
  gcAdminLessonCounts,
  gcAdminList,
} from "@/lib/admin/grammar-circuit-actions";

export const metadata: Metadata = {
  title: "مدیریت مدار دستور",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// دوازدهم/درس ۱ باز می‌شود، چون بستهٔ محتوایی موجود همان‌جاست و پنل خالی
// باز نمی‌شود.
const GRADE = "davazdahom";
const LESSON = 1;

const GRADES = ["dahom", "yazdahom", "davazdahom"] as const;
type Grade = (typeof GRADES)[number];

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; lesson?: string; focus?: string }>;
}) {
  const sp = await searchParams;

  /* آمدن از یک گزارش: پایه و درسِ همان پرسش در نشانی است. نشانیِ بی‌معنی
     همان درسِ پیش‌فرض را باز می‌کند، نه صفحهٔ خطا. */
  const grade: Grade = GRADES.includes(sp.grade as Grade) ? (sp.grade as Grade) : GRADE;
  const parsed = Number(sp.lesson);
  const lesson =
    Number.isInteger(parsed) && parsed >= 1 && parsed <= 18 ? parsed : LESSON;

  const result = await loadAdminData(async () => {
    const [questions, counts] = await Promise.all([
      gcAdminList({ grade, lesson }),
      gcAdminLessonCounts(grade),
    ]);
    return { questions, counts };
  });
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return (
    <GrammarCircuitAdminPanel
      initialGrade={grade}
      initialLesson={lesson}
      initialQuestions={result.data.questions}
      initialCounts={result.data.counts}
      focusId={sp.focus ?? null}
    />
  );
}
