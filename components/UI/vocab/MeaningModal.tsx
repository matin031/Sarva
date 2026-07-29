"use client";
import { motion, AnimatePresence } from "motion/react";
import type { VocabWord } from "@/lib/vocab-data";
import { vocabImageUrl } from "@/lib/vocab-image";

/** Shared "learn the meaning" modal used by both واژه‌یاب modes. */
export default function MeaningModal({
  open,
  isCorrect,
  answer,
  others,
  continueLabel,
  onContinue,
  headline,
  note,
  secondaryLabel,
  onSecondary,
  dismissable = true,
}: {
  open: boolean;
  isCorrect: boolean;
  answer: VocabWord;
  others: VocabWord[];
  continueLabel: string;
  onContinue: () => void;
  headline?: string;
  note?: React.ReactNode;
  secondaryLabel?: string;
  onSecondary?: () => void;
  dismissable?: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center"
          onClick={dismissable ? onContinue : undefined}
        >
          <motion.div
            dir="rtl"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
          >
            {/* status ribbon */}
            <div
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold ${
                isCorrect
                  ? "bg-green-500/15 text-green-700 dark:text-green-400"
                  : "bg-destructive/15 text-destructive"
              }`}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-current/20 text-base">
                {isCorrect ? "✓" : "✗"}
              </span>
              {headline ?? (isCorrect ? "آفرین! درست بود" : "اشکالی ندارد، یاد بگیر")}
            </div>

            <div className="sarva-scroll max-h-[70vh] overflow-y-auto p-6">
              {/* the word */}
              <div className="flex items-start gap-4">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={vocabImageUrl(answer.image)} alt="" className="absolute inset-0 size-full object-cover" />
                </div>
                <div className="min-w-0 pt-1">
                  <p className="text-xs text-muted-foreground">واژه</p>
                  <h3 className="text-3xl font-black text-primary">{answer.word}</h3>
                </div>
              </div>

              {/* the meaning — the focus */}
              <div className="mt-4 rounded-2xl bg-primary/5 p-4">
                <p className="mb-1 text-xs font-semibold text-primary">معنی</p>
                <p className="text-lg leading-relaxed text-foreground">{answer.meaning}</p>
              </div>

              {note && <div className="mt-4">{note}</div>}

              {/* the other options, so nothing is left unlearned */}
              {others.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">واژه‌های دیگرِ این پرسش</p>
                  <div className="space-y-2">
                    {others.map((o) => (
                      <div key={o.id} className="rounded-xl border border-border bg-background/60 p-3">
                        <span className="font-bold text-foreground">{o.word}:</span>{" "}
                        <span className="text-sm text-muted-foreground">{o.meaning}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-border p-4">
              {secondaryLabel && onSecondary && (
                <button
                  onClick={onSecondary}
                  className="min-h-12 flex-1 rounded-2xl border border-border bg-card font-medium text-muted-foreground transition-all hover:border-primary/50 active:scale-95"
                >
                  {secondaryLabel}
                </button>
              )}
              <button
                onClick={onContinue}
                className="min-h-12 flex-[2] rounded-2xl bg-primary text-lg font-black text-primary-foreground transition-all hover:brightness-90 active:scale-95"
              >
                {continueLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
