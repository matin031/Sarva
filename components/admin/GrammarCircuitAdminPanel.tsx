"use client";

import { useMemo, useState, useTransition } from "react";
import type { GradeKey } from "@/lib/doroos/types";
import {
  GRAMMAR_CIRCUIT_GRADES,
  LESSONS_PER_GRADE,
  isSelectableLesson,
  lessonTitle,
} from "@/lib/grammar-circuit/curriculum";
import { GRAMMAR_ROLE_CATALOG, grammarRoleLabel } from "@/lib/grammar-circuit/roles";
import {
  buildQuestionFromDraft,
  mergeTokenWithNext,
  sentenceFromTokens,
  tokenizeSentence,
  type AuthoredQuestion,
  type AuthoredToken,
} from "@/lib/grammar-circuit/authoring";
import { validateGrammarCircuitQuestion } from "@/lib/grammar-circuit/validator";
import {
  gcAdminDelete,
  gcAdminGet,
  gcAdminLessonCounts,
  gcAdminList,
  gcAdminSave,
  gcAdminSetPublished,
  type AdminGcSummary,
} from "@/lib/admin/grammar-circuit-actions";
import { useAdminToast } from "@/components/admin/AdminToast";

type LessonCounts = Record<number, { total: number; published: number }>;

type Editor = {
  id?: string;
  sourceId?: string;
  difficulty: number;
  explanation: string;
  attribution: string;
  isPublished: boolean;
  draft: AuthoredQuestion;
  /** متنِ خامی که در جعبهٔ بالا نشسته — منبعِ تکه‌کردن. */
  sentence: string;
};

const TYPE_LABELS: Record<string, string> = {
  sentence: "جمله",
  hemistich: "مصراع",
  verse: "بیت",
};

const DIFFICULTY_LABELS: Record<number, string> = { 1: "آسان", 2: "متوسط", 3: "دشوار" };

const fa = (n: number) => n.toLocaleString("fa-IR");

function emptyEditor(): Editor {
  return {
    difficulty: 2,
    explanation: "",
    attribution: "",
    isPublished: false,
    sentence: "",
    draft: { type: "sentence", tokens: [], distractorRoleKeys: [] },
  };
}

