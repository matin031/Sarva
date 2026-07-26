"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import type { Grade } from "@/lib/doroos/types";
import { faNum } from "@/lib/doroos";

const ACCENTS = ["--color-primary", "--color-gold", "--color-lapis-light"];

/** One textbook, drawn as a tilting spine. The tilt is driven by a pointer
 *  position cached on enter — never re-read while the pointer moves — and the
 *  sheen only exists while the pointer is inside, so nothing flashes on leave. */
export default function BookCard({
  grade,
  index,
}: {
  grade: Grade;
  index: number;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const rect = useRef<{ x: number; y: number; w: number; h: number } | null>(
    null,
  );
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [glare, setGlare] = useState<{ x: number; y: number } | null>(null);
  const accent = ACCENTS[index % ACCENTS.length];
  const readyCount = grade.lessons.filter((l) => l.ready).length;

  const cache = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    rect.current = { x: r.left, y: r.top, w: r.width || 1, h: r.height || 1 };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!rect.current) cache();
    const r = rect.current;
    if (!r) return;
    const nx = (e.clientX - r.x) / r.w;
    const ny = (e.clientY - r.y) / r.h;
    setTilt({ rx: (0.5 - ny) * 10, ry: (nx - 0.5) * 12 });
    setGlare({ x: nx * 100, y: ny * 100 });
  };

  const onLeave = () => {
    rect.current = null;
    setTilt({ rx: 0, ry: 0 });
    // the sheen is unmounted rather than recentred, so it cannot flash
    setGlare(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: -8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: 0.7,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{ perspective: 900 }}
      className="relative z-20"
    >
      <Link
        ref={ref}
        href={`/doroos/${grade.key}`}
        onPointerEnter={cache}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
          transformStyle: "preserve-3d",
        }}
        className="group relative z-20 block overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-xl transition-[border-color,box-shadow] duration-300 hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        {/* accent corner glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 -top-16 size-48 rounded-full"
          style={{
            background: `radial-gradient(closest-side, color-mix(in oklch, var(${accent}) 28%, transparent), transparent)`,
          }}
        />
        {/* pointer sheen — mounted only while hovered */}
        {glare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(340px circle at ${glare.x}% ${glare.y}%, color-mix(in oklch, var(${accent}) 16%, transparent), transparent 70%)`,
            }}
          />
        )}

        <div className="relative z-20">
          <span
            className="text-xs font-bold tracking-[0.25em] uppercase"
            style={{ color: `var(${accent})` }}
          >
            {grade.book}
          </span>

          <h2 className="mt-3 text-3xl font-black text-foreground">
            پایهٔ {grade.label}
          </h2>

          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-5xl font-black text-foreground">
              {faNum(grade.lessons.length)}
            </span>
            <span className="text-sm text-muted-foreground">درس</span>
          </div>

          {/* eighteen ticks: filled where a lesson is ready */}
          <div aria-hidden className="mt-5 flex flex-wrap gap-1.5">
            {grade.lessons.map((l) => (
              <span
                key={l.number}
                className="h-1.5 flex-1 rounded-full"
                style={{
                  minWidth: 8,
                  background: l.ready
                    ? `var(${accent})`
                    : "color-mix(in oklch, var(--color-muted-foreground) 25%, transparent)",
                }}
              />
            ))}
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            {readyCount > 0
              ? `${faNum(readyCount)} درس آماده است`
              : "به‌زودی افزوده می‌شود"}
          </p>

          <span
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold transition-transform group-hover:-translate-x-1"
            style={{ color: `var(${accent})` }}
          >
            انتخاب درس
            <span aria-hidden>←</span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
