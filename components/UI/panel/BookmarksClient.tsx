"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AREA_LABEL, type Bookmark, type BookmarkArea } from "@/lib/panel/types";
import { fa, relativeDay } from "@/lib/panel/format";
import { removeBookmark, setBookmarkNote } from "@/lib/panel/bookmarks-client";
import { vocabImageUrl } from "@/lib/vocab-image";
import { Card } from "@/components/UI/panel/primitives";

const AREA_TOKEN: Record<BookmarkArea, string> = {
  aruz: "--color-primary",
  vocab: "--color-gold",
  exam: "--color-lapis-light",
  jasoos: "--color-lapis-light",
};

/** Bookmarks, filterable by area and searchable, each with an editable note. */
export default function BookmarksClient({
  bookmarks,
}: {
  bookmarks: Bookmark[];
}) {
  const [items, setItems] = useState(bookmarks);
  const [area, setArea] = useState<BookmarkArea | "all">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const counts = useMemo(() => {
    const m = new Map<BookmarkArea, number>();
    for (const b of items) m.set(b.area, (m.get(b.area) ?? 0) + 1);
    return m;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim();
    return items.filter(
      (b) =>
        (area === "all" || b.area === area) &&
        (!q ||
          b.title.includes(q) ||
          (b.subtitle ?? "").includes(q) ||
          (b.note ?? "").includes(q)),
    );
  }, [items, area, query]);

  const drop = async (id: string) => {
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      await removeBookmark(id);
    } catch {
      setItems(before);
    }
  };

  const saveNote = async (id: string) => {
    const note = draft.trim();
    setItems((xs) =>
      xs.map((x) => (x.id === id ? { ...x, note: note || null } : x)),
    );
    setEditing(null);
    try {
      await setBookmarkNote(id, note);
    } catch {
      /* the list still shows what the student typed; a reload will correct it */
    }
  };

  return (
    <>
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "aruz", "vocab", "jasoos", "exam"] as const).map((a) => {
            const active = area === a;
            const n = a === "all" ? items.length : (counts.get(a) ?? 0);
            if (a !== "all" && n === 0) return null;
            return (
              <button
                key={a}
                onClick={() => setArea(a)}
                aria-pressed={active}
                className={`rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                {a === "all" ? "همه" : AREA_LABEL[a]} ({fa(n)})
              </button>
            );
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجو در نشان‌شده‌ها…"
          className="mt-3 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary"
        />
      </Card>

      {shown.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            چیزی با این فیلتر پیدا نشد.
          </p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {shown.map((b, i) => {
              const image = typeof b.payload?.image === "string" ? b.payload.image : "";
              return (
                <motion.li
                  key={b.id}
                  layout
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card index={i} className="h-full p-4">
                    <div className="flex items-start gap-3">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={vocabImageUrl(image)}
                          alt=""
                          loading="lazy"
                          className="size-14 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-black"
                            style={{
                              color: `var(${AREA_TOKEN[b.area]})`,
                              background: `color-mix(in oklch, var(${AREA_TOKEN[b.area]}) 15%, transparent)`,
                            }}
                          >
                            {AREA_LABEL[b.area]}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {relativeDay(b.createdAt)}
                          </span>
                        </div>
                        <h3 className="mt-2 text-sm font-black text-foreground">
                          {b.title}
                        </h3>
                        {b.subtitle && (
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {b.subtitle}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => drop(b.id)}
                        aria-label="برداشتنِ نشان"
                        className="shrink-0 rounded-full border border-border p-1.5 text-muted-foreground transition-colors hover:border-destructive/50 hover:text-destructive"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* note */}
                    <div className="mt-3 border-t border-border pt-3">
                      {editing === b.id ? (
                        <div className="flex flex-wrap gap-2">
                          <input
                            autoFocus
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNote(b.id);
                              if (e.key === "Escape") setEditing(null);
                            }}
                            placeholder="یادداشتت دربارهٔ این سؤال…"
                            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                          />
                          <button
                            onClick={() => saveNote(b.id)}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                          >
                            ذخیره
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditing(b.id);
                            setDraft(b.note ?? "");
                          }}
                          className="w-full text-right text-[11px] text-muted-foreground transition-colors hover:text-primary"
                        >
                          {b.note ? `📝 ${b.note}` : "افزودنِ یادداشت…"}
                        </button>
                      )}
                    </div>
                  </Card>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}
