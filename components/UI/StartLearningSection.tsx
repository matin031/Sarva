"use client";
import Link from "next/link";
import { motion } from "motion/react";
import {
  fadeUp,
  springPop,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";

function StartLearningSection() {
  return (
    <motion.div
      variants={staggerContainer(0.15)}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      className=" text-center relative z-0 cursor-default flex items-center justify-center flex-col"
    >
      <motion.h2
        variants={fadeUp}
        className=" text-foreground mb-6 text-2xl sm:text-3xl md:text-4xl font-bold text-center"
      >
        آماده‌اید سفر به دنیای عروض را آغاز کنید؟
      </motion.h2>
      <motion.p
        variants={fadeUp}
        className=" text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
      >
        همین حالا شروع کنید و با اوزان شعر فارسی آشنا شوید
      </motion.p>
      <motion.div variants={springPop} className=" rounded-xl">
        <motion.div
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          animate={{
            boxShadow: [
              "0 0 0 0 rgba(20, 184, 166, 0.35)",
              "0 0 0 14px rgba(20, 184, 166, 0)",
            ],
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
            },
          }}
          className=" rounded-xl"
        >
          <Link
            href={"/quiz"}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap 
      font-medium transition-all disabled:pointer-events-none disabled:opacity-50
       [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0
        [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 
        focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40
         aria-invalid:border-destructive text-primary-foreground h-10 has-[>svg]:px-4 bg-primary
          hover:bg-primary/90 text-lg px-10 py-6 rounded-xl shadow-lg shadow-primary/25"
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
            آغاز یادگیری رایگان
          </Link>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
export default StartLearningSection;
