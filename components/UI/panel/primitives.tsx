"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/** The panel's visual vocabulary, kept deliberately small.
 *
 *  One accent colour, one border weight, one radius, flat surfaces. An earlier
 *  version tinted every block a different colour and put a glow behind each
 *  number; with six sections on screen that reads as noise rather than as
 *  hierarchy. Meaning is carried by type weight and whitespace instead, and
 *  colour is reserved for right/wrong — where it actually means something. */

const EASE = [0.16, 1, 0.3, 1] as const;

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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** A row of plain numbers. No boxes, no colour — just a hairline between them. */
export function StatRow({
  items,
}: {
  items: { label: string; value: string; hint?: string }[];
}) {
  return (
    <motion.dl
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE }}
      className="grid grid-cols-2 gap-y-6 rounded-2xl border border-border bg-card p-6 sm:grid-cols-4"
    >
      {items.map((s) => (
        <div key={s.label} className="min-w-0">
          <dt className="text-xs text-muted-foreground">{s.label}</dt>
          <dd className="mt-1.5 text-2xl font-bold text-foreground">
            {s.value}
          </dd>
          {s.hint && (
            <dd className="mt-0.5 text-xs text-muted-foreground">{s.hint}</dd>
          )}
        </div>
      ))}
    </motion.dl>
  );
}

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
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.03, ease: EASE }}
      className={`rounded-2xl border border-border bg-card ${className}`}
    >
      {children}
    </motion.div>
  );
}

/** A labelled section, without a card around it — most content does not need
 *  its own frame when it already sits inside one. */
export function Block({
  title,
  hint,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`mt-6 ${className}`}>
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Correct/total as a hairline bar. */
export function ScoreBar({
  correct,
  total,
}: {
  correct: number;
  total: number;
}) {
  const p = total ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${p}%` }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
        className="h-full rounded-full bg-primary"
      />
    </div>
  );
}

/** A labelled bar — the panel's one repeated chart idiom. */
export function BarRow({
  label,
  correct,
  total,
}: {
  label: string;
  correct: number;
  total: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {total
            ? `${correct.toLocaleString("fa-IR")}/${total.toLocaleString("fa-IR")}`
            : "—"}
        </span>
      </div>
      <ScoreBar correct={correct} total={total} />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
      {cta && <div className="mt-6 flex justify-center">{cta}</div>}
    </div>
  );
}

/** Day-by-day activity. One bar per day, one colour. */
export function ActivityStrip({
  days,
}: {
  days: { label: string; total: number; correct: number }[];
}) {
  const peak = Math.max(1, ...days.map((d) => d.total));
  return (
    <div className="flex items-end gap-1.5">
      {days.map((d, i) => (
        <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-16 w-full items-end justify-center">
            <motion.div
              initial={{ height: 0 }}
              whileInView={{ height: `${Math.max((d.total / peak) * 100, d.total ? 8 : 4)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.02, ease: EASE }}
              title={`${d.total} پاسخ، ${d.correct} درست`}
              className={`w-1.5 rounded-full ${d.total ? "bg-primary" : "bg-border"}`}
            />
          </div>
          <span className="truncate text-[9px] text-muted-foreground">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
