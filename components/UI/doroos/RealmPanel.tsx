"use client";

import { motion } from "motion/react";

/** One قلمرو. `items` renders as a list (زبانی، ادبی); `body` renders as a
 *  paragraph (فکری). Each panel carries its own accent so a reader can tell the
 *  three apart at a glance without reading the heading. */
export default function RealmPanel({
  label,
  token,
  items,
  body,
  badge,
  delay = 0,
}: {
  label: string;
  token: string;
  items?: string[];
  body?: string;
  /** a short fact that belongs to the whole قلمرو rather than to one bullet —
   *  «۲ جمله» for قلمرو زبانی */
  badge?: string;
  delay?: number;
}) {
  if (!items?.length && !body) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-20 overflow-hidden rounded-2xl border border-border bg-card p-5"
      style={{ borderInlineStartWidth: 3, borderInlineStartColor: `var(${token})` }}
    >
      <div className="relative z-20 mb-3 flex items-center justify-between gap-2">
        <h3
          className="text-sm font-black tracking-wide"
          style={{ color: `var(${token})` }}
        >
          {label}
        </h3>
        {badge ? (
          <span
            className="shrink-0 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold"
            style={{
              color: `var(${token})`,
              background: `color-mix(in oklch, var(${token}) 13%, transparent)`,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>

      {items?.length ? (
        <ul className="relative z-20 space-y-2.5">
          {items.map((item, i) => (
            <motion.li
              key={i}
              // vertical, not horizontal: an x-offset entrance is toward the
              // page edge in RTL and briefly widens the layout mid-animation
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{
                duration: 0.4,
                delay: Math.min(i, 8) * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="flex gap-2.5 text-sm leading-relaxed text-foreground"
            >
              <span
                aria-hidden
                className="mt-[0.55em] size-1.5 shrink-0 rounded-full"
                style={{ background: `var(${token})` }}
              />
              <span>{item}</span>
            </motion.li>
          ))}
        </ul>
      ) : (
        <p className="relative z-20 text-sm leading-relaxed text-foreground">
          {body}
        </p>
      )}
    </motion.section>
  );
}
