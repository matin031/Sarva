"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { apiDelete, apiPatch } from "@/lib/api/client";
import { AREA_LABEL, type Bookmark, type BookmarkArea } from "@/lib/panel/types";

/**
 * همهٔ نشان‌شده‌ها، یک‌جا.
 *
 * تا امروز نشان‌شده‌ها فقط داخل صفحهٔ هر بخش دیده می‌شدند (عروض و واژه‌یاب)، و
 * نشان‌شده‌های امتحان و جاسوس اصلاً هیچ‌جا نمایش داده نمی‌شدند — با اینکه
 * ذخیره می‌شدند و `getBookmarks` از روز اول همه‌شان را بی‌فیلتر برمی‌گرداند.
 * یعنی قابلیتی که داده و کوئری‌اش کامل بود ولی صفحه نداشت.
 *
 * راهِ رسیدن به این صفحه، کارتِ «نشان‌شده» در نمای کلی است — منوی پنل عمداً
 * دست‌نخورده مانده.
 */

const AREA_HREF: Record<BookmarkArea, string> = {
  aruz: "/panel/aruz",
  vocab: "/panel/vocab",
  exam: "/panel/exam",
  jasoos: "/panel/jasoos",
};

const AREA_TONE: Record<BookmarkArea, string> = {
  aruz: "bg-primary/10 text-primary",
  vocab: "bg-gold/15 text-gold",
  exam: "bg-lapis-light/15 text-lapis-light",
  jasoos: "bg-muted text-muted-foreground",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AllBookmarks({ initial }: { initial: Bookmark[] }) {
  const [items, setItems] = useState(initial);
  const [area, setArea] = useState<BookmarkArea | "">("");
  const [query, setQuery] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // شمارش هر حوزه از روی خودِ داده — نه یک عدد جدا که می‌تواند از آن بیفتد.
  const counts = useMemo(() => {
    const c = { aruz: 0, vocab: 0, exam: 0, jasoos: 0 } as Record<BookmarkArea, number>;
    for (const b of items) c[b.area]++;
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((b) => {
      if (area && b.area !== area) return false;
      if (!needle) return true;
      return (
        b.title.toLowerCase().includes(needle) ||
        (b.subtitle ?? "").toLowerCase().includes(needle) ||
        (b.note ?? "").toLowerCase().includes(needle)
      );
    });
  }, [items, area, query]);

  const remove = (bookmark: Bookmark) => {
    // حذفِ خوش‌بینانه: ردیف بلافاصله می‌رود و اگر سرور خطا داد برمی‌گردد.
    // برای کاری که کاربر خودش الان انجام داده، انتظار کشیدن برای شبکه اضافه است.
    setItems((prev) => prev.filter((b) => b.id !== bookmark.id));
    setError(null);

    startTransition(async () => {
      const result = await apiDelete("/api/v1/bookmarks", { id: bookmark.id });
      if (!result.ok) {
        setItems((prev) =>
          [...prev, bookmark].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setError(result.errors.join("\n"));
      }
    });
  };

  const saveNote = (bookmark: Bookmark) => {
    const note = noteDraft.trim();
    setEditingNote(null);
    setError(null);

    startTransition(async () => {
      const result = await apiPatch("/api/v1/bookmarks", { id: bookmark.id, note });
      if (!result.ok) {
        setError(result.errors.join("\n"));
        return;
      }
      setItems((prev) => prev.map((b) => (b.id === bookmark.id ? { ...b, note: note || null } : b)));
    });
  };

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <p className="font-semibold">هنوز چیزی نشان نکرده‌ای</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          هر جای سایت که دکمهٔ نشان را ببینی می‌توانی سؤال یا واژه‌ای را ذخیره کنی تا بعداً
          همین‌جا پیدایش کنی.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {(Object.keys(AREA_LABEL) as BookmarkArea[]).map((a) => (
            <Link
              key={a}
              href={AREA_HREF[a]}
              className="min-h-10 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {AREA_LABEL[a]}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setArea("")}
          className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
            area === "" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
          }`}
        >
          همه ({items.length.toLocaleString("fa-IR")})
        </button>
        {(Object.keys(AREA_LABEL) as BookmarkArea[])
          .filter((a) => counts[a] > 0)
          .map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => setArea(a)}
              className={`min-h-10 rounded-full border px-4 text-sm transition-colors ${
                area === a ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
              }`}
            >
              {AREA_LABEL[a]} ({counts[a].toLocaleString("fa-IR")})
            </button>
          ))}
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="جست‌وجو در نشان‌شده‌ها و یادداشت‌ها…"
        className="min-h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
      />

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          چیزی با این جست‌وجو پیدا نشد.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((b) => (
            <li key={b.id} className="glass flex flex-col gap-3 rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <span className={`rounded-lg px-2 py-0.5 text-[11px] font-medium ${AREA_TONE[b.area]}`}>
                    {AREA_LABEL[b.area]}
                  </span>
                  <p className="mt-2 font-semibold leading-relaxed">{b.title}</p>
                  {b.subtitle && (
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.subtitle}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-muted-foreground">{formatDate(b.createdAt)}</time>
              </div>

              {editingNote === b.id ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    autoFocus
                    placeholder="یادداشت خودت را بنویس…"
                    className="rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => saveNote(b)}
                      className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      ذخیرهٔ یادداشت
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingNote(null)}
                      className="min-h-10 rounded-xl border border-border px-4 text-sm text-muted-foreground"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {b.note && (
                    <p className="rounded-xl border-r-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm leading-relaxed">
                      {b.note}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNote(b.id);
                        setNoteDraft(b.note ?? "");
                      }}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {b.note ? "ویرایش یادداشت" : "افزودن یادداشت"}
                    </button>
                    <Link
                      href={AREA_HREF[b.area]}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      رفتن به {AREA_LABEL[b.area]}
                    </Link>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => remove(b)}
                      className="text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
                    >
                      برداشتن نشان
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
