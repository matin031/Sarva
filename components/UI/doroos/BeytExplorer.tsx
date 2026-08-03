"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Beyt } from "@/lib/doroos/types";
import { marksForBeyt, tokenize, type Mark, type Realm } from "@/lib/doroos/annotations";

/** The بیت as the interface.
 *
 *  Every note in the lesson already says which words it is about — that is what
 *  the matcher in lib/doroos/annotations works out. The previous attempt drew
 *  that on the poem in ink, and fighting the layout was a losing game: arcs
 *  crossed labels, labels collided, and a phone made all of it worse.
 *
 *  Highlighting says the same thing and cannot collide with anything. It also
 *  works in the direction a reader actually wants: point at a word to see what
 *  is said about it, *or* point at a note to see which words it means. Two
 *  gestures, one dataset, no geometry.
 *
 *  «تمرین» turns the same data into a question: the notes are hidden and the
 *  reader has to find the words that carry them. */

type Mode = "explore" | "practice";

const REALM_META: Record<Realm, { label: string; token: string; dot: string }> = {
  linguistic: { label: "زبانی", token: "--color-primary", dot: "bg-primary" },
  literary: { label: "ادبی", token: "--color-gold", dot: "bg-gold" },
};

const EASE = [0.16, 1, 0.3, 1] as const;

