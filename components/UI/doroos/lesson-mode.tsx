"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/** Study or practice, for the whole درس at once.
 *
 *  This started as a switch on every بیت — seventeen of them down one page,
 *  each toggling only its own card. That is not a mode, it is a per-card
 *  setting nobody notices, and it makes "practice the lesson" seventeen
 *  separate decisions. One control at the top, one score for the lesson. */

export type LessonMode = "study" | "practice";

type Ctx = {
  mode: LessonMode;
  setMode: (m: LessonMode) => void;
  /** each بیت reports its own tally so the header can total them */
  report: (id: number, found: number, total: number) => void;
  score: { found: number; total: number };
  /** bumped when the reader restarts, so every بیت clears itself */
  resetToken: number;
  reset: () => void;
};

const LessonModeContext = createContext<Ctx | null>(null);

export function LessonModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeRaw] = useState<LessonMode>("study");
  const [resetToken, setResetToken] = useState(0);
  /** bumped whenever a بیت reports a new tally; the total is derived from it */
  const [version, bump] = useState(0);
  const tallies = useRef(new Map<number, { found: number; total: number }>());

  const report = useCallback((id: number, found: number, total: number) => {
    const prev = tallies.current.get(id);
    if (prev && prev.found === found && prev.total === total) return;
    tallies.current.set(id, { found, total });
    bump((n) => n + 1);
  }, []);

  const reset = useCallback(() => {
    tallies.current.clear();
    setResetToken((n) => n + 1);
  }, []);

  const setMode = useCallback(
    (m: LessonMode) => {
      tallies.current.clear();
      setResetToken((n) => n + 1);
      setModeRaw(m);
    },
    [],
  );

  const score = useMemo(() => {
    let found = 0;
    let total = 0;
    for (const t of tallies.current.values()) {
      found += t.found;
      total += t.total;
    }
    return { found, total };
    // `version` is the signal: the map is a ref, so nothing else about it
    // changes identity when a بیت reports in
  }, [version, resetToken, mode]);

  return (
    <LessonModeContext.Provider value={{ mode, setMode, report, score, resetToken, reset }}>
      {children}
    </LessonModeContext.Provider>
  );
}

/** Returns null outside a provider, so a بیت rendered on its own still works. */
export function useLessonMode() {
  return useContext(LessonModeContext);
}
