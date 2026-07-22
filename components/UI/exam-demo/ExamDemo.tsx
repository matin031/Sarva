"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Decorative, self-playing preview of the exam-taking flow for the homepage.
 *  Loops through a few scripted questions — typing text answers, selecting the
 *  right multiple-choice option, then revealing the green "درست" feedback —
 *  entirely on its own. No real exam data or logic; see /exam/[examKey] for the
 *  real thing. Pauses when off-screen and respects prefers-reduced-motion. */

type DemoQuestion =
  | {
      type: "text";
      number: number;
      score: string;
      prompt: string;
      verse?: string;
      answer: string;
    }
  | {
      type: "mcq";
      number: number;
      score: string;
      prompt: string;
      verse?: string;
      options: string[];
      correctIndex: number;
      answer: string;
    };

const QUESTIONS: DemoQuestion[] = [
  {
    type: "text",
    number: 2,
    score: "۰٫۲۵",
    prompt: "معنای واژهٔ «اورنگ» را بنویسید.",
    answer: "تخت پادشاهی",
  },
  {
    type: "mcq",
    number: 3,
    score: "۰٫۵",
    prompt: "آرایهٔ ادبیِ مصراعِ زیر کدام است؟",
    verse: "ابر و باد و مه و خورشید و فلک در کارند",
    options: ["مراعاتِ نظیر", "جناس", "حُسنِ تعلیل", "اغراق"],
    correctIndex: 0,
    answer: "مراعاتِ نظیر",
  },
  {
    type: "text",
    number: 4,
    score: "۰٫۲۵",
    prompt: "معنای واژهٔ «سیم» را بنویسید.",
    answer: "نقره",
  },
];

const faNum = (n: number) => n.toLocaleString("fa-IR");

export default function ExamDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);

  const [qIndex, setQIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(false);

  // reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // only animate while on-screen (saves CPU when scrolled away)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the scripted timeline
  useEffect(() => {
    if (reduced) {
      // static end-state: first question, answered & graded
      const q = QUESTIONS[0];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQIndex(0);
      setTyped(q.type === "text" ? q.answer : "");
      setSelected(q.type === "mcq" ? q.correctIndex : null);
      setFeedback(true);
      return;
    }
    if (!active) return;

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    (async () => {
      while (!cancelled) {
        for (let qi = 0; qi < QUESTIONS.length; qi++) {
          if (cancelled) return;
          const q = QUESTIONS[qi];
          setQIndex(qi);
          setTyped("");
          setSelected(null);
          setFeedback(false);
          await sleep(850);
          if (cancelled) return;

          if (q.type === "text") {
            for (let c = 1; c <= q.answer.length; c++) {
              if (cancelled) return;
              setTyped(q.answer.slice(0, c));
              await sleep(70);
            }
          } else {
            await sleep(650);
            if (cancelled) return;
            setSelected(q.correctIndex);
          }

          await sleep(450);
          if (cancelled) return;
          setFeedback(true);
          await sleep(1500);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, reduced]);

  const q = QUESTIONS[qIndex];

  return (
    <div
      ref={rootRef}
      aria-hidden
      dir="rtl"
      className="relative mx-auto w-full max-w-sm select-none"
    >
      {/* progress bar */}
      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${((qIndex + 1) / QUESTIONS.length) * 100}%` }}
          transition={{ ease: "easeOut", duration: 0.4 }}
        />
      </div>

      <div className="relative h-105 ">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.number}
            initial={reduced ? false : { opacity: 0, x: 36 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: -36 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass z-20 relative rounded-2xl border border-border bg-card! p-4 shadow xs:p-5"
          >
            {/* header: number badge (right) + score (left) */}
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {faNum(q.number)}
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                نمره {q.score}
              </span>
            </div>

            {/* prompt */}
            <p className="text-sm leading-relaxed text-foreground xs:text-base">
              {q.prompt}
            </p>
            {q.verse && (
              <p className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-center text-sm font-medium text-foreground">
                {q.verse}
              </p>
            )}

            {/* answer area */}
            {q.type === "text" ? (
              <div className="mt-3 flex min-h-11 items-center rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
                {typed ? (
                  <span className="font-medium text-foreground">{typed}</span>
                ) : (
                  !feedback && (
                    <span className="text-muted-foreground">
                      پاسخِ خود را بنویس…
                    </span>
                  )
                )}
                {!feedback && <BlinkingCaret />}
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {q.options.map((opt, i) => {
                  const chosen = selected === i;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-2.5 text-sm transition-all duration-300 ${
                        chosen
                          ? "border-primary bg-primary/10 font-semibold text-foreground shadow-[0_0_0_1px_var(--color-primary)]"
                          : "border-border bg-background/60 text-muted-foreground"
                      }`}
                    >
                      {opt}
                    </div>
                  );
                })}
              </div>
            )}

            {/* green feedback box */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={reduced ? false : { opacity: 0, y: 10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 rounded-xl border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">درست</span>
                      <span className="text-xs">
                        {q.score} / {q.score}
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed">
                      <span className="text-muted-foreground">پاسخ صحیح: </span>
                      {q.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function BlinkingCaret() {
  return (
    <motion.span
      aria-hidden
      className="ms-0.5 inline-block h-4 w-px bg-primary"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}
