"use client";
import { motion } from "motion/react";
import { defaultViewport } from "@/lib/motion";
import VaznYabDemo from "./vazn-yab-demo/VaznYabDemo";

function VaznYabHomeSection() {
  return (
    <div dir="rtl">
      <div className="flex items-center justify-center">
        <div className="mx-auto mb-3 inline-flex rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary sm:mb-0 sm:text-sm">
          وزن‌یاب
        </div>
      </div>

      <h2 className="text-center text-4xl font-bold">
        وزنِ هر بیت را در یک لحظه پیدا کن
      </h2>
      <p className="mx-auto max-w-xl text-center text-base font-[550] text-muted-foreground">
        بیت یا مصراعی را بنویس تا وزنِ عروضی، ارکان و بحرِ آن را همان‌جا ببینی و
        ضرب‌آهنگش را بشنوی.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={defaultViewport}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 sm:mt-10"
      >
        <VaznYabDemo />
      </motion.div>
    </div>
  );
}

export default VaznYabHomeSection;
