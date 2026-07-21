"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export type VocabMistake = {
  key: string;
  word: string;
  meaning: string;
  image: string;
  wrongCount: number;
  lastMissed: string; // formatted Jalali date
};

export type VocabMistakeGroup = {
  key: string; // `${grade}:${lesson}`
  gradeLabel: string;
  lessonLabel: string;
  mistakes: VocabMistake[];
};

export default function VocabMistakesSection({ groups }: { groups: VocabMistakeGroup[] }) {
  // every lesson starts expanded so the student sees all their words at once
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.map((g) => g.key)));

  if (groups.length === 0) {
    return (
      <div className="glass relative z-20 rounded-xl p-6 text-center text-sm text-muted-foreground">
        هنوز در بازیِ واژه‌یاب کلمه‌ای را اشتباه نزده‌ای — عالیه! 🎉
      </div>
    );
  }

  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => {
        const isOpen = open.has(g.key);
        return (
          <div key={g.key} className="glass relative z-20 overflow-hidden rounded-2xl">
            {/* lesson header — click to collapse/expand */}
            <button
              onClick={() => toggle(g.key)}
              className="flex w-full items-center gap-3 p-4 text-right transition-colors hover:bg-foreground/[0.03]"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-xl">
                📖
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold">
                  {g.gradeLabel} · {g.lessonLabel}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {g.mistakes.length.toLocaleString("fa-IR")} واژه برای مرور
                </p>
              </div>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
                  isOpen ? "rotate-180" : ""
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-2 border-t border-border p-3 sm:grid-cols-2">
                    {g.mistakes.map((m) => (
                      <div
                        key={m.key}
                        className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-2.5 text-right"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {m.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.image} alt="" className="absolute inset-0 size-full object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-xl">🖼️</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="font-black text-primary">{m.word}</h5>
                            <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                              {m.wrongCount.toLocaleString("fa-IR")} بار
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{m.meaning}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
