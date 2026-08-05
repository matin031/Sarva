"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { RevealItem, RevealLine, RevealGroup } from "@/components/UI/aruz/reveal";

/** سروا کلاب's hero, built as a shallow 3D stage.
 *
 *  Same construction as وزن‌یاب's: one perspective container, layers parked at
 *  different `translateZ`, and a spring-damped tilt driven by the pointer. The
 *  parallax then falls out of the perspective for free — no per-layer maths, no
 *  rAF loop, and nothing but `transform` animating.
 *
 *  What the layers *say* is the point. Poetry here arrives as loose leaves: a
 *  few slabs, each carrying one مصراع, drifting at different depths behind the
 *  title — one of them deliberately face-down and unsigned, because the whole
 *  section exists for people who write and never sign anything.
 *
 *  Falls back to a flat, still hero under reduced motion. */

type Leaf = {
  text: string;
  /** depth in px; larger = nearer the reader */
  z: number;
  className: string;
  /** degrees of resting tilt, and the float cycle's length */
  tilt: number;
  dur: number;
  delay: number;
  muted?: boolean;
};

/** Positions are given against the full width of the stage, not the text
 *  column — the leaves belong in the margins beside the copy, and anchoring
 *  them to the narrow column is what used to drop one on top of the numbers. */
const LEAVES: Leaf[] = [
  {
    text: "بشنو این نی چون شکایت می‌کند",
    z: 30,
    className: "right-[1%] top-[14%] hidden xl:block",
    tilt: -6,
    dur: 9,
    delay: 0,
  },
  {
    text: "…و این یکی هنوز امضا ندارد",
    z: -40,
    className: "left-[1%] top-[38%] hidden xl:block",
    tilt: 7,
    dur: 11,
    delay: 1.4,
    muted: true,
  },
  {
    text: "هر که را اسرار حق آموختند",
    z: -20,
    className: "right-[2%] bottom-[16%] hidden 2xl:block",
    tilt: 5,
    dur: 10,
    delay: 0.8,
  },
];

