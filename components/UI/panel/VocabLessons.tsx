"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AnimatedTabs } from "@/components/UI/kit/animated-tabs";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { MasteryChip } from "./skill/SkillMap";
import { LESSON_TITLES } from "@/lib/doroos/catalog";
import { VOCAB_GRADES, type VocabGrade } from "@/lib/vocab-data";
import { fa, relativeDay } from "@/lib/panel/format";
import { cn } from "@/lib/cn";

export type LessonWord = {
  grade: string;
  lesson: number;
  word: string;
  total: number;
  correct: number;
  lastOk: boolean;
  lastAt: string;
};

type GradeId = VocabGrade["id"];
const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * واژه‌یاب به تفکیکِ پایه و درس.
 *
 * هر درس یک کاشی است: حلقه دقت است و زیرش چند واژه از بانکِ همان درس را
 * دیده‌ای. با زدنِ کاشی واژه‌های همان درس باز می‌شوند؛ واژه‌ای که آخرین
 * بار غلط زده‌ای قرمز است، چون همان را باید مرور کنی.
 */
export default function VocabLessons({
  words,
  totals,
}: {
  words: LessonWord[];
  totals: { grade: string; lesson: number; words: number }[];
}) {
  // پایه‌ای که آخرین بار تمرین شده، باز است.
  const initialGrade = useMemo<GradeId>(() => {
    const last = words.reduce<LessonWord | null>((m, w) => (!m || w.lastAt > m.lastAt ? w : m), null);
    return (VOCAB_GRADES.find((g) => g.id === last?.grade)?.id ?? "dahom") as GradeId;
  }, [words]);
  const [grade, setGrade] = useState<GradeId>(initialGrade);
  const [open, setOpen] = useState<number | null>(null);

  const book = VOCAB_GRADES.find((g) => g.id === grade) ?? VOCAB_GRADES[0];
  const lessons = book.lessons.map((l) => {
    const list = words.filter((w) => w.grade === grade && w.lesson === l.number);
    const total = list.reduce((n, w) => n + w.total, 0);
    const correct = list.reduce((n, w) => n + w.correct, 0);
    const bank = totals.find((t) => t.grade === grade && t.lesson === l.number)?.words ?? 0;
    return { ...l, list, total, correct, bank };
  });
  const selected = lessons.find((l) => l.number === open && l.list.length) ?? null;

  return (
    <div className="mt-4">
      <AnimatedTabs
        label="پایه"
        value={grade}
        onChange={(g) => {
          setGrade(g);
          setOpen(null);
        }}
        tabs={VOCAB_GRADES.map((g) => ({
          value: g.id,
          label: g.title,
          hint: fa(new Set(words.filter((w) => w.grade === g.id).map((w) => w.word)).size || ""),
        }))}
      />

      <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {lessons.map((l, i) => {
          const played = l.list.length > 0;
          const active = selected?.number === l.number;
          return (
            <motion.li
              key={`${grade}-${l.number}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.02, ease: EASE }}
              className="list-none"
            >
              <button
                type="button"
                disabled={!played}
                aria-expanded={played ? active : undefined}
                onClick={() => setOpen(active ? null : l.number)}
                title={LESSON_TITLES[grade]?.[l.number]}
                className={cn(
                  "flex h-full w-full flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-[border-color,background-color,transform]",
                  played
                    ? "border-border/70 bg-card hover:-translate-y-0.5 hover:border-primary/50"
                    : "cursor-default border-dashed border-border/60 bg-transparent opacity-55",
                  active && "border-primary bg-primary/8",
                )}
              >
                <span className="text-[11.5px] text-muted-foreground">درس {fa(l.number)}</span>
                {l.free ? (
                  <span className="grid size-12 place-items-center text-[12px] text-muted-foreground">آزاد</span>
                ) : (
                  <AnimatedCircularProgress
                    value={l.total ? Math.round((l.correct / l.total) * 100) : 0}
                    ready={played}
                    className="size-12"
                  />
                )}
                <span className="panel-num text-[11px] text-muted-foreground">
                  {l.free ? "—" : l.bank ? `${fa(l.list.length)}/${fa(l.bank)} واژه` : played ? `${fa(l.list.length)} واژه` : "—"}
                </span>
              </button>
            </motion.li>
          );
        })}
      </ul>

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={`${grade}-${selected.number}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/[0.04] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">
                  درس {fa(selected.number)}
                  {LESSON_TITLES[grade]?.[selected.number] && ` · ${LESSON_TITLES[grade][selected.number]}`}
                </h3>
                <MasteryChip total={selected.total} correct={selected.correct} />
              </div>
              <p className="panel-num mt-1 text-[12px] text-muted-foreground">
                {fa(selected.correct)} از {fa(selected.total)} پاسخ درست · آخرین تمرین{" "}
                {relativeDay(selected.list.reduce((m, w) => (w.lastAt > m ? w.lastAt : m), ""))}
              </p>

              <ul className="mt-3 flex flex-wrap gap-1.5">
                {[...selected.list]
                  .sort((a, b) => Number(a.lastOk) - Number(b.lastOk) || a.correct / a.total - b.correct / b.total)
                  .map((w) => (
                    <li
                      key={w.word}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px]",
                        w.lastOk
                          ? "border-primary/30 bg-primary/8"
                          : "border-destructive/35 bg-destructive/8 text-destructive",
                      )}
                    >
                      {w.word}
                      <span className="panel-num text-[11px] opacity-70">
                        {fa(w.correct)}/{fa(w.total)}
                      </span>
                    </li>
                  ))}
              </ul>
              <p className="mt-3 flex items-center gap-4 text-[11.5px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-primary" /> آخرین بار درست
                </span>
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="size-2 rounded-full bg-destructive" /> آخرین بار غلط
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
