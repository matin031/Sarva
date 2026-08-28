"use client";

import { motion } from "motion/react";

/** نمایشِ کوتاهِ صفحهٔ معرفی: قطعهٔ نقش → سوکت → بسته‌شدنِ مدار → روشن‌شدنِ لامپ.
 *  فقط تزئینی است و هیچ ربطی به منطقِ بازی ندارد. */
export default function GrammarCircuitPreview() {
  const loop = { duration: 3.4, repeat: Infinity, ease: "easeInOut" as const };

  return (
    <div className="gc-root relative overflow-hidden rounded-2xl border border-[var(--gc-border)] bg-[var(--gc-board)] p-4">
      <div className="gc-trace-bg" aria-hidden />
      <div className="relative flex items-center justify-center gap-3" dir="rtl">
        <svg width="26" height="34" viewBox="0 0 44 56" aria-hidden>
          <rect x="7" y="10" width="30" height="38" rx="6" fill="var(--gc-board-elevated)" stroke="var(--gc-border-strong)" strokeWidth="2" />
          <rect x="17" y="5" width="10" height="6" rx="2" fill="var(--gc-metal)" />
        </svg>

        <div className="relative shrink-0">
          <p className="gc-sentence !text-base !leading-snug">
            <span className="gc-word gc-word-plain">دیروز</span>{" "}
            <span className="gc-word gc-word-slot">باران</span>{" "}
            <span className="gc-word gc-word-plain">بارید</span>
          </p>
          <div className="relative mt-2 h-9">
            <div
              className="gc-socket !translate-x-0 !translate-y-[-50%]"
              style={{ left: "50%", width: 74, height: 32, marginInlineStart: -37 }}
            />
            <motion.div
              className="gc-module absolute top-1/2 !py-1.5 !text-xs"
              style={{ left: "50%", marginInlineStart: -28 }}
              initial={{ y: -30, opacity: 1 }}
              animate={{ y: [-30, -30, -16, -16, -16], opacity: [0.9, 0.9, 1, 1, 1] }}
              transition={loop}
            >
              نهاد
            </motion.div>
          </div>
        </div>

        <motion.svg
          width="30"
          height="38"
          viewBox="0 0 66 82"
          aria-hidden
          animate={{ opacity: [0.45, 0.45, 1, 1] }}
          transition={loop}
        >
          <circle cx="33" cy="32" r="30" fill="var(--gc-lamp-on)" opacity="0.22" />
          <path
            d="M33 6c-11 0-19 8.4-19 19 0 7.4 3.8 11.4 6.6 15 1.9 2.4 2.9 3.9 2.9 6.6h19c0-2.7 1-4.2 2.9-6.6 2.8-3.6 6.6-7.6 6.6-15C52 14.4 44 6 33 6Z"
            fill="var(--gc-lamp-on)"
            fillOpacity="0.55"
            stroke="var(--gc-border-strong)"
            strokeWidth="2"
          />
          <rect x="23" y="50" width="20" height="14" rx="2" fill="var(--gc-metal)" />
        </motion.svg>
      </div>
    </div>
  );
}
