import type { Variants } from "motion/react";

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: easeOutExpo },
  },
};

export const fadeUpSmall: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutExpo },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: easeOutExpo },
  },
};

export const springPop: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 20 },
  },
};

// motion.ts — اضافه به فایل قبلی

export const cardPop: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.88 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 260, damping: 18, mass: 0.9 },
  },
};

export const cardFlip3D: Variants = {
  hidden: { opacity: 0, rotateX: -35, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    rotateX: 0,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

export const cardSlideSide: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 230, damping: 22 },
  },
};

export const staggerContainer = (
  stagger = 0.12,
  delayChildren = 0,
): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: stagger,
      delayChildren,
    },
  },
});

export const defaultViewport = { once: true, amount: 0.35 } as const;
