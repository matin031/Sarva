"use client";
import Link from "next/link";
import { motion } from "motion/react";

function StartLearningSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.9 }}
      className=" text-center cursor-default flex items-center justify-center flex-col"
    >
      <h2 className=" text-foreground mb-6 text-2xl sm:text-3xl md:text-4xl font-bold text-center">
        آماده‌اید سفر به دنیای عروض را آغاز کنید؟
      </h2>
      <p className=" text-base sm:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
        همین حالا شروع کنید و با اوزان شعر فارسی آشنا شوید
      </p>
      <Link
        href={"/"}
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
  );
}

export default StartLearningSection;
