"use client";

import { motion } from "motion/react";

/** The warm-up screen shown between «شروع» and the first question.
 *
 *  It only waits for the first handful of pictures — enough that play starts on
 *  an image that is already decoded. The rest keep arriving in the background
 *  while the reader answers. */
export default function PreloadScreen({
  done,
  total,
  label,
  onCancel,
}: {
  done: number;
  total: number;
  label: string;
  onCancel: () => void;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div dir="rtl" className="container mx-auto my-12 max-w-md">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-20 overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-xl"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 24%, transparent), transparent)",
          }}
        />

        <div className="relative z-20">
          {/* a ring that fills as pictures arrive */}
          <div className="relative mx-auto mb-6 size-24">
            <svg viewBox="0 0 100 100" className="size-full -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="8"
                className="stroke-muted"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                pathLength={1}
                className="stroke-primary"
                initial={{ strokeDasharray: "1 1", strokeDashoffset: 1 }}
                animate={{ strokeDashoffset: 1 - (total ? done / total : 0) }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-primary">
              {pct.toLocaleString("fa-IR")}٪
            </span>
          </div>

          <h2 className="text-xl font-black text-foreground">
            آماده‌سازیِ تصویرها
          </h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {label}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            {done.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")}{" "}
            تصویرِ اول بارگذاری شد؛ بقیه در طولِ بازی می‌آیند.
          </p>

          <button
            onClick={onCancel}
            className="mt-6 rounded-xl border border-border bg-background px-5 py-2 text-sm font-bold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            انصراف
          </button>
        </div>
      </motion.div>
    </div>
  );
}
