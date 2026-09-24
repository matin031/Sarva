"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Beyt } from "@/lib/doroos/types";
import { REALMS } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos/catalog";
import RealmPanel from "@/components/UI/doroos/RealmPanel";
import ReportButton from "@/components/UI/ReportButton";
import { AiNotice, AiThinking, useAiSyntax } from "@/components/UI/doroos/BeytAi";
import {
  DiagramScroller,
  PlusGatePanel,
  useAnalysisViews,
  ViewBar,
} from "@/components/UI/doroos/AnalysisViews";
import { hasAiLesson } from "@/lib/doroos/ai-catalog";
import styles from "./beyt-ai.module.css";

const EASE = [0.16, 1, 0.3, 1] as const;

/** One بیت, fully annotated: the couplet itself, then معنی و مفهوم, then the
 *  three قلمروs side by side, then whatever extras the بیت carries. The exam
 *  question keeps its answer hidden until the reader asks — otherwise the eye
 *  reads the answer before the question. */
export default function BeytCard({
  beyt,
  lessonRef,
}: {
  beyt: Beyt;
  /** شناسهٔ درس — تا گزارشِ «این معنی درست نیست» بگوید کدام بیتِ کدام درس. */
  lessonRef?: { grade: string; number: number; title: string };
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  const aiAvailable = !!lessonRef && hasAiLesson(lessonRef.grade, lessonRef.number);

  /* نوارِ نماها و دروازهٔ پلاس مشترک‌اند با `PassageCard` — هر دو از
     `AnalysisViews` می‌آیند تا قفل در یکی از آن دو جا نماند. */
  const { gate, views, view, current, locked, lockedUnknown, rolesFailed, pick } =
    useAnalysisViews({
      grade: lessonRef?.grade ?? "",
      lesson: lessonRef?.number ?? 0,
      n: beyt.n,
      flags: beyt.analysis,
      aiAvailable,
    });

  /* ⚠️ فقط وقتی این نما انتخاب شده بار می‌گیرد. دانش‌آموزی که هوشواره را
     نمی‌زند، حتی یک بایت از فایلش دانلود نمی‌کند. */
  const ai = useAiSyntax({
    grade: lessonRef?.grade ?? "",
    lesson: lessonRef?.number ?? 0,
    n: beyt.n,
    active: view === "ai" && gate.unlocked,
  });

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
          {/* ⚠️ `items-start` و نه `items-center`: زیرِ ۶۴۰ پیکسل نوارِ نماها
              به خطِ خودش می‌رود و اگر وسط‌چین بود، شمارهٔ بیت نسبت به آن
              می‌لغزید. */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2.5">
            <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
              بیت {faNum(beyt.n)}
              {lessonRef && (
                <ReportButton
                  target={{
                    area: "doroos",
                    targetId: `${lessonRef.grade}/${lessonRef.number}#${beyt.n}`,
                    snapshot: beyt.hemistichs.join(" / "),
                    targetRef: {
                      grade: lessonRef.grade,
                      lesson: lessonRef.number,
                      beyt: beyt.n,
                    },
                  }}
                  compact
                  variant="bare"
                  className="-mr-1 inline-flex items-center text-primary/70 transition-colors hover:text-destructive"
                />
              )}
            </span>

            {/* یک نما همیشه روشن است — نقطهٔ کلِ صفحه این است که تحلیل را
                همان لحظه ببینی — ولی «ساده» یک کلیک دورتر می‌ماند. */}
            <ViewBar views={views} view={view} gate={gate} onPick={pick} busy={ai.busy} />
          </div>

          {/* ⚠️ کلید روی «کدام نما» است: با عوض شدنش ری‌اکت زیردرخت را از نو
              می‌سازد، پس هم انیمیشنِ ورود دوباره اجرا می‌شود و هم نمودار
              اندازه‌گیریِ نمای قبلی را با خودش نمی‌آورد. */}
          <div key={`${view}-${locked}-${ai.busy}-${!!current?.roles}`} className={styles.reveal}>
            {locked || (view === "ai" && ai.forbidden) ? (
              <PlusGatePanel unknown={lockedUnknown || ai.forbidden === "unavailable"} />
            ) : rolesFailed ? (
              <p className={styles.error}>بارگذاری نشد. صفحه را دوباره باز کن.</p>
            ) : view === "plain" || (view !== "ai" && !current?.roles) ? (
              /* ⚠️ «ساده»، یا نمای پولی‌ای که نقش‌هایش هنوز از سرور نرسیده: تا
                 آمدنِ نمودار خودِ بیت نشان داده می‌شود و نه یک جای خالی. */
              <div className="mt-6 space-y-3 text-center">
                {beyt.hemistichs.map((h, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: EASE }}
                    className="font-serif text-xl leading-[2] font-bold text-foreground sm:text-2xl md:text-[1.7rem]"
                  >
                    {h}
                  </motion.p>
                ))}
              </div>
            ) : view === "ai" ? (
              ai.busy ? (
                <AiThinking stage={ai.stage} />
              ) : ai.failed ? (
                /* ⚠️ شکست پنهان نمی‌شود و نماهای دیگر هم پاک نمی‌شوند:
                   تحلیلِ دست‌نویس سرِ جایش است و فقط این یکی نیامده. */
                <p className={styles.error}>
                  بارگذاری نشد. دوباره امتحان کن.
                </p>
              ) : ai.roles ? (
                <>
                  <DiagramScroller
                    lines={beyt.hemistichs}
                    roles={ai.roles}
                    viewKey="ai"
                  />
                  <AiNotice />
                </>
              ) : null
            ) : current?.roles ? (
              <DiagramScroller
                lines={beyt.hemistichs}
                roles={current.roles}
                viewKey={current.id}
              />
            ) : null}
          </div>

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
              <h3 className="mb-1.5 text-xs font-black tracking-wide text-gold-ink">
                مفهوم
              </h3>
              <p className="text-sm leading-relaxed font-bold text-foreground">
                {beyt.concept}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ---------- the three قلمروs ---------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <RealmPanel
          label={REALMS[0].label}
          token={REALMS[0].token}
          items={beyt.linguistic}
          badge={beyt.clauses ? `${faNum(beyt.clauses)} جمله` : undefined}
          delay={0}
        />
        <RealmPanel
          label={REALMS[1].label}
          token={REALMS[1].token}
          items={beyt.literary}
          delay={0.08}
        />
        <RealmPanel
          label={REALMS[2].label}
          token={REALMS[2].token}
          body={beyt.intellectual}
          delay={0.16}
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
          <h3 className="mb-3 text-sm font-black text-gold-ink">قرابت معنایی</h3>
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
            {showAnswer ? "پنهان کردن پاسخ" : "نمایش پاسخ"}
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
