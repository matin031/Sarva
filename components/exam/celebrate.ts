"use client";

import confetti from "canvas-confetti";
import type { PartResult } from "@/lib/exam/result-types";
import { playFeedback } from "@/lib/exam/feedback-sfx";
import { paletteHexColors } from "@/lib/theme/palette";

export type QuestionOutcome = "correct" | "partial" | "wrong" | "pending";

/** What the student should *feel* about the question as a whole.
 *  Self-graded / AI parts that are still waiting don't count either way —
 *  a question whose only part is an essay is «pending», not «wrong». */
export function questionOutcome(parts: PartResult[]): QuestionOutcome {
  const graded = parts.filter((p) => p.status !== "needs_review");
  if (graded.length === 0) return "pending";
  if (graded.every((p) => p.status === "correct")) return "correct";
  if (graded.some((p) => p.status === "correct" || p.status === "partial")) return "partial";
  return "wrong";
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/** Sound, a short vibration on phones, and — for a fully correct answer — a
 *  burst of confetti from wherever the student pressed «ثبت پاسخ». */
export function celebrate(outcome: QuestionOutcome, from?: HTMLElement | null, streak = 0) {
  if (outcome === "pending") return;
  playFeedback(outcome === "correct" ? "correct" : outcome === "partial" ? "partial" : "wrong");

  try {
    if (outcome === "correct") navigator.vibrate?.(18);
    else if (outcome === "wrong") navigator.vibrate?.([12, 60, 12]);
  } catch {
    /* vibrate throws in some embedded webviews */
  }

  if (outcome !== "correct" || reducedMotion()) return;

  const rect = from?.getBoundingClientRect();
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 3) / window.innerHeight }
    : { x: 0.5, y: 0.8 };

  // a streak earns a slightly bigger burst, capped so the fifth one in a row
  // isn't a fireworks show
  const boost = Math.min(streak, 5);
  void confetti({
    particleCount: 38 + boost * 10,
    spread: 70 + boost * 6,
    startVelocity: 34 + boost * 2,
    gravity: 1.1,
    ticks: 160,
    scalar: 0.9,
    origin,
    colors: paletteHexColors(["#22c55e"]),
    disableForReducedMotion: true,
    zIndex: 60,
  });
  if (boost >= 3) {
    window.setTimeout(() => {
      void confetti({
        particleCount: 26,
        spread: 110,
        startVelocity: 26,
        shapes: ["star"],
        scalar: 1.1,
        origin,
        colors: ["#d4a941", "#f1d38a"],
        disableForReducedMotion: true,
        zIndex: 60,
      });
    }, 140);
  }
}
