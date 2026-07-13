"use client";
import { motion, useReducedMotion, type Variants } from "framer-motion";

function HeroSectionVaznYab() {
  const shouldReduceMotion = useReducedMotion();
  const EASE = [0.22, 1, 0.36, 1] as const;

  const dur = (d: number) => (shouldReduceMotion ? 0.01 : d);
  const yOffset = shouldReduceMotion ? 0 : 16;
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.09,
        delayChildren: shouldReduceMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: yOffset },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: dur(0.6), ease: EASE },
    },
  };
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className=" text-center mx-auto w-fit mt-12 flex items-center flex-col"
    >
      <motion.span
        variants={itemVariants}
        className=" max-w-48  mb-3 sm:mb-0 rounded-full text-xs sm:text-sm px-4 
          font-semibold py-1 bg-primary/10 text-primary"
      >
        وزن یاب
      </motion.span>
      <motion.h1
        variants={itemVariants}
        dir="rtl"
        className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight
           mb-2 text-balance"
      >
        وزن بیت
        <span className=" text-primary mr-1 inline-block"> دلخواهت</span>
        را پیدا کن
      </motion.h1>
      <motion.p
        variants={itemVariants}
        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed text-center"
      >
        اینجا می‌توانی با نوشتن بیت یا مصراع, بفهمی وزن عروضی اون بیت یا مصراع
        چیه و صداش رو بشنوی
      </motion.p>
    </motion.div>
  );
}

export default HeroSectionVaznYab;
