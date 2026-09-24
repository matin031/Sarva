"use client";

import { useId, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/perf/use-perf";

/**
 * تب‌هایی که پس‌زمینهٔ فعالشان بینِ گزینه‌ها سُر می‌خورد (shared layout).
 * اقتباس از الگوی Animated Tabs در https://21st.dev.
 *
 * ⚠️ صفحه راست‌به‌چپ است: فلشِ چپ «بعدی» است.
 */
export function AnimatedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  const reduced = useReducedMotion();

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const at = tabs.findIndex((t) => t.value === value);
    const next = tabs[(at + step + tabs.length) % tabs.length];
    onChange(next.value);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex gap-1 rounded-2xl border border-border/70 bg-card p-1", className)}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            data-value={t.value}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.value)}
            className={cn(
              "relative rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`tab-${id}`}
                aria-hidden
                className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/10"
                transition={reduced ? { duration: 0 } : { type: "spring", bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative">{t.label}</span>
            {t.hint && <span className="panel-num relative ms-1.5 text-[11px] opacity-70">{t.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}
