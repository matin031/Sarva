// FeaturesSection.tsx
"use client";
import { motion } from "motion/react";
import FeaturesSectionIconFirst from "../svgs/FeaturesSectionIconFirst";
import FeaturesCard from "./FeaturesCard";
import FeaturesSectionIconSecond from "../svgs/FeaturesSectionIconSecond";
import FeaturesSectionIconThird from "../svgs/FeaturesSectionIconThird";
import FeaturesSectionIconFourth from "../svgs/FeaturesSectionIconFourth";
import {
  fadeUp,
  cardPop,
  cardFlip3D,
  cardSlideSide,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";

// 👇 برای تست فقط همین خط رو عوض کن: cardPop | cardFlip3D | cardSlideSide
const ACTIVE_VARIANT = cardPop;

function FeaturesSection() {
  return (
    <div className="flex flex-col items-center justify-center cursor-default">
      <motion.div
        variants={staggerContainer(0.12)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="text-center"
      >
        <motion.h2
          variants={fadeUp}
          className="text-2xl sm:text-3xl md:text-4xl font-bold"
        >
          چرا سروا؟
        </motion.h2>
        <motion.p
          variants={fadeUp}
          className="text-muted-foreground text-center max-w-xl mx-auto text-base font-[550]"
        >
          با ترکیب زیبایی‌شناسی ایرانی و فناوری مدرن، تجربه‌ای متفاوت در یادگیری
          عروض
        </motion.p>
      </motion.div>

      <motion.div
        variants={staggerContainer(0.12, 0.1)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <FeaturesCard
          title="پیگیری پیشرفت"
          desc="روندِ پیشرفتت را دنبال کن و پله‌پله به سطوح بالاتر برس"
          icon={<FeaturesSectionIconFirst />}
          bgColor="bg-lapis-light/20"
          variants={ACTIVE_VARIANT}
        />
        <FeaturesCard
          title="گوش دادن به ریتم"
          desc="با پخشِ صوتی، ریتمِ هر وزن را بشنو و حس کن"
          icon={<FeaturesSectionIconThird />}
          bgColor="bg-gold/20"
          variants={ACTIVE_VARIANT}
        />
        <FeaturesCard
          title="یادگیری تعاملی"
          desc="با پاسخ به پرسش‌های چندگزینه‌ای، اوزان را عملی و ماندگار بیاموز"
          icon={<FeaturesSectionIconFourth />}
          bgColor="bg-primary/10"
          variants={ACTIVE_VARIANT}
        />
        <FeaturesCard
          title="طراحی زیبا"
          desc="رابطی کاربری، الهام‌گرفته از هنر و معماریِ اصیلِ ایرانی"
          icon={<FeaturesSectionIconSecond />}
          bgColor="bg-turquoise-light/20"
          variants={ACTIVE_VARIANT}
        />
      </motion.div>
    </div>
  );
}

export default FeaturesSection;
