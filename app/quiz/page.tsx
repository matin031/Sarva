import Quiz from "@/components/UI/Quiz";
import QuizBankLoader from "@/components/UI/QuizBankLoader";
import { loadQuestions } from "@/lib/quiz/bank";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AssignmentGone } from "@/components/UI/AssignmentNotice";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loadAssignmentForStudent } from "@/lib/teacher/assignments";

export const metadata: Metadata = {
  title: "آزمون وزن شعر",
  robots: { index: false, follow: false },
};

/** سؤال‌ها از دیتابیس می‌آیند و مدیر هر لحظه می‌تواند عوضشان کند، پس این صفحه
 *  نباید در زمان build پخته شود.
 *
 *  تا دیروز این خط لازم نبود: صفحه از cookies() استفاده می‌کرد (برای ساختن
 *  کلاینت Supabase) و همان به‌تنهایی Next را وادار می‌کرد پویا رندرش کند. با
 *  حذف آن وابستگی، صفحه ناگهان کاندید پیش‌رندر شد و build با
 *  «DATABASE_URL تنظیم نشده» شکست — چون مرحلهٔ build دیتابیس ندارد. */
export const dynamic = "force-dynamic";

async function page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  /* ⚠️ آزمونی که دبیر گذاشته. سؤال‌ها از خودِ تکلیف می‌آیند و تکلیف با
     `student_id`ِ همین سشن خوانده می‌شود؛ شناسهٔ نشانی فقط برچسب است. */
  const assignmentParam = (await searchParams).assignment;
  if (assignmentParam !== undefined) {
    const user = await getCurrentUser();
    if (!user) redirect(`/auth?returnTo=${encodeURIComponent("/panel/classes")}`);
    const gate = await loadAssignmentForStudent(user.id, assignmentParam, "aruz_quiz");
    if (gate.state !== "ok") return <AssignmentGone state={gate.state} />;
    const byId = new Map((await loadQuestions(gate.items)).map((q) => [q.id, q]));
    const picked = gate.items.flatMap((id) => byId.get(id) ?? []);
    /* سؤالی که بعد از ساختِ آزمون حذف شده، آزمون را کامل‌نشدنی می‌کند
       (سرور همهٔ سؤال‌ها را می‌خواهد). */
    if (picked.length !== gate.items.length) return <AssignmentGone state="missing" />;
    return <Quiz data={picked} assignment={{ id: gate.id, title: gate.title }} />;
  }

  /* ⚠️ دورِ آزاد بانک را در HTML نمی‌گذارد؛ از یک API کش‌شونده می‌گیرد.
     چرایی‌اش بالای lib/quiz/bank.ts است. */
  return <QuizBankLoader />;
}

export type Question = {
  id: string;
  type:
    | "audio-to-poem"
    | "audio-to-pattern"
    | "poem-to-audio"
    | "pattern-to-audio"
    | "audio-to-weight"
    | "weight-to-audio";
  poem?: string[];
  audioSrc?: string;
  options: {
    id: string;
    poem?: string[];
    label?: string;
    audioSrc?: string;
    isCorrect: boolean;
    x: number;
  }[];
};

export default page;
