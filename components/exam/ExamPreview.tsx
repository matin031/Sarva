"use client";

import type { ClientExam } from "@/lib/exam/client-exam";
import ExamQuestionList from "@/components/exam/ExamQuestionList";
import { useExamAnswers } from "@/components/exam/useExamAnswers";

type Props = {
  exam: ClientExam;
};

/** Preview/dev harness: renders every question of a seeded exam so
 *  in-progress part components can be checked against real transcribed
 *  data, question by question, as they're built out. Not the real
 *  exam-taking flow (no submit/grading) — see /exam/[examKey] for that. */
export default function ExamPreview({ exam }: Props) {
  const { getQuestionAnswers, setAnswer } = useExamAnswers();

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 xs:px-5">
      <div className="text-center">
        <h1 className="text-xl font-bold xs:text-2xl">{exam.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">نمرهٔ کل: {exam.totalScore}</p>
      </div>

      <ExamQuestionList exam={exam} getQuestionAnswers={getQuestionAnswers} onAnswerChange={setAnswer} />
    </div>
  );
}
