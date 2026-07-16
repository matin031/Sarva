import type { Metadata } from "next";
import { quizAdminList } from "@/lib/quiz/admin-actions";
import QuizAdminPanel from "@/components/admin/QuizAdminPanel";

export const metadata: Metadata = {
  title: "مدیریت عروض سماعی",
  robots: { index: false, follow: false },
};

async function loadQuestions() {
  try {
    return { ok: true as const, questions: await quizAdminList() };
  } catch (e) {
    return {
      ok: false as const,
      message: e instanceof Error ? e.message : "برای دیدن این صفحه باید وارد حساب کاربری با نقش مدیر شوید.",
    };
  }
}

export default async function Page() {
  const result = await loadQuestions();

  if (!result.ok) {
    return (
      <div dir="rtl" className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <h1 className="text-lg font-bold">دسترسی ندارید</h1>
        <p className="text-sm text-muted-foreground">{result.message}</p>
      </div>
    );
  }

  return <QuizAdminPanel initialQuestions={result.questions} />;
}
