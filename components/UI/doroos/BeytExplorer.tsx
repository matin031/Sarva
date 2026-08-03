"use client";

import { useMemo, useState } from "react";
import type { Beyt } from "@/lib/doroos/types";
import { marksForBeyt, tokenize, type Mark, type Realm } from "@/lib/doroos/annotations";

/** The بیت as the interface.
 *
 *  Every note in the lesson already says which words it is about — that is what
 *  the matcher in lib/doroos/annotations works out. Drawing that on the poem in
 *  ink was a losing fight with layout; highlighting says the same thing and
 *  cannot collide with anything, because there is no geometry to collide.
 *
 *  It reads in both directions, which is the whole point: rest on a word to see
 *  what is said about it, or rest on a note to see which words it means. */

const REALM_META: Record<Realm, { label: string; short: string; token: string }> = {
  linguistic: { label: "قلمرو زبانی", short: "زبانی", token: "--color-primary" },
  literary: { label: "قلمرو ادبی", short: "ادبی", token: "--color-gold" },
};

const ORDER: Realm[] = ["linguistic", "literary"];

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

  const [realms, setRealms] = useState<Realm[]>(ORDER);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [activeMark, setActiveMark] = useState<string | null>(null);

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
          map.set(k, [...(map.get(k) ?? []), m]);
        }
      }
    }
    return map;
  }, [anchored]);

  const wordsOfMark = (id: string) => {
    const m = anchored.find((x) => x.id === id);
    const out = new Set<string>();
    if (!m) return out;
    for (const s of m.spans) for (let i = s.from; i <= s.to; i++) out.add(`${s.h}:${i}`);
    return out;
  };

  const lit = activeMark
    ? wordsOfMark(activeMark)
    : activeWord
      ? new Set([activeWord])
      : null;

  /** when a note is doing the lighting, the poem should answer in that note's
   *  colour — otherwise a قلمرو ادبی note lights its words in the زبانی teal */
  const litToken = activeMark
    ? REALM_META[anchored.find((m) => m.id === activeMark)?.realm ?? "linguistic"].token
    : null;

  /** the words a note is about, as they read in the poem */
  const phraseOf = (m: Mark) =>
    [...wordsOfMark(m.id)]
      .sort((a, b) => {
        const [ah, ai] = a.split(":").map(Number);
        const [bh, bi] = b.split(":").map(Number);
        return ah - bh || ai - bi;
      })
      .map((k) => {
        const [h, i] = k.split(":").map(Number);
        return hemis[h][i];
      })
      .join(" ");

  const clear = () => {
    setActiveWord(null);
    setActiveMark(null);
  };

  return (
    <div dir="rtl" className="relative z-20">
      {/* ---------- the بیت ---------- */}
      <div className="flex flex-col items-center">
        {hemis.map((words, h) => (
          <div key={h} className="contents">
            {h === 1 && (
              /* a hairline between the two مصراع, fading at both ends — enough
                 to separate them without drawing a box around the poem */
              <div
                aria-hidden
                className="my-3 h-px w-32 bg-gradient-to-l from-transparent via-primary/30 to-transparent sm:w-48"
              />
            )}
            <p className="flex flex-wrap items-center justify-center gap-x-0.5 text-center font-serif text-xl leading-[2] font-bold text-foreground sm:text-2xl md:text-[1.7rem]">
              {words.map((w, i) => {
                const k = `${h}:${i}`;
                const ms = wordMarks.get(k) ?? [];
                const interactive = ms.length > 0;
                const on = lit?.has(k) ?? false;
                const dimmed = lit !== null && !on;
                const token =
                  (on && litToken) || (ms[0] ? REALM_META[ms[0].realm].token : "--color-primary");

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!interactive}
                    onClick={() => {
                      setActiveMark(null);
                      setActiveWord((p) => (p === k ? null : k));
                    }}
                    onMouseEnter={() => interactive && (setActiveMark(null), setActiveWord(k))}
                    onMouseLeave={clear}
                    className={`relative rounded-lg px-1.5 py-0.5 transition-all duration-300 ${
                      interactive ? "cursor-pointer" : "cursor-default"
                    }`}
                    style={{
                      backgroundColor: on
                        ? `color-mix(in oklch, var(${token}) 18%, transparent)`
                        : "transparent",
                      /* the "there is a note here" hint is painted as a
                         gradient rather than an inset shadow: an inset shadow
                         follows the rounded corners and curves up into a cup,
                         which reads as a box around every word */
                      backgroundImage:
                        interactive && !on
                          ? `linear-gradient(color-mix(in oklch, var(${token}) 35%, transparent), color-mix(in oklch, var(${token}) 35%, transparent))`
                          : undefined,
                      backgroundSize: "100% 1px",
                      backgroundPosition: "bottom",
                      backgroundRepeat: "no-repeat",
                      color: on ? `var(${token})` : undefined,
                      opacity: dimmed ? 0.45 : 1,
                      boxShadow: on
                        ? `0 0 0 1px color-mix(in oklch, var(${token}) 40%, transparent)`
                        : undefined,
                    }}
                  >
                    {w}
                  </button>
                );
              })}
            </p>
          </div>
        ))}
      </div>

      {children && <div className="mt-8">{children}</div>}

      {/* ---------- filter ---------- */}
      {anchored.length > 0 && (
        <div className="mt-9 flex items-center gap-3">
          <span className="text-xs font-bold whitespace-nowrap text-muted-foreground">
            نکته‌ها
          </span>
          <div
            aria-hidden
            className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent"
          />
          <div className="flex gap-1.5">
            {ORDER.map((r) => {
              const on = realms.includes(r);
              const meta = REALM_META[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() =>
                    setRealms((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]))
                  }
                  aria-pressed={on}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold transition-all"
                  style={{
                    color: on ? `var(${meta.token})` : "var(--color-muted-foreground)",
                    background: on
                      ? `color-mix(in oklch, var(${meta.token}) 12%, transparent)`
                      : "transparent",
                  }}
                >
                  <span
                    className="size-1.5 rounded-full transition-colors"
                    style={{ background: on ? `var(${meta.token})` : "var(--color-border)" }}
                  />
                  {meta.short}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------- notes, grouped by قلمرو ---------- */}
      <div className="mt-4 space-y-6">
        {ORDER.filter((r) => realms.includes(r)).map((r) => {
          const rows = anchored.filter((m) => m.realm === r);
          if (!rows.length) return null;
          const meta = REALM_META[r];
          return (
            <section key={r}>
              <h4
                className="mb-2 text-[0.72rem] font-black tracking-wide"
                style={{ color: `var(${meta.token})` }}
              >
                {meta.label}
              </h4>
              <ul
                className="space-y-0.5 border-e-2 pe-3"
                style={{ borderColor: `color-mix(in oklch, var(${meta.token}) 30%, transparent)` }}
              >
                {rows.map((m) => {
                  const isOn = activeMark === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onMouseEnter={() => (setActiveWord(null), setActiveMark(m.id))}
                        onMouseLeave={clear}
                        onClick={() => setActiveMark((p) => (p === m.id ? null : m.id))}
                        className="flex w-full items-baseline gap-2 rounded-lg px-2.5 py-1.5 text-right transition-colors duration-200"
                        style={{
                          background: isOn
                            ? `color-mix(in oklch, var(${meta.token}) 10%, transparent)`
                            : "transparent",
                        }}
                      >
                        <span
                          className="shrink-0 text-sm font-bold transition-colors"
                          style={{ color: `var(${meta.token})` }}
                        >
                          {phraseOf(m)}
                        </span>
                        {/* a thin rule instead of a bare gap: without it the
                            phrase and its label read as one run-on line */}
                        <span
                          aria-hidden
                          className="mt-2 h-px w-4 shrink-0 self-start"
                          style={{
                            background: `color-mix(in oklch, var(${meta.token}) 45%, transparent)`,
                          }}
                        />
                        <span className="text-sm leading-relaxed text-muted-foreground">
                          {/* the comma hugs the word before it, or a wrap can
                              orphan it onto the start of the next line */}
                          {m.kind === "roles" ? m.roleLabels?.join("، ") : m.label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {general.length > 0 && (
          <section>
            <h4 className="mb-2 text-[0.72rem] font-black tracking-wide text-muted-foreground">
              دربارهٔ کلِ بیت
            </h4>
            <ul className="space-y-1.5 border-e-2 border-border pe-3">
              {general.map((n) => (
                <li
                  key={n.id}
                  className="px-2.5 text-sm leading-relaxed text-muted-foreground"
                >
                  {n.label}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
