"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { RevealGroup, RevealItem, RevealLine } from "@/components/UI/aruz/reveal";

/** سروا کلاب's hero.
 *
 *  Plain HTML, centred, quiet: a badge, the invitation, the three rules of the
 *  place, and the one button that matters. Nothing here competes with the
 *  poems below it, and the words are real text — selectable, readable by a
 *  screen reader, and visible to a search engine, which matters more on a page
 *  whose entire subject is words than any amount of scenery would. */

export default function ClubHero({
  signedIn,
  stats,
}: {
  signedIn: boolean;
  stats: { poems: number; poets: number; comments: number };
}) {
  const reduced = useReducedMotion();
  const fa = (n: number) => n.toLocaleString("fa-IR");

  return (
    <section dir="rtl" className="relative mb-10 pt-6 pb-2 text-center">
      {/* ---------- ambience ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-0 size-[520px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 18%, transparent), transparent 70%)",
            ...(reduced
              ? null
              : { animation: "aruzDrift 18s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
      </div>

      <RevealGroup stagger={0.1} className="mx-auto flex max-w-2xl flex-col items-center">
        <RevealItem>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary sm:text-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
            سروا کلاب
          </span>
        </RevealItem>

        <h1 className="mt-5 text-3xl leading-[1.35] font-black sm:text-4xl">
          <RevealLine className="text-foreground" delay={0.08}>
            اینجا می‌توانی شعرت را
          </RevealLine>
          <RevealLine className="aruz-gradient-text" delay={0.2}>
            به دست بقیه برسانی
          </RevealLine>
        </h1>

        <RevealItem>
          <p className="mt-5 max-w-lg text-sm leading-8 text-muted-foreground sm:text-base">
            خیلی‌ها می‌سرایند و به کسی نشان نمی‌دهند. سروا کلاب برای همان‌هاست:
            بیتی که گفته‌ای را بفرست — اگر خجالت می‌کشی، بی‌نام — بقیه زیرش
            می‌نویسند.
          </p>
        </RevealItem>

        <RevealItem>
          <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {["با نام خودت، یا بی‌نام", "بقیه زیرش می‌نویسند", "پیش از انتشار بررسی می‌شود"].map(
              (line) => (
                <li key={line} className="flex items-center gap-2">
                  <span className="inline-block size-1.5 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ),
            )}
          </ul>
        </RevealItem>

        <RevealItem>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
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
            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-muted-foreground">
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
    </section>
  );
}
