import { redirect } from "next/navigation";
import ExamPanel from "@/components/UI/panel/ExamPanel";
import { getExamAttempts, getPanelUser } from "@/lib/panel/queries";
import { getExamByKey } from "@/lib/exam/db-exam";
import type { ExamPaper } from "@/components/UI/panel/ExamPanel";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getPanelUser();
  if (!user) redirect("/auth");

  const attempts = await getExamAttempts(user.id);

  /* The stored results know a question's number and its answer key, but not the
     صورت‌سؤال. Load each paper once — attempts repeat exams far more often than
     they introduce new ones — so the review can show the question itself. */
  const keys = [...new Set(attempts.map((a) => a.examKey).filter(Boolean))] as string[];
  const papers: Record<string, ExamPaper> = {};
  await Promise.all(
    keys.map(async (key) => {
      try {
        const exam = await getExamByKey(key);
        if (!exam) return;
        papers[key] = {
          questions: exam.sections.flatMap((section) =>
            section.questions.map((q) => ({
              number: q.number,
              section: section.title,
              instruction: q.instruction ?? "",
            })),
          ),
        };
      } catch (err) {
        console.error(`panel/exam: could not load ${key} —`, err);
      }
    }),
  );

  return <ExamPanel attempts={attempts} papers={papers} />;
}
