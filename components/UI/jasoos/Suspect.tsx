"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import HandsUpFigure, { type FigureMood } from "@/components/UI/jasoos/HandsUpFigure";
import { usePointer } from "@/components/UI/jasoos/pointer";
import type { SuspectRole } from "@/lib/jasoos-data";

export type SuspectVisualState = "idle" | "shot-correct" | "shot-wrong" | "dimmed";

// caps the revealed word/phrase to a fixed box width; if the text is longer
// than that (roughly more than two words), it scrolls like a subtitle
// ticker instead of wrapping or overflowing the suspect's card
function RevealTag({ text, isSpy }: { text: string; isSpy: boolean }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      const overflow =
        textRef.current.scrollWidth >
        textRef.current.parentElement!.clientWidth;
      setIsOverflow(overflow);
    }
  }, [text]);

  return (
    <span
      className={`block max-w-[80px] overflow-hidden rounded-full px-2 py-0.5 text-[10px] sm:text-xs ${
        isSpy ? "text-destructive bg-destructive/10" : "text-primary bg-primary/10"
      }`}
    >
      <span
        ref={textRef}
        className={`inline-block whitespace-nowrap ${isOverflow ? "animate-marquee" : ""}`}
      >
        {text}
      </span>
    </span>
  );
}


function Suspect({
  role,
  state,
  wordInVerse,
  onShoot,
  index = 0,
  /** true once an innocent has been shot — the real spy enjoys that */
  gloat = false,
  isSpy = false,
}: {
  role: SuspectRole;
  state: SuspectVisualState;
  wordInVerse?: string;
  onShoot: () => void;
  index?: number;
  gloat?: boolean;
  isSpy?: boolean;
}) {
  const disabled = state !== "idle";
  const revealed = state !== "idle";
  const reduced = useReducedMotion();
  const pointer = usePointer();

  /** true while the crosshair is over this one */
  const [aimed, setAimed] = useState(false);

  // pupils. The head's centre is cached and only re-read on resize/scroll, so a
  // pointermove never causes a layout read.
  const headRef = useRef<HTMLDivElement>(null);
  const box = useRef<{ cx: number; cy: number } | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const eyeX = useSpring(rawX, { stiffness: 260, damping: 22, mass: 0.4 });
  const eyeY = useSpring(rawY, { stiffness: 260, damping: 22, mass: 0.4 });

  const measure = useCallback(() => {
    const el = headRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    box.current = { cx: r.left + r.width / 2, cy: r.top + r.height * 0.22 };
  }, []);

  useEffect(() => {
    if (reduced || !pointer) return;
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });

    const R = 2.6; // pupil travel, in the figure's own viewBox units
    const apply = () => {
      const b = box.current;
      if (!b) return;
      const dx = pointer.x.get() - b.cx;
      const dy = pointer.y.get() - b.cy;
      const d = Math.hypot(dx, dy) || 1;
      // normalise, then ease off so a far-away pointer does not peg the pupils
      const k = Math.min(1, d / 260);
      rawX.set((dx / d) * R * k);
      rawY.set((dy / d) * R * k);
    };
    apply();
    const unx = pointer.x.on("change", apply);
    const uny = pointer.y.on("change", apply);
    return () => {
      unx();
      uny();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [pointer, reduced, measure, rawX, rawY]);

  const mood: FigureMood =
    state === "shot-correct"
      ? "dead"
      : isSpy && gloat
        ? "smug"
        : aimed && state === "idle"
          ? "scared"
          : "calm";

  return (
    /* The wrapper is the stable part: it never transforms, so the hit area
       below cannot move. The artwork animates inside it and takes no pointer
       events at all — when the figure *was* the button, flinching upward slid
       it out from under the cursor, which fired pointerleave, which settled it
       back, which fired pointerenter again. That is the jitter. */
    <div
      data-aimed={aimed ? "1" : "0"}
      className={`group relative z-20 flex shrink-0 flex-col items-center gap-y-2 ${
        state === "dimmed" ? "opacity-75" : ""
      }`}
    >
      {/* a pool of light under the one being aimed at — a gradient, not a blur */}
      <motion.span
        aria-hidden
        className=" pointer-events-none absolute -bottom-3 left-1/2 h-6 w-24 -translate-x-1/2 rounded-[100%]"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 45%, transparent), transparent)",
        }}
        animate={{ opacity: aimed && state === "idle" ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />

      <motion.div
        ref={headRef}
        animate={
          state === "shot-correct"
            ? { rotate: 14, y: 46, opacity: 0, filter: "brightness(0.4)" }
            : state === "shot-wrong"
              ? { x: [0, -8, 8, -5, 5, 0] }
              : mood === "smug"
                ? { y: [0, -3, 0], scale: 1.04 }
                : aimed
                  ? { y: -6, scale: 0.97 }
                  : { y: [0, -4, 0] }
        }
        transition={
          state === "shot-correct"
            ? { duration: 0.55, ease: "easeIn" }
            : state === "shot-wrong"
              ? { duration: 0.5 }
              : mood === "smug"
                ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
                : aimed
                  ? { type: "spring", stiffness: 320, damping: 18 }
                  : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        className={`pointer-events-none w-14 transition-colors duration-200 sm:w-20 ${
          state === "shot-correct"
            ? "text-destructive"
            : state === "shot-wrong"
              ? "text-gold"
              : mood === "smug"
                ? "text-destructive/90"
                : "text-foreground/85 group-enabled:group-hover:text-primary"
        } drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]`}
      >
        <HandsUpFigure
          mood={mood}
          eyeX={reduced ? undefined : eyeX}
          eyeY={reduced ? undefined : eyeY}
        />
      </motion.div>

      <span className="glass whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold sm:text-sm">
        {role}
      </span>

      {revealed && (
        <RevealTag text={wordInVerse ?? "نادرست"} isSpy={!wordInVerse} />
      )}

      {state === "shot-wrong" && (
        <span className=" pointer-events-none absolute -right-1 -top-2 text-lg font-black text-destructive sm:text-xl">
          ✕
        </span>
      )}

      {/* the aim/shoot surface: fixed to the wrapper, never animated */}
      <button
        type="button"
        onClick={onShoot}
        onPointerEnter={() => {
          measure();
          setAimed(true);
        }}
        onPointerLeave={() => setAimed(false)}
        disabled={disabled}
        aria-label={`نشانه‌گیری به سمت مظنونِ ${role}`}
        className={`absolute inset-0 z-30 ${
          disabled ? "cursor-default" : "cursor-crosshair"
        }`}
      />
    </div>
  );
}

export default Suspect;