export default function BeytExplorer({
  beyt,
  children,
}: {
  beyt: Beyt;
  /** rendered between the بیت and its notes — معنی و مفهوم belong there, since
   *  they are what a reader wants before any analysis */
  children?: React.ReactNode;
}) {
  const hemis = useMemo(() => beyt.hemistichs.map(tokenize), [beyt]);
  const marks = useMemo(() => marksForBeyt(beyt), [beyt]);

  const [mode, setMode] = useState<Mode>("explore");
  const [realms, setRealms] = useState<Realm[]>(["linguistic", "literary"]);
  /** the word the reader is pointing at, as "h:i" */
  const [activeWord, setActiveWord] = useState<string | null>(null);
  /** the note the reader is pointing at */
  const [activeMark, setActiveMark] = useState<string | null>(null);
  /** practice: words already found, and words tried and rejected */
  const [found, setFound] = useState<Set<string>>(new Set());
  const [missed, setMissed] = useState<string | null>(null);

  const shown = marks.filter((m) => realms.includes(m.realm));
  const anchored = shown.filter((m) => m.kind !== "line");
  const general = shown.filter((m) => m.kind === "line");

  /** word key → the notes that mention it */
  const wordMarks = useMemo(() => {
    const map = new Map<string, Mark[]>();
    for (const m of anchored) {
      for (const s of m.spans) {
        if (s.from < 0) continue;
        for (let i = s.from; i <= s.to; i++) {
          const k = `${s.h}:${i}`;
          const list = map.get(k) ?? [];
          list.push(m);
          map.set(k, list);
        }
      }
    }
    return map;
  }, [anchored]);

  const marksOfWord = (k: string) => wordMarks.get(k) ?? [];
  const wordsOfMark = (id: string) => {
    const m = anchored.find((x) => x.id === id);
    if (!m) return new Set<string>();
    const out = new Set<string>();
    for (const s of m.spans) for (let i = s.from; i <= s.to; i++) out.add(`${s.h}:${i}`);
    return out;
  };

  const litByMark = activeMark ? wordsOfMark(activeMark) : null;
  const litByWord = activeWord ? new Set([activeWord]) : null;

  const total = wordMarks.size;
  const done = found.size >= total && total > 0;

  function tapWord(k: string) {
    if (mode === "explore") {
      setActiveWord((prev) => (prev === k ? null : k));
      setActiveMark(null);
      return;
    }
    if (marksOfWord(k).length > 0) {
      setFound((prev) => new Set(prev).add(k));
      setMissed(null);
    } else {
      setMissed(k);
      window.setTimeout(() => setMissed((m) => (m === k ? null : m)), 550);
    }
  }

  function resetPractice() {
    setFound(new Set());
    setMissed(null);
  }

  return (
    <div dir="rtl" className="relative z-20">
      {/* ---------- controls ---------- */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
          {(
            [
              ["explore", "کاوش"],
              ["practice", "تمرین"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setMode(v);
                setActiveWord(null);
                setActiveMark(null);
                resetPractice();
              }}
              aria-pressed={mode === v}
              className={`min-h-9 rounded-full px-4 text-xs font-bold transition-colors ${
                mode === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(Object.keys(REALM_META) as Realm[]).map((r) => {
            const on = realms.includes(r);
            const meta = REALM_META[r];
            return (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRealms((prev) =>
                    prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
                  );
                  resetPractice();
                }}
                aria-pressed={on}
                className="flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-bold transition-all"
                style={{
                  borderColor: on ? `var(${meta.token})` : "var(--color-border)",
                  color: on ? `var(${meta.token})` : "var(--color-muted-foreground)",
                  background: on
                    ? `color-mix(in oklch, var(${meta.token}) 12%, transparent)`
                    : "transparent",
                }}
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: on ? `var(${meta.token})` : "var(--color-border)" }}
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- the بیت ---------- */}
      <div className="flex flex-col items-center gap-2 text-center">
        {hemis.map((words, h) => (
          <p
            key={h}
            className="flex flex-wrap items-center justify-center gap-x-1 font-serif text-xl leading-[2.1] font-bold text-foreground sm:text-2xl md:text-[1.65rem]"
          >
            {words.map((w, i) => {
              const k = `${h}:${i}`;
              const ms = marksOfWord(k);
              const interactive = ms.length > 0;
              const realm = ms[0]?.realm;
              const token = realm ? REALM_META[realm].token : "--color-primary";

              const isFound = found.has(k);
              const isMissed = missed === k;
              const lit =
                mode === "explore"
                  ? (litByMark?.has(k) ?? false) || (litByWord?.has(k) ?? false)
                  : isFound;
              // in practice the marked words must not give themselves away
              const hint = mode === "explore" && interactive;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => tapWord(k)}
                  onMouseEnter={() => mode === "explore" && interactive && setActiveWord(k)}
                  onMouseLeave={() => mode === "explore" && setActiveWord(null)}
                  disabled={mode === "explore" && !interactive}
                  className={`relative rounded-md px-1 transition-all duration-200 ${
                    mode === "practice" ? "cursor-pointer" : interactive ? "cursor-pointer" : "cursor-default"
                  } ${isMissed ? "animate-[hbShake_0.4s_ease]" : ""}`}
                  style={{
                    background: lit
                      ? `color-mix(in oklch, var(${token}) 20%, transparent)`
                      : "transparent",
                    boxShadow: hint
                      ? `inset 0 -2px 0 0 color-mix(in oklch, var(${token}) 45%, transparent)`
                      : undefined,
                    color: lit ? `var(${token})` : undefined,
                  }}
                >
                  {w}
                </button>
              );
            })}
          </p>
        ))}
      </div>

      {/* ---------- practice progress ---------- */}
      {mode === "practice" && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
          <span className="text-muted-foreground">
            واژه‌های نکته‌دار را پیدا کن — {found.size} از {total}
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: total ? `${(found.size / total) * 100}%` : "0%" }}
              transition={{ duration: 0.4, ease: EASE }}
            />
          </div>
          {found.size > 0 && (
            <button
              type="button"
              onClick={resetPractice}
              className="text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              از نو
            </button>
          )}
          <AnimatePresence>
            {done && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-full bg-primary/15 px-3 py-1 text-xs font-black text-primary"
              >
                همه را پیدا کردی
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}

      {children && <div className="mt-7">{children}</div>}

      {/* ---------- the notes ---------- */}
      <div className="mt-7 space-y-2">
        {anchored.map((m) => {
          const meta = REALM_META[m.realm];
          const words = wordsOfMark(m.id);
          const isActive =
            activeMark === m.id || (activeWord ? words.has(activeWord) : false);
          // in practice a note stays hidden until its word has been found
          const revealed =
            mode === "explore" || [...words].some((w) => found.has(w));

          return (
            <motion.button
              key={m.id}
              type="button"
              layout
              onMouseEnter={() => {
                setActiveMark(m.id);
                setActiveWord(null);
              }}
              onMouseLeave={() => setActiveMark(null)}
              onClick={() => setActiveMark((p) => (p === m.id ? null : m.id))}
              className={`flex w-full items-start gap-3 rounded-xl border px-4 py-2.5 text-right transition-all duration-200 ${
                isActive ? "border-transparent" : "border-border/60"
              }`}
              style={{
                background: isActive
                  ? `color-mix(in oklch, var(${meta.token}) 10%, transparent)`
                  : "transparent",
                borderColor: isActive ? `var(${meta.token})` : undefined,
                opacity: revealed ? 1 : 0.35,
              }}
            >
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: `var(${meta.token})` }}
              />
              <span className="flex-1 text-sm leading-relaxed text-foreground">
                {revealed ? (
                  <>
                    <span className="font-bold" style={{ color: `var(${meta.token})` }}>
                      {[...words]
                        .sort()
                        .map((k) => {
                          const [h, i] = k.split(":").map(Number);
                          return hemis[h][i];
                        })
                        .join(" ")}
                    </span>
                    {" — "}
                    {m.kind === "roles" ? m.roleLabels?.join(" / ") : m.label}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    یک نکتهٔ {REALM_META[m.realm].label} — هنوز پیدا نشده
                  </span>
                )}
              </span>
            </motion.button>
          );
        })}

        {general.length > 0 && (
          <div className="mt-4 rounded-xl border border-dashed border-border/70 px-4 py-3">
            <p className="mb-2 text-xs font-black text-muted-foreground">
              دربارهٔ کلِ بیت
            </p>
            <ul className="space-y-1.5">
              {general.map((n) => (
                <li key={n.id} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full"
                    style={{ background: `var(${REALM_META[n.realm].token})` }}
                  />
                  <span>{n.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
