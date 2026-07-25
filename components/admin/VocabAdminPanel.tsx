"use client";

import { useState, useTransition } from "react";
import { VOCAB_GRADES } from "@/lib/vocab-data";
import {
  vocabAdminDelete,
  vocabAdminList,
  vocabAdminUpsert,
  type AdminVocabWord,
} from "@/lib/admin/vocab-actions";
import { useAdminToast } from "@/components/admin/AdminToast";

type Draft = { id?: string; word: string; meaning: string; image: string };

export default function VocabAdminPanel({
  initialGrade,
  initialLesson,
  initialWords,
}: {
  initialGrade: string;
  initialLesson: number;
  initialWords: AdminVocabWord[];
}) {
  const toast = useAdminToast();
  const [grade, setGrade] = useState(initialGrade);
  const [lesson, setLesson] = useState(initialLesson);
  const [words, setWords] = useState<AdminVocabWord[]>(initialWords);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const gradeObj = VOCAB_GRADES.find((g) => g.id === grade) ?? VOCAB_GRADES[0];
  const lessonObj = gradeObj.lessons.find((l) => l.number === lesson);
  const isFree = lessonObj?.free ?? false;

  const load = (g: string, l: number) => {
    startTransition(async () => {
      try {
        const rows = await vocabAdminList(g, l);
        setWords(rows);
      } catch (e) {
        toast(e instanceof Error ? e.message : "خطا در بارگذاری واژه‌ها");
        setWords([]);
      }
    });
  };

  const onGrade = (g: string) => {
    setGrade(g);
    setDraft(null);
    setConfirmDeleteId(null);
    load(g, lesson);
  };
  const onLesson = (l: number) => {
    setLesson(l);
    setDraft(null);
    setConfirmDeleteId(null);
    load(grade, l);
  };

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const res = await vocabAdminUpsert({
        id: draft.id,
        grade,
        lesson,
        word: draft.word,
        meaning: draft.meaning,
        image: draft.image,
      });
      if (res.ok) {
        setDraft(null);
        toast(draft.id ? "واژه ویرایش شد." : "واژه اضافه شد.", "success");
        const rows = await vocabAdminList(grade, lesson);
        setWords(rows);
      } else {
        toast(res.error);
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await vocabAdminDelete(id);
      if (res.ok) {
        setConfirmDeleteId(null);
        toast("واژه حذف شد.", "success");
        setWords((prev) => prev.filter((w) => w.id !== id));
      } else {
        toast(res.error);
      }
    });
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت واژه‌یاب</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          واژگانِ هر درس را اضافه، ویرایش یا حذف کن. آدرس عکس می‌تواند لینک اینترنتی یا مسیر داخل پوشهٔ public باشد.
        </p>
      </div>

      {/* pickers */}
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">پایه</span>
          <select
            value={grade}
            onChange={(e) => onGrade(e.target.value)}
            className="min-h-10 rounded-xl border border-border bg-card px-3"
          >
            {VOCAB_GRADES.map((g) => (
              <option key={g.id} value={g.id}>
                فارسی {g.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">درس</span>
          <select
            value={lesson}
            onChange={(e) => onLesson(Number(e.target.value))}
            className="min-h-10 rounded-xl border border-border bg-card px-3"
          >
            {gradeObj.lessons.map((l) => (
              <option key={l.id} value={l.number}>
                {l.title}
                {l.free ? " (آزاد)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isFree ? (
        <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          این درس «آزاد» است و واژه‌ای ندارد.
        </div>
      ) : (
        <>
          {/* add / edit form */}
          {draft ? (
            <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <h3 className="mb-3 font-bold">{draft.id ? "ویرایش واژه" : "واژهٔ تازه"}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">واژه</span>
                  <input
                    value={draft.word}
                    onChange={(e) => setDraft({ ...draft, word: e.target.value })}
                    className="min-h-10 rounded-xl border border-border bg-card px-3"
                    placeholder="مثلاً: میاسا"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">آدرس عکس</span>
                  <input
                    value={draft.image}
                    onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                    dir="ltr"
                    className="min-h-10 rounded-xl border border-border bg-card px-3 text-left"
                    placeholder="https://…/1.png  یا  /vocab/…/1.jpg"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="text-muted-foreground">معنی (کامل)</span>
                  <textarea
                    value={draft.meaning}
                    onChange={(e) => setDraft({ ...draft, meaning: e.target.value })}
                    rows={2}
                    className="rounded-xl border border-border bg-card px-3 py-2"
                    placeholder="مثلاً: دست نکش"
                  />
                </label>
              </div>
              {draft.image.trim() && (
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>پیش‌نمایش:</span>
                  <div className="relative size-16 overflow-hidden rounded-lg border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draft.image} alt="" className="absolute inset-0 size-full object-cover" />
                  </div>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={save}
                  disabled={pending}
                  className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
                >
                  {pending ? "در حال ذخیره…" : "ذخیره"}
                </button>
                <button
                  onClick={() => setDraft(null)}
                  className="min-h-10 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDraft({ word: "", meaning: "", image: "" })}
              className="mb-5 min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90"
            >
              + افزودن واژه
            </button>
          )}

          {/* word list */}
          {pending && words.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
          ) : words.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              هنوز واژه‌ای برای این درس ثبت نشده. با دکمهٔ «افزودن واژه» شروع کن.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {words.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {w.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.image} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xl">🖼️</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold">{w.word}</h4>
                    <p className="line-clamp-1 text-sm text-muted-foreground">{w.meaning}</p>
                    {!w.image && <p className="text-xs text-destructive">بدون عکس — در بازی نمایش داده نمی‌شود</p>}
                  </div>
                  {confirmDeleteId === w.id ? (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => remove(w.id)}
                        disabled={pending}
                        className="min-h-9 rounded-lg bg-destructive px-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                      >
                        حذف
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="min-h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground"
                      >
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() =>
                          setDraft({ id: w.id, word: w.word, meaning: w.meaning, image: w.image })
                        }
                        className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(w.id)}
                        className="min-h-9 rounded-lg border border-border px-3 text-sm text-destructive hover:bg-destructive/10"
                      >
                        حذف
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
