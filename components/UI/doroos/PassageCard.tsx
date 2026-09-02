"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Passage, WordRole } from "@/lib/doroos/types";
import { REALMS } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";
import RealmPanel from "@/components/UI/doroos/RealmPanel";
import BeytSyntaxMap from "@/components/UI/doroos/BeytSyntaxMap";
import ReportButton from "@/components/UI/ReportButton";

const EASE = [0.16, 1, 0.3, 1] as const;

/** One بند of a prose lesson.
 *
 *  A گلستان-style lesson alternates: a paragraph of نثر, then a بیت, then more
 *  نثر. The two want different typography — نثر runs justified across the
 *  measure and is read line by line, a بیت is centred and set in the serif —
 *  so the بند says which it is and this renders accordingly.
 *
 *  نثر gets no wire diagram. A نثر بند is one long sentence, sometimes several
 *  paragraphs of it; arrows from thirty words up to thirty labels would be
 *  unreadable, and the reader asked for them not to be drawn there. The verse
 *  بندs keep them, since those are بیت like any other. */
export default function PassageCard({
  passage,
  lessonRef,
}: {
  passage: Passage;
  /** شناسهٔ درس — تا گزارش بگوید کدام بندِ کدام درس. */
  lessonRef?: { grade: string; number: number; title: string };
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const [view, setView] = useState<"syntax" | "devices" | "plain">("syntax");

  const isVerse = passage.form === "verse";
  const isQuote = passage.form === "quotation";

  const VIEWS = [
    { id: "syntax", label: "نقش دستوری", roles: passage.syntax },
    { id: "devices", label: "آرایه‌ها", roles: passage.devices },
  ] as const;
  const available = isVerse
    ? VIEWS.filter(
        (v): v is (typeof VIEWS)[number] & { roles: WordRole[] } => !!v.roles?.length,
      )
    : [];
  const active = available.find((v) => v.id === view);

  return (
    <article id={`band-${passage.n}`} className="relative z-20 scroll-mt-28">
      {/* a new part of the lesson announces itself before the بند */}
      {passage.section ? (
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-sm font-black text-primary">{passage.section}</h2>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative z-20 overflow-hidden rounded-3xl border border-primary/25 bg-card p-6 shadow-xl sm:p-9"
      >
        <div className="relative z-20">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              {isVerse ? "بیت" : isQuote ? "آیه / حدیث" : "بند"} {faNum(passage.n)}
              {lessonRef && (
                <ReportButton
                  target={{
                    area: "doroos",
                    targetId: `${lessonRef.grade}/${lessonRef.number}#${passage.n}`,
                    snapshot: passage.lines.join(" / "),
                    targetRef: {
                      grade: lessonRef.grade,
                      lesson: lessonRef.number,
                      passage: passage.n,
                    },
                  }}
                  compact
                  variant="bare"
                  className="-mr-1 inline-flex items-center text-primary/70 transition-colors hover:text-destructive"
                />
              )}
            </span>

            {available.length ? (
              <div className="flex flex-wrap gap-1.5">
                {[...available, { id: "plain", label: "ساده" } as const].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setView(v.id)}
                    aria-pressed={view === v.id}
                    className={`rounded-full border px-3 py-1 text-[0.7rem] font-bold transition-colors ${
                      view === v.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* ---------- the text ---------- */}
          {active ? (
            <div className="mt-8 overflow-x-auto pb-1">
              <div className="min-w-[30rem]">
                <BeytSyntaxMap
                  key={active.id}
                  lines={passage.lines}
                  roles={active.roles}
                />
              </div>
            </div>
          ) : isVerse ? (
            <div className="mt-6 space-y-3 text-center">
              {passage.lines.map((line, i) => (
                <p
                  key={i}
                  className="font-serif text-xl leading-[2] font-bold text-foreground sm:text-2xl md:text-[1.7rem]"
                >
                  {line}
                </p>
              ))}
            </div>
          ) : isQuote ? (
            /* the quoted آیه is someone else's words inside سعدی's — a rule
               down the side and a tinted ground say so without a label */
            <blockquote className="mt-6 rounded-2xl border-e-4 border-gold/50 bg-gold/5 px-5 py-4">
              {passage.lines.map((line, i) => (
                <p
                  key={i}
                  lang="ar"
                  className="text-center font-serif text-lg leading-[2.2] font-bold text-foreground sm:text-xl"
                >
                  {line}
                </p>
              ))}
            </blockquote>
          ) : (
            <div className="mt-6 space-y-4">
              {passage.lines.map((line, i) => (
                <p
                  key={i}
                  className="text-justify font-serif text-lg leading-[2.15] text-foreground sm:text-xl"
                >
                  {line}
                </p>
              ))}
            </div>
          )}

          {/* ---------- معنی و مفهوم ---------- */}
          {passage.meaning || passage.concept ? (
            <div className="mt-7 grid gap-3 sm:grid-cols-5">
              {passage.meaning ? (
                <div
                  className={`relative z-20 rounded-2xl border border-border bg-background p-4 ${
                    passage.concept ? "sm:col-span-3" : "sm:col-span-5"
                  }`}
                >
                  <h3 className="mb-1.5 text-xs font-black tracking-wide text-muted-foreground">
                    معنی
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground">
                    {passage.meaning}
                  </p>
                </div>
              ) : null}
              {passage.concept ? (
                <div
                  className={`relative z-20 rounded-2xl border border-gold/30 bg-background p-4 ${
                    passage.meaning ? "sm:col-span-2" : "sm:col-span-5"
                  }`}
                >
                  <h3 className="mb-1.5 text-xs font-black tracking-wide text-gold-ink">
                    مفهوم
                  </h3>
                  <p className="text-sm leading-relaxed font-bold text-foreground">
                    {passage.concept}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </motion.div>

      {/* ---------- the three قلمروs ---------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <RealmPanel
          label={REALMS[0].label}
          token={REALMS[0].token}
          items={passage.linguistic}
          badge={passage.clauses ? `${faNum(passage.clauses)} جمله` : undefined}
        />
        <RealmPanel
          label={REALMS[1].label}
          token={REALMS[1].token}
          items={passage.literary}
          delay={0.08}
        />
        <RealmPanel
          label={REALMS[2].label}
          token={REALMS[2].token}
          body={passage.intellectual}
          delay={0.16}
        />
      </div>

      {passage.affinity?.length ? (
        <section className="relative z-20 mt-4 rounded-2xl border border-gold/30 bg-card p-5">
          <h3 className="mb-3 text-sm font-black text-gold-ink">قرابت معنایی</h3>
          <ul className="space-y-2.5">
            {passage.affinity.map((a, i) => (
              <li
                key={i}
                className="border-e-2 border-gold/40 pe-3 text-sm leading-relaxed text-foreground"
              >
                {a}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {passage.notes?.length ? (
        <section className="relative z-20 mt-4 space-y-3 rounded-2xl border border-lapis-light/40 bg-card p-5">
          {passage.notes.map((note, i) => (
            <div key={i}>
              {note.label ? (
                <h3 className="mb-1 text-sm font-black text-lapis-light">
                  {note.label}
                </h3>
              ) : null}
              <p className="text-sm leading-relaxed text-foreground">{note.body}</p>
            </div>
          ))}
        </section>
      ) : null}

      {passage.exam ? (
        <section className="relative z-20 mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-card p-5">
          <h3 className="mb-2 inline-flex items-center gap-2 text-sm font-black text-primary">
            <span aria-hidden>✓</span>
            سؤال امتحانی
          </h3>
          <p className="text-sm leading-relaxed text-foreground">{passage.exam.q}</p>

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
                  {passage.exam.a}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      ) : null}
    </article>
  );
}
