"use client";
import { motion } from "motion/react";

import {
  fadeUp,
  springPop,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";
import ExamDemo from "./exam-demo/ExamDemo";
import SectionCTA from "./SectionCTA";
function ExamSection() {
  return (
    <div dir="rtl">
      <div
        className=" flex items-center
       justify-center"
      >
        <motion.div
          variants={springPop}
          className=" inline-flex mx-auto mb-3 sm:mb-0 rounded-full text-xs 
        sm:text-sm px-4 font-semibold py-1 bg-primary/10 text-primary"
        >
          امتحانات نهایی
        </motion.div>
      </div>

      <h2 className=" font-bold text-4xl text-center">
        امتحانات نهایی را به‌صورت تعاملی تجربه کن
      </h2>
      <motion.p
        variants={fadeUp}
        className="text-muted-foreground text-center max-w-xl mx-auto text-base font-[550]"
      >
        اینجا قرار نیست پی‌دی‌اف از آزمون‌های نهایی ببینی؛اینجا قراره سوال به
        سوال در لحظه برای خودت آزمون بدی و جواب رو ببینی!
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={defaultViewport}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 flex justify-center sm:mt-10"
      >
        <ExamDemo />
      </motion.div>

      <SectionCTA href="/exam" label="شروع آزمون نهایی" />
    </div>
  );
}

export default ExamSection;