export default function ClubHero({
  signedIn,
  stats,
}: {
  signedIn: boolean;
  stats: { poems: number; poets: number; comments: number };
}) {
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 120, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 120, damping: 20, mass: 0.6 });
  const rotateY = useTransform(sx, [-1, 1], [9, -9]);
  const rotateX = useTransform(sy, [-1, 1], [-7, 7]);

  useEffect(() => {
    if (reduced) return;
    const el = stageRef.current;
    if (!el) return;
    // measured on enter, never inside the move handler — a getBoundingClientRect
    // in the hot path forces a layout on every pointer event
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

  const layer = (z: number) => (reduced ? undefined : { transform: `translateZ(${z}px)` });
  const fa = (n: number) => n.toLocaleString("fa-IR");

  return (
    <section dir="rtl" className="relative mb-10 overflow-hidden rounded-[2rem]">
      {/* ---------- ambience ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Radial gradients rather than blurred circles: an 80px blur is a
            multi-pass full-surface paint, a gradient is one cheap fill. */}
        <div
          className="absolute -right-32 -top-24 size-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 28%, transparent), color-mix(in oklch, var(--color-primary) 8%, transparent) 62%, transparent)",
            ...(reduced
              ? null
              : { animation: "aruzDrift 18s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
        <div
          className="absolute -left-28 top-1/3 size-[460px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 22%, transparent), transparent 64%)",
            ...(reduced
              ? null
              : { animation: "aruzDrift2 22s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
        {/* perspective floor, the same one عروض stands on */}
        <div
          className="absolute inset-x-0 bottom-0 h-[38vh] [mask-image:linear-gradient(to_top,black,transparent)] opacity-60"
          style={{ perspective: "500px" }}
        >
          <div className="aruz-grid-floor absolute inset-0 origin-bottom" style={{ transform: "rotateX(68deg)" }} />
        </div>
        <div className="club-paper absolute inset-0 opacity-[0.035] mix-blend-overlay" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--color-background)_95%)]" />
      </div>

      {/* ---------- 3D stage ---------- */}
      <motion.div
        ref={stageRef}
        style={reduced ? undefined : { perspective: 1100 }}
        className="relative px-5 py-12 sm:py-16"
      >
        <motion.div
          style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* floating verse leaves, out in the margins beside the copy */}
          {LEAVES.map((leaf) => (
            <div
              key={leaf.text}
              aria-hidden
              className={`absolute ${leaf.className}`}
              style={{
                ...(reduced ? null : { transform: `translateZ(${leaf.z}px)` }),
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className={`max-w-[190px] rounded-xl border px-4 py-2.5 text-center font-serif text-[13px] leading-7 backdrop-blur-sm ${
                  leaf.muted
                    ? "border-dashed border-muted-foreground/30 bg-card/40 text-muted-foreground"
                    : "border-border/70 bg-card/70 text-foreground/80"
                }`}
                style={
                  reduced
                    ? { transform: `rotate(${leaf.tilt}deg)` }
                    : {
                        ["--club-tilt" as string]: `${leaf.tilt}deg`,
                        animation: `clubFloat ${leaf.dur}s ease-in-out ${leaf.delay}s infinite`,
                        willChange: "transform",
                      }
                }
              >
                {leaf.text}
              </div>
            </div>
          ))}

          {/* ---------- copy ---------- */}
          <RevealGroup stagger={0.12} className="relative z-10 mx-auto max-w-2xl text-center">
            <RevealItem>
              <span
                style={layer(70)}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm sm:text-sm"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                سروا کلاب
              </span>
            </RevealItem>

            <h1
              style={layer(50)}
              className="mt-5 text-3xl leading-[1.2] font-black sm:text-5xl"
            >
              <RevealLine className="text-foreground" delay={0.08}>
                طبعِ شعر داری؟
              </RevealLine>
              <RevealLine className="aruz-gradient-text" delay={0.2}>
                اینجا بخوانش.
              </RevealLine>
            </h1>

            {/* a quill stroke that draws itself once, under the title */}
            <RevealItem>
              <svg
                aria-hidden
                viewBox="0 0 260 14"
                style={layer(40)}
                className="mx-auto mt-3 h-3.5 w-56 text-primary/70"
              >
                <path
                  d="M4 9 C 60 1, 90 13, 130 7 S 210 2, 256 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={
                    reduced
                      ? undefined
                      : {
                          ["--club-len" as string]: "300",
                          strokeDasharray: 300,
                          animation: "clubDraw 1.6s cubic-bezier(0.16,1,0.3,1) 0.5s both",
                        }
                  }
                />
              </svg>
            </RevealItem>

            <RevealItem>
              <p
                style={layer(30)}
                className="mx-auto mt-5 max-w-lg text-sm leading-8 text-muted-foreground sm:text-base"
              >
                خیلی‌ها می‌سرایند و به کسی نشان نمی‌دهند. اینجا برای همان‌هاست:
                بیتی که گفته‌ای را بفرست — اگر خجالت می‌کشی، بی‌نام — بقیه زیرش
                می‌نویسند. هر سروده و هر دیدگاه پیش از نمایش به‌دست مدیران سایت
                بررسی می‌شود.
              </p>
            </RevealItem>

            {/* ---------- live numbers ----------
                Hidden while the club is empty: three tiles reading ۰ are a
                worse first impression than no tiles at all, and the invitation
                below them is the thing a first visitor should be reading. */}
            {stats.poems > 0 && (
            <RevealItem>
              <div
                style={layer(55)}
                className="mx-auto mt-8 flex max-w-md items-stretch justify-center gap-2 sm:gap-3"
              >
                {[
                  { v: stats.poems, l: "سروده" },
                  { v: stats.poets, l: "شاعر" },
                  { v: stats.comments, l: "دیدگاه" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="flex-1 rounded-2xl border border-border/70 bg-card/60 px-3 py-3 backdrop-blur-sm"
                  >
                    <span className="block text-xl font-black text-primary sm:text-2xl">
                      {fa(s.v)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{s.l}</span>
                  </div>
                ))}
              </div>
            </RevealItem>
            )}

            {signedIn && (
              <RevealItem>
                <Link
                  href="/panel/club"
                  style={layer(45)}
                  className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
                >
                  سروده‌ها و دیدگاه‌های من ←
                </Link>
              </RevealItem>
            )}
          </RevealGroup>
        </motion.div>
      </motion.div>
    </section>
  );
}
