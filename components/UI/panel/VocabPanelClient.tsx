"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { VocabAnswer } from "@/lib/panel/types";
import { clock, fa, groupIntoSessions, jalaliLong, pct, relativeDay } from "@/lib/panel/format";
import { vocabImageUrl } from "@/lib/vocab-image";
import { Card, ScoreBar } from "@/components/UI/panel/primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

const GRADE_LABEL: Record<string, string> = {
  dahom: "دهم",
  yazdahom: "یازدهم",
  davazdahom: "دوازدهم",
};

type Tab = "sessions" | "words";

/** واژه‌یاب history: the rounds you played, and a searchable index of every
 *  word you have ever been shown. */
export default function VocabPanelClient({
  answers,
}: {
  answers: VocabAnswer[];
}) {
  const [tab, setTab] = useState<Tab>("sessions");
  const [query, setQuery] = useState("");
  const [onlyWrong, setOnlyWrong] = useState(false);
  const [openSession, setOpenSession] = useState<number | null>(0);

  const sessions = useMemo(
    () => groupIntoSessions(answers, (a) => a.answeredAt),
    [answers],
  );

  /** One row per distinct word, carrying its whole history. */
  const words = useMemo(() => {
    const map = new Map<
      string,
      {
        word: string;
        meaning: string;
        image: string;
        grade: string;
        lesson: number | null;
        seen: number;
        right: number;
        lastAt: string;
        lastOk: boolean;
      }
    >();
    for (const a of answers) {
      const row = map.get(a.word);
      if (!row) {
        map.set(a.word, {
          word: a.word,
          meaning: a.meaning,
          image: a.image,
          grade: a.grade,
          lesson: a.lesson,
          seen: 1,
          right: a.isCorrect ? 1 : 0,
          // answers arrive newest-first, so the first one seen is the latest
          lastAt: a.answeredAt,
          lastOk: a.isCorrect,
        });
      } else {
        row.seen += 1;
        if (a.isCorrect) row.right += 1;
      }
    }
    return [...map.values()];
  }, [answers]);

  const filteredWords = useMemo(() => {
    const q = query.trim();
    let out = words;
    if (q) {
      out = out.filter(
        (w) => w.word.includes(q) || w.meaning.includes(q),
      );
    }
    if (onlyWrong) out = out.filter((w) => !w.lastOk);
    return out.sort((a, b) => Date.parse(b.lastAt) - Date.parse(a.lastAt));
  }, [words, query, onlyWrong]);

  return (
    <>
      {/* tabs */}
      <div className="mt-6 mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["sessions", `آزمون‌های گذشته (${fa(sessions.length)})`],
            ["words", `واژه‌ها (${fa(words.length)})`],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
              tab === id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sessions" ? (
        <ul className="space-y-3">
          {sessions.map((session, si) => {
            const right = session.filter((a) => a.isCorrect).length;
            const open = openSession === si;
            const lessons = [
              ...new Set(session.map((a) => a.lesson).filter(Boolean)),
            ].sort((a, b) => (a as number) - (b as number));
            return (
              <li key={si}>
                <Card index={si} className="overflow-hidden">
                  <button
                    onClick={() => setOpenSession(open ? null : si)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 p-4 text-right"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-black text-foreground">
                          {relativeDay(session[0].answeredAt)}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {jalaliLong(session[0].answeredAt)} — ساعت{" "}
                          {clock(session[0].answeredAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        پایهٔ {GRADE_LABEL[session[0].grade] ?? session[0].grade}
                        {lessons.length
                          ? ` — درس ${lessons.map((l) => fa(l as number)).join("، ")}`
                          : ""}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <ScoreBar correct={right} total={session.length} />
                        </div>
                        <span className="shrink-0 text-xs font-bold text-muted-foreground">
                          {fa(right)}/{fa(session.length)} — {pct(right, session.length)}
                        </span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                      className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <ul className="grid gap-2 border-t border-border p-4 sm:grid-cols-2">
                          {[...session].reverse().map((a, n) => (
                            <li
                              key={a.id}
                              className={`flex items-center gap-3 rounded-xl border p-2.5 ${
                                a.isCorrect
                                  ? "border-green-500/40 bg-green-500/5"
                                  : "border-destructive/40 bg-destructive/5"
                              }`}
                            >
                              <span className="shrink-0 text-[11px] font-black text-muted-foreground">
                                {fa(n + 1)}
                              </span>
                              {a.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={vocabImageUrl(a.image)}
                                  alt=""
                                  loading="lazy"
                                  className="size-11 shrink-0 rounded-lg object-cover"
                                />
                              ) : null}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-bold text-foreground">
                                  {a.word}
                                </span>
                                <span className="block truncate text-[11px] text-muted-foreground">
                                  {a.meaning}
                                </span>
                              </span>
                              <span
                                aria-hidden
                                className={`ms-auto shrink-0 text-sm ${
                                  a.isCorrect
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-destructive"
                                }`}
                              >
                                {a.isCorrect ? "✓" : "✕"}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          {/* search */}
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="جست‌وجو در واژه‌ها و معنی‌ها…"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 pe-10 text-sm text-foreground outline-none transition-colors focus:border-primary"
                />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted-foreground"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
                </svg>
              </div>
              <button
                onClick={() => setOnlyWrong((v) => !v)}
                aria-pressed={onlyWrong}
                className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                  onlyWrong
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                فقط اشتباه‌ها
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {fa(filteredWords.length)} واژه
            </p>
          </Card>

          {filteredWords.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                واژه‌ای با این جست‌وجو پیدا نشد.
              </p>
            </Card>
          ) : (
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {filteredWords.map((w, i) => (
                <li key={w.word}>
                  <Card index={i} className="flex items-center gap-3 p-3">
                    {w.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={vocabImageUrl(w.image)}
                        alt=""
                        loading="lazy"
                        className="size-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                        📘
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="truncate text-sm font-black text-foreground">
                          {w.word}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            w.lastOk
                              ? "bg-green-500/15 text-green-700 dark:text-green-400"
                              : "bg-destructive/15 text-destructive"
                          }`}
                        >
                          {w.lastOk ? "یادگرفته" : "نیاز به مرور"}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        {w.meaning}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {fa(w.right)} از {fa(w.seen)} بار درست ·{" "}
                        {relativeDay(w.lastAt)}
                        {w.lesson ? ` · درس ${fa(w.lesson)}` : ""}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
