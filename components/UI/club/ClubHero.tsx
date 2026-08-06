"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { RevealItem, RevealGroup } from "@/components/UI/aruz/reveal";

/** سروا کلاب's hero: the book alone, centre stage.
 *
 *  The invitation is written across its two pages rather than set beside it, so
 *  nothing competes with the object — the sides of the book are deliberately
 *  empty. Only what you can press lives below it.
 *
 *  Because the words are inside the scene, they are repeated here in a visually
 *  hidden heading: a canvas texture is invisible to a screen reader and to a
 *  search engine, and this page's whole subject is words.
 *
 *  The entrance waits for the site's logo intro. `LogoReveal` covers the screen
 *  for 3.1s on the first load of a session; without the gate the book would
 *  open behind the splash and be still by the time anyone could see it. */

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
    <section dir="rtl" className="relative mb-10">
      {/* the words carved into the pages, for readers who cannot see a canvas */}
      <h1 className="sr-only">
        سروا کلاب — اینجا می‌توانی شعرت را به دست بقیه برسانی. با نام خودت یا
        بی‌نام؛ بقیه زیرش می‌نویسند؛ پیش از انتشار بررسی می‌شود.
      </h1>

      {/* ---------- ambience ---------- */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute left-1/2 top-4 size-[620px] -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 22%, transparent), transparent 68%)",
            ...(reduced
              ? null
              : { animation: "aruzDrift 18s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
        <div
          className="absolute -left-24 top-1/3 size-[420px] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 16%, transparent), transparent 68%)",
            ...(reduced
              ? null
              : { animation: "aruzDrift2 22s ease-in-out infinite", willChange: "transform, opacity" }),
          }}
        />
      </div>

      {/* ---------- the book, alone and large ---------- */}
      <div className="relative mx-auto h-[380px] w-full max-w-6xl xs:h-[440px] sm:h-[580px] lg:h-[720px]">
        {ready && <SarvaBook3D className="h-full w-full" />}
      </div>

      {/* ---------- below it, the parts you can press ---------- */}
      <RevealGroup stagger={0.1} className="mt-2 flex flex-col items-center gap-5">
        <RevealItem>
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
        </RevealItem>

        {stats.poems > 0 && (
          <RevealItem>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
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
