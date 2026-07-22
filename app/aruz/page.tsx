"use client";
import StartLearningSection from "@/components/UI/StartLearningSection";
import Link from "next/link";
import { motion } from "motion/react";
import {
  fadeUp,
  springPop,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";
import LearningProcessSection from "@/components/UI/LearningProcessSection";

function page() {
  return (
    <div>
      <section
        className="container text-center flex items-center justify-center flex-col px-6  
        md:px-12 lg:px-20 py-14 relative"
      >
        <div className="hidden dark:block  bg-primary/8 blur-3xl size-100 rounded-full left-20 bottom-0 absolute"></div>
        <motion.div
          variants={staggerContainer(0.18)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
        >
          <motion.div
            variants={springPop}
            className=" inline-flex mx-auto mb-3 sm:mb-0 rounded-full text-xs sm:text-sm px-4 font-semibold py-1 bg-primary/10 text-primary"
          >
            عروض سماعی
          </motion.div>
          <h1 className=" -space-y-6 sm:-space-y-8 md:-space-y-12 font-bold text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-foreground leading-tight mb-6 ">
            <motion.span variants={fadeUp} className="block">
              آرزویی دست‌یافتنی
            </motion.span>
            <motion.span variants={fadeUp} className="text-primary block">
              به سادگیِ گوش دادن
            </motion.span>
          </h1>
          <motion.p
            variants={fadeUp}
            className=" text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl
           mx-auto mb-8 text-pretty "
          >
            سماعی شدن در عروض حالا دیگر دشوار نیست با تست‌های صوتی و تعاملی
            ســروا به راحتی وزن هر بیت را تنها با گوش دادن تشخیص می‌دهی
          </motion.p>
        </motion.div>
      </section>

      <section>
        <LearningProcessSection />
      </section>
      <section className=" container z-10 relative pb-22">
        <StartLearningSection />
      </section>
    </div>
  );
}

export default page;
