"use client";

import { useMemo, useState } from "react";
import { questionPartContentSchema, correctAnswerSchemaByType, type QuestionPartType } from "@/lib/exam/content-schemas";
import { CONTENT_TEMPLATES, CORRECT_ANSWER_TEMPLATES, TYPE_LABELS, NEEDS_OPTIONS } from "@/lib/exam/admin-templates";
import type { AdminPartInput } from "@/lib/exam/admin-actions";
import QuestionPartRenderer from "@/components/exam/QuestionPartRenderer";

const ALL_TYPES = Object.keys(TYPE_LABELS) as QuestionPartType[];

export type PartFormState = {
  label: string;
  pageRef: string;
  type: QuestionPartType;
  score: string;
  gradingMode: AdminPartInput["gradingMode"];
  contentJson: string;
  correctAnswerJson: string;
  acceptedAnswers: string;
  aiGradingHint: string;
  options: { optionKey: string; text: string; isCorrect: boolean }[];
};

export function emptyPart(): PartFormState {
  return {
    label: "",
    pageRef: "",
    type: "short-text-answer",
    score: "0.25",
    gradingMode: "exact_match",
    contentJson: CONTENT_TEMPLATES["short-text-answer"],
    correctAnswerJson: CORRECT_ANSWER_TEMPLATES["short-text-answer"],
    acceptedAnswers: "",
    aiGradingHint: "",
    options: [
      { optionKey: "الف", text: "", isCorrect: true },
      { optionKey: "ب", text: "", isCorrect: false },
    ],
  };
}

export type PartFormResult = { ok: true; part: AdminPartInput } | { ok: false; errors: string[] };

