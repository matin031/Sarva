"use client";

import { useState } from "react";
import {
  adminCreateSection,
  adminDeleteQuestion,
  adminDeleteSection,
  adminGetExamDetail,
  type AdminExamDetail,
  type AdminQuestionDetail,
} from "@/lib/exam/admin-actions";
import ExamQuestionForm from "./ExamQuestionForm";
import { useAdminToast } from "./AdminToast";

type Props = {
  exam: AdminExamDetail;
};

export default function ExamDetailPanel({ exam: initialExam }: Props) {
  const toast = useAdminToast();
  const [exam, setExam] = useState(initialExam);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionScore, setSectionScore] = useState("");
  const [editing, setEditing] = useState<{ sectionId: string; question?: AdminQuestionDetail } | null>(null);

  async function refresh() {
    const fresh = await adminGetExamDetail(exam.id);
    if (fresh) setExam(fresh);
  }

  async function handleAddSection() {
    if (!sectionTitle) return;
    const result = await adminCreateSection(exam.id, {
      title: sectionTitle,
      orderIndex: exam.sections.length,
      sectionScore: Number(sectionScore) || 0,
    });
    if (result.ok) {
      setSectionTitle("");
      setSectionScore("");
      setAddingSection(false);
      await refresh();
    } else {
      toast(result.errors.join("\n"));
    }
  }

  async function handleDeleteSection(sectionId: string) {
    if (!confirm("این بخش و همهٔ سؤالاتش حذف شود؟")) return;
    const result = await adminDeleteSection(sectionId);
    if (result.ok) await refresh();
    else toast(result.errors.join("\n"));
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!confirm("این سؤال حذف شود؟")) return;
    const result = await adminDeleteQuestion(questionId);
    if (result.ok) await refresh();
    else toast(result.errors.join("\n"));
  }

  if (editing) {
    return (
      <div dir="rtl" className="max-w-3xl p-4 xs:p-6">
        <ExamQuestionForm
          sectionId={editing.sectionId}
          initial={editing.question}
          onCancel={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      </div>
    );
  }

  return (
    <div dir="rtl" className="flex max-w-3xl flex-col gap-6 p-4 xs:p-6">
      <div>
        <h1 className="text-xl font-bold">{exam.title}</h1>
        <p className="text-sm text-muted-foreground">
          {exam.examKey} · {exam.totalScore} نمره
        </p>
      </div>

      {exam.sections.map((section) => (
        <div key={section.id} className="bg-card border border-border flex flex-col gap-3 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {section.title} <span className="text-muted-foreground">({section.sectionScore} نمره)</span>
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditing({ sectionId: section.id })}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground"
              >
                + سؤال
              </button>
              <button type="button" onClick={() => handleDeleteSection(section.id)} className="text-xs text-destructive">
                حذف بخش
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {section.questions.map((q) => (
              <div key={q.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5">
                <span className="text-sm">
                  سؤال {q.number} · {q.parts.length} بخش
                </span>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ sectionId: section.id, question: q })}
                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                  >
                    ویرایش
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs text-destructive"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
            {section.questions.length === 0 && (
              <p className="text-center text-xs text-muted-foreground">هنوز سؤالی در این بخش نیست.</p>
            )}
          </div>
        </div>
      ))}

      {addingSection ? (
        <div className="bg-card border border-border flex flex-col gap-3 rounded-2xl p-4">
          <input
            dir="rtl"
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="عنوان بخش (مثلاً قلمرو زبانی)"
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            type="number"
            value={sectionScore}
            onChange={(e) => setSectionScore(e.target.value)}
            placeholder="نمرهٔ کل بخش"
            className="min-h-11 w-40 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddSection}
              className="min-h-11 flex-1 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              ایجاد بخش
            </button>
            <button
              type="button"
              onClick={() => setAddingSection(false)}
              className="min-h-11 rounded-xl border border-border px-5 text-sm"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingSection(true)}
          className="min-h-11 self-start rounded-xl bg-secondary px-4 text-sm text-secondary-foreground"
        >
          + بخش جدید
        </button>
      )}
    </div>
  );
}
