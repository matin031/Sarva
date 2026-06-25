"use client";
import { motion } from "motion/react";
import FeaturesSectionIconFirst from "../svgs/FeaturesSectionIconFirst";
import FeaturesCard from "./FeaturesCard";
import FeaturesSectionIconSecond from "../svgs/FeaturesSectionIconSecond";
import FeaturesSectionIconThird from "../svgs/FeaturesSectionIconThird";
import FeaturesSectionIconFourth from "../svgs/FeaturesSectionIconFourth";

function FeaturesSection() {
  return (
    <div className=" flex flex-col items-center justify-center cursor-default">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className=" text-center"
      >
        <h2 className=" text-2xl sm:text-3xl md:text-4xl  font-bold">
          چرا عروض آموز؟
        </h2>
        <p className="text-muted-foreground text-center max-w-xl mx-auto text-base font-[550]">
          با ترکیب زیبایی‌شناسی ایرانی و فناوری مدرن، تجربه‌ای متفاوت در یادگیری
          عروض
        </p>
      </motion.div>
      <div className=" mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <FeaturesCard
          title={"پیگیری پیشرفت"}
          desc={" میزان یادگیری خود را ببینید و به سطوح بالاتر برسید"}
          icon={<FeaturesSectionIconFirst />}
          bgColor="bg-lapis-light/20"
          transition={{
            duration: 0.5,
            delay: 0.15,
          }}
        />

        <FeaturesCard
          title={"گوش دادن به ریتم"}
          desc={"با پخش صوتی، ریتم هر وزن را بشنوید و درک کنید"}
          icon={<FeaturesSectionIconThird />}
          bgColor="bg-gold/20"
          transition={{
            duration: 0.5,
            delay: 0.3,
          }}
        />

        <FeaturesCard
          title={"یادگیری تعاملی"}
          desc={
            "با پاسخ به سوالات چندگزینه‌ای، اوزان را به صورت عملی یاد بگیرید"
          }
          icon={<FeaturesSectionIconFourth />}
          bgColor="bg-primary/10"
          transition={{
            duration: 0.5,
            delay: 0.45,
          }}
        />

        <FeaturesCard
          title={"طراحی زیبا"}
          desc={"رابط کاربری الهام‌گرفته از هنر و معماری ایرانی"}
          icon={<FeaturesSectionIconSecond />}
          bgColor="bg-turquoise-light/20"
          transition={{
            duration: 0.5,
            delay: 0.6,
          }}
        />
      </div>
    </div>
  );
}

export default FeaturesSection;
