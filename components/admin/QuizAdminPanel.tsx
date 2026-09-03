"use client";

import { useEffect, useRef, useState } from "react";
import {
  quizAdminDeleteQuestion,
  quizAdminGet,
  quizAdminList,
  type QuizListItem,
  type QuizQuestionDetail,
  type QuizType,
} from "@/lib/quiz/admin-actions";
import { QUIZ_PAGE_SIZE } from "@/lib/quiz/constants";
import QuizQuestionForm from "./QuizQuestionForm";
import ConfirmDialog from "./ConfirmDialog";
import { useAdminToast } from "@/components/admin/AdminToast";

const TYPE_LABELS: Record<QuizType, string> = {
  "poem-to-audio": "بیت → صوت",
  "audio-to-poem": "صوت → بیت",
  "weight-to-audio": "وزن → صوت",
};

const DIFFICULTY_LABELS: Record<"easy" | "medium" | "hard", string> = {
  easy: "آسان",
  medium: "متوسط",
  hard: "دشوار",
};

type Props = {
  initialItems: QuizListItem[];
  initialTotal: number;
  /** شناسهٔ سؤالی که مدیر از یک گزارش به آن لینک شده — مستقیم باز می‌شود. */
  focusId?: string | null;
};

export default function QuizAdminPanel({ initialItems, initialTotal, focusId }: Props) {
  const toast = useAdminToast();
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  const [type, setType] = useState<QuizType | null>(null);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard" | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<QuizQuestionDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [confirming, setConfirming] = useState<QuizListItem | null>(null);

  const searching = query.trim().length > 0;

  // Category filters and search re-fetch from the server (search needs the
  // full filtered set to look across, not just the loaded page) so both
  // reset back to page one of the same filters.
  async function applyFilters(nextType: QuizType | null, nextDifficulty: "easy" | "medium" | "hard" | null) {
    setLoadingPage(true);
    const result = await quizAdminList({
      type: nextType ?? undefined,
      difficulty: nextDifficulty ?? undefined,
      limit: QUIZ_PAGE_SIZE,
    });
    setLoadingPage(false);
    setItems(result.items);
    setTotal(result.total);
  }

  async function handleTypeChange(nextType: QuizType | null) {
    setType(nextType);
    await applyFilters(nextType, difficulty);
  }

  async function handleDifficultyChange(nextDifficulty: "easy" | "medium" | "hard" | null) {
    setDifficulty(nextDifficulty);
    await applyFilters(type, nextDifficulty);
  }

  async function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    if (!nextQuery.trim()) {
      await applyFilters(type, difficulty);
      return;
    }
    // Search needs to look across every question matching the current
    // category filters, not just the loaded page — fetch the whole set.
    setLoadingPage(true);
    const result = await quizAdminList({ type: type ?? undefined, difficulty: difficulty ?? undefined });
    setLoadingPage(false);
    setItems(result.items);
    setTotal(result.total);
  }

  async function handleLoadMore() {
    setLoadingPage(true);
    const result = await quizAdminList({
      type: type ?? undefined,
      difficulty: difficulty ?? undefined,
      limit: QUIZ_PAGE_SIZE,
      offset: items.length,
    });
    setLoadingPage(false);
    setItems((prev) => {
      const seen = new Set(prev.map((q) => q.id));
      return [...prev, ...result.items.filter((q) => !seen.has(q.id))];
    });
    setTotal(result.total);
  }

  async function refresh() {
    await applyFilters(type, difficulty);
  }

  /* آمدن از «رفتن به همین مورد»: همان سؤال باز می‌شود، نه فهرست.

     ⚠️ سؤالِ گزارش‌شده ممکن است اصلاً در صفحهٔ اول فهرست نباشد، پس دنبالش در
     `items` نمی‌گردیم — مستقیم از سرور می‌خوانیمش. `openedRef` نگه می‌دارد
     که این فقط یک بار اتفاق بیفتد، وگرنه بستنِ فرم بلافاصله دوباره بازش
     می‌کند. */
  const openedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || openedRef.current === focusId) return;
    openedRef.current = focusId;
    let alive = true;
    setLoadingId(focusId);
    quizAdminGet(focusId)
      .then((detail) => {
        if (!alive) return;
        if (detail) setEditing(detail);
        else toast("این سؤال دیگر در بانک نیست — شاید حذف شده باشد.");
      })
      .finally(() => alive && setLoadingId(null));
    return () => {
      alive = false;
    };
  }, [focusId, toast]);

  async function handleEdit(id: string) {
    setLoadingId(id);
    const detail = await quizAdminGet(id);
    setLoadingId(null);
    if (detail) setEditing(detail);
  }

  async function handleDelete() {
    if (!confirming) return;
    const id = confirming.id;
    setConfirming(null);
    const result = await quizAdminDeleteQuestion(id);
    if (result.ok) {
      toast("سؤال حذف شد.", "success");
      await refresh();
    } else {
      toast(result.errors.join("\n"));
    }
  }

  if (creating || editing) {
    return (
      <div dir="rtl" className="max-w-2xl p-4 xs:p-6">
        <QuizQuestionForm
          initial={editing ?? undefined}
          onCancel={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await refresh();
          }}
        />
      </div>
    );
  }

  const filtered = searching
    ? items.filter((q) => (TYPE_LABELS[q.type] ?? "").includes(query) || q.poem?.[0]?.includes(query))
    : items;

  return (
    <div dir="rtl" className="flex max-w-2xl flex-col gap-6 p-4 xs:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">مدیریت عروض سماعی</h1>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
        >
          + سؤال جدید
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange(null)}
            className={`min-h-9 rounded-full border px-3 text-xs ${
              type === null ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
            }`}
          >
            همه دسته‌ها
          </button>
          {(Object.keys(TYPE_LABELS) as QuizType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleTypeChange(t)}
              className={`min-h-9 rounded-full border px-3 text-xs ${
                type === t ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            dir="rtl"
            value={difficulty ?? ""}
            onChange={(e) => handleDifficultyChange((e.target.value || null) as "easy" | "medium" | "hard" | null)}
            className="min-h-10 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">همهٔ سختی‌ها</option>
            {(Object.keys(DIFFICULTY_LABELS) as Array<"easy" | "medium" | "hard">).map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
          <input
            dir="rtl"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="جست‌وجو با نوع یا متن بیت..."
            className="min-h-10 flex-1 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {!loadingPage && total === 0 && (
        <p className="text-center text-sm text-muted-foreground">هنوز سؤالی اضافه نشده.</p>
      )}
      {!loadingPage && total > 0 && filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">سؤالی یافت نشد.</p>
      )}

      <div className="flex flex-col gap-3">
        {filtered.map((q) => (
          <div key={q.id} className="bg-card border border-border flex items-center justify-between gap-3 rounded-2xl p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold">{TYPE_LABELS[q.type]}</span>
              <span className="text-xs text-muted-foreground">
                {q.poem?.[0] || (q.audioUrl ? "صوت" : "-")} · {DIFFICULTY_LABELS[q.difficulty]} · {q.optionCount} گزینه
              </span>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={loadingId === q.id}
                onClick={() => handleEdit(q.id)}
                className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-secondary-foreground disabled:opacity-60"
              >
                {loadingId === q.id ? "..." : "ویرایش"}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(q)}
                className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs text-destructive"
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      {!searching && items.length < total && (
        <button
          type="button"
          disabled={loadingPage}
          onClick={handleLoadMore}
          className="min-h-11 rounded-xl border border-border bg-card text-sm text-muted-foreground disabled:opacity-60"
        >
          {loadingPage ? "در حال بارگذاری..." : `نمایش بیشتر (${items.length} از ${total})`}
        </button>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title="حذف سؤال"
        body={
          confirming?.poem?.[0]
            ? `سؤال «${confirming.poem[0]}» و همهٔ گزینه‌هایش حذف می‌شود.`
            : "این سؤال و همهٔ گزینه‌هایش حذف می‌شود."
        }
        consequence="پاسخ‌هایی که دانش‌آموزان به این سؤال داده‌اند هم از کارنامه‌ها حذف می‌شود."
        confirmLabel="حذف کن"
        onConfirm={handleDelete}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
