"use client";
import Link from "next/link";
import { motion } from "motion/react";
function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className=" max-w-48 mx-auto mb-3 sm:mb-0 rounded-full text-xs sm:text-sm px-4 font-semibold py-1 bg-primary/10 text-primary">
        پلتفرم آموزش عروض فارسی
      </div>
      <h1 className=" -space-y-6 sm:-space-y-8 md:-space-y-12 font-bold text-3xl sm:text-4xl md:text-6xl lg:text-7xl text-foreground leading-tight mb-6 ">
        <span className=" block ">هنر شعر فارسی را</span>
        <span className="text-primary ">با عروض بیاموزید</span>
      </h1>
      <p
        className=" text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl
           mx-auto mb-8 text-pretty "
      >
        با روشی تعاملی و نوین، اوزان عروضی شعر فارسی را بشناسید و ریتم زیبای
        اشعار حافظ، سعدی و... را درک کنید
      </p>
      <div className=" flex items-center justify-center flex-col xs:flex-row-reverse gap-4 text-sm xs:text-base md:text-lg font-bold">
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
      </div>
    </motion.div>
  );
}

export default HeroSection;
