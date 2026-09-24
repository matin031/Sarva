"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { Check, Fingerprint } from "lucide-react";
import HandsUpFigure, { type FigureMood } from "./HandsUpFigure";
import { usePointer } from "./pointer";
import type { SuspectRole } from "@/lib/jasoos-data";
import styles from "./jasoos.module.css";

export type SuspectVisualState = "idle" | "shot-correct" | "shot-wrong" | "dimmed";

export default function Suspect({ role, state, wordInVerse, onShoot, index = 0, gloat = false, isSpy = false }: {
  role: SuspectRole;
  state: SuspectVisualState;
  wordInVerse?: string;
  onShoot: () => void;
  index?: number;
  gloat?: boolean;
  isSpy?: boolean;
}) {
  const revealed = state !== "idle";
  const reduced = useReducedMotion();
  const pointer = usePointer();
  const [pointerAimed, setPointerAimed] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const aimed = pointerAimed || keyboardFocused;
  const headRef = useRef<HTMLButtonElement>(null);
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
    const apply = () => {
      const b = box.current;
      if (!b) return;
      const dx = pointer.x.get() - b.cx;
      const dy = pointer.y.get() - b.cy;
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 260);
      rawX.set((dx / d) * 2.6 * k);
      rawY.set((dy / d) * 2.6 * k);
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

  const mood: FigureMood = isSpy && gloat ? "smug" : aimed && !revealed ? "scared" : "calm";

  return (
    // Hover and click share the painted SVG silhouette, not the surrounding card.
    // Keep that silhouette still on hover so its edge cannot slide off the pointer.
    <div className={styles.suspect} data-aimed={aimed && !revealed} data-result={state} data-revealed={revealed ? isSpy ? "spy" : "innocent" : undefined}>
      <span className={styles.suspectIndex}><span aria-hidden="true" />مظنون {(index + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span>
      <div className={styles.figureStage}>
        <span className={styles.targetFrame} aria-hidden="true"><i /><i /><i /><i /></span>
        <span className={styles.stageLight} aria-hidden="true" />
        <button ref={headRef} type="button" className={styles.figure} onClick={onShoot} disabled={revealed}
          aria-label={`انتخاب ${role} به‌عنوان جاسوس`}
          onFocus={(event) => { measure(); setKeyboardFocused(event.currentTarget.matches(":focus-visible")); }}
          onBlur={() => setKeyboardFocused(false)}
          onPointerEnter={(event) => { measure(); if (event.pointerType !== "touch") setPointerAimed(true); }}
          onPointerLeave={() => setPointerAimed(false)}
          onPointerCancel={() => setPointerAimed(false)}>
          <span aria-hidden="true">
            <HandsUpFigure interactive outfit={index} mood={mood} eyeX={reduced ? undefined : eyeX} eyeY={reduced ? undefined : eyeY} />
          </span>
        </button>
        {state === "shot-correct" && <span className={styles.caughtStamp} aria-hidden="true">پیدا شد!</span>}
      </div>
      <span className={styles.role}>{role}</span>
      {revealed ? (
        <span className={styles.reveal}>{isSpy ? <Fingerprint size={13} /> : <Check size={13} />}{isSpy ? "جاسوس این پرونده" : wordInVerse || "بی‌گناه"}</span>
      ) : <span className={styles.suspectHint}>«من در متن هستم!»</span>}
    </div>
  );
}
