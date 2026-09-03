"use client";

import { useState, useTransition } from "react";
import {
  MEMORY_GRADES,
  MEMORY_MAX_PAIRS,
  MEMORY_TERMS,
  memoryGridColumns,
  type MemoryGrade,
  type MemoryTerm,
} from "@/lib/literary-pairs";
import {
  pairsAdminBulkAdd,
  pairsAdminDelete,
  pairsAdminList,
  pairsAdminUpsert,
  type AdminMemoryPair,
  type MemoryDeckCounts,
} from "@/lib/admin/pairs-actions";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useFocusedRow } from "@/components/admin/useFocusedRow";

type Draft = { id?: string; work: string; author: string };

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function PairsAdminPanel({
  initialGrade,
  initialTerm,
  initialPairs,
  initialCounts,
  focusId = null,
}: {
  initialGrade: MemoryGrade;
  initialTerm: MemoryTerm;
  initialPairs: AdminMemoryPair[];
  initialCounts: MemoryDeckCounts;
  /** جفتی که مدیر از یک گزارش به آن لینک شده — برجسته می‌شود. */
  focusId?: string | null;
}) {
  const toast = useAdminToast();
  const [grade, setGrade] = useState<MemoryGrade>(initialGrade);
  const [term, setTerm] = useState<MemoryTerm>(initialTerm);
  const [pairs, setPairs] = useState<AdminMemoryPair[]>(initialPairs);
  const [counts, setCounts] = useState<MemoryDeckCounts>(initialCounts);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [bulk, setBulk] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const focus = useFocusedRow(focusId);

  const deckKey = (g: string, t: string) => `${g}:${t}`;

  const refresh = async (g: MemoryGrade, t: MemoryTerm) => {
    const rows = await pairsAdminList(g, t);
    setPairs(rows);
    setCounts((prev) => ({ ...prev, [deckKey(g, t)]: rows.length }));
  };

  const load = (g: MemoryGrade, t: MemoryTerm) => {
    startTransition(async () => {
      try {
        await refresh(g, t);
      } catch (e) {
        toast(e instanceof Error ? e.message : "خطا در بارگذاری جفت‌ها");
        setPairs([]);
      }
    });
  };

  const pick = (g: MemoryGrade, t: MemoryTerm) => {
    setGrade(g);
    setTerm(t);
    setDraft(null);
    setBulk(null);
    setConfirmDeleteId(null);
    load(g, t);
  };

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      const res = await pairsAdminUpsert({
        id: draft.id,
        grade,
        term,
        work: draft.work,
        author: draft.author,
      });
      if (res.ok) {
        setDraft(null);
        toast(draft.id ? "جفت ویرایش شد." : "جفت اضافه شد.", "success");
        await refresh(grade, term);
      } else {
        toast(res.error);
      }
    });
  };

  const saveBulk = () => {
    if (bulk === null) return;
    startTransition(async () => {
      const res = await pairsAdminBulkAdd({ grade, term, text: bulk });
      if (res.ok) {
        setBulk(null);
        const notes = [
          `${fa(res.added)} جفت اضافه شد`,
          res.duplicates > 0 ? `${fa(res.duplicates)} تکراری بود` : "",
          res.skipped > 0 ? `${fa(res.skipped)} خط خوانده نشد` : "",
        ].filter(Boolean);
        toast(notes.join(" · "), "success");
        await refresh(grade, term);
      } else {
        toast(res.error);
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await pairsAdminDelete(id);
      if (res.ok) {
        setConfirmDeleteId(null);
        toast("جفت حذف شد.", "success");
        setPairs((prev) => prev.filter((p) => p.id !== id));
        setCounts((prev) => ({
          ...prev,
          [deckKey(grade, term)]: Math.max(0, (prev[deckKey(grade, term)] ?? 1) - 1),
        }));
      } else {
        toast(res.error);
      }
    });
  };

  const dealt = Math.min(pairs.length, MEMORY_MAX_PAIRS);
  const columns = memoryGridColumns(dealt * 2);
  const termTitle = MEMORY_TERMS.find((t) => t.id === term)?.title ?? "";

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت جفت‌های ادبی</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          دانش‌آموز اول پایه و بعد آزمون را انتخاب می‌کند و همان دسته برایش چیده
          می‌شود. هر جفت — یک اثر و پدیدآورنده‌اش — روی صفحه دو کارت است.
        </p>
      </div>

      {/* انتخاب پایه */}
      <div className="mb-3 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">پایه</span>
        <div className="flex flex-wrap gap-2">
          {MEMORY_GRADES.map((g) => (
            <button
              key={g.id}
              onClick={() => pick(g.id, term)}
              className={`min-h-10 rounded-xl px-4 text-sm font-medium transition-colors ${
                grade === g.id
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
            >
              فارسی {g.title}
            </button>
          ))}
        </div>
      </div>

      {/* انتخاب نوبت */}
      <div className="mb-5 flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">آزمون</span>
        <div className="flex flex-wrap gap-2">
          {MEMORY_TERMS.map((t) => {
            const n = counts[deckKey(grade, t.id)] ?? 0;
            return (
              <button
                key={t.id}
                onClick={() => pick(grade, t.id)}
                className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
                  term === t.id
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                <span>{t.title}</span>
                <span className="text-xs opacity-70">({t.hint})</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    term === t.id ? "bg-primary-foreground/20" : "bg-muted"
                  }`}
                >
                  {fa(n)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* چیدمانی که دانش‌آموز خواهد دید — تا مدیر قبل از اضافه کردنِ نفر بیستم
          بداند کارت‌ها چقدر کوچک می‌شوند. */}
      <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4 text-sm">
        {pairs.length === 0 ? (
          <p className="text-muted-foreground">
            هنوز برای «{termTitle}» چیزی ثبت نشده. تا وقتی هیچ دسته‌ای پر نشده
            باشد، بازی با فهرست پیش‌فرضِ سایت کار می‌کند.
          </p>
        ) : (
          <p className="text-muted-foreground">
            <span className="font-bold text-foreground">{fa(pairs.length)}</span> جفت ={" "}
            <span className="font-bold text-foreground">{fa(pairs.length * 2)}</span> کارت.
            {pairs.length > MEMORY_MAX_PAIRS && (
              <>
                {" "}
                در هر دور {fa(MEMORY_MAX_PAIRS)} جفت به‌قید قرعه چیده می‌شود، پس
                بقیه هدر نمی‌روند و هر بار بازی متفاوت است.
              </>
            )}{" "}
            چیدمان: {fa(columns.base)} ستون روی موبایل و {fa(columns.wide)} ستون روی
            صفحهٔ بزرگ.
          </p>
        )}
      </div>

      {/* فرم افزودن/ویرایش */}
      {draft ? (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-3 font-bold">{draft.id ? "ویرایش جفت" : "جفت تازه"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">اثر / کتاب</span>
              <input
                value={draft.work}
                onChange={(e) => setDraft({ ...draft, work: e.target.value })}
                className="min-h-10 rounded-xl border border-border bg-card px-3"
                placeholder="مثلاً: کویر"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">پدیدآورنده / نویسنده</span>
              <input
                value={draft.author}
                onChange={(e) => setDraft({ ...draft, author: e.target.value })}
                className="min-h-10 rounded-xl border border-border bg-card px-3"
                placeholder="مثلاً: علی شریعتی"
              />
            </label>
          </div>
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
      ) : bulk !== null ? (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-1 font-bold">افزودن گروهی</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            هر خط یک جفت: اول نام اثر، بعد یک جداکننده، بعد نام پدیدآورنده.
            جداکننده می‌تواند <span dir="ltr">|</span> یا خط تیره باشد.
          </p>
          <textarea
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            rows={7}
            className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm leading-7"
            placeholder={"کویر | علی شریعتی\nچشمهایش - بزرگ علوی\nسووشون | سیمین دانشور"}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveBulk}
              disabled={pending}
              className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
            >
              {pending ? "در حال افزودن…" : "افزودن همه"}
            </button>
            <button
              onClick={() => setBulk(null)}
              className="min-h-10 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setDraft({ work: "", author: "" })}
            className="min-h-11 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90"
          >
            + افزودن جفت
          </button>
          <button
            onClick={() => setBulk("")}
            className="min-h-11 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
          >
            افزودن گروهی از یک فهرست
          </button>
        </div>
      )}

      {/* فهرست جفت‌ها */}
      {pending && pairs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : pairs.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          هنوز جفتی برای این آزمون ثبت نشده. با «افزودن جفت» شروع کن.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {pairs.map((p, i) => (
            <div
              key={p.id}
              ref={focus.isFocused(p.id) ? focus.ref : undefined}
              className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-3 ${
                focus.isFocused(p.id) ? focus.litClass : ""
              }`}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                {fa(i + 1)}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="rounded-lg bg-gold/15 px-3 py-1.5 text-sm font-bold">
                  {p.work}
                </span>
                <span className="text-muted-foreground">←</span>
                <span className="rounded-lg bg-primary/15 px-3 py-1.5 text-sm font-bold">
                  {p.author}
                </span>
              </div>
              {confirmDeleteId === p.id ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => remove(p.id)}
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
                    onClick={() => setDraft({ id: p.id, work: p.work, author: p.author })}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50"
                  >
                    ویرایش
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(p.id)}
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
