"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminUserRow } from "@/lib/admin/user-actions";
import type { QuizAttemptRow } from "@/lib/admin/quiz-stats-actions";
import type { ExamAttemptRow } from "@/lib/admin/exam-stats-actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const QUIZ_TYPE_LABEL: Record<string, string> = {
  "poem-to-audio": "بیت به صدا",
  "audio-to-poem": "صدا به بیت",
  "weight-to-audio": "وزن به صدا",
};

const PART_STATUS: Record<string, { label: string; cls: string }> = {
  correct: { label: "درست", cls: "bg-primary/10 text-primary" },
  incorrect: { label: "غلط", cls: "bg-destructive/10 text-destructive" },
  partial: { label: "جزئی", cls: "bg-gold/15 text-gold" },
  needs_review: { label: "نیازمند بازبینی", cls: "bg-muted text-muted-foreground" },
};

type Props = {
  user: AdminUserRow;
  quizAttempts: QuizAttemptRow[];
  examAttempts: ExamAttemptRow[];
};

export default function UserDetailPanel({ user, quizAttempts, examAttempts }: Props) {
  const [openExam, setOpenExam] = useState<string | null>(null);
  const [openQuiz, setOpenQuiz] = useState<string | null>(null);

  const quizTotal = quizAttempts.reduce((s, a) => s + a.total, 0);
  const quizCorrect = quizAttempts.reduce((s, a) => s + a.correct, 0);
  const quizAccuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : null;

  const examTotal = examAttempts.reduce((s, a) => s + a.maxScore, 0);
  const examScored = examAttempts.reduce((s, a) => s + a.totalScore, 0);
  const examAccuracy = examTotal > 0 ? Math.round((examScored / examTotal) * 100) : null;

  return (
    <div dir="rtl" className="flex max-w-3xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <Link href="/admin/users" className="text-xs text-muted-foreground hover:text-foreground">
          ← بازگشت به کاربران
        </Link>
        <h1 className="mt-1 text-xl font-bold">{user.fullName || user.email || user.id}</h1>
        <p className="text-sm text-muted-foreground" dir="ltr">
          {user.email}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 xs:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{quizAttempts.length}</span>
          <span className="text-xs text-muted-foreground">آزمون عروض سماعی</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{quizAccuracy ?? "—"}٪</span>
          <span className="text-xs text-muted-foreground">دقت عروض سماعی</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{examAttempts.length}</span>
          <span className="text-xs text-muted-foreground">امتحان نهایی انجام‌شده</span>
        </div>
        <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
          <span className="text-2xl font-bold">{examAccuracy ?? "—"}٪</span>
          <span className="text-xs text-muted-foreground">میانگین نمرهٔ امتحانات</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">امتحانات نهایی</h2>
        {examAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ امتحانی را کامل نکرده.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {examAttempts.map((a) => {
              const open = openExam === a.id;
              const questions = Object.values(a.questionResults).sort((x, y) => x.number - y.number);
              return (
                <div key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenExam(open ? null : a.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right text-sm hover:bg-muted/20"
                  >
                    <span className="font-medium">{a.examTitle}</span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">
                        {a.totalScore.toFixed(2)} / {a.maxScore}
                      </span>
                      <span className="whitespace-nowrap">{formatDate(a.createdAt)}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
                            <th className="px-4 py-2 font-medium">سؤال</th>
                            <th className="px-4 py-2 font-medium">بخش</th>
                            <th className="px-4 py-2 font-medium">وضعیت</th>
                            <th className="px-4 py-2 font-medium">نمره</th>
                            <th className="px-4 py-2 font-medium">پاسخ صحیح</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questions.map((q) =>
                            q.parts.map((p, i) => {
                              const status = PART_STATUS[p.status] ?? PART_STATUS.needs_review;
                              return (
                                <tr key={`${q.number}-${i}`} className="border-b border-border last:border-0">
                                  {i === 0 && (
                                    <td className="px-4 py-2 align-top font-medium" rowSpan={q.parts.length}>
                                      {q.number}
                                    </td>
                                  )}
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{p.label || "—"}</td>
                                  <td className="px-4 py-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${status.cls}`}>
                                      {status.label}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-xs">
                                    {p.score} / {p.maxScore}
                                  </td>
                                  <td className="px-4 py-2 text-xs text-muted-foreground">{p.correctAnswerText}</td>
                                </tr>
                              );
                            }),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">عروض سماعی</h2>
        {quizAttempts.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز هیچ آزمونی بازی نکرده.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {quizAttempts.map((a) => {
              const open = openQuiz === a.id;
              return (
                <div key={a.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => setOpenQuiz(open ? null : a.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right text-sm hover:bg-muted/20"
                  >
                    <span className="font-medium whitespace-nowrap">
                      {a.correct} / {a.total}
                    </span>
                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="whitespace-nowrap">{formatDate(a.createdAt)}</span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.75}
                        className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {open && (
                    <div className="border-t border-border">
                      {a.answers.length === 0 ? (
                        <p className="p-4 text-center text-xs text-muted-foreground">جزئیات این آزمون ثبت نشده.</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40 text-right text-xs text-muted-foreground">
                              <th className="px-4 py-2 font-medium">نوع سؤال</th>
                              <th className="px-4 py-2 font-medium">بیت / الگو</th>
                              <th className="px-4 py-2 font-medium">سختی</th>
                              <th className="px-4 py-2 font-medium">نتیجه</th>
                            </tr>
                          </thead>
                          <tbody>
                            {a.answers.map((ans, i) => (
                              <tr key={i} className="border-b border-border last:border-0">
                                <td className="px-4 py-2 text-xs">{QUIZ_TYPE_LABEL[ans.type] ?? ans.type}</td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">
                                  {ans.poem?.join(" / ") || "—"}
                                </td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">{ans.difficulty ?? "—"}</td>
                                <td className="px-4 py-2">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                                      ans.isCorrect ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                                    }`}
                                  >
                                    {ans.isCorrect ? "درست" : "غلط"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
