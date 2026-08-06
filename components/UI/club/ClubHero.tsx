"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { RevealGroup, RevealItem, RevealLine } from "@/components/UI/aruz/reveal";

/** سروا کلاب's hero: the invitation, beside the club's own book.
 *
 *  The book is a real 3D object (see SarvaBook3D) and is loaded only when this
 *  page is, so three.js never lands in the bundle of a page that has no use for
 *  it. The copy stays plain HTML rather than being drawn into the scene —
 *  text rendered into a canvas is blurry, unselectable and invisible to search
 *  engines, and this page's whole purpose is words.
 *
 *  The entrance waits for the site's logo intro. `LogoReveal` covers the screen
 *  for 3.1s on the first load of a session; without the gate the book would
 *  swing in behind the splash and be still by the time anyone could see it. */

const SarvaBook3D = dynamic(() => import("@/components/UI/club/SarvaBook3D"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default function ClubHero({
  signedIn,
  stats,
}: {
  signedIn: boolean;
  stats: { poems: number; poets: number; comments: number };
}) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const fa = (n: number) => n.toLocaleString("fa-IR");

  useEffect(() => {
    // A zero timeout, not a direct read: LogoReveal marks the document in its
    // own mount effect, and every effect of the initial commit flushes before
    // any timer fires — so by now the flag is either set, or the intro is not
    // playing at all (a repeat visit in the same session).
    const t = setTimeout(() => {
      if (document.documentElement.dataset.sarvaIntro !== "playing") {
        setReady(true);
        return;
      }
      window.addEventListener("sarva:intro-done", () => setReady(true), { once: true });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <section dir="rtl" className="relative mb-12">
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

      <div className="grid items-center gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
        {/* ---------- the words ---------- */}
        <RevealGroup stagger={0.12} className="text-center lg:text-right">
          <RevealItem>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm sm:text-sm">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              سروا کلاب
            </span>
          </RevealItem>

          <h1 className="mt-5 text-3xl leading-[1.3] font-black sm:text-4xl xl:text-5xl">
            <RevealLine className="text-foreground" delay={0.08}>
              اینجا می‌توانی شعرت را
            </RevealLine>
            <RevealLine className="aruz-gradient-text" delay={0.2}>
              به دست بقیه برسانی
            </RevealLine>
          </h1>

          <RevealItem>
            <p className="mx-auto mt-5 max-w-lg text-sm leading-8 text-muted-foreground sm:text-base lg:mx-0">
              خیلی‌ها می‌سرایند و به کسی نشان نمی‌دهند. سروا کلاب برای همان‌هاست:
              بیتی که گفته‌ای را بفرست — اگر خجالت می‌کشی، بی‌نام — بقیه زیرش
              می‌نویسند.
            </p>
          </RevealItem>

          <RevealItem>
            <ul className="mx-auto mt-6 flex max-w-lg flex-col items-center gap-2.5 text-sm text-muted-foreground lg:mx-0 lg:items-start">
              {["با نام خودت، یا بی‌نام", "بقیه زیرش می‌نویسند", "پیش از انتشار بررسی می‌شود"].map(
                (line) => (
                  <li key={line} className="flex items-center gap-2.5">
                    <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                    {line}
                  </li>
                ),
              )}
            </ul>
          </RevealItem>

          <RevealItem>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
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
          </RevealItem>

          {stats.poems > 0 && (
            <RevealItem>
              <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground lg:justify-start">
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
            </RevealItem>
          )}
        </RevealGroup>

        {/* ---------- the book ---------- */}
        <div className="relative order-first h-[300px] w-full sm:h-[380px] lg:order-none lg:h-[520px]">
          {/* a pool of light for it to stand in */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent 70%)",
            }}
          />
          {/* mounted only once the splash is gone, so the swing-in is seen */}
          {ready && <SarvaBook3D intro={!reduced} className="h-full w-full" />}
        </div>
      </div>
    </section>
  );
}
