"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

/** سروا کلاب's hero: a book the width of the page that riffles its leaves the
 *  moment the page is ready and settles open on the invitation.
 *
 *  The mechanics live in `app/globals.css` (`.club-*`) — one preserve-3d scene
 *  and six staggered `transform` animations, no library and no rAF loop.
 *
 *  Two things this component is responsible for:
 *
 *  • Waiting for the site's logo intro. `LogoReveal` covers the whole screen
 *    for 3.1s on the first load of a session, which is longer than the whole
 *    riffle — without this gate the book would finish under the splash and the
 *    reader would only ever meet an already-open book.
 *
 *  • Keeping every click target outside the book. Nothing rotated in 3D has to
 *    behave as a button; the call to action sits underneath. */

/** What is glimpsed as the leaves go past.
 *
 *  Each leaf carries a whole بیت: the first مصراع on the face lying on the
 *  left, the second on the back that lands on the right. So the riffle reads
 *  as a couplet completing itself every time a page turns, and no two visible
 *  pages ever repeat a line — which is what happened when fronts and backs
 *  were drawn from the same list. */
const RIFFLE: { front: string; back: string }[] = [
  { front: "بشنو این نی چون شکایت می‌کند", back: "از جدایی‌ها حکایت می‌کند" },
  { front: "هر که را اسرار حق آموختند", back: "مُهر کردند و دهانش دوختند" },
  { front: "بنی‌آدم اعضای یک پیکرند", back: "که در آفرینش ز یک گوهرند" },
  { front: "توانا بود هر که دانا بود", back: "ز دانش دل پیر برنا بود" },
  { front: "…و این یکی هنوز امضا ندارد", back: "" },
];

const LEAF_COUNT = RIFFLE.length;
const FIRST_DELAY = 0.3;
const STAGGER = 0.13;
const TURN = 0.62;
/** the moment the last leaf has finished landing */
const SETTLED = FIRST_DELAY + (LEAF_COUNT - 1) * STAGGER + TURN;

function Verse({
  text,
  side,
  under,
}: {
  text: string;
  side: "left" | "right";
  /** the page the turned leaves pile on top of */
  under?: boolean;
}) {
  return (
    <div
      dir="rtl"
      className={`club-sheet club-sheet--${side} ${under ? "club-sheet--under" : ""}`}
    >
      <span className="club-paper pointer-events-none absolute inset-0 opacity-[0.05]" />
      <p
        className="font-serif text-muted-foreground/60"
        style={{ fontSize: "clamp(9px, 1.9cqw, 19px)" }}
      >
        {text}
      </p>
    </div>
  );
}

