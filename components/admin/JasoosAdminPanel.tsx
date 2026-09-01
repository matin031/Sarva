"use client";

import { useMemo, useState, useTransition } from "react";
import { JASOOS_ROLES, JASOOS_SUSPECT_COUNT } from "@/lib/jasoos-data";
import {
  jasoosAdminDelete,
  jasoosAdminGet,
  jasoosAdminList,
  jasoosAdminSave,
  jasoosAdminSetPublished,
  type AdminJasoosSummary,
} from "@/lib/admin/jasoos-actions";
import { useAdminToast } from "@/components/admin/AdminToast";

type SuspectDraft = {
  role: string;
  isSpy: boolean;
  evidence: string;
  wordInVerse: string;
};

type LevelDraft = {
  id?: number;
  title: string;
  category: string;
  contentType: string;
  line1: string;
  line2: string;
  isPublished: boolean;
  suspects: SuspectDraft[];
};

const fa = (n: number) => n.toLocaleString("fa-IR");

function emptyDraft(): LevelDraft {
  return {
    title: "",
    category: "دستوری",
    contentType: "poem",
    line1: "",
    line2: "",
    isPublished: true,
    suspects: Array.from({ length: JASOOS_SUSPECT_COUNT }, (_, i) => ({
      role: JASOOS_ROLES[i] ?? JASOOS_ROLES[0],
      // مظنون چهارم پیش‌فرض جاسوس است تا فرم از همان اول یک وضعیتِ معتبر
      // داشته باشد؛ عوض کردنش یک کلیک است.
      isSpy: i === JASOOS_SUSPECT_COUNT - 1,
      evidence: "",
      wordInVerse: "",
    })),
  };
}

/** کلمات بیت، برای اینکه مدیر به‌جای تایپِ دوباره فقط رویشان کلیک کند.
 *  نقطه‌گذاری کنار می‌رود چون «عافیت،» و «عافیت» باید یک کارت باشند. */
