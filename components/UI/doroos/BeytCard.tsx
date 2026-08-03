"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Beyt } from "@/lib/doroos/types";
import { REALMS } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";
import RealmPanel from "@/components/UI/doroos/RealmPanel";
import BeytExplorer from "@/components/UI/doroos/BeytExplorer";

const EASE = [0.16, 1, 0.3, 1] as const;

/** One بیت, fully annotated: the couplet itself, then معنی و مفهوم, then the
 *  three قلمروs side by side, then whatever extras the بیت carries. The exam
 *  question keeps its answer hidden until the reader asks — otherwise the eye
 *  reads the answer before the question. */
export default function BeytCard({ beyt }: { beyt: Beyt }) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <article id={`beyt-${beyt.n}`} className="relative z-20 scroll-mt-28">
      {/* ---------- the couplet ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 34 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-20 overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 shadow-xl sm:p-9"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 -top-20 size-56 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 22%, transparent), transparent)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 size-56 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 16%, transparent), transparent)",
          }}
        />

        <div className="relative z-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            بیت {faNum(beyt.n)}
          </span>

          <div className="mt-6">
            <BeytExplorer beyt={beyt}>
              {/* معنی و مفهوم */}
          <div className="mt-7 grid gap-3 sm:grid-cols-5">
            <div className="relative z-20 rounded-2xl border border-border bg-background p-4 sm:col-span-3">
              <h3 className="mb-1.5 text-xs font-black tracking-wide text-muted-foreground">
                معنی
              </h3>
              <p className="text-sm leading-relaxed text-foreground">
                {beyt.meaning}
              </p>
            </div>
            <div className="relative z-20 rounded-2xl border border-gold/30 bg-background p-4 sm:col-span-2">
              <h3 className="mb-1.5 text-xs font-black tracking-wide text-gold">
                مفهوم
              </h3>
              <p className="text-sm leading-relaxed font-bold text-foreground">
                {beyt.concept}
              </p>
            </div>
          </div>
            </BeytExplorer>
          </div>
        </div>
      </motion.div>

      {/* ---------- the three قلمروs ---------- */}
      {/* قلمرو فکری stays a panel: it is a paragraph about the بیت as a
          whole, with no words to point at, so there is nothing for the
          explorer to do with it. */}
      <div className="mt-4">
        <RealmPanel
          label={REALMS[2].label}
          token={REALMS[2].token}
          body={beyt.intellectual}
        />
      </div>

      {/* ---------- extras ---------- */}
      {beyt.affinity?.length ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative z-20 mt-4 rounded-2xl border border-gold/30 bg-card p-5"
        >
          <h3 className="mb-3 text-sm font-black text-gold">قرابت معنایی</h3>
          <ul className="space-y-2.5">
            {beyt.affinity.map((a, i) => (
              <li
                key={i}
                className="border-inline-start relative z-20 border-e-2 border-gold/40 pe-3 text-sm leading-relaxed text-foreground"
              >
                {a}
              </li>
            ))}
          </ul>
        </motion.section>
      ) : null}

      {beyt.notes?.length ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative z-20 mt-4 space-y-3 rounded-2xl border border-lapis-light/40 bg-card p-5"
        >
          {beyt.notes.map((note, i) => (
            <div key={i}>
              {note.label ? (
                <h3 className="mb-1 text-sm font-black text-lapis-light">
                  {note.label}
                </h3>
              ) : null}
              <p className="text-sm leading-relaxed text-foreground">
                {note.body}
              </p>
            </div>
          ))}
        </motion.section>
      ) : null}

      {beyt.exam ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="relative z-20 mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-card p-5"
        >
          <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-black text-primary">
            <span aria-hidden>✓</span>
            سؤال امتحانی
          </h3>
          <p className="text-sm leading-relaxed text-foreground">
            {beyt.exam.q}
          </p>

          <button
            type="button"
            onClick={() => setShowAnswer((v) => !v)}
            aria-expanded={showAnswer}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition-all hover:brightness-95 active:scale-95"
          >
            {showAnswer ? "پنهان کردنِ پاسخ" : "نمایشِ پاسخ"}
          </button>

          <AnimatePresence initial={false}>
            {showAnswer && (
              <motion.div
                key="answer"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <p className="relative z-20 mt-4 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm leading-relaxed font-bold text-foreground">
                  {beyt.exam.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      ) : null}
    </article>
  );
}
