"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { RevealGroup, RevealItem, RevealWords } from "@/components/UI/aruz/reveal";
import type { Shape } from "./Chapter3D";

// WebGL is client-only and heavy; keep it out of the initial bundle
const Chapter3D = dynamic(() => import("./Chapter3D"), { ssr: false });

export type Chapter = {
  index: string;
  tag: string;
  title: string;
  desc: string;
  steps: string[];
  href: string;
  cta: string;
  accent: string; // CSS color (may be a var) for text/UI
  hex: string; // concrete hex for the WebGL material
  shape: Shape;
  badge: ReactNode; // small inline preview under the 3D object
};

/** One feature "chapter": a staggered text column beside a live 3D object.
 *  Alternates sides on `flip` for rhythm. */
export default function GuideChapter({
  chapter,
  flip,
  reduced,
}: {
  chapter: Chapter;
  flip: boolean;
  reduced: boolean;
}) {
  const { index, tag, title, desc, steps, href, cta, accent, hex, shape, badge } =
    chapter;

  return (
    <section dir="rtl" className="relative z-20 container py-14 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* text */}
        <RevealGroup
          stagger={0.1}
          className={`relative z-20 ${flip ? "lg:order-2" : ""}`}
        >
          <RevealItem>
            <div className="mb-4 flex items-center gap-3">
              <span
                className="text-4xl font-black tabular-nums sm:text-5xl"
                style={{ color: accent, opacity: 0.9 }}
              >
                {index}
              </span>
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

          <h2 className="text-2xl font-black text-foreground sm:text-3xl md:text-4xl">
            <RevealWords text={title} />
          </h2>

          <RevealItem>
            <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
              {desc}
            </p>
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
        </RevealGroup>

        {/* live 3D object on an opaque stage */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 44, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          className={`relative z-20 ${flip ? "lg:order-1" : ""}`}
        >
          <div className="relative z-20 overflow-hidden rounded-[2rem] border border-border bg-card p-4 shadow-2xl">
            {/* accent bloom behind the object */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
              style={{ background: accent }}
            />
            <div className="relative z-20">
              <Chapter3D shape={shape} color={hex} reduced={reduced} />
              <div className="mt-1 flex justify-center pb-2">{badge}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