export function partFormToInput(state: PartFormState): PartFormResult {
  const errors: string[] = [];

  let content: unknown;
  try {
    content = JSON.parse(state.contentJson);
  } catch {
    errors.push("محتوای سؤال (content) یک JSON معتبر نیست.");
  }
  let correctAnswer: unknown;
  try {
    correctAnswer = JSON.parse(state.correctAnswerJson);
  } catch {
    errors.push("پاسخ صحیح (correctAnswer) یک JSON معتبر نیست.");
  }
  if (errors.length > 0) return { ok: false, errors };

  const score = Number(state.score);
  if (!score || score <= 0) errors.push("نمره باید عددی بزرگ‌تر از صفر باشد.");

  let acceptedAnswers: unknown;
  const acceptedRaw = state.acceptedAnswers.trim();
  if (acceptedRaw) {
    try {
      acceptedAnswers = JSON.parse(acceptedRaw);
    } catch {
      errors.push("پاسخ‌های پذیرفته‌شده (acceptedAnswers) یک JSON معتبر نیست.");
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const part: AdminPartInput = {
    label: state.label || undefined,
    pageRef: state.pageRef ? Number(state.pageRef) : undefined,
    type: state.type,
    score,
    content: content as AdminPartInput["content"],
    correctAnswer,
    acceptedAnswers,
    gradingMode: state.gradingMode,
    aiGradingHint: state.aiGradingHint || undefined,
    options: NEEDS_OPTIONS.includes(state.type)
      ? state.options.map((o) => ({ optionKey: o.optionKey || undefined, text: o.text, isCorrect: o.isCorrect }))
      : undefined,
  };

  return errors.length > 0 ? { ok: false, errors } : { ok: true, part };
}

type Props = {
  index: number;
  state: PartFormState;
  onChange: (state: PartFormState) => void;
  onRemove: () => void;
};

export default function ExamPartEditor({ index, state, onChange, onRemove }: Props) {
  const [previewValue, setPreviewValue] = useState<unknown>(null);

  function set<K extends keyof PartFormState>(key: K, value: PartFormState[K]) {
    onChange({ ...state, [key]: value });
  }

  function handleTypeChange(type: QuestionPartType) {
    const needsOptionsNow = NEEDS_OPTIONS.includes(type);
    onChange({
      ...state,
      type,
      contentJson: CONTENT_TEMPLATES[type],
      correctAnswerJson: CORRECT_ANSWER_TEMPLATES[type],
      options:
        needsOptionsNow && state.options.length === 0
          ? [
              { optionKey: "الف", text: "", isCorrect: true },
              { optionKey: "ب", text: "", isCorrect: false },
            ]
          : state.options,
    });
  }

  const parsedContent = useMemo(() => {
    try {
      const raw = JSON.parse(state.contentJson);
      const result = questionPartContentSchema.safeParse(raw);
      return result.success ? { ok: true as const, content: result.data } : { ok: false as const, error: result.error.issues.map((i) => i.message).join("; ") };
    } catch {
      return { ok: false as const, error: "JSON نامعتبر" };
    }
  }, [state.contentJson]);

  const answerCheck = useMemo(() => {
    try {
      const raw = JSON.parse(state.correctAnswerJson);
      const schema = correctAnswerSchemaByType[state.type];
      const result = schema.safeParse(raw);
      return result.success ? { ok: true as const } : { ok: false as const, error: result.error.issues.map((i) => i.message).join("; ") };
    } catch {
      return { ok: false as const, error: "JSON نامعتبر" };
    }
  }, [state.correctAnswerJson, state.type]);

  const needsOptions = NEEDS_OPTIONS.includes(state.type);

  return (
    <div dir="rtl" className="flex flex-col gap-3 rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">بخش {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-xs text-destructive">
          حذف این بخش
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          dir="rtl"
          value={state.label}
          onChange={(e) => set("label", e.target.value)}
          placeholder="برچسب (الف/ب/...) — اختیاری"
          className="min-h-11 w-32 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={state.type}
          onChange={(e) => handleTypeChange(e.target.value as QuestionPartType)}
          className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.25"
          value={state.score}
          onChange={(e) => set("score", e.target.value)}
          placeholder="نمره"
          className="min-h-11 w-24 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          value={state.gradingMode}
          onChange={(e) => set("gradingMode", e.target.value as PartFormState["gradingMode"])}
          className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="exact_match">تصحیح دقیق</option>
          <option value="ai_semantic">تصحیح هوشمند (معنایی)</option>
          <option value="ai_partial_credit">تصحیح هوشمند (نمرهٔ جزئی)</option>
          <option value="manual">تصحیح دستی</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          محتوای سؤال (content) — JSON {parsedContent.ok ? "✓ معتبر" : `✗ ${parsedContent.error}`}
        </label>
        <textarea
          dir="ltr"
          value={state.contentJson}
          onChange={(e) => set("contentJson", e.target.value)}
          rows={8}
          className={`w-full rounded-xl border bg-card px-3 py-2 font-mono text-xs outline-none ${
            parsedContent.ok ? "border-border focus:border-primary" : "border-destructive/60"
          }`}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          پاسخ صحیح (correctAnswer) — JSON {answerCheck.ok ? "✓ معتبر" : `✗ ${answerCheck.error}`}
        </label>
        <textarea
          dir="ltr"
          value={state.correctAnswerJson}
          onChange={(e) => set("correctAnswerJson", e.target.value)}
          rows={3}
          className={`w-full rounded-xl border bg-card px-3 py-2 font-mono text-xs outline-none ${
            answerCheck.ok ? "border-border focus:border-primary" : "border-destructive/60"
          }`}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">
          پاسخ‌های پذیرفته‌شده (JSON، اختیاری) — مثلاً {`{"accepted":["گریبان","یقه"]}`}
        </label>
        <textarea
          dir="ltr"
          value={state.acceptedAnswers}
          onChange={(e) => set("acceptedAnswers", e.target.value)}
          rows={3}
          placeholder='{"accepted":[]}'
          className="w-full rounded-xl border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus:border-primary"
        />
      </div>

      {needsOptions && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">گزینه‌ها</span>
            <button
              type="button"
              onClick={() => set("options", [...state.options, { optionKey: "", text: "", isCorrect: false }])}
              className="rounded-lg bg-secondary px-2 py-1 text-xs text-secondary-foreground"
            >
              + افزودن گزینه
            </button>
          </div>
          {state.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                checked={opt.isCorrect}
                onChange={() =>
                  set(
                    "options",
                    state.options.map((o, idx) => ({ ...o, isCorrect: idx === i })),
                  )
                }
                className="size-4 shrink-0 accent-primary"
              />
              <input
                dir="rtl"
                value={opt.optionKey}
                onChange={(e) =>
                  set(
                    "options",
                    state.options.map((o, idx) => (idx === i ? { ...o, optionKey: e.target.value } : o)),
                  )
                }
                placeholder="الف"
                className="min-h-11 w-16 shrink-0 rounded-xl border border-border bg-card px-2 py-2 text-sm outline-none focus:border-primary"
              />
              <input
                dir="rtl"
                value={opt.text}
                onChange={(e) =>
                  set(
                    "options",
                    state.options.map((o, idx) => (idx === i ? { ...o, text: e.target.value } : o)),
                  )
                }
                placeholder="متن گزینه — از {{کلمه}} برای هایلایت استفاده کنید"
                className="min-h-11 flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {state.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => set("options", state.options.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-xs text-destructive"
                >
                  حذف
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <input
        dir="rtl"
        value={state.aiGradingHint}
        onChange={(e) => set("aiGradingHint", e.target.value)}
        placeholder="راهنمای تصحیح هوشمند (اختیاری)"
        className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">پیش‌نمایش زنده</span>
        <div className="rounded-xl bg-muted/30 p-3">
          {parsedContent.ok ? (
            <QuestionPartRenderer
              content={parsedContent.content}
              options={state.options.map((o, i) => ({ id: String(i), optionKey: o.optionKey || undefined, text: o.text }))}
              value={previewValue}
              onChange={setPreviewValue}
            />
          ) : (
            <p className="text-sm text-muted-foreground">محتوا معتبر نیست، پیش‌نمایش در دسترس نیست.</p>
          )}
        </div>
      </div>
    </div>
  );
}
