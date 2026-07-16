"use client";

import { useState } from "react";
import Link from "next/link";
import { adminCreateExam, adminListExams } from "@/lib/exam/admin-actions";

type ExamListItem = Awaited<ReturnType<typeof adminListExams>>[number];

export default function ExamListPanel({ initialExams }: { initialExams: ExamListItem[] }) {
  const [exams, setExams] = useState(initialExams);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const subject = "farsi3"; // only subject in the bank today; add a field here once a second one ships
  const [grade, setGrade] = useState(12);
  const [title, setTitle] = useState("");
  const [examKey, setExamKey] = useState("");
  const [totalScore, setTotalScore] = useState(20);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    setSaving(true);
    setErrors([]);
    const result = await adminCreateExam({ subject, grade, title, examKey, totalScore });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setExams(await adminListExams());
    setCreating(false);
    setTitle("");
    setExamKey("");
  }

  return (
    <div dir="rtl" className="flex max-w-2xl flex-col gap-6 p-4 xs:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">مدیریت امتحانات نهایی</h1>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          {creating ? "بستن" : "+ آزمون جدید"}
        </button>
      </div>

      {creating && (
        <div className="bg-card border border-border flex flex-col gap-3 rounded-2xl p-4">
          <input
            dir="rtl"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان آزمون (مثلاً فارسی۳ دوازدهم — امتحان نهایی خرداد ۱۴۰۴)"
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            dir="ltr"
            value={examKey}
            onChange={(e) => setExamKey(e.target.value)}
            placeholder="exam key (مثلاً 1404-kherdad) — در آدرس /exam/... استفاده می‌شود"
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="flex gap-3">
            <input
              type="number"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              placeholder="پایه"
              className="min-h-11 w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <input
              type="number"
              value={totalScore}
              onChange={(e) => setTotalScore(Number(e.target.value))}
              placeholder="نمرهٔ کل"
              className="min-h-11 w-28 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          {errors.length > 0 && (
            <div className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.map((e, i) => (
                <p key={i}>{e}</p>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={saving || !title || !examKey}
            onClick={handleCreate}
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "در حال ذخیره..." : "ایجاد آزمون"}
          </button>
        </div>
      )}

      {exams.length > 1 && (
        <input
          dir="rtl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو با عنوان..."
          className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      )}

      <div className="flex flex-col gap-3">
        {exams
          .filter((exam) => !query || exam.title.includes(query) || exam.examKey.includes(query))
          .map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/exams/${exam.id}`}
              className="bg-card border border-border flex flex-col gap-1 rounded-2xl p-4 transition-colors hover:border-primary/50"
            >
              <span className="text-sm font-semibold">{exam.title}</span>
              <span className="text-xs text-muted-foreground">
                {exam.examKey} · پایهٔ {exam.grade} · {exam.totalScore} نمره · ساخته‌شده در{" "}
                {new Date(exam.createdAt).toLocaleDateString("fa-IR")}
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}
