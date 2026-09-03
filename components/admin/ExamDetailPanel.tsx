"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  adminCreateSection,
  adminDeleteExam,
  adminDeleteQuestion,
  adminDeleteSection,
  adminExamAttemptCount,
  adminGetExamDetail,
  adminUpdateExam,
  type AdminExamDetail,
  type AdminQuestionDetail,
} from "@/lib/exam/admin-actions";
import ExamQuestionForm from "./ExamQuestionForm";
import ConfirmDialog from "./ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useFocusedRow } from "@/components/admin/useFocusedRow";

type Props = {
  exam: AdminExamDetail;
  /** شمارهٔ سؤالی که مدیر از یک گزارش به آن لینک شده — برجسته می‌شود. */
  focusNumber?: string | null;
};

function questionMatches(q: AdminQuestionDetail, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  if (String(q.number).includes(needle)) return true;
  if (q.instruction?.toLowerCase().includes(needle)) return true;
  return q.parts.some(
    (p) =>
      p.label?.toLowerCase().includes(needle) ||
      JSON.stringify(p.content).toLowerCase().includes(needle),
  );
}

/** چیزی که منتظر تأیید است — جایگزین confirm() مرورگر. */
type Pending =
  | { kind: "section"; id: string; title: string; questionCount: number }
  | { kind: "question"; id: string; number: number }
  | { kind: "exam"; attempts: number };