function verseWords(line1: string, line2: string): string[] {
  return [...new Set(
    `${line1} ${line2}`
      .split(/\s+/)
      .map((w) => w.replace(/^[«»"'(),.:;؛،؟!?]+|[«»"'(),.:;؛،؟!?]+$/g, "").trim())
      .filter((w) => w.length > 0),
  )];
}

export default function JasoosAdminPanel({
  initialLevels,
}: {
  initialLevels: AdminJasoosSummary[];
}) {
  const toast = useAdminToast();
  const [levels, setLevels] = useState(initialLevels);
  const [draft, setDraft] = useState<LevelDraft | null>(null);
  const [focused, setFocused] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const words = useMemo(
    () => (draft ? verseWords(draft.line1, draft.line2) : []),
    [draft],
  );

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "خطا در ارتباط با سرور");
      }
    });
  };

  const refreshList = async () => setLevels(await jasoosAdminList());

  const openEditor = (id: number) => {
    run(async () => {
      const level = await jasoosAdminGet(id);
      if (!level) return toast("این پرونده پیدا نشد.");
      const base = emptyDraft();
      setDraft({
        id: level.id,
        title: level.title,
        category: level.category,
        contentType: level.contentType,
        line1: level.verseLines[0],
        line2: level.verseLines[1],
        isPublished: level.isPublished,
        // پروندهٔ ناقصِ قدیمی هم باید قابل باز شدن باشد، وگرنه تنها راهِ درست
        // کردنش حذف و ساختِ دوباره می‌شود.
        suspects: base.suspects.map((fallback, i) => level.suspects[i] ?? fallback),
      });
      setFocused(0);
    });
  };

  const setSuspect = (index: number, patch: Partial<SuspectDraft>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      suspects: draft.suspects.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  };

  // جاسوس رادیویی است نه چک‌باکس: انتخابِ یکی یعنی برداشته شدنِ بقیه، وگرنه
  // می‌شد پرونده‌ای با دو جاسوس ساخت که سرور بعداً ردش می‌کند.
  const setSpy = (index: number) => {
    if (!draft) return;
    setDraft({
      ...draft,
      suspects: draft.suspects.map((s, i) => ({
        ...s,
        isSpy: i === index,
        wordInVerse: i === index ? "" : s.wordInVerse,
      })),
    });
  };

  const assignWord = (word: string) => {
    if (!draft) return;
    if (draft.suspects[focused]?.isSpy) {
      return toast("جاسوس نباید کلمه‌ای در بیت داشته باشد؛ همین است که لو می‌دهدش.");
    }
    setSuspect(focused, { wordInVerse: word });
  };

  const save = () => {
    if (!draft) return;
    run(async () => {
      const res = await jasoosAdminSave({
        id: draft.id,
        title: draft.title,
        category: draft.category,
        contentType: draft.contentType,
        verseLines: [draft.line1, draft.line2],
        isPublished: draft.isPublished,
        suspects: draft.suspects,
      });
      if (!res.ok) return toast(res.error);
      toast(draft.id ? "پرونده ویرایش شد." : "پرونده ساخته شد.", "success");
      setDraft(null);
      await refreshList();
    });
  };

  const togglePublish = (level: AdminJasoosSummary) => {
    run(async () => {
      const res = await jasoosAdminSetPublished(level.id, !level.isPublished);
      if (!res.ok) return toast(res.error);
      await refreshList();
    });
  };

  const remove = (id: number) => {
    run(async () => {
      const res = await jasoosAdminDelete(id);
      if (!res.ok) return toast(res.error);
      toast("پرونده حذف شد.", "success");
      setConfirmDeleteId(null);
      await refreshList();
    });
  };

  // ---------------------------------------------------------------- ویرایشگر
  if (draft) {
    const spyIndex = draft.suspects.findIndex((s) => s.isSpy);

    return (
      <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold sm:text-2xl">
            {draft.id ? "ویرایش پرونده" : "پروندهٔ تازه"}
          </h1>
          <button
            onClick={() => setDraft(null)}
            className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm text-muted-foreground hover:border-primary/50"
          >
            بازگشت به فهرست
          </button>
        </div>

        <div className="mb-5 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">عنوان (روی درِ سالن دیده می‌شود)</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="min-h-10 rounded-xl border border-border bg-background px-3"
              placeholder="مثلاً: درِ نهم"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">دسته</span>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              className="min-h-10 rounded-xl border border-border bg-background px-3"
            >
              <option value="دستوری">دستوری</option>
              <option value="آرایه">آرایه</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">نوع متن</span>
            <select
              value={draft.contentType}
              onChange={(e) => setDraft({ ...draft, contentType: e.target.value })}
              className="min-h-10 rounded-xl border border-border bg-background px-3"
            >
              <option value="poem">شعر (دو مصرع)</option>
              <option value="prose">نثر (یک بند)</option>
            </select>
          </label>

          <label className="flex items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              checked={draft.isPublished}
              onChange={(e) => setDraft({ ...draft, isPublished: e.target.checked })}
              className="size-4"
            />
            <span>در بازی نمایش داده شود</span>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">
              {draft.contentType === "poem" ? "مصرع اول" : "متن"}
            </span>
            <input
              value={draft.line1}
              onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
              className="min-h-10 rounded-xl border border-border bg-background px-3"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted-foreground">
              {draft.contentType === "poem" ? "مصرع دوم" : "ادامهٔ متن (اختیاری)"}
            </span>
            <input
              value={draft.line2}
              onChange={(e) => setDraft({ ...draft, line2: e.target.value })}
              className="min-h-10 rounded-xl border border-border bg-background px-3"
            />
          </label>
        </div>

        {/* کلمات بیت: کلیک روی هر کلمه، آن را به مظنونِ انتخاب‌شده می‌دهد */}
        {words.length > 0 && (
          <div className="mb-5 rounded-2xl border border-gold/40 bg-gold/5 p-4">
            <p className="mb-2 text-sm text-muted-foreground">
              روی هر کلمه بزن تا به مظنونِ شمارهٔ{" "}
              <span className="font-bold text-foreground">{fa(focused + 1)}</span> («
              {draft.suspects[focused]?.role}») نسبت داده شود.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {words.map((w) => {
                const usedBy = draft.suspects.findIndex((s) => s.wordInVerse === w);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => assignWord(w)}
                    className={`min-h-9 rounded-lg border px-3 text-sm transition-colors ${
                      usedBy >= 0
                        ? "border-primary bg-primary/15 font-bold text-primary"
                        : "border-border bg-card hover:border-primary/60"
                    }`}
                  >
                    {w}
                    {usedBy >= 0 && (
                      <span className="mr-1 text-[10px] opacity-70">
                        ({draft.suspects[usedBy].role})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* چهار مظنون */}
        <div className="flex flex-col gap-3">
          {draft.suspects.map((s, i) => (
            <div
              key={i}
              onFocusCapture={() => setFocused(i)}
              onClick={() => setFocused(i)}
              className={`rounded-2xl border p-4 transition-colors ${
                focused === i ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-xs font-bold">
                  {fa(i + 1)}
                </span>
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">نقش</span>
                  <select
                    value={s.role}
                    onChange={(e) => setSuspect(i, { role: e.target.value })}
                    className="min-h-9 rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    {JASOOS_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="jasoos-spy"
                    checked={s.isSpy}
                    onChange={() => setSpy(i)}
                    className="size-4"
                  />
                  <span className={s.isSpy ? "font-bold text-destructive" : ""}>
                    جاسوس است
                  </span>
                </label>
              </div>

              {!s.isSpy && (
                <label className="mb-3 flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">کلمهٔ این نقش در بیت</span>
                  <input
                    value={s.wordInVerse}
                    onChange={(e) => setSuspect(i, { wordInVerse: e.target.value })}
                    className="min-h-10 rounded-xl border border-border bg-background px-3"
                    placeholder="از بالا یک کلمه انتخاب کن یا همین‌جا بنویس"
                  />
                </label>
              )}

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-muted-foreground">
                  {s.isSpy
                    ? "توضیحِ لو رفتن (بعد از شلیک نشان داده می‌شود)"
                    : "توضیحِ نقش (چرا این کلمه این نقش را دارد)"}
                </span>
                <textarea
                  value={s.evidence}
                  onChange={(e) => setSuspect(i, { evidence: e.target.value })}
                  rows={2}
                  className="rounded-xl border border-border bg-background px-3 py-2"
                  placeholder={
                    s.isSpy
                      ? "«آرام» در این بیت نقشِ مسند را ندارد؛ او جاسوس بود!"
                      : "«عافیت» مفعولِ فعلِ «خواهی» است."
                  }
                />
              </label>
            </div>
          ))}
        </div>

        {spyIndex < 0 && (
          <p className="mt-3 text-sm text-destructive">
            یکی از چهار مظنون باید جاسوس باشد.
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={save}
            disabled={pending}
            className="min-h-11 rounded-xl bg-primary px-6 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
          >
            {pending ? "در حال ذخیره…" : "ذخیرهٔ پرونده"}
          </button>
          <button
            onClick={() => setDraft(null)}
            className="min-h-11 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
          >
            انصراف
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------ فهرست
  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت جاسوسِ نقش‌ها</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هر پرونده یک بیت است با چهار مظنون؛ سه نفر نقشی را ادعا می‌کنند که
          واقعاً در بیت هست و یکی — جاسوس — نقشی را که نیست.
        </p>
      </div>

      {levels.length === 0 && (
        <div className="mb-5 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
          هنوز پرونده‌ای ساخته نشده، پس بازی با هشت پروندهٔ پیش‌فرضِ سایت کار
          می‌کند. با ساختن اولین پرونده، بازی فقط همین فهرست را می‌خواند.
        </div>
      )}

      <button
        onClick={() => {
          setDraft(emptyDraft());
          setFocused(0);
        }}
        className="mb-5 min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90"
      >
        + پروندهٔ تازه
      </button>

      <div className="flex flex-col gap-2">
        {levels.map((l) => {
          const broken = l.suspectCount !== JASOOS_SUSPECT_COUNT || l.spyCount !== 1;
          return (
            <div
              key={l.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{l.title}</h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    {l.category}
                  </span>
                  {!l.isPublished && (
                    <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-[11px]">
                      منتشرنشده
                    </span>
                  )}
                  {broken && (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive">
                      ناقص — {fa(l.suspectCount)} مظنون، {fa(l.spyCount)} جاسوس
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                  {l.firstLine}
                </p>
              </div>

              {confirmDeleteId === l.id ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => remove(l.id)}
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
                    onClick={() => togglePublish(l)}
                    disabled={pending}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50 disabled:opacity-50"
                  >
                    {l.isPublished ? "پنهان کن" : "منتشر کن"}
                  </button>
                  <button
                    onClick={() => openEditor(l.id)}
                    disabled={pending}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50 disabled:opacity-50"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(l.id)}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm text-destructive hover:bg-destructive/10"
                  >
                    حذف
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
