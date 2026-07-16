"use client";

import { useState } from "react";
import {
  quizAdminUpsertQuestion,
  type QuizOptionInput,
  type QuizQuestionDetail,
  type QuizType,
} from "@/lib/quiz/admin-actions";

const TYPE_LABELS: Record<QuizType, string> = {
  "poem-to-audio": "صورت سؤال: بیت — گزینه‌ها: صوت",
  "audio-to-poem": "صورت سؤال: صوت — گزینه‌ها: بیت",
  "weight-to-audio": "صورت سؤال: وزن نوشته‌شده — گزینه‌ها: صوت",
};

function emptyOption(): QuizOptionInput {
  return { audioUrl: "", poem: ["", ""], isCorrect: false };
}

type Props = {
  initial?: QuizQuestionDetail;
  onSaved: () => void;
  onCancel: () => void;
};

export default function QuizQuestionForm({ initial, onSaved, onCancel }: Props) {
  const [type, setType] = useState<QuizType>(initial?.type ?? "poem-to-audio");
  const [poemLine1, setPoemLine1] = useState(initial?.poem?.[0] ?? "");
  const [poemLine2, setPoemLine2] = useState(initial?.poem?.[1] ?? "");
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl ?? "");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "medium");
  const [options, setOptions] = useState<QuizOptionInput[]>(
    initial?.options.length ? initial.options : [emptyOption(), emptyOption()],
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const needsStemPoem = type === "poem-to-audio" || type === "weight-to-audio";
  const needsStemAudio = type === "audio-to-poem";
  const optionsAreAudio = type === "poem-to-audio" || type === "weight-to-audio";

  function updateOption(index: number, patch: Partial<QuizOptionInput>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function setCorrectOption(index: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  }

  async function handleSubmit() {
    setSaving(true);
    setErrors([]);

    const result = await quizAdminUpsertQuestion({
      id: initial?.id,
      type,
      poem: needsStemPoem ? (type === "weight-to-audio" ? [poemLine1] : [poemLine1, poemLine2]) : undefined,
      audioUrl: needsStemAudio ? audioUrl : undefined,
      difficulty,
      options: options.map((o) =>
        optionsAreAudio
          ? { audioUrl: o.audioUrl, isCorrect: o.isCorrect }
          : { poem: o.poem, isCorrect: o.isCorrect },
      ),
    });

    setSaving(false);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSaved();
  }

  return (
    <div dir="rtl" className="bg-card border border-border flex flex-col gap-4 rounded-2xl p-4 xs:p-5">
      <h2 className="text-lg font-semibold">{initial ? "ویرایش سؤال" : "سؤال جدید"}</h2>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted-foreground">نوع سؤال</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as QuizType)}
          className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          {(Object.keys(TYPE_LABELS) as QuizType[]).map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {needsStemPoem && type === "poem-to-audio" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">بیت (دو مصراع)</label>
          <input
            dir="rtl"
            value={poemLine1}
            onChange={(e) => setPoemLine1(e.target.value)}
            placeholder="مصراع اول"
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <input
            dir="rtl"
            value={poemLine2}
            onChange={(e) => setPoemLine2(e.target.value)}
            placeholder="مصراع دوم"
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {needsStemPoem && type === "weight-to-audio" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">الگوی وزن (مثلاً «فاعلاتن فاعلاتن فاعلاتن فاعلن»)</label>
          <input
            dir="rtl"
            value={poemLine1}
            onChange={(e) => setPoemLine1(e.target.value)}
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
      )}

      {needsStemAudio && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-muted-foreground">لینک فایل صوتی سؤال</label>
          <input
            dir="ltr"
            value={audioUrl}
            onChange={(e) => setAudioUrl(e.target.value)}
            placeholder="https://..."
            className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          />
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-muted-foreground">سطح دشواری</label>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
          className="min-h-11 w-32 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="easy">آسان</option>
          <option value="medium">متوسط</option>
          <option value="hard">سخت</option>
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">گزینه‌ها (پاسخ صحیح را با دکمهٔ رادیویی مشخص کنید)</label>
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, emptyOption()])}
            className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
          >
            + افزودن گزینه
          </button>
        </div>

        {options.map((opt, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                checked={opt.isCorrect}
                onChange={() => setCorrectOption(i)}
                className="size-4 accent-primary"
              />
              <span className="text-xs text-muted-foreground">گزینهٔ {i + 1} {opt.isCorrect && "(پاسخ صحیح)"}</span>
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                  className="mr-auto text-xs text-destructive"
                >
                  حذف
                </button>
              )}
            </div>

            {optionsAreAudio ? (
              <>
                <input
                  dir="ltr"
                  value={opt.audioUrl ?? ""}
                  onChange={(e) => updateOption(i, { audioUrl: e.target.value })}
                  placeholder="https://..."
                  className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {opt.audioUrl && <audio controls src={opt.audioUrl} className="w-full" />}
              </>
            ) : (
              <>
                <input
                  dir="rtl"
                  value={opt.poem?.[0] ?? ""}
                  onChange={(e) => updateOption(i, { poem: [e.target.value, opt.poem?.[1] ?? ""] })}
                  placeholder="مصراع اول"
                  className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <input
                  dir="rtl"
                  value={opt.poem?.[1] ?? ""}
                  onChange={(e) => updateOption(i, { poem: [opt.poem?.[0] ?? "", e.target.value] })}
                  placeholder="مصراع دوم"
                  className="min-h-11 rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <div className="flex flex-col gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="min-h-11 flex-1 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-border px-5 text-sm"
        >
          انصراف
        </button>
      </div>
    </div>
  );
}
