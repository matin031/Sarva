"use client";

import "@/components/UI/rang-ara/rang-ara.css";

import { useDeferredValue, useMemo, useState, useTransition, type CSSProperties } from "react";
import { GRADE_META, LESSON_TITLES, faNum } from "@/lib/doroos/catalog";
import { parseBulk, type BulkPlace } from "@/lib/rang-ara/bulk";
import { CONCEPTS, tokenize, type ConceptId, type GradeKey, type Step, type TokenId } from "@/lib/rang-ara/content";
import { LESSONS_PER_GRADE, MAX_STEPS, isSelectableLesson, selectableLessons, validateVerse } from "@/lib/rang-ara/verse";
import {
  rangAraAdminDelete,
  rangAraAdminGet,
  rangAraAdminImport,
  rangAraAdminList,
  rangAraAdminSave,
  rangAraAdminSetPublished,
  type AdminRangAraSummary,
} from "@/lib/admin/rang-ara-actions";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useFocusedRow } from "@/components/admin/useFocusedRow";

/* ═══════════════════════════════════════════════════════════════════════════
   پنلِ «رنگ‌آرا»: بانکِ بیت‌ها به تفکیکِ پایه و درس.

   مدیر جوابِ هر گام را تایپ نمی‌کند؛ روی واژه‌های خودِ بیت کلیک می‌کند. پس
   شناسهٔ واژه («مصراع-جایگاه») همیشه درست ساخته می‌شود و بیتی مثلِ «ما چو
   ناییم و نوا در ما ز توست» که یک واژه را دو بار دارد، مشکلی نمی‌سازد.
   ═══════════════════════════════════════════════════════════════════════════ */

type Filter = "all" | GradeKey | "outside";

type Draft = {
  id?: string;
  grade: GradeKey | null;
  lesson: number | null;
  poet: string;
  source: string;
  line1: string;
  line2: string;
  meaning: string;
  steps: Step[];
  isPublished: boolean;
};

/** کدام انتخاب الان با کلیک روی واژه‌ها پر می‌شود: جوابِ اصلی (-1) یا یکی از جایگزین‌ها. */
type Target = { step: number; group: number };

const CONCEPT_IDS = Object.keys(CONCEPTS) as ConceptId[];

const tone = (c: ConceptId) =>
  ({ "--c": `var(--ra-${CONCEPTS[c].color})`, "--ci": `var(--ra-${CONCEPTS[c].color}-ink)` }) as CSSProperties;

function emptyDraft(grade: GradeKey | null = "dahom", lesson: number | null = 1): Draft {
  return {
    grade,
    lesson: grade ? lesson : null,
    poet: "",
    source: "",
    line1: "",
    line2: "",
    meaning: "",
    steps: [{ concept: "mushabbah", answer: [], explanation: "" }],
    isPublished: false,
  };
}

function placeLabel(grade: GradeKey | null, lesson: number | null) {
  if (!grade || !lesson) return "خارج از کتاب";
  const g = GRADE_META.find((m) => m.key === grade)?.label ?? grade;
  const title = LESSON_TITLES[grade]?.[lesson];
  return `${g} · درس ${faNum(lesson)}${title ? ` · ${title}` : ""}`;
}

