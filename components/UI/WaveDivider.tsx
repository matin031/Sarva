"use client";
import WaveCanvas from "./WaveCanvas";
import { motion } from "motion/react";

export default function VerseCard() {
  return (
    <motion.div
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
      className="glass z-20 relative rounded-3xl p-4 md:p-12 max-w-3xl
     mx-auto text-center flex flex-col justify-between items-center gap-y-6"
    >
      <WaveCanvas phaseOffset={0} />

      <div className="text-center font-semibold">
        <p className=" text-base sm:text-xl md:text-2xl text-foreground leading-loose calligraphy mb-4">
          اظهار عجز پیش ستمگر ز ابلهیست
        </p>
        <p className=" text-base sm:text-xl md:text-2xl text-foreground leading-loose calligraphy mb-4">
          اشک کباب موجب طغیان آتش است
        </p>
      </div>

      <WaveCanvas phaseOffset={0.5} />

      <p className=" text-xs sm:text-sm">صائب تبریزی-</p>
    </motion.div>
  );
}
