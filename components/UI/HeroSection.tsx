"use client";
import Link from "next/link";
import { motion } from "motion/react";
import {
  fadeUp,
  springPop,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";

function HeroSection() {
  return (
    <motion.div
      variants={staggerContainer(0.18)}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
    >
      <motion.div
        variants={springPop}
        className=" max-w-48 mx-auto mb-3 sm:mb-0 rounded-full text-xs sm:text-sm px-4 font-semibold py-1 bg-primary/10 text-primary"
      >
        پلتفرمِ آموزشِ عروضِ پارسی
      </motion.div>
      <h1 className=" -space-y-6 sm:-space-y-8 md:-space-y-12 font-bold text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-foreground leading-tight mb-6 ">
        <motion.span variants={fadeUp} className=" block ">
          آهنگِ شعر پارسی را
        </motion.span>
        <motion.span variants={fadeUp} className="text-primary block">
          با سروا بیاموز
        </motion.span>
      </h1>
      <motion.p
        variants={fadeUp}
        className=" text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl
           mx-auto mb-8 text-pretty "
      >
        با روشی تعاملی و امروزی، اوزانِ عروضی را گام‌به‌گام بشناس و ریتمِ زیبای
        شعرِ حافظ، سعدی و دیگر بزرگان را حس کن
      </motion.p>
      <motion.div
        variants={fadeUp}
        className=" flex items-center justify-center flex-col xs:flex-row-reverse gap-4 text-sm xs:text-base md:text-lg font-bold"
      >
        <Link
          className="active:scale-95 hover:brightness-90 transition-all bg-primary
           px-4 py-1 text-white justify-center rounded-xl flex items-center gap-x-2 z-20 relative"
          href={"/quiz"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-5"
          >
            <path
              fillRule="evenodd"
              d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
              clipRule="evenodd"
            />
          </svg>
          شروع آزمون
        </Link>
        <Link
          className=" border z-20 relative  hover:bg-accent/70 transition-all active:scale-95 rounded-xl px-6 py-1"
          href={"/guide"}
        >
          راهنمای یادگیری
        </Link>
      </motion.div>
    </motion.div>
  );
}
export default HeroSection;
