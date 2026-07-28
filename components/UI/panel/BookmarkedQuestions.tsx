"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toFa } from "@/components/UI/CircularProgress";
import QuizStyleQuestion, {
  type ReviewQuestion,
} from "@/components/UI/panel/QuizStyleQuestion";
import { removeBookmark } from "@/lib/panel/bookmarks-client";
import { jalali } from "@/lib/panel/format";
import { ARUZ_TYPE_LABEL } from "@/lib/panel/types";
import type { Bookmark } from "@/lib/panel/types";

const EASE = [0.16, 1, 0.3, 1] as const;

type Item = {
  id: string;
  title: string;
  subtitle: string | null;
  createdAt: string;
  question: ReviewQuestion;
  demo?: boolean;
};

/** A stand-in so the section can be judged before anything is flagged. It is
 *  labelled as a sample and cannot be removed — nothing about it touches the
 *  database. It disappears the moment a real bookmark exists. */
const DEMO: Item = {
  id: "demo",
  title: "یار بارافتاده را در کاروان بگذاشتند",
  subtitle: ARUZ_TYPE_LABEL["poem-to-audio"],
  createdAt: new Date().toISOString(),
  demo: true,
  question: {
    id: "demo-q",
    type: "poem-to-audio",
    poem: [
      "یار بارافتاده را در کاروان بگذاشتند",
      "بی‌وفا یاران که بربستند بارِ خویش را",
    ],
    audioUrl: null,
    options: [
      { id: "d1", audioUrl: "/currectsound.mp3", isCorrect: false },
      { id: "d2", audioUrl: "/currectsound.mp3", isCorrect: true },
      { id: "d3", audioUrl: "/currectsound.mp3", isCorrect: false },
      { id: "d4", audioUrl: "/currectsound.mp3", isCorrect: false },
    ],
  },
};

/** سؤال‌های نشان‌شدهٔ عروض.
 *
 *  The question is rebuilt from the bookmark's own `payload`, not from a join
 *  back to the question bank: a flagged question should keep showing what the
 *  student actually saw, even after the bank is edited. */
export default function BookmarkedQuestions({
  bookmarks,
}: {
  bookmarks: Bookmark[];
}) {
  const [removed, setRemoved] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  const items: Item[] = bookmarks
    .filter((b) => !removed.includes(b.id))
    .map((b) => {
      const p = (b.payload ?? {}) as Record<string, unknown>;
      return {
        id: b.id,
        title: b.title,
        subtitle: b.subtitle,
        createdAt: b.createdAt,
        question: {
          id: b.refId,
          type: (p.type as ReviewQuestion["type"]) ?? null,
          poem: (p.poem as string[] | null) ?? null,
          audioUrl: (p.audioUrl as string | null) ?? null,
          options: Array.isArray(p.options)
            ? (p.options as ReviewQuestion["options"])
            : [],
        },
      };
    });

  const list = items.length ? items : [DEMO];

  return (
    <div className=" mt-3 flex flex-col gap-y-3">
      {!items.length && (
        <p className=" text-sm text-muted-foreground">
          هنوز سؤالی نشان نکرده‌ای. بالای هر سؤال در آزمون عروض، دکمهٔ
          «نشان‌کردن» را بزن تا همین‌جا بماند. نمونهٔ زیر فقط برای دیدنِ شکلِ کار
          است.
        </p>
      )}

      {list.map((item) => (
        <BookmarkRow
          key={item.id}
          item={item}
          open={openId === item.id}
          onToggle={() => setOpenId((id) => (id === item.id ? null : item.id))}
          onRemove={() => setRemoved((r) => [...r, item.id])}
        />
      ))}
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
    if (busy || item.demo) return;
    setBusy(true);
    try {
      await removeBookmark(item.id);
      onRemove();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className=" bg-card shadow rounded-xl p-3">
      <div className=" flex items-center justify-between gap-x-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className=" flex min-w-0 flex-1 cursor-pointer items-center gap-x-3 text-right"
        >
          <span className=" text-gold shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="size-6"
            >
              <path
                fillRule="evenodd"
                d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <span className=" min-w-0">
            <span className=" block truncate">{item.title}</span>
            <span className=" flex items-center gap-x-2 text-xs text-muted-foreground">
              {item.subtitle && <span>{item.subtitle}</span>}
              <span>{jalali(item.createdAt)}</span>
              {item.demo && (
                <span className=" rounded-full border border-gold/40 px-2 py-0.5 text-gold">
                  نمونهٔ آزمایشی
                </span>
              )}
            </span>
          </span>
        </button>

        <div className=" flex shrink-0 items-center gap-x-2">
          {!item.demo && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              title="برداشتنِ نشان"
              aria-label="برداشتنِ نشان"
              className=" cursor-pointer rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
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
          )}
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
              className={`size-4 transition-transform duration-300 ${
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
            <div dir="rtl" className=" bg-secondary p-4 mt-3 rounded-xl">
              {item.question.options.length ? (
                <>
                  <QuizStyleQuestion question={item.question} />
                  <p className=" mt-4 text-sm text-muted-foreground">
                    گزینهٔ درست با رنگ سبز مشخص شده است.
                  </p>
                </>
              ) : (
                <p className=" text-center text-muted-foreground py-6">
                  محتوای این سؤال ذخیره نشده است.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Small helper the page uses for the section's counter. */
export function bookmarkCountLabel(n: number): string {
  return n ? `${toFa(n)} سؤال` : "بدون سؤال";
}
