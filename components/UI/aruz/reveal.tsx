"use client";

import { motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/** Reusable, premium scroll-reveal primitives for the عروض page.
 *  - RevealGroup: staggers its children when scrolled into view.
 *  - RevealItem:  a child that rises + unblurs (use inside RevealGroup).
 *  - RevealWords: a heading that reveals word-by-word behind a mask. */

const EASE = [0.16, 1, 0.3, 1] as const;
const VIEW = { once: true, amount: 0.4 } as const;

export function RevealGroup({
  children,
  className,
  stagger = 0.1,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={VIEW}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

const itemV: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export function RevealItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemV} className={className}>
      {children}
    </motion.div>
  );
}

/** Heading text that rises word-by-word from behind a mask. `as` picks the tag
 *  (defaults to a span so it can nest inside an <h2>). */
export function RevealWords({
  text,
  className,
  stagger = 0.07,
  delay = 0,
  inherit = false,
}: {
  text: string;
  className?: string;
  stagger?: number;
  delay?: number;
  /**
   * داخلِ یک `RevealGroup` هستی؟ آن‌وقت ناظرِ خودت را نساز.
   *
   * ⚠️ چرا مهم است: هر `whileInView` یک IntersectionObserver مستقل است. در
   * صفحهٔ کهکشان هر ایستگاه یک گروه داشت به‌علاوهٔ یک عنوانِ واژه‌به‌واژه —
   * یعنی دو ناظرِ تودرتو که دقیقاً هم‌زمان و برای یک چیز شلیک می‌کردند.
   * با `inherit`، همان حالتِ گروهِ والد از راهِ variants پایین می‌آید و
   * ناظرِ دوم حذف می‌شود.
   */
  inherit?: boolean;
}) {
  const words = text.split(" ");
  const gate = inherit
    ? {}
    : ({ initial: "hidden", whileInView: "visible", viewport: VIEW } as const);
  return (
    <motion.span
      className={className}
      style={{ display: "inline-block" }}
      {...gate}
      aria-label={text}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
    >
      {words.map((w, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "top",
            paddingBottom: "0.18em",
            marginBottom: "-0.18em",
          }}
        >
          <motion.span
            style={{ display: "inline-block" }}
            variants={{
              hidden: { y: "115%" },
              visible: { y: "0%", transition: { duration: 0.75, ease: EASE } },
            }}
          >
            {w}
          </motion.span>
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </motion.span>
  );
}

/** A single block that rises + unblurs behind a mask — for hero lines that must
 *  keep a gradient/clip intact (word-splitting would break background-clip). */
export function RevealLine({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.span
      className={className}
      style={{
        display: "block",
        overflow: "hidden",
        paddingBottom: "0.14em",
        marginBottom: "-0.14em",
      }}
      initial="hidden"
      whileInView="visible"
      viewport={VIEW}
      variants={{ hidden: {}, visible: { transition: { delayChildren: delay } } }}
    >
      <motion.span
        style={{ display: "block" }}
        variants={{
          hidden: { y: "115%" },
          visible: { y: "0%", transition: { duration: 0.8, ease: EASE } },
        }}
      >
        {children}
      </motion.span>
    </motion.span>
  );
}
