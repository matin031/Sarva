"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/** وزن‌یاب's hero, built as a shallow 3D stage.
 *
 *  A real perspective container holds four layers at different depths: the
 *  copy, a slab carrying a بیت, the syllable tiles scanned out of it, and a
 *  soft glow. The pointer tilts the whole stage, and because each layer sits at
 *  its own `translateZ` the parallax comes out of the perspective for free —
 *  no per-layer maths, no rAF loop, and nothing but `transform` animating, so
 *  the whole thing runs on the compositor.
 *
 *  The tiles are the point: عروض is syllables, long (—) and short (∪), and
 *  seeing them lift off the line is the clearest way to say what this page is
 *  for. Falls back to a flat, still hero under reduced motion. */

const BEYT = ["شهر یاران بود و خاک مهربانان این دیار", "مهربانی کی سر آمد؟ شهریاران را چه شد؟"];

/** فاعلاتن فاعلاتن فاعلاتن فاعلن — the metre of the بیت above. */
const FEET = ["فاعلاتن", "فاعلاتن", "فاعلاتن", "فاعلن"];
const PATTERN = [
  ["—", "∪", "—", "—"],
  ["—", "∪", "—", "—"],
  ["—", "∪", "—", "—"],
  ["—", "∪", "—"],
];

export default function VaznYabHero3D() {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // -1..1 across the stage; springs keep the tilt from snapping
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 120, damping: 20, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [10, -10]);
  const rotateX = useTransform(sy, [-1, 1], [-8, 8]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const el = stageRef.current;
    if (!el) return;
    // the box is read once per pointerenter, never inside pointermove — a
    // getBoundingClientRect in the hot path is a forced layout on every move
    let box: DOMRect | null = null;
    const onEnter = () => {
      box = el.getBoundingClientRect();
    };
    const onMove = (e: PointerEvent) => {
      if (!box) box = el.getBoundingClientRect();
      mx.set(((e.clientX - box.left) / box.width) * 2 - 1);
      my.set(((e.clientY - box.top) / box.height) * 2 - 1);
    };
    const onLeave = () => {
      mx.set(0);
      my.set(0);
      box = null;
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced, mx, my]);

  const layer = (z: number) => ({ transform: `translateZ(${z}px)` });

  return (
    <section
      dir="rtl"
      className=" relative mx-auto mt-10 w-full max-w-5xl px-1 sm:mt-14"
    >
      <div
        ref={stageRef}
        className=" relative"
        style={{ perspective: reduced ? undefined : "1100px" }}
      >
        <motion.div
          style={
            reduced
              ? undefined
              : { rotateX, rotateY, transformStyle: "preserve-3d" }
          }
          className=" relative flex flex-col items-center"
        >
          {/* glow, furthest back */}
          <div
            aria-hidden
            style={reduced ? undefined : layer(-140)}
            className=" pointer-events-none absolute inset-x-0 top-4 mx-auto h-64 w-[85%] rounded-full"
          >
            <div
              className=" size-full rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 26%, transparent), transparent)",
              }}
            />
          </div>

          <motion.span
            initial={reduced ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={reduced ? undefined : layer(60)}
            className=" relative z-20 rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary sm:text-sm"
          >
            وزن‌یاب
          </motion.span>

          <motion.h1
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
            style={reduced ? undefined : layer(45)}
            className=" relative z-20 mt-3 text-balance text-center text-3xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl"
          >
            وزن بیت
            <span className=" mx-2 inline-block text-primary">دلخواهت</span>
            را پیدا کن
          </motion.h1>

          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            style={reduced ? undefined : layer(30)}
            className=" relative z-20 mx-auto mt-4 max-w-2xl text-pretty text-center leading-relaxed text-muted-foreground sm:text-lg"
          >
            بیت یا مصراعت را بنویس تا وزن عروضی‌اش را بگوید و ریتمش را برایت
            بنوازد — یا دکمهٔ بیتِ تصادفی را بزن و خودت را بیازما.
          </motion.p>

          {/* the slab: a بیت with its scansion lifted above it */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={
              reduced
                ? undefined
                : { ...layer(12), transformStyle: "preserve-3d" }
            }
            className=" glass relative z-20 mt-10 w-full max-w-3xl rounded-3xl p-4 sm:p-7"
          >
            <div className=" absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />

            <div className=" text-center text-sm leading-loose text-foreground sm:text-lg">
              {BEYT.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {/* syllable tiles, floating a little above the slab */}
            <div
              style={reduced ? undefined : { transform: "translateZ(38px)" }}
              className=" mt-6 flex flex-wrap items-end justify-center gap-x-3 gap-y-3 sm:gap-x-5"
            >
              {FEET.map((foot, fi) => (
                <div key={foot + fi} className=" flex flex-col items-center gap-2">
                  <div className=" flex items-center gap-1">
                    {PATTERN[fi].map((sym, si) => (
                      <motion.span
                        key={si}
                        initial={reduced || !ready ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.35,
                          delay: 0.5 + fi * 0.12 + si * 0.05,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className={`flex size-7 items-center justify-center rounded-full font-mono text-xs sm:size-8 sm:text-sm ${
                          sym === "—"
                            ? "bg-primary text-primary-foreground shadow-[0_6px_14px_-6px_var(--color-primary)]"
                            : "border border-border bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {sym === "—" ? (
                          <span className=" block h-0.5 w-2/5 bg-current opacity-80" />
                        ) : (
                          "∪"
                        )}
                      </motion.span>
                    ))}
                  </div>
                  <span className=" text-[11px] text-muted-foreground sm:text-xs">
                    {foot}
                  </span>
                </div>
              ))}
            </div>

            <div className=" absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-gold/60 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
