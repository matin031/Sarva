"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { RevealGroup, RevealItem, RevealWords } from "@/components/UI/aruz/reveal";
import type { PlanetKind } from "./PlanetView";

const PlanetView = dynamic(() => import("./PlanetView"), { ssr: false });

export type Stop = {
  index: string;
  tag: string;
  title: string;
  desc: string;
  steps: string[];
  href: string;
  cta: string;
  accent: string;
  planet: PlanetKind;
};

/** One stop on the galaxy map: a planet on one side, its briefing panel on the
 *  other. Sides alternate so the space cable can weave between them. */
export default function PlanetStop({
  stop,
  flip,
  reduced,
}: {
  stop: Stop;
  flip: boolean;
  reduced: boolean;
}) {
  const { index, tag, title, desc, steps, href, cta, accent, planet } = stop;

  return (
    <section
      dir="rtl"
      className="relative z-20 container flex min-h-[86vh] items-center py-16"
    >
      <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-14">
        {/* the planet */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 70, damping: 16 }}
          className={`relative z-10 flex justify-center ${flip ? "lg:order-2" : ""}`}
        >
          {/* planet halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 size-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[70px]"
            style={{ background: accent }}
          />
          <PlanetView kind={planet} reduced={reduced} />
        </motion.div>

        {/* briefing panel — opaque so the starfield never washes out the text */}
        <RevealGroup
          stagger={0.1}
          className={`relative z-20 ${flip ? "lg:order-1" : ""}`}
        >
          <div className="relative z-20 rounded-[1.75rem] border border-border bg-card p-6 shadow-2xl sm:p-8">
            <RevealItem>
              <div className="mb-4 flex items-center gap-3">
                <span
                  className="font-mono text-xs tracking-[0.3em]"
                  style={{ color: accent }}
                >
                  PLANET {index}
                </span>
                <span className="h-px flex-1" style={{ background: `${accent}55` }} />
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    color: accent,
                    background: `color-mix(in oklch, ${accent} 14%, transparent)`,
                  }}
                >
                  {tag}
                </span>
              </div>
            </RevealItem>

            <h2 className="text-2xl font-black text-foreground sm:text-3xl">
              <RevealWords text={title} />
            </h2>

            <RevealItem>
              <p className="mt-3 leading-relaxed text-muted-foreground">{desc}</p>
            </RevealItem>

            <RevealItem>
              <ul className="mt-5 space-y-2.5">
                {steps.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm text-foreground/90"
                  >
                    <span
                      className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                      style={{ background: accent }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        className="size-3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m4.5 12.75 6 6 9-13.5"
                        />
                      </svg>
                    </span>
                    {s}
                  </li>
                ))}
              </ul>
            </RevealItem>

            <RevealItem>
              <Link
                href={href}
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 font-bold text-white shadow-lg transition-all active:scale-95"
                style={{ background: accent, boxShadow: `0 10px 30px -10px ${accent}` }}
              >
                {cta}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 6 5 12l6 6M19 12H5"
                  />
                </svg>
              </Link>
            </RevealItem>
          </div>
        </RevealGroup>
      </div>
    </section>
  );
}
