"use client";
import { motion } from "motion/react";
import { defaultViewport } from "@/lib/motion";
import VocabChallengeDemo from "./vocab-demo/VocabChallengeDemo";

function VocabHomeSection() {
  return (
    <div dir="rtl">
      <div className="flex items-center justify-center">
        <div className="mx-auto mb-3 inline-flex rounded-full bg-primary/10 px-4 py-1 text-xs font-semibold text-primary sm:mb-0 sm:text-sm">
          واژه‌یاب
        </div>
      </div>

      <h2 className="text-center text-4xl font-bold">واژگان را با تصویر و در چالشِ زمان یاد بگیر</h2>
      <p className="mx-auto max-w-xl text-center text-base font-[550] text-muted-foreground">
        در حالتِ چالش، تصویر را می‌بینی و باید در چند ثانیه واژهٔ درست را بزنی؛
        یک اشتباه و از اول! سریع، هیجان‌انگیز و ماندگار.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={defaultViewport}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mt-8 sm:mt-10"
      >
        <VocabChallengeDemo />
      </motion.div>
    </div>
  );
}

export default VocabHomeSection;
