"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

/** Self-playing preview of the وزن‌یاب tool for the homepage: types a verse
 *  into both مصراع inputs, presses "پیدا کن", runs the analysing loader, then
 *  reveals the detected ارکان عروضی + بحر — and loops. Purely decorative; no
 *  real logic. Pauses off-screen and honors prefers-reduced-motion. */

const EXAMPLE = {
  mesra1: "شهر یاران بود و خاک مهربانان این دیار",
  mesra2: "مهربانی کی سرآمد؟ شهریاران را چه شد؟",
  feet: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
  bahr: "رملِ مثمنِ محذوف",
};

type Stage = "idle" | "loading" | "result";
type Caret = "one" | "two" | null;

export default function VaznYabDemo() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);

  const [typed1, setTyped1] = useState("");
  const [typed2, setTyped2] = useState("");
  const [caret, setCaret] = useState<Caret>(null);
  const [pressed, setPressed] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      // static end-state: filled + result shown
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTyped1(EXAMPLE.mesra1);
      setTyped2(EXAMPLE.mesra2);
      setCaret(null);
      setStage("result");
      return;
    }
    if (!active) return;

    let cancelled = false;
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
    const type = async (text: string, set: (s: string) => void) => {
      for (let c = 1; c <= text.length; c++) {
        if (cancelled) return;
        set(text.slice(0, c));
        await sleep(45);
      }
    };

    (async () => {
      while (!cancelled) {
        setTyped1("");
        setTyped2("");
        setPressed(false);
        setStage("idle");
        setCaret("one");
        await sleep(700);
        if (cancelled) return;

        await type(EXAMPLE.mesra1, setTyped1);
        setCaret("two");
        await sleep(300);
        await type(EXAMPLE.mesra2, setTyped2);
        setCaret(null);
        await sleep(450);
        if (cancelled) return;

        setPressed(true);
        await sleep(220);
        setPressed(false);
        setStage("loading");
        await sleep(2200);
        if (cancelled) return;

        setStage("result");
        await sleep(3400);
        if (cancelled) return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, reduced]);

  return (
    <div ref={rootRef} aria-hidden dir="rtl" className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* input card */}
      <div className="glass relative z-20 rounded-3xl p-5 sm:p-7">
        <span className="text-xs text-muted-foreground sm:text-sm">
          بیت خود را بنویس — هر مصراع در یک خط
        </span>

        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-5">
          <span className="w-18.75 shrink-0 rounded-xl border border-border bg-secondary px-2 py-1 text-center text-xs">
            مصراع اول
          </span>
          <div className="flex min-h-[2.75rem] w-full items-center rounded-3xl border-2 border-border bg-secondary px-4 py-2 text-right text-sm text-foreground sm:text-base">
            {typed1 || (caret !== "one" && <span className="text-muted-foreground/30">مصراع اول…</span>)}
            {caret === "one" && <Caret />}
          </div>
        </div>

        <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-x-5">
          <span className="w-18.75 shrink-0 rounded-xl border border-border bg-secondary px-2 py-1 text-center text-xs">
            مصراع دوم
          </span>
          <div className="flex min-h-[2.75rem] w-full items-center rounded-3xl border-2 border-border bg-secondary px-4 py-2 text-right text-sm text-foreground sm:text-base">
            {typed2 || (caret !== "two" && <span className="text-muted-foreground/30">مصراع دوم…</span>)}
            {caret === "two" && <Caret />}
          </div>
        </div>

        <motion.span
          animate={{ scale: pressed ? 0.92 : 1, filter: pressed ? "brightness(1.1)" : "brightness(0.9)" }}
          transition={{ duration: 0.18 }}
          className="mt-7 inline-flex items-center gap-x-2 rounded-3xl bg-primary px-4 py-1.5 font-bold text-secondary sm:text-lg"
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
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
            />
          </svg>
          {stage === "loading" ? "درحال جستجو" : "پیدا کن"}
        </motion.span>
      </div>

      {/* result region: empty → loading → result */}
      <div className="relative min-h-[210px]">
        <AnimatePresence mode="wait">
          {stage === "loading" && (
            <motion.div
              key="loading"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass relative z-20 flex min-h-[210px] items-center justify-center rounded-3xl p-6"
            >
              <Equalizer />
            </motion.div>
          )}

          {stage === "result" && (
            <motion.div
              key="result"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="glass relative z-20 rounded-3xl p-5 sm:p-7"
            >
              <div className="flex items-center gap-x-3 text-lg font-bold sm:text-xl">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    className="size-5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0ZM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2" />
                  </svg>
                </span>
                <h3>وزن و بحر</h3>
              </div>

              <div className="mt-6">
                <span className="mb-2 inline-block text-xs text-muted-foreground sm:text-sm">ارکان عروضی</span>
                <div className="w-full rounded-3xl bg-primary/10 px-2 py-3 text-center font-bold text-primary">
                  {EXAMPLE.feet}
                </div>
              </div>

              <div className="mt-3">
                <span className="text-xs text-muted-foreground sm:text-sm">بحر</span>
                <div className="w-full font-bold brightness-75">{EXAMPLE.bahr}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Caret() {
  return (
    <motion.span
      aria-hidden
      className="ms-0.5 inline-block h-4 w-px bg-primary align-middle"
      animate={{ opacity: [1, 1, 0, 0] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

/** The same "listening to the rhythm" equalizer the real tool shows while analysing. */
function Equalizer() {
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="flex flex-col items-center gap-y-4">
      <div className="flex h-11 items-center gap-[5px]">
        {bars.map((i) => (
          <motion.span
            key={i}
            className="w-[5px] rounded-full bg-gradient-to-b from-primary to-primary/60 shadow-[0_0_10px_var(--color-primary)]"
            style={{ height: "25%" }}
            animate={{ height: ["25%", "100%", "25%"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: i * 0.09 }}
          />
        ))}
      </div>
      <motion.span
        className="text-xs font-medium text-muted-foreground sm:text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        در حال تحلیل وزن…
      </motion.span>
    </div>
  );
}
