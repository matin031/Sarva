"use client";
import WaveCanvas from "./WaveCanvas";
import { motion } from "motion/react";
import {
  scaleIn,
  fadeUp,
  staggerContainer,
  defaultViewport,
} from "@/lib/motion";

export default function VerseCard() {
  return (
    <motion.div
      variants={scaleIn}
      initial="hidden"
      whileInView="visible"
      viewport={defaultViewport}
      className="glass z-20 relative rounded-3xl p-4 md:p-12 max-w-3xl
     mx-auto text-center flex flex-col justify-between items-center gap-y-6"
    >
      <WaveCanvas phaseOffset={0} />
      <motion.div
        variants={staggerContainer(0.15, 0.15)}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className="text-center font-semibold"
      >
        <motion.p
          variants={fadeUp}
          className=" text-base sm:text-xl md:text-2xl text-foreground leading-loose calligraphy mb-4"
        >
          اظهار عجز پیش ستمگر ز ابلهیست
        </motion.p>
        <motion.p
          variants={fadeUp}
          className=" text-base sm:text-xl md:text-2xl text-foreground leading-loose calligraphy mb-4"
        >
          اشک کباب موجب طغیان آتش است
        </motion.p>
      </motion.div>
      <WaveCanvas phaseOffset={0.5} />
      <motion.p
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={defaultViewport}
        className=" text-xs sm:text-sm"
      >
        صائب تبریزی-
      </motion.p>
    </motion.div>
  );
}