export default function ClubHero({
  signedIn,
  stats,
}: {
  signedIn: boolean;
  stats: { poems: number; poets: number; comments: number };
}) {
  const reduced = useReducedMotion();
  const [waiting, setWaiting] = useState(true);
  const fa = (n: number) => n.toLocaleString("fa-IR");

  useEffect(() => {
    // A zero timeout, not a direct read: LogoReveal marks the document in its
    // own mount effect, and every effect of the initial commit flushes before
    // any timer fires — so by now the flag is either set or the intro is not
    // playing at all (a repeat visit in the same session).
    const t = setTimeout(() => {
      if (document.documentElement.dataset.sarvaIntro !== "playing") {
        setWaiting(false);
        return;
      }
      window.addEventListener("sarva:intro-done", () => setWaiting(false), { once: true });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <section dir="rtl" className="relative mb-10">
      {/* ---------- ambience ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -right-32 -top-28 size-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 24%, transparent), transparent 66%)",
            ...(reduced
              ? null
              : { animation: "aruzDrift 18s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
        <div
          className="absolute -left-28 top-1/4 size-[460px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 18%, transparent), transparent 66%)",
            ...(reduced
              ? null
              : { animation: "aruzDrift2 22s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
      </div>

      {/* ---------- the book ----------
          `dir="ltr"` on the scene is load-bearing: RTL reverses flex order,
          which swaps the halves and hinges every leaf on its outer edge. */}
      <div className={`club-book relative ${waiting ? "club-book--waiting" : ""}`}>
        <div className="club-spread" dir="ltr">
          <div className="club-board" aria-hidden />

          {/* ---- left half: the page uncovered as the leaves depart ---- */}
          <div className="club-half">
            <div dir="rtl" className="club-sheet club-sheet--left">
              <span className="club-paper pointer-events-none absolute inset-0 opacity-[0.05]" />
              <div
                className={`flex flex-col items-center ${waiting ? "" : "club-settle"}`}
                style={{
                  ["--club-delay" as string]: `${SETTLED - 0.15}s`,
                  gap: "2cqw",
                  opacity: waiting ? 0 : undefined,
                }}
              >
                {["با نام خودت، یا بی‌نام", "بقیه زیرش می‌نویسند", "پیش از انتشار بررسی می‌شود"].map(
                  (line) => (
                    <p
                      key={line}
                      className="flex items-center gap-[1.4cqw] text-muted-foreground"
                      style={{ fontSize: "clamp(8px, 1.75cqw, 17px)" }}
                    >
                      <span
                        className="inline-block shrink-0 rounded-full bg-primary"
                        style={{ width: "0.75cqw", height: "0.75cqw" }}
                      />
                      {line}
                    </p>
                  ),
                )}
              </div>
            </div>

            {/* ---- the leaves that riffle across the spine ---- */}
            {RIFFLE.map((beyt, i) => {
              const last = i === LEAF_COUNT - 1;
              const delay = `${FIRST_DELAY + i * STAGGER}s`;
              return (
                <div
                  key={beyt.front}
                  aria-hidden={!last}
                  className="club-leaf"
                  style={{
                    // nearest the reader at rest, farthest once turned
                    ["--club-d" as string]: `${(LEAF_COUNT - i) * 0.7}px`,
                    ["--club-delay" as string]: delay,
                  }}
                >
                  <div className="club-face">
                    <Verse text={beyt.front} side="left" />
                    <div className="club-leaf-shade" style={{ ["--club-delay" as string]: delay }} />
                  </div>

                  {/* The back of the last leaf is the page the book stops on:
                      it is the surface facing the reader once everything has
                      turned, so the invitation is written there. */}
                  <div className="club-face club-face--back">
                    {last ? (
                      <div dir="rtl" className="club-sheet club-sheet--right">
                        <span className="club-paper pointer-events-none absolute inset-0 opacity-[0.05]" />
                        <div
                          className={waiting ? "" : "club-settle"}
                          style={{
                            ["--club-delay" as string]: `${SETTLED - 0.2}s`,
                            opacity: waiting ? 0 : undefined,
                          }}
                        >
                          <span
                            className="inline-block rounded-full bg-primary/12 font-semibold text-primary"
                            style={{ fontSize: "clamp(8px, 1.5cqw, 15px)", padding: "0.6cqw 2cqw" }}
                          >
                            سروا کلاب
                          </span>
                          <h1
                            className="text-balance font-black leading-[1.6]"
                            style={{ fontSize: "clamp(13px, 3.2cqw, 35px)", marginTop: "2cqw" }}
                          >
                            اینجا می‌توانی شعرت را
                            <br />
                            <span className="aruz-gradient-text">به دست بقیه برسانی</span>
                          </h1>
                          <p
                            className="mx-auto leading-[2] text-muted-foreground"
                            style={{
                              fontSize: "clamp(8px, 1.75cqw, 17px)",
                              marginTop: "2cqw",
                              maxWidth: "82%",
                            }}
                          >
                            خیلی‌ها می‌سرایند و به کسی نشان نمی‌دهند. این صفحه برای
                            همان‌هاست.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <Verse text={beyt.back} side="right" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ---- right half: what lies under the turned leaves ---- */}
          <div className="club-half">
            <Verse text="دفتری که هنوز نوشته نشده" side="right" under />
          </div>
        </div>
      </div>

      {/* ---------- below the book: the parts you can actually press ---------- */}
      <div
        className={`mt-8 flex flex-col items-center gap-5 ${waiting ? "" : "club-settle"}`}
        style={{
          ["--club-delay" as string]: `${SETTLED + 0.05}s`,
          opacity: waiting ? 0 : undefined,
        }}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="#club-composer"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            {signedIn ? "سرودهٔ تازه بفرست" : "سروده‌ات را بفرست"}
          </Link>
          {signedIn && (
            <Link
              href="/panel/club"
              className="rounded-xl border border-border px-6 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              سروده‌ها و دیدگاه‌های من
            </Link>
          )}
        </div>

        {stats.poems > 0 && (
          <div className="flex items-center gap-5 text-xs text-muted-foreground sm:gap-7">
            {[
              { v: stats.poems, l: "سروده" },
              { v: stats.poets, l: "شاعر" },
              { v: stats.comments, l: "دیدگاه" },
            ].map((s) => (
              <span key={s.l} className="flex items-baseline gap-1.5">
                <b className="text-base font-black text-primary">{fa(s.v)}</b>
                {s.l}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