export default function ExamDetailPanel({
  exam: initialExam,
  focusNumber = null,
}: Props) {
  const toast = useAdminToast();
  const router = useRouter();
  const [exam, setExam] = useState(initialExam);
  const focus = useFocusedRow(focusNumber);
  const [query, setQuery] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionScore, setSectionScore] = useState("");
  const [editing, setEditing] = useState<{ sectionId: string; question?: AdminQuestionDetail } | null>(null);
  const [confirming, setConfirming] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  // ── ویرایش مشخصات آزمون ────────────────────────────────────────────────
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState(exam.title);
  const [metaKey, setMetaKey] = useState(exam.examKey);
  const [metaGrade, setMetaGrade] = useState(String(exam.grade ?? 12));
  const [metaScore, setMetaScore] = useState(String(exam.totalScore));
  const [metaErrors, setMetaErrors] = useState<string[]>([]);

  async function handleSaveMeta() {
    setBusy(true);
    setMetaErrors([]);
    const result = await adminUpdateExam(exam.id, {
      title: metaTitle,
      examKey: metaKey,
      grade: Number(metaGrade),
      totalScore: Number(metaScore),
    });
    setBusy(false);
    if (!result.ok) {
      setMetaErrors(result.errors);
      return;
    }
    setEditingMeta(false);
    toast("مشخصات آزمون ذخیره شد.", "success");
    await refresh();
    router.refresh();
  }

  async function askDeleteExam() {
    // تعداد کارنامه‌ها قبل از پرسیدن خوانده می‌شود: «۴۲ کارنامه هم پاک می‌شود»
    // تصمیم متفاوتی است با «یک آزمون خالی پاک می‌شود».
    setBusy(true);
    const attempts = await adminExamAttemptCount(exam.id);
    setBusy(false);
    setConfirming({ kind: "exam", attempts });
  }

  async function runConfirmed() {
    if (!confirming) return;
    const target = confirming;
    setConfirming(null);
    setBusy(true);

    try {
      if (target.kind === "exam") {
        const result = await adminDeleteExam(exam.id);
        if (!result.ok) return toast(result.errors.join("\n"));
        toast("آزمون حذف شد.", "success");
        router.push("/admin/exams");
        router.refresh();
        return;
      }

      const result =
        target.kind === "section"
          ? await adminDeleteSection(target.id)
          : await adminDeleteQuestion(target.id);

      if (!result.ok) return toast(result.errors.join("\n"));
      toast(target.kind === "section" ? "بخش حذف شد." : "سؤال حذف شد.", "success");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

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
      <div className="flex flex-col gap-3">
        <Link href="/admin/exams" className="text-xs text-muted-foreground hover:text-foreground">
          ← بازگشت به آزمون‌ها
        </Link>

        {editingMeta ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4">
            <h2 className="font-bold">ویرایش مشخصات آزمون</h2>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">عنوان</span>
              <input
                dir="rtl"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">شناسهٔ آدرس</span>
              <input
                dir="ltr"
                value={metaKey}
                onChange={(e) => setMetaKey(e.target.value)}
                className="min-h-11 rounded-xl border border-border bg-card px-3 text-left text-sm outline-none focus:border-primary"
              />
              <span className="text-xs text-gold">
                این همان چیزی است که در آدرس صفحهٔ آزمون می‌آید (/exam/{metaKey || "…"}). عوضش کنید
                و لینک‌هایی که قبلاً جایی گذاشته‌اید کار نمی‌کنند.
              </span>
            </label>

            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">پایه</span>
                <input
                  type="number"
                  value={metaGrade}
                  onChange={(e) => setMetaGrade(e.target.value)}
                  className="min-h-11 w-24 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">نمرهٔ کل</span>
                <input
                  type="number"
                  value={metaScore}
                  onChange={(e) => setMetaScore(e.target.value)}
                  className="min-h-11 w-28 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </label>
            </div>

            {metaErrors.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {metaErrors.map((e, i) => (
                  <p key={i}>{e}</p>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleSaveMeta}
                className="min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "در حال ذخیره…" : "ذخیره"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingMeta(false);
                  setMetaErrors([]);
                  setMetaTitle(exam.title);
                  setMetaKey(exam.examKey);
                  setMetaGrade(String(exam.grade ?? 12));
                  setMetaScore(String(exam.totalScore));
                }}
                className="min-h-11 rounded-xl border border-border px-5 text-sm text-muted-foreground"
              >
                انصراف
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold">{exam.title}</h1>
              <p className="text-sm text-muted-foreground">
                {exam.examKey} · {exam.totalScore} نمره
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEditingMeta(true)}
                className="min-h-9 rounded-lg border border-border bg-card px-3 text-xs hover:border-primary/50"
              >
                ویرایش مشخصات
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={askDeleteExam}
                className="min-h-9 rounded-lg bg-destructive/10 px-3 text-xs text-destructive disabled:opacity-60"
              >
                حذف آزمون
              </button>
            </div>
          </div>
        )}
      </div>

      {exam.sections.some((s) => s.questions.length > 0) && (
        <input
          dir="rtl"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو با شمارهٔ سؤال یا متن..."
          className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
      )}

      {exam.sections.map((section) => {
        const matchedQuestions = section.questions.filter((q) => questionMatches(q, query));
        if (query && matchedQuestions.length === 0) return null;

        return (
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
                <button
                  type="button"
                  onClick={() =>
                    setConfirming({
                      kind: "section",
                      id: section.id,
                      title: section.title,
                      questionCount: section.questions.length,
                    })
                  }
                  className="text-xs text-destructive"
                >
                  حذف بخش
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {matchedQuestions.map((q) => (
                <div
                  key={q.id}
                  ref={focus.isFocused(q.number) ? focus.ref : undefined}
                  className={`flex items-center justify-between gap-2 rounded-xl border border-border p-2.5 ${
                    focus.isFocused(q.number) ? focus.litClass : ""
                  }`}
                >
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
                      onClick={() => setConfirming({ kind: "question", id: q.id, number: q.number })}
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
        );
      })}

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

      <ConfirmDialog
        open={confirming !== null}
        title={
          confirming?.kind === "exam"
            ? "حذف کامل آزمون"
            : confirming?.kind === "section"
              ? "حذف بخش"
              : "حذف سؤال"
        }
        body={
          confirming?.kind === "exam"
            ? `آزمون «${exam.title}» با همهٔ بخش‌ها و سؤالاتش حذف می‌شود.`
            : confirming?.kind === "section"
              ? `بخش «${confirming.title}» حذف می‌شود.`
              : confirming
                ? `سؤال ${confirming.number} حذف می‌شود.`
                : ""
        }
        consequence={
          confirming?.kind === "exam"
            ? confirming.attempts > 0
              ? `${confirming.attempts.toLocaleString("fa-IR")} کارنامهٔ دانش‌آموزان هم برای همیشه پاک می‌شود.`
              : "این کار قابل بازگشت نیست."
            : confirming?.kind === "section" && confirming.questionCount > 0
              ? `${confirming.questionCount.toLocaleString("fa-IR")} سؤال داخل این بخش هم حذف می‌شود.`
              : undefined
        }
        confirmLabel="حذف کن"
        // آزمونی که کارنامه دارد، حذفش یعنی از دست رفتن نمرات دانش‌آموزان —
        // تنها جایی در این صفحه که تایپ کردن را می‌ارزد.
        requireTyping={
          confirming?.kind === "exam" && confirming.attempts > 0 ? exam.examKey : undefined
        }
        onConfirm={runConfirmed}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
