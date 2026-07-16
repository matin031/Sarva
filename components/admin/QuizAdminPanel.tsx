"use client";

import { useState } from "react";
import {
  quizAdminDeleteQuestion,
  quizAdminGet,
  quizAdminList,
  type QuizQuestionDetail,
  type QuizType,
} from "@/lib/quiz/admin-actions";
import QuizQuestionForm from "./QuizQuestionForm";

type ListItem = Awaited<ReturnType<typeof quizAdminList>>[number];

const TYPE_LABELS: Record<QuizType, string> = {
  "poem-to-audio": "بیت → صوت",
  "audio-to-poem": "صوت → بیت",
  "weight-to-audio": "وزن → صوت",
};

type Props = {
  initialQuestions: ListItem[];
};

export default function QuizAdminPanel({ initialQuestions }: Props) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [editing, setEditing] = useState<QuizQuestionDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function refresh() {
    setQuestions(await quizAdminList());
  }

  async function handleEdit(id: string) {
    setLoadingId(id);
    const detail = await quizAdminGet(id);
    setLoadingId(null);
    if (detail) setEditing(detail);
  }

  async function handleDelete(id: string) {
    if (!confirm("این سؤال حذف شود؟")) return;
    const result = await quizAdminDeleteQuestion(id);
    if (result.ok) await refresh();
    else alert(result.errors.join("\n"));
  }

  if (creating || editing) {
    return (
      <div dir="rtl" className="mx-auto max-w-xl px-4 py-8 xs:px-5">
        <QuizQuestionForm
          initial={editing ?? undefined}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-8 xs:px-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">مدیریت عروض سماعی</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          + سؤال جدید
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">هنوز سؤالی اضافه نشده.</p>
      )}

      <div className="flex flex-col gap-3">
        {questions.map((q) => (
          <div key={q.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{TYPE_LABELS[q.type]}</span>
              <span className="text-xs text-muted-foreground">
                {q.poem?.[0] || (q.audioUrl ? "صوت" : "-")} · {q.optionCount} گزینه
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={loadingId === q.id}
                onClick={() => handleEdit(q.id)}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground disabled:opacity-60"
              >
                {loadingId === q.id ? "..." : "ویرایش"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(q.id)}
                className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
