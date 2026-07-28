"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import { removeBookmark } from "@/lib/panel/bookmarks-client";
import { jalali } from "@/lib/panel/format";
import { VOCAB_GRADES } from "@/lib/vocab-data";
import { vocabImageUrl } from "@/lib/vocab-image";
import type { Bookmark } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

const GRADE_TITLE: Record<string, string> = Object.fromEntries(
  VOCAB_GRADES.map((g) => [g.id, g.title]),
);

type Item = {
  id: string;
  word: string;
  meaning: string;
  image: string;
  scope: string;
  createdAt: string;
};

/** واژه‌های نشان‌شده, with a search box.
 *
 *  The picture and the meaning come from the bookmark's own payload, so a word
 *  stays reviewable exactly as it was flagged even if the word bank changes. */
export default function VocabBookmarks({
  bookmarks,
}: {
  bookmarks: Bookmark[];
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const items: Item[] = useMemo(
    () =>
      bookmarks
        .filter((b) => !removed.includes(b.id))
        .map((b) => {
          const p = (b.payload ?? {}) as Record<string, unknown>;
          const grade = (p.grade as string) ?? "";
          const lesson = p.lesson as number | null;
          return {
            id: b.id,
            word: b.title,
            meaning: b.subtitle ?? "",
            image: (p.image as string) ?? "",
            scope: [
              GRADE_TITLE[grade] ?? grade,
              lesson ? `درس ${toFa(lesson)}` : "",
            ]
              .filter(Boolean)
              .join(" · "),
            createdAt: b.createdAt,
          };
        }),
    [bookmarks, removed],
  );

  const needle = q.trim();
  const shown = needle
    ? items.filter(
        (i) => i.word.includes(needle) || i.meaning.includes(needle),
      )
    : items;

  if (!items.length) {
    return (
      <div className=" mt-3 rounded-2xl bg-card p-6 text-center shadow sm:p-8">
        <p className=" text-muted-foreground">
          هنوز واژه‌ای نشان نکرده‌ای. بعد از پاسخ‌دادن به هر واژه در بازی، دکمهٔ
          «نشان‌کردن» را بزن تا همین‌جا بماند.
        </p>
      </div>
    );
  }

  return (
    <div className=" mt-3">
      <div className=" relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جست‌وجو بین واژه‌های نشان‌شده…"
          className=" w-full rounded-2xl border border-border bg-card py-3 pe-11 ps-4 text-sm outline-none transition-colors focus:border-primary/60"
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden
          className=" pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>

      {!shown.length ? (
        <p className=" mt-4 text-center text-sm text-muted-foreground">
          واژه‌ای با «{needle}» پیدا نشد.
        </p>
      ) : (
        <div className=" mt-3 flex flex-col gap-y-3">
          {shown.map((item) => (
            <BookmarkRow
              key={item.id}
              item={item}
              open={openId === item.id}
              onToggle={() =>
                setOpenId((id) => (id === item.id ? null : item.id))
              }
              onRemove={() => setRemoved((r) => [...r, item.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookmarkRow({
  item,
  open,
  onToggle,
  onRemove,
}: {
  item: Item;
  open: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await removeBookmark(item.id);
      onRemove();
    } catch (err) {
      console.error("removeBookmark:", err);
      setBusy(false);
    }
  };

  return (
    <div className=" rounded-2xl bg-card p-3 shadow">
      <div className=" flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className=" flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-right"
        >
          <span className=" size-11 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary sm:size-12">
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vocabImageUrl(item.image)}
                alt=""
                loading="lazy"
                className=" size-full object-cover"
              />
            ) : (
              <span className=" flex size-full items-center justify-center text-lg">
                🖼️
              </span>
            )}
          </span>
          <span className=" min-w-0">
            <span className=" block truncate font-bold">{item.word}</span>
            <span className=" flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {item.scope && <span>{item.scope}</span>}
              <span className=" opacity-70">{jalali(item.createdAt)}</span>
            </span>
          </span>
        </button>

        <div className=" flex shrink-0 items-center gap-x-1">
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            title="برداشتنِ نشان"
            aria-label="برداشتنِ نشان"
            className=" cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.2v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-hidden
            tabIndex={-1}
            className=" cursor-pointer p-1"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className={`size-4 text-muted-foreground transition-transform duration-300 ${
                open ? "rotate-180" : ""
              }`}
            >
              <path
                fillRule="evenodd"
                d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className=" overflow-hidden"
          >
            <div className=" mt-3 rounded-2xl bg-secondary p-3 sm:p-4">
              {item.image && (
                <div className=" relative z-20 mx-auto aspect-[4/3] w-full max-w-sm overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={vocabImageUrl(item.image)}
                    alt={item.word}
                    loading="lazy"
                    className=" absolute inset-0 size-full object-cover"
                  />
                </div>
              )}
              <div className=" mx-auto mt-4 max-w-sm rounded-2xl border-2 border-primary bg-primary/10 px-4 py-3 text-center text-lg font-bold text-primary">
                {item.word}
              </div>
              {item.meaning && (
                <p className=" mx-auto mt-3 max-w-sm rounded-2xl border border-border bg-card p-3 text-sm leading-relaxed">
                  {item.meaning}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