export default function RangAraAdminPanel({
  initialVerses,
  focusId = null,
}: {
  initialVerses: AdminRangAraSummary[];
  focusId?: string | null;
}) {
  const toast = useAdminToast();
  const [verses, setVerses] = useState(initialVerses);
  const [filter, setFilter] = useState<Filter>("all");
  const [lessonFilter, setLessonFilter] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [importing, setImporting] = useState(false);
  const [target, setTarget] = useState<Target>({ step: 0, group: -1 });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const focus = useFocusedRow(focusId);

  const run = (fn: () => Promise<void>) =>
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "خطا در ارتباط با سرور");
      }
    });
  const refresh = async () => setVerses(await rangAraAdminList());

  const visible = useMemo(
    () =>
      verses.filter((v) =>
        filter === "all"
          ? true
          : filter === "outside"
            ? v.grade === null
            : v.grade === filter && (lessonFilter === null || v.lesson === lessonFilter),
      ),
    [verses, filter, lessonFilter],
  );

  /* گروه‌بندیِ فهرست: هر درس یک سرتیتر. ترتیب همان ترتیبِ سرور است. */
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: AdminRangAraSummary[] }[] = [];
    for (const v of visible) {
      const key = `${v.grade ?? "outside"}-${v.lesson ?? 0}`;
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(v);
      else out.push({ key, label: placeLabel(v.grade, v.lesson), items: [v] });
    }
    return out;
  }, [visible]);

  const openEditor = (id: string) =>
    run(async () => {
      const v = await rangAraAdminGet(id);
      if (!v) return toast("این بیت پیدا نشد.");
      setDraft({
        id: v.id,
        grade: v.grade,
        lesson: v.lesson,
        poet: v.poet,
        source: v.source ?? "",
        line1: v.lines[0],
        line2: v.lines[1],
        meaning: v.meaning ?? "",
        steps: v.steps.length ? v.steps : emptyDraft().steps,
        isPublished: v.isPublished,
      });
      setTarget({ step: 0, group: -1 });
    });

  const togglePublish = (v: AdminRangAraSummary) =>
    run(async () => {
      const res = await rangAraAdminSetPublished(v.id, !v.isPublished);
      if (!res.ok) return toast(res.error);
      await refresh();
    });

  const remove = (id: string) =>
    run(async () => {
      const res = await rangAraAdminDelete(id);
      if (!res.ok) return toast(res.error);
      toast("بیت حذف شد.", "success");
      setConfirmDelete(null);
      await refresh();
    });

  if (importing) {
    return (
      <BulkImport
        start={filter === "outside" ? null : { grade: filter === "all" ? "dahom" : filter, lesson: lessonFilter ?? 1 }}
        pending={pending}
        onCancel={() => setImporting(false)}
        onImport={(items, publish) =>
          run(async () => {
            const res = await rangAraAdminImport(items.map((v) => ({ ...v, isPublished: publish })));
            if (!res.ok) return toast(res.error);
            const notes = [
              `${faNum(res.added)} بیت افزوده شد`,
              res.published ? `${faNum(res.published)} منتشر شد` : "",
              res.duplicates ? `${faNum(res.duplicates)} تکراری کنار رفت` : "",
            ].filter(Boolean);
            toast(`${notes.join("، ")}.`, "success");
            setImporting(false);
            await refresh();
          })
        }
      />
    );
  }

  if (draft) {
    return (
      <Editor
        draft={draft}
        setDraft={setDraft}
        target={target}
        setTarget={setTarget}
        pending={pending}
        onCancel={() => setDraft(null)}
        onSave={() =>
          run(async () => {
            const res = await rangAraAdminSave({
              id: draft.id,
              grade: draft.grade,
              lesson: draft.grade ? draft.lesson : null,
              poet: draft.poet,
              source: draft.grade ? null : draft.source,
              lines: [draft.line1, draft.line2],
              meaning: draft.meaning,
              steps: draft.steps,
              isPublished: draft.isPublished,
            });
            if (!res.ok) return toast(res.error);
            toast(draft.id ? "بیت ویرایش شد." : "بیت ساخته شد.", "success");
            setDraft(null);
            await refresh();
          })
        }
      />
    );
  }

  const published = verses.filter((v) => v.isPublished).length;

  return (
    <div dir="rtl" className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">رنگ‌آرا</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {faNum(verses.length)} بیت · {faNum(published)} منتشرشده
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setImporting(true)}
            className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:border-primary/50"
          >
            افزودن انبوه
          </button>
          <button
            onClick={() => {
              const g = filter === "outside" ? null : filter === "all" ? "dahom" : filter;
              setDraft(emptyDraft(g, lessonFilter ?? (g ? selectableLessons(g)[0] : 1)));
              setTarget({ step: 0, group: -1 });
            }}
            className="min-h-10 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-95"
          >
            بیت تازه
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "همه"],
            ...GRADE_META.map((g) => [g.key, g.label] as const),
            ["outside", "خارج از کتاب"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => {
              setFilter(key as Filter);
              setLessonFilter(null);
            }}
            className={`min-h-9 rounded-full border px-3.5 text-sm transition-colors ${
              filter === key ? "border-primary bg-primary/10 font-bold text-primary" : "border-border bg-card hover:border-primary/50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filter !== "outside" && (
        <Coverage
          verses={verses}
          grades={filter === "all" ? GRADE_META.map((g) => g.key) : [filter]}
          active={filter === "all" ? null : { grade: filter, lesson: lessonFilter }}
          onPick={(grade, lesson) => {
            const same = filter === grade && lessonFilter === lesson;
            setFilter(grade);
            setLessonFilter(same ? null : lesson);
          }}
        />
      )}

      {groups.length === 0 && (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          اینجا هنوز بیتی نیست.
        </p>
      )}

      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <section key={g.key}>
            <h2 className="mb-2 text-sm font-bold text-muted-foreground">
              {g.label} <span className="font-normal">({faNum(g.items.length)})</span>
            </h2>
            <ul className="flex flex-col gap-2">
              {g.items.map((v) => (
                <li
                  key={v.id}
                  ref={focus.isFocused(v.id) ? focus.ref : undefined}
                  className={`flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 ${
                    focus.isFocused(v.id) ? focus.litClass : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{v.firstLine}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.poet || "بی‌نام"} · {faNum(v.stepCount)} گام
                      {v.problem && <span className="mr-2 text-destructive">· {v.problem}</span>}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      checked={v.isPublished}
                      disabled={pending}
                      onChange={() => togglePublish(v)}
                      className="size-4"
                    />
                    منتشر
                  </label>
                  <button
                    onClick={() => openEditor(v.id)}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50"
                  >
                    ویرایش
                  </button>
                  {confirmDelete === v.id ? (
                    <span className="flex items-center gap-1">
                      <button
                        onClick={() => remove(v.id)}
                        className="min-h-9 rounded-lg bg-destructive px-3 text-sm text-white"
                      >
                        حذف شود
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="min-h-9 px-2 text-sm text-muted-foreground">
                        نه
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(v.id)}
                      className="min-h-9 rounded-lg px-2 text-sm text-muted-foreground hover:text-destructive"
                    >
                      حذف
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/* ── ویرایشگر ─────────────────────────────────────────────────────────── */

function Editor({
  draft,
  setDraft,
  target,
  setTarget,
  pending,
  onCancel,
  onSave,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  target: Target;
  setTarget: (t: Target) => void;
  pending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const tokens = useMemo(() => tokenize([draft.line1, draft.line2]), [draft.line1, draft.line2]);
  const problem = validateVerse({
    grade: draft.grade,
    lesson: draft.grade ? draft.lesson : null,
    poet: draft.poet,
    source: draft.source,
    lines: [draft.line1, draft.line2],
    meaning: draft.meaning,
    steps: draft.steps,
  });

  const setStep = (i: number, patch: Partial<Step>) =>
    setDraft({ ...draft, steps: draft.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  /** مالکِ هر «واژه:آرایه». یک واژه می‌تواند جوابِ دو آرایهٔ مختلف باشد (مجازی
   *  در دلِ کنایه)، ولی نه دو گام با یک آرایه. */
  const owner = new Map<string, number>();
  draft.steps.forEach((s, i) =>
    [s.answer, ...(s.accepted ?? [])].flat().forEach((id) => owner.set(`${id}:${s.concept}`, i)),
  );
  const ownerOf = (id: TokenId, i: number) => owner.get(`${id}:${draft.steps[i].concept}`);

  const toggleToken = (i: number, group: number, id: TokenId) => {
    const s = draft.steps[i];
    const o = ownerOf(id, i);
    if (o !== undefined && o !== i) return;
    const flip = (sel: TokenId[]) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
    if (group === -1) return setStep(i, { answer: flip(s.answer) });
    const accepted = (s.accepted ?? []).map((sel, k) => (k === group ? flip(sel) : sel));
    setStep(i, { accepted });
  };

  const input = "min-h-10 rounded-xl border border-border bg-background px-3";

  return (
    <div dir="rtl" className="ra-vars mx-auto max-w-3xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">{draft.id ? "ویرایش بیت" : "بیت تازه"}</h1>
        <button onClick={onCancel} className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm text-muted-foreground hover:border-primary/50">
          بازگشت به فهرست
        </button>
      </div>

      {/* جای بیت */}
      <div className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">پایه</span>
          <select
            value={draft.grade ?? "outside"}
            onChange={(e) => {
              const g = e.target.value === "outside" ? null : (e.target.value as GradeKey);
              const keep = g && draft.lesson && isSelectableLesson(g, draft.lesson);
              setDraft({ ...draft, grade: g, lesson: g ? (keep ? draft.lesson : selectableLessons(g)[0]) : null });
            }}
            className={input}
          >
            {GRADE_META.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label} ({g.book})
              </option>
            ))}
            <option value="outside">خارج از کتاب</option>
          </select>
        </label>
        {draft.grade ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">درس</span>
            <select
              value={draft.lesson ?? 1}
              onChange={(e) => setDraft({ ...draft, lesson: Number(e.target.value) })}
              className={input}
            >
              <LessonOptions grade={draft.grade} />
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">منبع (اختیاری)</span>
            <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} className={input} placeholder="مثلاً: گلستان" />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">شاعر</span>
          <input value={draft.poet} onChange={(e) => setDraft({ ...draft, poet: e.target.value })} className={input} placeholder="مثلاً: سعدی" />
        </label>
        <label className="flex items-center gap-2 self-end text-sm">
          <input type="checkbox" checked={draft.isPublished} onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })} className="size-4" />
          در بازی نمایش داده شود
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">مصراع اول</span>
          <input value={draft.line1} onChange={(e) => setDraft({ ...draft, line1: e.target.value })} className={`${input} text-base`} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">مصراع دوم</span>
          <input value={draft.line2} onChange={(e) => setDraft({ ...draft, line2: e.target.value })} className={`${input} text-base`} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">معنی بیت (اختیاری؛ در پایانِ بیت نشان داده می‌شود)</span>
          <textarea value={draft.meaning} onChange={(e) => setDraft({ ...draft, meaning: e.target.value })} rows={2} className="rounded-xl border border-border bg-background px-3 py-2" />
        </label>
      </div>

      {/* پیش‌نمایش: بیت همان‌طور که در پایانِ بازی رنگی می‌شود */}
      {tokens.length > 0 && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 text-xs text-muted-foreground">پیش‌نمایش</p>
          <VersePreview lines={[draft.line1, draft.line2]} steps={draft.steps} />
        </div>
      )}

      {/* گام‌ها */}
      <div className="flex flex-col gap-3">
        {draft.steps.map((s, i) => (
          <div
            key={i}
            onClick={() => target.step !== i && setTarget({ step: i, group: -1 })}
            className={`rounded-2xl border p-4 transition-colors ${target.step === i ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            style={tone(s.concept)}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-bold">{faNum(i + 1)}</span>
              <span className="size-4 rounded-full" style={{ background: "var(--c)", boxShadow: "inset 0 0 0 1px var(--ci)" }} />
              <select value={s.concept} onChange={(e) => setStep(i, { concept: e.target.value as ConceptId })} className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm">
                {CONCEPT_IDS.map((c) => (
                  <option key={c} value={c}>
                    {CONCEPTS[c].label}
                  </option>
                ))}
              </select>
              <span className="flex-1" />
              <button
                type="button"
                disabled={i === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  const steps = [...draft.steps];
                  [steps[i - 1], steps[i]] = [steps[i], steps[i - 1]];
                  setDraft({ ...draft, steps });
                  setTarget({ step: i - 1, group: -1 });
                }}
                className="min-h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                بالاتر
              </button>
              <button
                type="button"
                disabled={draft.steps.length === 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setDraft({ ...draft, steps: draft.steps.filter((_, k) => k !== i) });
                  setTarget({ step: 0, group: -1 });
                }}
                className="min-h-8 rounded-lg px-2 text-xs text-muted-foreground hover:text-destructive disabled:opacity-30"
              >
                حذف گام
              </button>
            </div>

            {[-1, ...(s.accepted ?? []).map((_, k) => k)].map((group) => {
              const sel = group === -1 ? s.answer : s.accepted?.[group] ?? [];
              const active = target.step === i && target.group === group;
              return (
                <div key={group} className="mb-2">
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <button type="button" onClick={() => setTarget({ step: i, group })} className={active ? "font-bold text-primary" : ""}>
                      {group === -1 ? "جواب" : `جوابِ دیگر ${faNum(group + 1)}`}
                    </button>
                    {CONCEPTS[s.concept].pair && <span>· همهٔ واژه‌های جفت؛ بازیکن هر کدام را جدا رنگ می‌کند</span>}
                    {group >= 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setStep(i, { accepted: (s.accepted ?? []).filter((_, k) => k !== group) });
                          setTarget({ step: i, group: -1 });
                        }}
                        className="hover:text-destructive"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tokens.map((t) => {
                      const on = sel.includes(t.id);
                      const o = ownerOf(t.id, i);
                      const taken = o !== undefined && o !== i;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={taken}
                          onClick={() => {
                            setTarget({ step: i, group });
                            toggleToken(i, group, t.id);
                          }}
                          title={taken ? `جوابِ گامِ ${faNum((o as number) + 1)}` : undefined}
                          className={`min-h-8 rounded-lg border px-2.5 text-sm transition-colors ${
                            on
                              ? "border-transparent font-bold"
                              : taken
                                ? "border-dashed border-border text-muted-foreground/60"
                                : "border-border bg-background hover:border-primary/60"
                          } ${t.line === 1 && t.id.endsWith("-0") ? "ms-3" : ""}`}
                          style={on ? { background: "var(--c)", color: "var(--ra-paint-ink)" } : undefined}
                        >
                          {t.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setStep(i, { accepted: [...(s.accepted ?? []), []] });
                setTarget({ step: i, group: (s.accepted ?? []).length });
              }}
              className="mb-3 text-xs text-primary hover:underline"
            >
              + جوابِ دیگری هم درست است
            </button>

            <label className="mb-2 flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">توضیح (بعد از پیدا شدن نشان داده می‌شود)</span>
              <textarea value={s.explanation} onChange={(e) => setStep(i, { explanation: e.target.value })} rows={2} className="rounded-xl border border-border bg-background px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">نکته (اختیاری)</span>
              <input value={s.tip ?? ""} onChange={(e) => setStep(i, { tip: e.target.value || undefined })} className={input} />
            </label>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={draft.steps.length >= MAX_STEPS}
          onClick={() => {
            setDraft({ ...draft, steps: [...draft.steps, { concept: "kenaye", answer: [], explanation: "" }] });
            setTarget({ step: draft.steps.length, group: -1 });
          }}
          className="min-h-10 rounded-xl border border-dashed border-border px-4 text-sm hover:border-primary/60 disabled:opacity-40"
        >
          + گامِ تازه
        </button>
        <span className="flex-1" />
        {problem && <span className="text-sm text-destructive">{problem}</span>}
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !!problem}
          className="min-h-10 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:brightness-95 disabled:opacity-50"
        >
          ذخیره
        </button>
      </div>
    </div>
  );
}

/* ── پوششِ درس‌ها ─────────────────────────────────────────────────────────
   هر پایه ۱۸ خانه: درس‌های آزاد خط‌چین‌اند و کلیک نمی‌خورند. رنگِ خانه
   می‌گوید آن درس در بازی بیت دارد یا فقط پیش‌نویس. */

function Coverage({
  verses,
  grades,
  active,
  onPick,
}: {
  verses: AdminRangAraSummary[];
  grades: GradeKey[];
  active: { grade: GradeKey; lesson: number | null } | null;
  onPick: (grade: GradeKey, lesson: number) => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, { total: number; published: number }>();
    for (const v of verses) {
      if (!v.grade || !v.lesson) continue;
      const key = `${v.grade}:${v.lesson}`;
      const e = m.get(key) ?? { total: 0, published: 0 };
      e.total += 1;
      if (v.isPublished) e.published += 1;
      m.set(key, e);
    }
    return m;
  }, [verses]);

  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 sm:p-4">
      {grades.map((g) => (
        <div key={g} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-20 shrink-0 text-sm font-bold">{GRADE_META.find((m) => m.key === g)?.label}</span>
          <div className="grid flex-1 grid-cols-6 gap-1.5 sm:grid-cols-9 lg:grid-cols-18">
            {Array.from({ length: LESSONS_PER_GRADE }, (_, i) => i + 1).map((n) => {
              if (!isSelectableLesson(g, n)) {
                return (
                  <span
                    key={n}
                    title={`درس ${faNum(n)} آزاد است`}
                    className="flex h-11 flex-col items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground/60"
                  >
                    <span className="text-xs">{faNum(n)}</span>
                    <span className="text-[10px]">آزاد</span>
                  </span>
                );
              }
              const c = counts.get(`${g}:${n}`);
              const on = active?.grade === g && active.lesson === n;
              const title = LESSON_TITLES[g]?.[n];
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => onPick(g, n)}
                  title={`درس ${faNum(n)}${title ? ` · ${title}` : ""} — ${faNum(c?.published ?? 0)} منتشرشده از ${faNum(c?.total ?? 0)}`}
                  className={`flex h-11 flex-col items-center justify-center rounded-lg border transition-colors ${
                    on
                      ? "border-primary bg-primary/15 ring-1 ring-primary"
                      : c?.published
                        ? "border-primary/30 bg-primary/8 hover:border-primary/60"
                        : c
                          ? "border-amber-400/50 bg-amber-400/10 hover:border-amber-500"
                          : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="text-xs font-bold">{faNum(n)}</span>
                  <span className="text-[10px] text-muted-foreground">{c ? faNum(c.total) : "—"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        عددِ پایین: تعداد بیت‌ها · رنگی: در بازی هست · کهربایی: فقط پیش‌نویس
      </p>
    </div>
  );
}

function LessonOptions({ grade }: { grade: GradeKey }) {
  return (
    <>
      {Array.from({ length: LESSONS_PER_GRADE }, (_, i) => i + 1).map((n) => {
        const free = !isSelectableLesson(grade, n);
        const title = LESSON_TITLES[grade]?.[n];
        return (
          <option key={n} value={n} disabled={free}>
            درس {faNum(n)} {free ? "· آزاد" : title ? `· ${title}` : ""}
          </option>
        );
      })}
    </>
  );
}

function VersePreview({ lines, steps, small = false }: { lines: [string, string]; steps: Step[]; small?: boolean }) {
  const tokens = tokenize(lines);
  /* لایه‌های هر واژه؛ عبارتِ بلندتر زمینه است و آرایهٔ درونش نواری زیرِ واژه. */
  const layers = new Map<TokenId, { c: ConceptId; n: number }[]>();
  steps.forEach((s) =>
    [s.answer, ...(s.accepted ?? [])].forEach((sel) =>
      sel.forEach((id) => {
        const l = layers.get(id) ?? [];
        if (!l.some((x) => x.c === s.concept)) l.push({ c: s.concept, n: sel.length });
        layers.set(id, l);
      }),
    ),
  );
  return (
    <>
      {[0, 1].map((line) => (
        <p
          key={line}
          className={`flex flex-wrap justify-center gap-x-2 gap-y-1 leading-loose ${small ? "text-base" : "text-lg"}`}
          style={{ fontFamily: "var(--font-pofak), var(--font-sans)" }}
        >
          {tokens
            .filter((t) => t.line === line)
            .map((t) => {
              const [outer, inner] = [...(layers.get(t.id) ?? [])].sort((a, b) => b.n - a.n);
              return (
                <span
                  key={t.id}
                  style={
                    outer
                      ? {
                          background: `var(--ra-${CONCEPTS[outer.c].color})`,
                          color: "var(--ra-paint-ink)",
                          ...(inner ? { boxShadow: `inset 0 -0.32em 0 var(--ra-${CONCEPTS[inner.c].color}-ink)` } : {}),
                        }
                      : undefined
                  }
                  className="rounded-md px-1"
                >
                  {t.pre}
                  {t.text}
                  {t.post}
                </span>
              );
            })}
        </p>
      ))}
    </>
  );
}

/* ── افزودنِ انبوه ─────────────────────────────────────────────────────── */

const BULK_EXAMPLE = `# دهم، درس ۵
سرو چمان من چرا میل چمن نمی‌کند / همدم گل نمی‌شود یاد سمن نمی‌کند
شاعر: حافظ
استعاره: سرو | «سرو» استعاره از معشوقِ بلندقامت است.`;

type BulkVerse = ReturnType<typeof parseBulk>["items"][number]["verse"];

function BulkImport({
  start,
  pending,
  onCancel,
  onImport,
}: {
  start: BulkPlace;
  pending: boolean;
  onCancel: () => void;
  onImport: (verses: BulkVerse[], publish: boolean) => void;
}) {
  const [place, setPlace] = useState<BulkPlace>(start);
  const [text, setText] = useState("");
  const [publish, setPublish] = useState(true);
  const deferred = useDeferredValue(text);
  const { items, errors } = useMemo(() => parseBulk(deferred, place), [deferred, place]);

  const bad = items.filter((i) => i.error).length;
  const drafts = items.filter((i) => !i.error && i.problem).length;
  const ready = items.length - bad - drafts;
  const blocked = pending || !items.length || bad > 0 || errors.length > 0 || deferred !== text;
  const input = "min-h-10 rounded-xl border border-border bg-background px-3";

  return (
    <div dir="rtl" className="ra-vars mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">افزودن انبوه</h1>
        <button
          onClick={onCancel}
          className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm text-muted-foreground hover:border-primary/50"
        >
          بازگشت به فهرست
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">پایه</span>
              <select
                value={place?.grade ?? "outside"}
                onChange={(e) =>
                  setPlace(
                    e.target.value === "outside"
                      ? null
                      : { grade: e.target.value as GradeKey, lesson: selectableLessons(e.target.value as GradeKey)[0] },
                  )
                }
                className={input}
              >
                {GRADE_META.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
                <option value="outside">خارج از کتاب</option>
              </select>
            </label>
            {place && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">درس</span>
                <select
                  value={place.lesson}
                  onChange={(e) => setPlace({ ...place, lesson: Number(e.target.value) })}
                  className={input}
                >
                  <LessonOptions grade={place.grade} />
                </select>
              </label>
            )}
          </div>

          <details className="rounded-2xl border border-border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-bold">قالب متن</summary>
            <ul className="mt-2 list-disc space-y-1 pr-5 text-muted-foreground">
              <li>بیت‌ها را با یک سطرِ خالی از هم جدا کنید.</li>
              <li>دو مصراع با «/» یا در دو سطرِ پشتِ هم.</li>
              <li>
                هر آرایه یک سطر: <code>استعاره: سرو | توضیح | نکته</code> یا <code>سرو: استعاره | توضیح</code>
              </li>
              <li>
                جوابِ دیگر با «؛»؛ واژهٔ تکراری با شماره: <code>ما#۲</code>
              </li>
              <li>
                جناس و سجع: <code>جناس: دست + دوست | توضیح</code>
              </li>
              <li>
                <code>شاعر:</code>، <code>معنی:</code> و برای خارج از کتاب <code>منبع:</code>
              </li>
              <li>
                <code># دوازدهم، درس ۳</code> یا <code># خارج از کتاب</code> جای بیت‌های بعدی را عوض می‌کند.
              </li>
              <li>بیتِ ناقص (مثلاً بی‌توضیح) پیش‌نویس ذخیره می‌شود.</li>
            </ul>
            <button type="button" onClick={() => setText(BULK_EXAMPLE)} className="mt-3 text-xs text-primary hover:underline">
              درج نمونه
            </button>
          </details>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={16}
            spellCheck={false}
            placeholder={BULK_EXAMPLE}
            className="min-h-80 rounded-2xl border border-border bg-background p-4 text-base leading-8"
            style={{ fontFamily: "var(--font-peyda), var(--font-sans)" }}
          />

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="size-4" />
              بیت‌های کامل منتشر شوند
            </label>
            <span className="flex-1" />
            <button
              type="button"
              disabled={blocked}
              onClick={() => onImport(items.map((i) => i.verse), publish)}
              className="min-h-10 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:brightness-95 disabled:opacity-50"
            >
              {items.length ? `افزودن ${faNum(items.length)} بیت` : "افزودن"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {items.length
              ? `${faNum(items.length)} بیت · ${faNum(ready)} آماده · ${faNum(drafts)} پیش‌نویس${bad ? ` · ${faNum(bad)} خطا` : ""}`
              : "پیش‌نمایش اینجا دیده می‌شود."}
          </p>
          {errors.map((e) => (
            <p key={e} className="rounded-xl border border-destructive/50 p-3 text-sm text-destructive">
              {e}
            </p>
          ))}
          <ul className="flex flex-col gap-2">
            {items.map((i) => (
              <li
                key={i.line}
                className={`rounded-2xl border bg-card p-3 ${
                  i.error ? "border-destructive/50" : i.problem ? "border-amber-400/60" : "border-border"
                }`}
              >
                <p className="mb-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                  <span>سطر {faNum(i.line)}</span>
                  <span>· {placeLabel(i.verse.grade, i.verse.lesson)}</span>
                  {i.verse.poet && <span>· {i.verse.poet}</span>}
                  <span>· {faNum(i.verse.steps.length)} گام</span>
                </p>
                <VersePreview lines={i.verse.lines} steps={i.verse.steps} small />
                {i.error ? (
                  <p className="mt-1 text-sm text-destructive">{i.error}</p>
                ) : (
                  i.problem && <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">پیش‌نویس: {i.problem}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
