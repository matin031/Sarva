"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ninjaAdminOverview,
  ninjaCategoryDelete,
  ninjaCategorySave,
  ninjaWordDelete,
  ninjaWordMove,
  ninjaWordRename,
  ninjaWordsAdd,
  type AdminNinjaCategory,
} from "@/lib/admin/ninja-actions";
import { useAdminToast } from "@/components/admin/AdminToast";

type CategoryDraft = { id?: string; label: string; hint: string; enabled: boolean };

const fa = (n: number) => n.toLocaleString("fa-IR");

export default function NinjaAdminPanel({
  initialCategories,
}: {
  initialCategories: AdminNinjaCategory[];
}) {
  const toast = useAdminToast();
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialCategories[0]?.id ?? null,
  );
  const [categoryDraft, setCategoryDraft] = useState<CategoryDraft | null>(null);
  const [wordsText, setWordsText] = useState("");
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editingWordText, setEditingWordText] = useState("");
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState(false);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () => categories.find((c) => c.id === selectedId) ?? null,
    [categories, selectedId],
  );

  /** بارگذاری دوبارهٔ همهٔ نقش‌ها، و انتخابِ یکی از آن‌ها.
   *
   *  `pick` را می‌گیرد و نه یک شناسه، چون بعد از *ساختن* یک نقش هنوز شناسه‌ای
   *  در دست نیست — و پیش از این همان باعث می‌شد نقشِ تازه‌ساخته انتخاب نشود و
   *  کلماتی که مدیر بلافاصله وارد می‌کرد سر از نقشِ قبلی دربیاورند. */
  const refresh = async (pick: (rows: AdminNinjaCategory[]) => string | null) => {
    const rows = await ninjaAdminOverview();
    setCategories(rows);
    const wanted = pick(rows);
    setSelectedId(
      wanted && rows.some((r) => r.id === wanted) ? wanted : (rows[0]?.id ?? null),
    );
  };

  const keepSelection = (rows: AdminNinjaCategory[]) =>
    rows.some((r) => r.id === selectedId) ? selectedId : null;

  const run = (fn: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        toast(e instanceof Error ? e.message : "خطا در ارتباط با سرور");
      }
    });
  };

  const saveCategory = () => {
    if (!categoryDraft) return;
    run(async () => {
      const res = await ninjaCategorySave(categoryDraft);
      if (!res.ok) return toast(res.error);
      toast(categoryDraft.id ? "نقش ویرایش شد." : "نقش ساخته شد.", "success");
      const label = categoryDraft.label.trim();
      setCategoryDraft(null);
      // نقشِ تازه با نامش پیدا می‌شود — نام یکتاست، پس دقیق است.
      await refresh((rows) =>
        categoryDraft.id
          ? categoryDraft.id
          : (rows.find((r) => r.label === label)?.id ?? null),
      );
    });
  };

  const deleteCategory = () => {
    if (!selected) return;
    run(async () => {
      const res = await ninjaCategoryDelete(selected.id);
      if (!res.ok) return toast(res.error);
      toast("نقش و کلماتش حذف شد.", "success");
      setConfirmDeleteCategory(false);
      await refresh(() => null);
    });
  };

  const addWords = () => {
    if (!selected || !wordsText.trim()) return;
    run(async () => {
      const res = await ninjaWordsAdd({ categoryId: selected.id, text: wordsText });
      if (!res.ok) return toast(res.error);
      toast(
        [
          `${fa(res.added)} کلمه اضافه شد`,
          res.duplicates > 0 ? `${fa(res.duplicates)} تکراری بود` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        "success",
      );
      setWordsText("");
      await refresh(() => selected.id);
    });
  };

  const renameWord = (id: string) => {
    run(async () => {
      const res = await ninjaWordRename(id, editingWordText);
      if (!res.ok) return toast(res.error);
      setEditingWordId(null);
      await refresh(keepSelection);
    });
  };

  const moveWord = (id: string, categoryId: string) => {
    run(async () => {
      const res = await ninjaWordMove(id, categoryId);
      if (!res.ok) return toast(res.error);
      const label = categories.find((c) => c.id === categoryId)?.label ?? "";
      toast(`کلمه به «${label}» منتقل شد.`, "success");
      await refresh(keepSelection);
    });
  };

  const deleteWord = (id: string) => {
    run(async () => {
      const res = await ninjaWordDelete(id);
      if (!res.ok) return toast(res.error);
      await refresh(keepSelection);
    });
  };

  return (
    <div dir="rtl" className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">مدیریت نینجای دستور زبان</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          هر نقش (قید، صفت، حرف ربط…) یک دور بازی است و کلماتش همان‌هایی‌اند که
          باید برش زده شوند. کلماتِ نقش‌های دیگر خودبه‌خود طعمهٔ این نقش می‌شوند.
        </p>
      </div>

      {categories.length === 0 && !categoryDraft && (
        <div className="mb-5 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm">
          هنوز هیچ نقشی ساخته نشده، پس بازی با چهار نقشِ پیش‌فرضِ سایت (قید، صفت،
          حرف ربط و ضمیر) کار می‌کند. به‌محض ساختن اولین نقش، بازی فقط همین‌جا را
          می‌خواند.
        </div>
      )}

      {/* نقش‌ها */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">نقش‌ها</span>
        <button
          onClick={() => setCategoryDraft({ label: "", hint: "", enabled: true })}
          className="min-h-9 rounded-lg border border-border bg-card px-3 text-sm hover:border-primary/50"
        >
          + نقش تازه
        </button>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelectedId(c.id);
              setCategoryDraft(null);
              setConfirmDeleteCategory(false);
              setEditingWordId(null);
            }}
            className={`flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors ${
              selectedId === c.id
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
          >
            <span>{c.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                selectedId === c.id ? "bg-primary-foreground/20" : "bg-muted"
              }`}
            >
              {fa(c.words.length)}
            </span>
            {!c.enabled && (
              <span className="rounded-full bg-muted-foreground/20 px-2 py-0.5 text-[10px]">
                خاموش
              </span>
            )}
          </button>
        ))}
      </div>

      {/* فرم نقش */}
      {categoryDraft && (
        <div className="mb-5 rounded-2xl border border-primary/40 bg-primary/5 p-4">
          <h3 className="mb-3 font-bold">
            {categoryDraft.id ? "ویرایش نقش" : "نقش تازه"}
          </h3>
          <div className="grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">نام نقش</span>
              <input
                value={categoryDraft.label}
                onChange={(e) =>
                  setCategoryDraft({ ...categoryDraft, label: e.target.value })
                }
                className="min-h-10 rounded-xl border border-border bg-card px-3"
                placeholder="مثلاً: حرف اضافه"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">
                توضیح (در صفحهٔ مرورِ بازی نشان داده می‌شود)
              </span>
              <textarea
                value={categoryDraft.hint}
                onChange={(e) =>
                  setCategoryDraft({ ...categoryDraft, hint: e.target.value })
                }
                rows={2}
                className="rounded-xl border border-border bg-card px-3 py-2"
                placeholder="کلماتی که نسبتِ اسم را با فعل مشخص می‌کنند."
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={categoryDraft.enabled}
                onChange={(e) =>
                  setCategoryDraft({ ...categoryDraft, enabled: e.target.checked })
                }
                className="size-4"
              />
              <span>در بازی قابل انتخاب باشد</span>
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={saveCategory}
              disabled={pending}
              className="min-h-10 rounded-xl bg-primary px-5 font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
            >
              {pending ? "در حال ذخیره…" : "ذخیره"}
            </button>
            <button
              onClick={() => setCategoryDraft(null)}
              className="min-h-10 rounded-xl border border-border bg-card px-5 font-medium text-muted-foreground transition-all hover:border-primary/50"
            >
              انصراف
            </button>
          </div>
        </div>
      )}

      {/* کلماتِ نقشِ انتخاب‌شده */}
      {selected && !categoryDraft && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-bold">{selected.label}</h2>
              <p className="text-xs text-muted-foreground">
                {selected.hint || "بدون توضیح"}
              </p>
              {selected.enabled && selected.words.length === 0 && (
                <p className="mt-1 text-xs text-destructive">
                  این نقش فعال است ولی کلمه‌ای ندارد، پس در بازی نشان داده نمی‌شود.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() =>
                  setCategoryDraft({
                    id: selected.id,
                    label: selected.label,
                    hint: selected.hint,
                    enabled: selected.enabled,
                  })
                }
                className="min-h-9 rounded-lg border border-border px-3 text-sm hover:border-primary/50"
              >
                ویرایش نقش
              </button>
              {confirmDeleteCategory ? (
                <>
                  <button
                    onClick={deleteCategory}
                    disabled={pending}
                    className="min-h-9 rounded-lg bg-destructive px-3 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                  >
                    حذف با {fa(selected.words.length)} کلمه
                  </button>
                  <button
                    onClick={() => setConfirmDeleteCategory(false)}
                    className="min-h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground"
                  >
                    انصراف
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmDeleteCategory(true)}
                  className="min-h-9 rounded-lg border border-border px-3 text-sm text-destructive hover:bg-destructive/10"
                >
                  حذف نقش
                </button>
              )}
            </div>
          </div>

          {/* افزودن کلمه — چندتایی، چون کسی یک قید را تنها وارد نمی‌کند */}
          <div className="mb-4 flex flex-col gap-2">
            <textarea
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
              placeholder="کلمه‌ها را با ویرگول یا خط تازه از هم جدا کن: ناگهان، هرگز، دیشب"
            />
            <div>
              <button
                onClick={addWords}
                disabled={pending || !wordsText.trim()}
                className="min-h-10 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-90 disabled:opacity-50"
              >
                افزودن به «{selected.label}»
              </button>
            </div>
          </div>

          {/* فهرست کلمات */}
          {selected.words.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز کلمه‌ای در این نقش نیست.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {selected.words.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
                >
                  {editingWordId === w.id ? (
                    <>
                      <input
                        value={editingWordText}
                        onChange={(e) => setEditingWordText(e.target.value)}
                        className="min-h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => renameWord(w.id)}
                        disabled={pending}
                        className="min-h-9 rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
                      >
                        ذخیره
                      </button>
                      <button
                        onClick={() => setEditingWordId(null)}
                        className="min-h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground"
                      >
                        انصراف
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {w.word}
                      </span>

                      {/* ارجاع کلمه به نقشی دیگر — همان «این قید نبود، صفت بود» */}
                      {categories.length > 1 && (
                        <select
                          value=""
                          onChange={(e) => e.target.value && moveWord(w.id, e.target.value)}
                          disabled={pending}
                          className="min-h-9 rounded-lg border border-border bg-card px-2 text-xs text-muted-foreground"
                          aria-label={`انتقال «${w.word}» به نقش دیگر`}
                        >
                          <option value="">انتقال به نقش…</option>
                          {categories
                            .filter((c) => c.id !== selected.id)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.label}
                              </option>
                            ))}
                        </select>
                      )}

                      <button
                        onClick={() => {
                          setEditingWordId(w.id);
                          setEditingWordText(w.word);
                        }}
                        className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-primary/50"
                      >
                        ویرایش
                      </button>
                      <button
                        onClick={() => deleteWord(w.id)}
                        disabled={pending}
                        className="min-h-9 rounded-lg border border-border px-3 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        حذف
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
