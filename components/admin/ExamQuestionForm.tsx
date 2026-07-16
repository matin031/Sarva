"use client";

import { useState } from "react";
import { adminUpsertQuestion, type AdminQuestionDetail } from "@/lib/exam/admin-actions";
import type { LayoutPattern } from "@/lib/exam/content-schemas";
import ExamPartEditor, { emptyPart, partFormToInput, type PartFormState } from "./ExamPartEditor";

const LAYOUT_PATTERNS: { value: LayoutPattern | ""; label: string }[] = [
  { value: "", label: "بدون الگو (سؤال تک‌بخشی)" },
  { value: "multi-subquestion", label: "چند زیرسؤال (الف/ب/...)" },
  { value: "bracket-choice-mcq", label: "انتخاب داخل کمانک" },
  { value: "multi-item-true-false", label: "چند گزارهٔ درست/نادرست" },
  { value: "multi-paraphrase-block", label: "بلوک معنی‌کردن چندتایی" },
  { value: "list-of-parallel-blanks", label: "لیست جاهای خالی موازی" },
];

function detailToPartForm(detail: AdminQuestionDetail["parts"][number]): PartFormState {
  return {
    label: detail.label ?? "",
    pageRef: detail.pageRef ? String(detail.pageRef) : "",
    type: detail.type,
    score: String(detail.score),
    gradingMode: detail.gradingMode,
    contentJson: JSON.stringify(detail.content, null, 2),
    correctAnswerJson: JSON.stringify(detail.correctAnswer, null, 2),
    acceptedAnswers: detail.acceptedAnswers?.join(", ") ?? "",
    aiGradingHint: detail.aiGradingHint ?? "",
    options: (detail.options ?? []).map((o) => ({ optionKey: o.optionKey ?? "", text: o.text, isCorrect: o.isCorrect })),
  };
}

type Props = {
  sectionId: string;
  initial?: AdminQuestionDetail;
  onSaved: () => void;
  onCancel: () => void;
};

export default function ExamQuestionForm({ sectionId, initial, onSaved, onCancel }: Props) {
  const [number, setNumber] = useState(initial ? String(initial.number) : "");
  const [pageRef, setPageRef] = useState(initial?.pageRef ? String(initial.pageRef) : "");
  const [layoutPattern, setLayoutPattern] = useState<LayoutPattern | "">(initial?.layoutPattern ?? "");
  const [instruction, setInstruction] = useState(initial?.instruction ?? "");
  const [parts, setParts] = useState<PartFormState[]>(
    initial?.parts.length ? initial.parts.map(detailToPartForm) : [emptyPart()],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    setErrors([]);

    const parsedParts = parts.map(partFormToInput);
    const partErrors = parsedParts.flatMap((p) => (p.ok ? [] : p.errors));
    if (partErrors.length > 0) {
      setSaving(false);
      setErrors(partErrors);
      return;
    }

    const result = await adminUpsertQuestion(sectionId, {
      id: initial?.id,
      number: Number(number),
      pageRef: pageRef ? Number(pageRef) : undefined,
      layoutPattern: layoutPattern || undefined,
      instruction: instruction || undefined,
      parts: parsedParts.flatMap((p) => (p.ok ? [p.part] : [])),
    });

    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSaved();
  }

  return (
    <div dir="rtl" className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">{initial ? "ویرایش سؤال" : "سؤال جدید"}</h2>

      <div className="flex flex-wrap gap-3">
        <input
          type="number"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="شمارهٔ سؤال"
          className="min-h-11 w-32 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <input
          type="number"
          value={pageRef}
          onChange={(e) => setPageRef(e.target.value)}
          placeholder="صفحهٔ کتاب"
          className="min-h-11 w-32 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={layoutPattern}
          onChange={(e) => setLayoutPattern(e.target.value as LayoutPattern | "")}
          className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {LAYOUT_PATTERNS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <textarea
        dir="rtl"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder="صورت سؤال / دستورالعمل مشترک بین بخش‌ها (اختیاری)"
        rows={2}
        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="flex flex-col gap-3">
        {parts.map((part, i) => (
          <ExamPartEditor
            key={i}
            index={i}
            state={part}
            onChange={(next) => setParts((prev) => prev.map((p, idx) => (idx === i ? next : p)))}
            onRemove={() => setParts((prev) => prev.filter((_, idx) => idx !== i))}
          />
        ))}
        <button
          type="button"
          onClick={() => setParts((prev) => [...prev, emptyPart()])}
          className="self-start rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
        >
          + افزودن بخش دیگر (برای سؤال چندبخشی)
        </button>
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving || !number}
          onClick={handleSubmit}
          className="min-h-11 flex-1 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "در حال ذخیره..." : "ذخیره سؤال"}
        </button>
        <button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-border px-5 text-sm">
          انصراف
        </button>
      </div>
    </div>
  );
}
