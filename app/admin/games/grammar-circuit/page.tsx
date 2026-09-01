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

export default async function Page() {
  const result = await loadAdminData(async () => {
    const [questions, counts] = await Promise.all([
      gcAdminList({ grade: GRADE, lesson: LESSON }),
      gcAdminLessonCounts(GRADE),
    ]);
    return { questions, counts };
  });
  if (!result.ok) return <AdminAccessDenied title={result.title} message={result.message} />;

  return (
    <GrammarCircuitAdminPanel
      initialGrade={GRADE}
      initialLesson={LESSON}
      initialQuestions={result.data.questions}
      initialCounts={result.data.counts}
    />
  );
}
