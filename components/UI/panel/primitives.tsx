"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Section heading with an optional trailing control. */
export function PanelHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="relative z-20 mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** A number worth looking at. */
export function StatTile({
  label,
  value,
  hint,
  token = "--color-primary",
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  token?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.05, ease: EASE }}
      className="relative z-20 overflow-hidden rounded-2xl border border-border bg-card p-4"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 size-24 rounded-full"
        style={{
          background: `radial-gradient(closest-side, color-mix(in oklch, var(${token}) 26%, transparent), transparent)`,
        }}
      />
      <p className="relative z-20 text-xs font-bold text-muted-foreground">
        {label}
      </p>
      <p
        className="relative z-20 mt-1.5 text-2xl font-black"
        style={{ color: `var(${token})` }}
      >
        {value}
      </p>
      {hint && (
        <p className="relative z-20 mt-1 text-[11px] text-muted-foreground">
          {hint}
        </p>
      )}
    </motion.div>
  );
}

/** Generic card used for every list row and panel block. */
export function Card({
  children,
  className = "",
  index = 0,
}: {
  children: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: Math.min(index, 8) * 0.04, ease: EASE }}
      className={`relative z-20 rounded-2xl border border-border bg-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** Correct/total as a thin bar — the panel's one repeated chart idiom. */
export function ScoreBar({
  correct,
  total,
  token = "--color-primary",
}: {
  correct: number;
  total: number;
  token?: string;
}) {
  const p = total ? Math.round((correct / total) * 100) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="img"
      aria-label={`${p}٪`}
    >
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${p}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: EASE }}
        className="h-full rounded-full"
        style={{ background: `var(${token})` }}
      />
    </div>
  );
}

/** Shown when a section has nothing yet — never a blank screen. */
export function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon: string;
  title: string;
  body: string;
  cta?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="relative z-20 rounded-3xl border border-dashed border-border bg-card p-10 text-center"
    >
      <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted text-3xl">
        {icon}
      </div>
      <h2 className="text-lg font-black text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {cta && <div className="mt-6 flex justify-center">{cta}</div>}
    </motion.div>
  );
}

/** A day-by-day activity strip. Bars are relative to the busiest day. */
export function ActivityStrip({
  days,
}: {
  days: { label: string; total: number; correct: number }[];
}) {
  const peak = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="flex items-end justify-between gap-1">
      {days.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="flex h-24 w-full items-end justify-center">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${(d.total / peak) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.03, ease: EASE }}
              title={`${d.total} پاسخ، ${d.correct} درست`}
              className="w-full max-w-6 rounded-t-md bg-primary/25"
            >
              <div
                className="w-full rounded-t-md bg-primary"
                style={{
                  height: d.total ? `${(d.correct / d.total) * 100}%` : "0%",
                }}
              />
            </motion.div>
          </div>
          <span className="truncate text-[9px] text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