export default function GrammarCircuitAdminPanel({
  initialGrade,
  initialLesson,
  initialQuestions,
  initialCounts,
}: {
  initialGrade: GradeKey;
  initialLesson: number;
  initialQuestions: AdminGcSummary[];
  initialCounts: LessonCounts;
}) {
  const toast = useAdminToast();
  const [grade, setGrade] = useState<GradeKey>(initialGrade);
  const [lesson, setLesson] = useState(initialLesson);
  const [questions, setQuestions] = useState(initialQuestions);
  const [counts, setCounts] = useState<LessonCounts>(initialCounts);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [focused, setFocused] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "خطا در ارتباط با سرور");
      }
    });

  const refresh = async (g: GradeKey, l: number) => {
    const [rows, lessonCounts] = await Promise.all([
      gcAdminList({ grade: g, lesson: l }),
      gcAdminLessonCounts(g),
    ]);
    setQuestions(rows);
    setCounts(lessonCounts);
  };

  const pick = (g: GradeKey, l: number) => {
    setGrade(g);
    setLesson(l);
    setEditor(null);
    setConfirmDeleteId(null);
    run(() => refresh(g, l));
  };

  /* ------------------------------------------------------------ ویرایشگر */

  const setDraft = (patch: Partial<AuthoredQuestion>) =>
    setEditor((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));

  const setTokens = (tokens: AuthoredToken[]) => setDraft({ tokens });

  /** واژه‌ها را از متن می‌سازد. وقتی هنوز هیچ نقشی نسبت داده نشده خودکار
   *  اجرا می‌شود؛ بعد از آن فقط با دکمه، تا کارِ انجام‌شده با یک تایپ نپرد. */
  const onSentenceChange = (value: string) => {
    setEditor((e) => {
      if (!e) return e;
      const untouched = e.draft.tokens.every((t) => t.acceptedRoleKeys.length === 0);
      return {
        ...e,
        sentence: value,
        draft: untouched
          ? { ...e.draft, tokens: tokenizeSentence(value), circuitOrder: undefined }
          : e.draft,
      };
    });
  };

  const rebuildTokens = () => {
    setEditor((e) =>
      e
        ? {
            ...e,
            draft: {
              ...e.draft,
              tokens: tokenizeSentence(e.sentence),
              circuitOrder: undefined,
            },
          }
        : e,
    );
    setFocused(0);
  };

  const toggleRole = (roleKey: string) => {
    setEditor((e) => {
      if (!e) return e;
      const tokens = e.draft.tokens.map((t, i) => {
        if (i !== focused) return t;
        const has = t.acceptedRoleKeys.includes(roleKey);
        return {
          ...t,
          acceptedRoleKeys: has
            ? t.acceptedRoleKeys.filter((k) => k !== roleKey)
            : [...t.acceptedRoleKeys, roleKey],
        };
      });
      return { ...e, draft: { ...e.draft, tokens } };
    });
  };

  const clearRoles = (index: number) =>
    setTokens(
      (editor?.draft.tokens ?? []).map((t, i) =>
        i === index ? { ...t, acceptedRoleKeys: [] } : t,
      ),
    );

  // ساختِ سؤال و اعتبارسنجی در هر رندر: همان تابعی که سرور و خودِ بازی
  // استفاده می‌کنند، پس مدیر پیش از ذخیره دقیقاً همان نتیجه را می‌بیند.
  const preview = useMemo(() => {
    if (!editor) return null;
    const built = buildQuestionFromDraft(editor.draft, { id: editor.id ?? "draft" });
    return { built, validation: validateGrammarCircuitQuestion(built) };
  }, [editor]);

  const openEditor = (id: string) =>
    run(async () => {
      const row = await gcAdminGet(id);
      if (!row) return toast("این پرسش پیدا نشد.");
      setEditor({
        id: row.id,
        sourceId: row.sourceId,
        difficulty: row.difficulty,
        explanation: row.explanation,
        attribution: row.attribution,
        isPublished: row.isPublished,
        draft: row.draft,
        sentence: sentenceFromTokens(row.draft.tokens),
      });
      setFocused(0);
    });

  const save = () => {
    if (!editor) return;
    run(async () => {
      const res = await gcAdminSave({
        id: editor.id,
        grade,
        lesson,
        difficulty: editor.difficulty,
        explanation: editor.explanation,
        attribution: editor.attribution,
        isPublished: editor.isPublished,
        draft: editor.draft,
      });
      if (!res.ok) {
        toast(res.problems?.length ? `${res.error} ${res.problems[0]}` : res.error);
        return;
      }
      toast(editor.id ? "پرسش ویرایش شد." : "پرسش ساخته شد.", "success");
      setEditor(null);
      await refresh(grade, lesson);
    });
  };

  const togglePublish = (q: AdminGcSummary) =>
    run(async () => {
      const res = await gcAdminSetPublished(q.id, !q.isPublished);
      if (!res.ok) return toast(res.error);
      await refresh(grade, lesson);
    });

  const remove = (id: string) =>
    run(async () => {
      const res = await gcAdminDelete(id);
      if (!res.ok) return toast(res.error);
      toast("پرسش حذف شد.", "success");
      setConfirmDeleteId(null);
      await refresh(grade, lesson);
    });

  /* ---------------------------------------------------------------- UI */

  if (editor) {
    const tokens = editor.draft.tokens;
    const current = tokens[focused];
    const slotCount = tokens.filter((t) => t.acceptedRoleKeys.length > 0).length;
    const stale =
      tokens.length > 0 && sentenceFromTokens(tokens) !== editor.sentence.trim();

    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">
              {editor.id ? "ویرایش پرسش" : "پرسش تازه"}
            </h1>
            <p className="text-xs text-muted-foreground">
              فارسی {GRAMMAR_CIRCUIT_GRADES.find((g) => g.key === grade)?.label} ·{" "}
              {lessonTitle(grade, lesson)}
              {editor.sourceId && <span dir="ltr"> · {editor.sourceId}</span>}
            </p>
          </div>
          <button
            onClick={() => setEditor(null)}
            className="min-h-10 shrink-0 rounded-xl border border-border bg-card px-4 text-sm text-muted-foreground hover:border-primary/50"
          >
            بازگشت به فهرست
          </button>
        </div>

        {/* ۱ — متن */}
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">
              متنِ سؤال را بنویس؛ واژه‌ها خودشان جدا می‌شوند.
            </span>
            <textarea
              value={editor.sentence}
              onChange={(e) => onSentenceChange(e.target.value)}
              rows={2}
              className="rounded-xl border border-border bg-background px-3 py-2 leading-8"
              placeholder="دیروز باران بارید."
            />
          </label>
          {stale && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-gold/10 p-3 text-sm">
              <span className="text-muted-foreground">
                متن با واژه‌های پایین یکی نیست.
              </span>
              <button
                onClick={rebuildTokens}
                className="min-h-9 rounded-lg border border-gold/50 px-3 text-sm font-medium hover:bg-gold/15"
              >
                بازسازی واژه‌ها (نقش‌ها پاک می‌شوند)
              </button>
            </div>
          )}
        </div>

        {/* ۲ — واژه‌ها و نقش‌ها */}
        {tokens.length > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              روی یک واژه بزن، بعد نقشش را از پایین انتخاب کن. واژه‌ای که نقشی
              نگیرد در بازی دیده می‌شود ولی سوکت ندارد.
            </p>

            <div className="mb-4 flex flex-wrap gap-2">
              {tokens.map((t, i) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFocused(i)}
                  className={`flex min-h-11 flex-col items-center justify-center rounded-xl border px-3 py-1 transition-colors ${
                    focused === i
                      ? "border-primary bg-primary/15"
                      : t.acceptedRoleKeys.length > 0
                        ? "border-primary/40 bg-primary/5 hover:border-primary/60"
                        : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <span className="text-sm font-bold">{t.text}</span>
                  <span
                    className={`text-[10px] ${
                      t.acceptedRoleKeys.length > 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {t.acceptedRoleKeys.length > 0
                      ? t.acceptedRoleKeys.map(grammarRoleLabel).join(" / ")
                      : "بدون نقش"}
                  </span>
                </button>
              ))}
            </div>

            {current && (
              <div className="rounded-xl bg-muted/40 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    نقشِ <span className="font-bold">«{current.text}»</span>
                    {current.acceptedRoleKeys.length > 1 && (
                      <span className="text-muted-foreground">
                        {" "}
                        — هر {fa(current.acceptedRoleKeys.length)} نقش پذیرفته
                        می‌شود، ولی قطعه‌ای که در سینی می‌گذاریم «
                        {grammarRoleLabel(current.acceptedRoleKeys[0])}» است.
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    {current.acceptedRoleKeys.length > 0 && (
                      <button
                        onClick={() => clearRoles(focused)}
                        className="min-h-9 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground hover:border-primary/50"
                      >
                        بدون نقش
                      </button>
                    )}
                    {focused < tokens.length - 1 && (
                      <button
                        onClick={() => setTokens(mergeTokenWithNext(tokens, focused))}
                        className="min-h-9 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground hover:border-primary/50"
                      >
                        چسباندن به واژهٔ بعد
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {GRAMMAR_ROLE_CATALOG.map((role) => {
                    const on = current.acceptedRoleKeys.includes(role.key);
                    return (
                      <button
                        key={role.key}
                        type="button"
                        title={role.hint}
                        onClick={() => toggleRole(role.key)}
                        className={`min-h-9 rounded-lg border px-3 text-sm transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/50"
                        }`}
                      >
                        {role.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ۳ — قطعه‌های فریب */}
        {slotCount > 0 && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <p className="mb-2 text-sm text-muted-foreground">
              قطعه‌های اضافه در سینی (اختیاری) — نقش‌هایی که هیچ واژه‌ای
              نمی‌خواهدشان و فقط بازی را سخت‌تر می‌کنند.
            </p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {editor.draft.distractorRoleKeys.map((key, i) => (
                <button
                  key={`${key}-${i}`}
                  onClick={() =>
                    setDraft({
                      distractorRoleKeys: editor.draft.distractorRoleKeys.filter(
                        (_, j) => j !== i,
                      ),
                    })
                  }
                  className="min-h-9 rounded-lg border border-gold/50 bg-gold/10 px-3 text-sm"
                >
                  {grammarRoleLabel(key)} ✕
                </button>
              ))}
              {editor.draft.distractorRoleKeys.length === 0 && (
                <span className="text-sm text-muted-foreground">هیچ‌کدام</span>
              )}
            </div>
            <select
              value=""
              onChange={(e) =>
                e.target.value &&
                setDraft({
                  distractorRoleKeys: [...editor.draft.distractorRoleKeys, e.target.value],
                })
              }
              className="min-h-10 rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="">+ افزودن قطعهٔ فریب…</option>
              {GRAMMAR_ROLE_CATALOG.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ۴ — فراداده */}
        <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">نوع متن</span>
            <select
              value={editor.draft.type}
              onChange={(e) =>
                setDraft({ type: e.target.value as AuthoredQuestion["type"] })
              }
              className="min-h-10 rounded-xl border border-border bg-background px-3"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">سطح سختی</span>
            <select
              value={editor.difficulty}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, difficulty: Number(e.target.value) } : s))
              }
              className="min-h-10 rounded-xl border border-border bg-background px-3"
            >
              {[1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABELS[d]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">
              توضیح (بعد از بسته شدن مدار نشان داده می‌شود)
            </span>
            <textarea
              value={editor.explanation}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, explanation: e.target.value } : s))
              }
              rows={2}
              className="rounded-xl border border-border bg-background px-3 py-2"
              placeholder="«دیروز» زمانِ انجامِ فعل را می‌گوید، پس قید است."
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">مأخذ (اختیاری)</span>
            <input
              value={editor.attribution}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, attribution: e.target.value } : s))
              }
              className="min-h-10 rounded-xl border border-border bg-background px-3"
              placeholder="سعدی، گلستان"
            />
          </label>

          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={editor.isPublished}
              onChange={(e) =>
                setEditor((s) => (s ? { ...s, isPublished: e.target.checked } : s))
              }
              className="size-4"
            />
            <span>در بازی نمایش داده شود</span>
          </label>
        </div>

        {/* ۵ — همان اعتبارسنجی‌ای که بازی اجرا می‌کند */}
        {preview && (
          <div
            className={`mb-5 rounded-2xl border p-4 text-sm ${
              preview.validation.ok
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/50 bg-destructive/10"
            }`}
          >
            {preview.validation.ok ? (
              <p>
                ✓ آمادهٔ بازی: {fa(slotCount)} سوکت و{" "}
                {fa(preview.built.pieces.length)} قطعه در سینی (
                {preview.built.pieces.map((p) => grammarRoleLabel(p.roleKey)).join("، ")}
                ).
              </p>
            ) : (
              <>
                <p className="mb-1 font-bold text-destructive">
                  هنوز قابلِ بازی نیست:
                </p>
                <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                  {preview.validation.errors.slice(0, 6).map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={pending || !preview?.validation.ok}
            className="min-h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
          >
            {pending ? "در حال ذخیره…" : "ذخیرهٔ پرسش"}
          </button>
          <button
            onClick={() => setEditor(null)}
            className="min-h-11 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground hover:border-primary/50"
          >
            انصراف
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- فهرست */

  const lessonNumbers = Array.from({ length: LESSONS_PER_GRADE }, (_, i) => i + 1);

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت مدار دستور</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هر پرسش یک جمله است و هر واژه‌اش می‌تواند یک سوکتِ نقش داشته باشد.
          نقش‌ها را از فهرست انتخاب می‌کنی و به واژهٔ دلخواهت می‌دهی؛ قطعه‌های
          سینی خودشان از روی همان ساخته می‌شوند.
        </p>
      </div>

      <div className="mb-3 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">پایه</span>
        <div className="flex flex-wrap gap-2">
          {GRAMMAR_CIRCUIT_GRADES.map((g) => (
            <button
              key={g.key}
              onClick={() => pick(g.key, lesson)}
              className={`min-h-10 rounded-xl px-4 text-sm font-medium transition-colors ${
                grade === g.key
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              {g.book}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">درس</span>
        <div className="flex flex-wrap gap-1.5">
          {lessonNumbers.map((n) => {
            const c = counts[n];
            const selectable = isSelectableLesson(grade, n);
            return (
              <button
                key={n}
                onClick={() => pick(grade, n)}
                title={
                  selectable
                    ? lessonTitle(grade, n)
                    : `${lessonTitle(grade, n)} — درسِ آزاد؛ در بازی انتخاب نمی‌شود`
                }
                className={`flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-sm transition-colors ${
                  lesson === n
                    ? "bg-primary font-bold text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/50"
                } ${selectable ? "" : "opacity-60"}`}
              >
                <span>{fa(n)}</span>
                {c && c.total > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      lesson === n ? "bg-primary-foreground/20" : "bg-muted"
                    }`}
                  >
                    {fa(c.published)}/{fa(c.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          عدد کنار هر درس: منتشرشده از کل. درس‌های کم‌رنگ آزادند و در بازی
          انتخاب نمی‌شوند.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{lessonTitle(grade, lesson)}</h2>
        <button
          onClick={() => {
            setEditor(emptyEditor());
            setFocused(0);
          }}
          className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90"
        >
          + پرسش تازه
        </button>
      </div>

      {pending && questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : questions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          هنوز پرسشی برای این درس ثبت نشده.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-7">{q.sentence}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {TYPE_LABELS[q.questionType] ?? q.questionType}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {DIFFICULTY_LABELS[q.difficulty] ?? q.difficulty}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                    {fa(q.slotCount)} سوکت
                  </span>
                  {!q.isPublished && (
                    <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5">
                      منتشرنشده
                    </span>
                  )}
                  {q.problems.length > 0 && (
                    <span
                      title={q.problems.join(" | ")}
                      className="rounded-full bg-destructive/15 px-2 py-0.5 text-destructive"
                    >
                      خراب — {q.problems[0]}
                    </span>
                  )}
                </div>
              </div>

              {confirmDeleteId === q.id ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => remove(q.id)}
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
                <div className="flex shrink-0 flex-wrap gap-1">
                  <button
                    onClick={() => togglePublish(q)}
                    disabled={pending}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50 disabled:opacity-50"
                  >
                    {q.isPublished ? "پنهان کن" : "منتشر کن"}
                  </button>
                  <button
                    onClick={() => openEditor(q.id)}
                    disabled={pending}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50 disabled:opacity-50"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(q.id)}
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
    </div>
  );
}
